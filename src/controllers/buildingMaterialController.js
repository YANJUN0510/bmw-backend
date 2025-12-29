const supabase = require('../config/supabase');

const BUCKET_NAME = 'building-materials';

exports.uploadBuildingMaterial = async (req, res) => {
  try {
    const { code, name, category, series, description, specs, price } = req.body;
    
    // Handle multiple files
    const files = req.files || {};
    const imageFile = files['image'] ? files['image'][0] : null;
    const galleryFiles = files['gallery'] || [];

    console.log('Received files:', {
      hasImage: !!imageFile,
      galleryCount: galleryFiles.length,
      imageFileName: imageFile?.originalname,
      galleryFileNames: galleryFiles.map(f => f.originalname)
    });

    if (!imageFile) {
      return res.status(400).json({ status: 'error', message: 'Main image file is required' });
    }

    // 1. Upload main image
    const fileExt = imageFile.originalname.split('.').pop();
    const fileName = `${code}.${fileExt}`;
    const filePath = `${fileName}`;

    console.log(`Uploading main image: ${fileName}, size: ${imageFile.buffer.length} bytes`);

    const { error: storageError } = await supabase
      .storage
      .from(BUCKET_NAME)
      .upload(filePath, imageFile.buffer, {
        contentType: imageFile.mimetype,
        upsert: true
      });

    if (storageError) {
      console.error('Main image upload error:', storageError);
      throw new Error(`Main image upload failed: ${storageError.message}`);
    }

    // Get Public URL for main image
    const { data: { publicUrl: mainImageUrl } } = supabase
      .storage
      .from(BUCKET_NAME)
      .getPublicUrl(filePath);
    
    console.log(`Main image uploaded successfully: ${mainImageUrl}`);

    // 2. Upload gallery images (最多4张)
    const galleryUrls = [];
    const maxGalleryImages = Math.min(galleryFiles.length, 4);
    
    console.log(`Uploading ${maxGalleryImages} gallery images...`);
    
    for (let i = 0; i < maxGalleryImages; i++) {
      try {
        const file = galleryFiles[i];
        const galleryFileExt = file.originalname.split('.').pop();
        const galleryFileName = `${code}_gallery_${i + 1}.${galleryFileExt}`;
        
        console.log(`Uploading gallery image ${i + 1}/${maxGalleryImages}: ${galleryFileName}, size: ${file.buffer.length} bytes`);
        
        const { data: uploadData, error: galleryError } = await supabase
          .storage
          .from(BUCKET_NAME)
          .upload(galleryFileName, file.buffer, {
            contentType: file.mimetype,
            upsert: true
          });

        if (galleryError) {
          console.error(`Gallery image ${i + 1} upload error:`, {
            message: galleryError.message,
            statusCode: galleryError.statusCode,
            error: galleryError.error,
            fileName: galleryFileName
          });
          throw new Error(`Gallery image ${i + 1} upload failed: ${galleryError.message}`);
        }

        console.log(`Gallery image ${i + 1} upload response:`, uploadData);

        const { data: { publicUrl } } = supabase
          .storage
          .from(BUCKET_NAME)
          .getPublicUrl(galleryFileName);
        
        console.log(`Gallery image ${i + 1} uploaded successfully: ${publicUrl}`);
        galleryUrls.push(publicUrl);
      } catch (error) {
        console.error(`Fatal error during gallery image ${i + 1} upload:`, error);
        throw error;
      }
    }
    
    console.log('All gallery images uploaded:', galleryUrls);

    // 3. Insert into Database
    // Note: gallery字段如果是text[]类型，直接传数组；如果是jsonb类型，需要JSON.stringify
    // 当前假设是text[]类型
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

    console.log('Inserting into database:', {
      code,
      name,
      category,
      image: mainImageUrl ? 'uploaded' : 'missing',
      gallery: galleryUrls.length > 0 ? galleryUrls : null,
      galleryType: typeof insertData.gallery,
      galleryIsArray: Array.isArray(insertData.gallery)
    });

    const { data, error } = await supabase
      .from('building_material')
      .insert([insertData])
      .select();

    if (error) {
      console.error('Database insertion error:', error);
      throw error;
    }

    console.log('Material uploaded successfully:', data[0].code);

    res.status(201).json({
      status: 'success',
      message: 'Building material created successfully',
      data: data[0],
    });

  } catch (error) {
    console.error('Error uploading building material:', error);
    console.error('Full error details:', JSON.stringify(error, null, 2));
    res.status(500).json({
      status: 'error',
      message: error.message,
      details: error.details || error.hint || error.code || 'No additional details',
      errorObject: error
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
      .from('building_material')
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
      .from('building_material')
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
      .from('building_material')
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
      .from('building_material')
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
      .from('building_material')
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
      .from('building_material')
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

