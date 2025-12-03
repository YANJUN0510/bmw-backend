const supabase = require('../config/supabase');

const BUCKET_NAME = 'products';

exports.uploadProduct = async (req, res) => {
  try {
    const { code, name, style, category, description, long_description, specs } = req.body;
    
    // Handle multiple files
    const files = req.files || {};
    const imageFile = files['image'] ? files['image'][0] : null;
    const galleryFiles = files['gallery'] || [];

    if (!imageFile) {
      return res.status(400).json({ status: 'error', message: 'Main image file is required' });
    }

    // 1. Upload main image
    const fileExt = imageFile.originalname.split('.').pop();
    const fileName = `${code}.${fileExt}`;
    const filePath = `${fileName}`;

    const { error: storageError } = await supabase
      .storage
      .from(BUCKET_NAME)
      .upload(filePath, imageFile.buffer, {
        contentType: imageFile.mimetype,
        upsert: true
      });

    if (storageError) {
      throw storageError;
    }

    // Get Public URL for main image
    const { data: { publicUrl: mainImageUrl } } = supabase
      .storage
      .from(BUCKET_NAME)
      .getPublicUrl(filePath);

    // 2. Upload gallery images
    const galleryUrls = [];
    for (let i = 0; i < galleryFiles.length; i++) {
      const file = galleryFiles[i];
      const galleryFileExt = file.originalname.split('.').pop();
      const galleryFileName = `${code}_gallery_${i + 1}.${galleryFileExt}`;
      
      const { error: galleryError } = await supabase
        .storage
        .from(BUCKET_NAME)
        .upload(galleryFileName, file.buffer, {
          contentType: file.mimetype,
          upsert: true
        });

      if (galleryError) throw galleryError;

      const { data: { publicUrl } } = supabase
        .storage
        .from(BUCKET_NAME)
        .getPublicUrl(galleryFileName);
      
      galleryUrls.push(publicUrl);
    }

    // 3. Insert into Database
    const { data, error } = await supabase
      .from('products')
      .insert([
        {
          code,
          name,
          style,
          category,
          image: mainImageUrl,
          gallery: galleryUrls,
          description,
          long_description,
          specs: specs ? JSON.parse(specs) : null,
        },
      ])
      .select();

    if (error) {
      throw error;
    }

    res.status(201).json({
      status: 'success',
      message: 'Product created successfully',
      data: data[0],
    });

  } catch (error) {
    console.error('Error uploading product:', error);
    res.status(500).json({
      status: 'error',
      message: error.message,
    });
  }
};

exports.updateProduct = async (req, res) => {
  try {
    const { code } = req.params;
    const { name, style, category, description, long_description, specs } = req.body;
    const file = req.file;

    let updateData = {
      name,
      style,
      category,
      description,
      long_description,
      specs: specs ? JSON.parse(specs) : undefined,
    };

    // Remove undefined keys
    Object.keys(updateData).forEach(key => updateData[key] === undefined && delete updateData[key]);

    if (file) {
      const fileExt = file.originalname.split('.').pop();
      const fileName = `${code}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: storageError } = await supabase
        .storage
        .from(BUCKET_NAME)
        .upload(filePath, file.buffer, {
          contentType: file.mimetype,
          upsert: true
        });

      if (storageError) {
        throw storageError;
      }

      const { data: { publicUrl } } = supabase
        .storage
        .from(BUCKET_NAME)
        .getPublicUrl(filePath);
      
      updateData.image = publicUrl;
    }

    const { data, error } = await supabase
      .from('products')
      .update(updateData)
      .eq('code', code)
      .select();

    if (error) {
      throw error;
    }

    if (data.length === 0) {
      return res.status(404).json({ status: 'error', message: 'Product not found' });
    }

    res.json({
      status: 'success',
      message: 'Product updated successfully',
      data: data[0],
    });

  } catch (error) {
    console.error('Error updating product:', error);
    res.status(500).json({
      status: 'error',
      message: error.message,
    });
  }
};

exports.deleteProduct = async (req, res) => {
  try {
    const { code } = req.params;

    // 1. Get product to find image path (optional, but good for cleanup)
    // For simplicity, we assume the image name follows the pattern code.ext
    // But we stored the full URL. We might need to list files or just try to delete likely matches.
    // Or we can query the product first to get the image URL and parse the filename.
    
    const { data: product, error: fetchError } = await supabase
      .from('products')
      .select('image')
      .eq('code', code)
      .single();

    if (fetchError) {
        // If not found, just return 404
        if (fetchError.code === 'PGRST116') {
             return res.status(404).json({ status: 'error', message: 'Product not found' });
        }
        throw fetchError;
    }

    // 2. Delete from Database
    const { error: deleteError } = await supabase
      .from('products')
      .delete()
      .eq('code', code);

    if (deleteError) {
      throw deleteError;
    }

    // 3. Delete image from Storage
    // Extract filename from URL. URL format: .../storage/v1/object/public/products/filename
    if (product && product.image) {
        const urlParts = product.image.split('/');
        const fileName = urlParts[urlParts.length - 1];
        
        const { error: storageError } = await supabase
            .storage
            .from(BUCKET_NAME)
            .remove([fileName]);
            
        if (storageError) {
            console.warn('Failed to delete image from storage:', storageError);
            // We don't fail the request if image deletion fails, as the record is gone.
        }
    }

    res.json({
      status: 'success',
      message: 'Product deleted successfully',
    });

  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).json({
      status: 'error',
      message: error.message,
    });
  }
};

exports.getAllProducts = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    res.json({
      status: 'success',
      results: data.length,
      data: data,
    });
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({
      status: 'error',
      message: error.message,
    });
  }
};

exports.getAllStyles = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('style');

    if (error) {
      throw error;
    }

    // Extract unique styles
    const styles = [...new Set(data.map(item => item.style))];

    res.json({
      status: 'success',
      results: styles.length,
      data: styles,
    });
  } catch (error) {
    console.error('Error fetching styles:', error);
    res.status(500).json({
      status: 'error',
      message: error.message,
    });
  }
};

exports.getAllCategories = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('category');

    if (error) {
      throw error;
    }

    // Extract unique categories
    const categories = [...new Set(data.map(item => item.category))];

    res.json({
      status: 'success',
      results: categories.length,
      data: categories,
    });
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({
      status: 'error',
      message: error.message,
    });
  }
};

exports.getProductByCode = async (req, res) => {
  try {
    const { code } = req.params;
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('code', code)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ status: 'error', message: 'Product not found' });
      }
      throw error;
    }

    res.json({
      status: 'success',
      data: data,
    });
  } catch (error) {
    console.error('Error fetching product:', error);
    res.status(500).json({
      status: 'error',
      message: error.message,
    });
  }
};
