const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const sharp = require('sharp');
const pdf2pic = require('pdf2pic');
const mammoth = require('mammoth');

// Configure multer for file upload
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads');
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    'image/jpeg',
    'image/png', 
    'image/gif',
    'image/webp',
    'application/pdf',
    'text/plain',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only images, PDFs, text files, and Word documents are allowed.'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// Extract text content from different file types
const extractFileContent = async (filePath, mimeType) => {
  try {
    switch (mimeType) {
      case 'text/plain':
        return await fs.readFile(filePath, 'utf8');
        
      case 'application/pdf':
        // For PDF files, we'll extract text using a PDF library
        // This is a simplified version - you might want to use pdf-parse or similar
        return 'PDF file uploaded - content extraction would require additional PDF parsing library';
        
      case 'application/msword':
      case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
        try {
          const result = await mammoth.extractRawText({ path: filePath });
          return result.value;
        } catch (error) {
          return 'Word document uploaded - content extraction failed';
        }
        
      case 'image/jpeg':
      case 'image/png':
      case 'image/gif':
      case 'image/webp':
        // For images, we'll describe what was uploaded
        return `Image file uploaded: ${path.basename(filePath)}`;
        
      default:
        return 'File uploaded successfully';
    }
  } catch (error) {
    console.error('Error extracting file content:', error);
    return 'File uploaded but content could not be extracted';
  }
};

// Handle file upload
exports.uploadFile = upload.single('file');

exports.handleFileUpload = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        status: 'error',
        message: 'No file uploaded'
      });
    }

    const { filename, originalname, mimetype, size, path: filePath } = req.file;
    
    // Extract content from the file
    const content = await extractFileContent(filePath, mimetype);
    
    // Generate URL for the uploaded file
    const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
    const fileUrl = `${baseUrl}/uploads/${filename}`;
    
    console.log('File uploaded successfully:', {
      originalName: originalname,
      filename: filename,
      fileUrl: fileUrl,
      contentLength: content.length
    });
    
    console.log('File uploaded successfully:', {
      originalName: originalname,
      filename: filename,
      fileUrl: fileUrl,
      contentLength: content.length
    });

    res.json({
      status: 'success',
      message: 'File uploaded successfully',
      file: {
        name: originalname,
        type: mimetype,
        size: size,
        url: fileUrl,
        content: content
      }
    });

  } catch (error) {
    console.error('Error handling file upload:', error);
    res.status(500).json({
      status: 'error',
      message: error.message || 'File upload failed'
    });
  }
};

// Clean up old files (optional - can be called periodically)
exports.cleanupOldFiles = async (req, res) => {
  try {
    const uploadDir = path.join(__dirname, '../../uploads');
    const files = await fs.readdir(uploadDir);
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours

    for (const file of files) {
      const filePath = path.join(uploadDir, file);
      const stats = await fs.stat(filePath);
      
      if (now - stats.mtime.getTime() > maxAge) {
        await fs.unlink(filePath);
        console.log(`Deleted old file: ${file}`);
      }
    }

    res.json({
      status: 'success',
      message: 'Cleanup completed'
    });

  } catch (error) {
    console.error('Error during cleanup:', error);
    res.status(500).json({
      status: 'error',
      message: error.message || 'Cleanup failed'
    });
  }
};