const supabase = require('../config/supabase');

const BUCKET_NAME = 'building-materials';

exports.uploadBuildingMaterial = async (req, res) => {
  try {
    console.log('📦 Received request body:', req.body);
    console.log('🖼️ Received files:', req.files ? req.files.length : 0);
    
    const { code, name, category, series, description, specs, price } = req.body;
    const imageFiles = req.files; // Now receives array of files

    if (!imageFiles || imageFiles.length === 0) {
      console.log('❌ No image files received');
      return res.status(400).json({ status: 'error', message: 'At least one image file is required' });
    }
    
    console.log('✅ Processing', imageFiles.length, 'image(s)');

    // Upload all images and collect URLs
    const uploadedUrls = [];
    
    for (let i = 0; i < imageFiles.length; i++) {
      const file = imageFiles[i];
      const fileExt = file.originalname.split('.').pop();
      const fileName = `${code}_${i + 1}.${fileExt}`;
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

      uploadedUrls.push(publicUrl);
    }

    // First image is the main image, all images go to gallery
    const mainImage = uploadedUrls[0];
    const gallery = uploadedUrls;

    // Insert into Database
    const cleanSeries = (series === 'null' || series === 'undefined' || series === '') ? null : series;
    const cleanSpecs = (specs && specs !== 'null' && specs !== 'undefined' && specs !== '') ? JSON.parse(specs) : null;
    const cleanPrice = (price === 'null' || price === 'undefined' || price === '') ? null : String(price);

    const { data, error } = await supabase
      .from('building_material')
      .insert([
        {
          code,
          name,
          category,
          series: cleanSeries,
          image: mainImage,
          gallery: gallery,
          description,
          specs: cleanSpecs,
          price: cleanPrice,
        },
      ])
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
    const imageFiles = req.files;

    const updateData = {};
    
    if (name !== undefined) updateData.name = name;
    if (category !== undefined) updateData.category = category;
    if (description !== undefined) updateData.description = description;
    
    if (series !== undefined) {
      updateData.series = (series === 'null' || series === 'undefined' || series === '') ? null : series;
    }
    
    if (specs !== undefined) {
      updateData.specs = (specs === 'null' || specs === 'undefined' || specs === '') ? null : JSON.parse(specs);
    }

    if (price !== undefined) {
      updateData.price = (price === 'null' || price === 'undefined' || price === '') ? null : String(price);
    }

    // Upload new images if provided
    if (imageFiles && imageFiles.length > 0) {
      const uploadedUrls = [];
      
      for (let i = 0; i < imageFiles.length; i++) {
        const file = imageFiles[i];
        const fileExt = file.originalname.split('.').pop();
        const fileName = `${code}_${i + 1}.${fileExt}`;
        const filePath = `${fileName}`;

        const { error: storageError } = await supabase
          .storage
          .from(BUCKET_NAME)
          .upload(filePath, file.buffer, {
            contentType: file.mimetype,
            upsert: true
          });

        if (storageError) throw storageError;

        const { data: { publicUrl } } = supabase
          .storage
          .from(BUCKET_NAME)
          .getPublicUrl(filePath);
        
        uploadedUrls.push(publicUrl);
      }

      updateData.image = uploadedUrls[0];
      updateData.gallery = uploadedUrls;
    }

    const { data, error } = await supabase
      .from('building_material')
      .update(updateData)
      .eq('code', code)
      .select();

    if (error) throw error;

    if (data.length === 0) {
      return res.status(404).json({ status: 'error', message: 'Building material not found' });
    }

    res.status(200).json({
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

    const { data, error } = await supabase
      .from('building_material')
      .delete()
      .eq('code', code)
      .select();

    if (error) throw error;

    if (data.length === 0) {
      return res.status(404).json({ status: 'error', message: 'Building material not found' });
    }

    res.status(200).json({
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
    const { category, series } = req.query;
    let query = supabase.from('building_material').select('*');

    if (category) {
      query = query.eq('category', category);
    }
    if (series) {
      query = query.eq('series', series);
    }

    const { data, error } = await query;

    if (error) throw error;

    res.status(200).json({
      status: 'success',
      data,
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

    if (error) throw error;

    res.status(200).json({
      status: 'success',
      data,
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
    // Fetch categories with prefixes from the category table
    const { data: categoryData, error: categoryError } = await supabase
      .from('building_material_category')
      .select('category, prefix');

    if (categoryError) throw categoryError;

    // Fetch existing materials to get series
    const { data: materialData, error: materialError } = await supabase
      .from('building_material')
      .select('category, series');

    if (materialError) throw materialError;

    // Process series
    const seriesMap = {};
    materialData.forEach(item => {
      if (!seriesMap[item.category]) {
        seriesMap[item.category] = new Set();
      }
      if (item.series) {
        seriesMap[item.category].add(item.series);
      }
    });

    // Merge data
    const result = categoryData.map(cat => ({
      category: cat.category,
      prefix: cat.prefix,
      series: seriesMap[cat.category] ? Array.from(seriesMap[cat.category]) : []
    }));

    // Add any categories found in materials but not in category table
    const definedCategories = new Set(categoryData.map(c => c.category));
    Object.keys(seriesMap).forEach(catName => {
      if (!definedCategories.has(catName)) {
        result.push({
          category: catName,
          prefix: null,
          series: Array.from(seriesMap[catName])
        });
      }
    });

    res.status(200).json({
      status: 'success',
      data: result,
    });
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({
      status: 'error',
      message: error.message,
    });
  }
};

