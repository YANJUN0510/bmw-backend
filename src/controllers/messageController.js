const supabase = require('../config/supabase');

const BUCKET_NAME = 'attachments';

exports.createMessage = async (req, res) => {
  try {
    const { email, phone, subject, message } = req.body;
    
    // Handle multiple files
    const files = req.files || [];
    const attachmentUrls = [];

    // Upload attachments if any
    if (files.length > 0) {
      for (const file of files) {
        const fileExt = file.originalname.split('.').pop();
        // Create a unique file name: timestamp_random_filename
        const uniquePrefix = `${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
        const fileName = `${uniquePrefix}_${file.originalname}`;
        const filePath = `${fileName}`;

        const { error: storageError } = await supabase
          .storage
          .from(BUCKET_NAME)
          .upload(filePath, file.buffer, {
            contentType: file.mimetype,
            upsert: false
          });

        if (storageError) throw storageError;

        const { data: { publicUrl } } = supabase
          .storage
          .from(BUCKET_NAME)
          .getPublicUrl(filePath);
        
        attachmentUrls.push(publicUrl);
      }
    }

    // Insert into Database
    const { data, error } = await supabase
      .from('messages')
      .insert([
        {
          email,
          phone,
          subject,
          message,
          attachments: attachmentUrls.length > 0 ? attachmentUrls : null,
        },
      ])
      .select();

    if (error) {
      throw error;
    }

    res.status(201).json({
      status: 'success',
      message: 'Message sent successfully',
      data: data[0],
    });

  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({
      status: 'error',
      message: error.message,
    });
  }
};

exports.getAllMessages = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json({
      status: 'success',
      results: data.length,
      data: data,
    });
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({
      status: 'error',
      message: error.message,
    });
  }
};

exports.getMessageById = async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ status: 'error', message: 'Message not found' });
      }
      throw error;
    }

    res.json({
      status: 'success',
      data: data,
    });
  } catch (error) {
    console.error('Error fetching message:', error);
    res.status(500).json({
      status: 'error',
      message: error.message,
    });
  }
};

exports.getMessagesByEmail = async (req, res) => {
  try {
    const { email } = req.params;
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('email', email)
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json({
      status: 'success',
      results: data.length,
      data: data,
    });
  } catch (error) {
    console.error('Error fetching messages by email:', error);
    res.status(500).json({
      status: 'error',
      message: error.message,
    });
  }
};

exports.getMessagesByPhone = async (req, res) => {
  try {
    const { phone } = req.params;
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('phone', phone)
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json({
      status: 'success',
      results: data.length,
      data: data,
    });
  } catch (error) {
    console.error('Error fetching messages by phone:', error);
    res.status(500).json({
      status: 'error',
      message: error.message,
    });
  }
};
