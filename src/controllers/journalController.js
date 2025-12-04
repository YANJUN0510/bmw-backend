const supabase = require('../config/supabase');

const BUCKET_NAME = 'journals';

exports.getAllJournals = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('journals')
      .select('*')
      .order('date', { ascending: false });

    if (error) throw error;

    res.json({
      status: 'success',
      results: data.length,
      data: data,
    });
  } catch (error) {
    console.error('Error fetching journals:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
};

exports.getJournalById = async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from('journals')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ status: 'error', message: 'Journal not found' });
      }
      throw error;
    }

    res.json({
      status: 'success',
      data: data,
    });
  } catch (error) {
    console.error('Error fetching journal:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
};

exports.createJournal = async (req, res) => {
  try {
    const { title, excerpt, category, date, content, featured } = req.body;
    const file = req.file;

    let imageUrl = null;

    if (file) {
      const fileExt = file.originalname.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
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
      
      imageUrl = publicUrl;
    }

    // If this journal is set to be featured, unfeature others first
    if (featured === 'true' || featured === true) {
      await supabase
        .from('journals')
        .update({ featured: false })
        .neq('id', -1); // Update all
    }

    const { data, error } = await supabase
      .from('journals')
      .insert([
        {
          title,
          excerpt,
          category,
          date,
          content,
          image: imageUrl,
          featured: featured === 'true' || featured === true,
        },
      ])
      .select();

    if (error) throw error;

    res.status(201).json({
      status: 'success',
      message: 'Journal created successfully',
      data: data[0],
    });

  } catch (error) {
    console.error('Error creating journal:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
};

exports.updateJournal = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, excerpt, category, date, content, featured } = req.body;
    const file = req.file;

    // Get current journal state to check if it was featured
    const { data: currentJournal } = await supabase
      .from('journals')
      .select('featured')
      .eq('id', id)
      .single();

    let updateData = {
      title,
      excerpt,
      category,
      date,
      content,
      featured: featured === 'true' || featured === true ? true : (featured === 'false' || featured === false ? false : undefined)
    };

    // Remove undefined keys
    Object.keys(updateData).forEach(key => updateData[key] === undefined && delete updateData[key]);

    if (file) {
      const fileExt = file.originalname.split('.').pop();
      const fileName = `${id}_${Date.now()}.${fileExt}`;
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
      
      updateData.image = publicUrl;
    }

    // If setting to featured, unfeature others
    if (updateData.featured) {
      await supabase
        .from('journals')
        .update({ featured: false })
        .neq('id', id);
    }

    const { data, error } = await supabase
      .from('journals')
      .update(updateData)
      .eq('id', id)
      .select();

    if (error) throw error;

    if (data.length === 0) {
      return res.status(404).json({ status: 'error', message: 'Journal not found' });
    }

    // If we just un-featured this journal, set the latest one to featured
    if (currentJournal?.featured && updateData.featured === false) {
      const { data: latestJournal } = await supabase
        .from('journals')
        .select('id')
        .neq('id', id) // Exclude the one we just updated
        .order('date', { ascending: false })
        .limit(1)
        .single();
      
      if (latestJournal) {
         await supabase
           .from('journals')
           .update({ featured: true })
           .eq('id', latestJournal.id);
      }
    }

    res.json({
      status: 'success',
      message: 'Journal updated successfully',
      data: data[0],
    });

  } catch (error) {
    console.error('Error updating journal:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
};

exports.deleteJournal = async (req, res) => {
  try {
    const { id } = req.params;

    // Get journal to find image path and check if featured
    const { data: journal, error: fetchError } = await supabase
      .from('journals')
      .select('image, featured')
      .eq('id', id)
      .single();

    if (fetchError) {
       if (fetchError.code === 'PGRST116') {
            return res.status(404).json({ status: 'error', message: 'Journal not found' });
       }
       throw fetchError;
    }

    const { error: deleteError } = await supabase
      .from('journals')
      .delete()
      .eq('id', id);

    if (deleteError) throw deleteError;

    // Delete image from Storage
    if (journal && journal.image) {
        const urlParts = journal.image.split('/');
        const fileName = urlParts[urlParts.length - 1];
        
        const { error: storageError } = await supabase
            .storage
            .from(BUCKET_NAME)
            .remove([fileName]);
            
        if (storageError) {
            console.warn('Failed to delete image from storage:', storageError);
        }
    }

    // If the deleted journal was featured, set the latest one as featured
    if (journal.featured) {
      const { data: latestJournal } = await supabase
        .from('journals')
        .select('id')
        .order('date', { ascending: false })
        .limit(1)
        .single();
      
      if (latestJournal) {
         await supabase
           .from('journals')
           .update({ featured: true })
           .eq('id', latestJournal.id);
      }
    }

    res.json({
      status: 'success',
      message: 'Journal deleted successfully',
    });

  } catch (error) {
    console.error('Error deleting journal:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
};

exports.setFeatured = async (req, res) => {
  try {
    const { id } = req.params;

    // 1. Set all to false
    const { error: resetError } = await supabase
      .from('journals')
      .update({ featured: false })
      .neq('id', -1); // Update all rows

    if (resetError) throw resetError;

    // 2. Set selected to true
    const { data, error: updateError } = await supabase
      .from('journals')
      .update({ featured: true })
      .eq('id', id)
      .select();

    if (updateError) throw updateError;

    if (data.length === 0) {
      return res.status(404).json({ status: 'error', message: 'Journal not found' });
    }

    res.json({
      status: 'success',
      message: 'Journal set as featured',
      data: data[0],
    });

  } catch (error) {
    console.error('Error setting featured journal:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
};

exports.getAllCategories = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('journals')
      .select('category');

    if (error) throw error;

    // Extract unique categories
    const categories = [...new Set(data.map(item => item.category))];

    res.json({
      status: 'success',
      results: categories.length,
      data: categories,
    });
  } catch (error) {
    console.error('Error fetching journal categories:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
};
