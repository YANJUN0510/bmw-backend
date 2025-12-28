const supabase = require('../config/supabase');

const BUCKET_NAME = 'building-materials';

exports.getAllCategories = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('building_material_category')
      .select('*')
      .order('id', { ascending: true });

    if (error) throw error;

    res.json({ status: 'success', data });
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
};

exports.getCategoryById = async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from('building_material_category')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;

    res.json({ status: 'success', data });
  } catch (error) {
    console.error('Error fetching category:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
};

exports.createCategory = async (req, res) => {
  try {
    const { category, description, prefix } = req.body;
    const imageFile = req.file;

    if (!category || !description) {
      return res.status(400).json({ status: 'error', message: 'Category and description are required' });
    }
    if (!imageFile) {
      return res.status(400).json({ status: 'error', message: 'Image file is required' });
    }

    // Upload Image
    const fileExt = imageFile.originalname.split('.').pop();
    const safeName = category.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const fileName = `category_${safeName}_${Date.now()}.${fileExt}`;
    const filePath = `categories/${fileName}`;

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

    // Insert DB
    const { data, error } = await supabase
      .from('building_material_category')
      .insert([{ category, description, prefix, image: publicUrl }])
      .select();

    if (error) throw error;

    res.status(201).json({ status: 'success', data: data[0] });
  } catch (error) {
    console.error('Error creating category:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
};

exports.updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { category, description, prefix } = req.body;
    const imageFile = req.file;

    const updates = {};
    if (category) updates.category = category;
    if (description) updates.description = description;
    if (prefix) updates.prefix = prefix;

    if (imageFile) {
      const fileExt = imageFile.originalname.split('.').pop();
      const safeName = (category || 'updated').replace(/[^a-z0-9]/gi, '_').toLowerCase();
      const fileName = `category_${safeName}_${Date.now()}.${fileExt}`;
      const filePath = `categories/${fileName}`;

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
      
      updates.image = publicUrl;
    }

    const { data, error } = await supabase
      .from('building_material_category')
      .update(updates)
      .eq('id', id)
      .select();

    if (error) throw error;

    res.json({ status: 'success', data: data[0] });
  } catch (error) {
    console.error('Error updating category:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
};

exports.deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('building_material_category')
      .delete()
      .eq('id', id);

    if (error) throw error;

    res.json({ status: 'success', message: 'Category deleted successfully' });
  } catch (error) {
    console.error('Error deleting category:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
};
