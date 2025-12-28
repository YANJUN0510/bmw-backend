const supabase = require('../config/supabase');

const BUCKET_NAME = 'building-materials';

exports.getAllSeries = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('building_material_series')
      .select('*')
      .order('id', { ascending: true });

    if (error) throw error;

    res.json({ status: 'success', data });
  } catch (error) {
    console.error('Error fetching building material series:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
};

exports.getSeriesById = async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from('building_material_series')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;

    res.json({ status: 'success', data });
  } catch (error) {
    console.error('Error fetching building material series:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
};

exports.createSeries = async (req, res) => {
  try {
    const { name } = req.body;
    const pdfFile = req.file;

    if (!name) {
      return res.status(400).json({ status: 'error', message: 'Name is required' });
    }
    if (!pdfFile) {
      return res.status(400).json({ status: 'error', message: 'PDF file is required' });
    }

    const fileExt = pdfFile.originalname.split('.').pop();
    const safeName = name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const fileName = `series_${safeName}_${Date.now()}.${fileExt}`;
    const filePath = `series/${fileName}`;

    const { error: storageError } = await supabase
      .storage
      .from(BUCKET_NAME)
      .upload(filePath, pdfFile.buffer, {
        contentType: pdfFile.mimetype,
        upsert: true
      });

    if (storageError) throw storageError;

    const { data: { publicUrl } } = supabase
      .storage
      .from(BUCKET_NAME)
      .getPublicUrl(filePath);

    const { data, error } = await supabase
      .from('building_material_series')
      .insert([{ name, pdf: publicUrl }])
      .select();

    if (error) throw error;

    res.status(201).json({ status: 'success', data: data[0] });
  } catch (error) {
    console.error('Error creating building material series:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
};

exports.updateSeries = async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    const pdfFile = req.file;

    const updates = {};
    if (name) updates.name = name;

    if (pdfFile) {
      const fileExt = pdfFile.originalname.split('.').pop();
      const safeName = (name || 'updated').replace(/[^a-z0-9]/gi, '_').toLowerCase();
      const fileName = `series_${safeName}_${Date.now()}.${fileExt}`;
      const filePath = `series/${fileName}`;

      const { error: storageError } = await supabase
        .storage
        .from(BUCKET_NAME)
        .upload(filePath, pdfFile.buffer, {
          contentType: pdfFile.mimetype,
          upsert: true
        });

      if (storageError) throw storageError;

      const { data: { publicUrl } } = supabase
        .storage
        .from(BUCKET_NAME)
        .getPublicUrl(filePath);

      updates.pdf = publicUrl;
    }

    const { data, error } = await supabase
      .from('building_material_series')
      .update(updates)
      .eq('id', id)
      .select();

    if (error) throw error;

    if (data.length === 0) {
      return res.status(404).json({ status: 'error', message: 'Series not found' });
    }

    res.json({ status: 'success', data: data[0] });
  } catch (error) {
    console.error('Error updating building material series:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
};

exports.deleteSeries = async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('building_material_series')
      .delete()
      .eq('id', id);

    if (error) throw error;

    res.json({ status: 'success', message: 'Series deleted successfully' });
  } catch (error) {
    console.error('Error deleting building material series:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
};
