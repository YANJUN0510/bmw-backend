const supabase = require('../config/bmw_supabase');
const { buildMaterialSearchText, getEmbedding } = require('../lib/embeddings');

const BUCKET_NAME = 'building-materials';

exports.uploadBuildingMaterial = async (req, res) => {
  try {
    const { code, name, category, series, description, specs, price } = req.body;
    
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

    // 2. Upload gallery images (最多4张)
    const galleryUrls = [];
    const maxGalleryImages = Math.min(galleryFiles.length, 4);
    
    for (let i = 0; i < maxGalleryImages; i++) {
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
    const insertData = {
      code,
      name,
      category,
      series: series || null,
      image: mainImageUrl,
      gallery: galleryUrls.length > 0 ? galleryUrls : null,
      description,
      specs: specs ? JSON.parse(specs) : null,
      price: price || null,
    };

    const searchText = buildMaterialSearchText({ code, name, category, series, description });
    const embedding = await getEmbedding(searchText);
    if (embedding) {
      insertData.embedding = embedding;
    }

    const { data, error } = await supabase
      .from('furniture_items')
      .insert([insertData])
      .select();

    if (error) {
      throw error;
    }

    res.status(201).json({
      status: 'success',
      message: 'Building material created successfully',
      data: data[0],
    });

  } catch (error) {
    console.error('Error uploading building material:', error);
    res.status(500).json({
      status: 'error',
      message: error.message,
    });
  }
};

exports.updateBuildingMaterial = async (req, res) => {
  try {
    const { code } = req.params;
    const { name, category, series, description, specs, price } = req.body;
    
    // Handle multiple files
    const files = req.files || {};
    const imageFile = files['image'] ? files['image'][0] : null;
    const galleryFiles = files['gallery'] || [];

    let updateData = {
      name,
      category,
      series: series || null,
      description,
      specs: specs ? JSON.parse(specs) : undefined,
      price: price || null,
    };

    // Remove undefined keys
    Object.keys(updateData).forEach(key => updateData[key] === undefined && delete updateData[key]);

    const shouldRefreshEmbedding = ['name', 'category', 'series', 'description'].some(
      (key) => key in updateData
    );

    if (shouldRefreshEmbedding) {
      const { data: currentRow, error: currentError } = await supabase
        .from('furniture_items')
        .select('name, category, series, description, code')
        .eq('code', code)
        .single();

      if (currentError) {
        console.warn('Failed to load current material for embedding update:', currentError);
      } else if (currentRow) {
        const merged = { ...currentRow, ...updateData, code };
        const searchText = buildMaterialSearchText(merged);
        const embedding = await getEmbedding(searchText);
        if (embedding) {
          updateData.embedding = embedding;
        }
      }
    }

    // Handle Main Image
    if (imageFile) {
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

      const { data: { publicUrl } } = supabase
        .storage
        .from(BUCKET_NAME)
        .getPublicUrl(filePath);
      
      updateData.image = publicUrl;
    }

    // Handle Gallery Images
    if (galleryFiles.length > 0) {
      const galleryUrls = [];
      const maxGalleryImages = Math.min(galleryFiles.length, 4);
      for (let i = 0; i < maxGalleryImages; i++) {
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
      updateData.gallery = galleryUrls;
    }

    const { data, error } = await supabase
      .from('furniture_items')
      .update(updateData)
      .eq('code', code)
      .select();

    if (error) {
      throw error;
    }

    if (data.length === 0) {
      return res.status(404).json({ status: 'error', message: 'Building material not found' });
    }

    res.json({
      status: 'success',
      message: 'Building material updated successfully',
      data: data[0],
    });

  } catch (error) {
    console.error('Error updating building material:', error);
    res.status(500).json({
      status: 'error',
      message: error.message,
    });
  }
};

exports.deleteBuildingMaterial = async (req, res) => {
  try {
    const { code } = req.params;

    // 1. Get building material to find image paths
    const { data: material, error: fetchError } = await supabase
      .from('furniture_items')
      .select('image, gallery')
      .eq('code', code)
      .single();

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return res.status(404).json({ status: 'error', message: 'Building material not found' });
      }
      throw fetchError;
    }

    // 2. Delete from Database
    const { error: deleteError } = await supabase
      .from('furniture_items')
      .delete()
      .eq('code', code);

    if (deleteError) {
      throw deleteError;
    }

    // 3. Delete main image from Storage
    if (material && material.image) {
      const urlParts = material.image.split('/');
      const fileName = urlParts[urlParts.length - 1];
      
      const { error: storageError } = await supabase
        .storage
        .from(BUCKET_NAME)
        .remove([fileName]);
        
      if (storageError) {
        console.warn('Failed to delete main image from storage:', storageError);
      }
    }

    // 4. Delete gallery images from Storage
    if (material && material.gallery && Array.isArray(material.gallery)) {
      const galleryFileNames = material.gallery.map(url => {
        const urlParts = url.split('/');
        return urlParts[urlParts.length - 1];
      });
      
      const { error: galleryStorageError } = await supabase
        .storage
        .from(BUCKET_NAME)
        .remove(galleryFileNames);
        
      if (galleryStorageError) {
        console.warn('Failed to delete gallery images from storage:', galleryStorageError);
      }
    }

    res.json({
      status: 'success',
      message: 'Building material deleted successfully',
    });

  } catch (error) {
    console.error('Error deleting building material:', error);
    res.status(500).json({
      status: 'error',
      message: error.message,
    });
  }
};

exports.getAllBuildingMaterials = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('furniture_items')
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
    console.error('Error fetching building materials:', error);
    res.status(500).json({
      status: 'error',
      message: error.message,
    });
  }
};

exports.getBuildingMaterialByCode = async (req, res) => {
  try {
    const { code } = req.params;
    const { data, error } = await supabase
      .from('furniture_items')
      .select('*')
      .eq('code', code)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ status: 'error', message: 'Building material not found' });
      }
      throw error;
    }

    res.json({
      status: 'success',
      data: data,
    });
  } catch (error) {
    console.error('Error fetching building material:', error);
    res.status(500).json({
      status: 'error',
      message: error.message,
    });
  }
};

exports.getAllCategoriesAndSeries = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('furniture_items')
      .select('category, series');

    if (error) {
      throw error;
    }

    // Extract unique categories and series
    const categories = [...new Set(data.map(item => item.category))];
    const series = [...new Set(data.map(item => item.series).filter(Boolean))];

    res.json({
      status: 'success',
      data: {
        categories,
        series
      },
    });
  } catch (error) {
    console.error('Error fetching categories and series:', error);
    res.status(500).json({
      status: 'error',
      message: error.message,
    });
  }
};

