const supabase = require('../config/supabase');

const BUCKET_NAME = 'building-materials';

exports.uploadBuildingMaterial = async (req, res) => {
  try {
    const { code, category, series, description, specs } = req.body;
    const imageFile = req.file;

    if (!imageFile) {
      return res.status(400).json({ status: 'error', message: 'Image file is required' });
    }

    // 1. Upload image
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

    // Get Public URL
    const { data: { publicUrl } } = supabase
      .storage
      .from(BUCKET_NAME)
      .getPublicUrl(filePath);

    // 2. Insert into Database
    const { data, error } = await supabase
      .from('building_material')
      .insert([
        {
          code,
          category,
          series,
          image: publicUrl,
          description,
          specs: specs ? JSON.parse(specs) : null,
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
    const { category, series, description, specs } = req.body;
    const imageFile = req.file;

    let imageUrl;

    // 1. Upload new image if provided
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

      if (storageError) throw storageError;

      const { data: { publicUrl } } = supabase
        .storage
        .from(BUCKET_NAME)
        .getPublicUrl(filePath);
      
      imageUrl = publicUrl;
    }

    // 2. Update Database
    const updateData = {
      category,
      series,
      description,
      specs: specs ? JSON.parse(specs) : undefined,
    };

    if (imageUrl) {
      updateData.image = imageUrl;
    }

    // Remove undefined keys
    Object.keys(updateData).forEach(key => updateData[key] === undefined && delete updateData[key]);

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

    // 1. Get the image path to delete from storage (optional, but good practice)
    // For simplicity, we might skip deleting from storage if we don't know the exact extension, 
    // or we can try to list files with the prefix `code.`
    
    // 2. Delete from Database
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
    const { data, error } = await supabase
      .from('building_material')
      .select('category, series');

    if (error) throw error;

    // Process data to group series by category
    const categories = {};
    data.forEach(item => {
      if (!categories[item.category]) {
        categories[item.category] = new Set();
      }
      if (item.series) {
        categories[item.category].add(item.series);
      }
    });

    const result = Object.keys(categories).map(category => ({
      category,
      series: Array.from(categories[category])
    }));

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
