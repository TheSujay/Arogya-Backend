// routes/pdfUploadRoute.js
import express from 'express';
import upload from '../middleware/multer.js';
import { uploadPDFBuffer } from '../utils/uploadToCloudinary.js';
import { connectCloudinary } from '../config/cloudinary.js';

const router = express.Router();

router.post('/upload-pdf', upload.single('file'), async (req, res) => {
  try {
    connectCloudinary(); // Setup Cloudinary config

    const fileBuffer = req.file.buffer;
    const originalName = req.file.originalname.replace(/\.[^/.]+$/, '');

    const result = await uploadPDFBuffer(fileBuffer, originalName);

    res.json({
      message: 'Uploaded successfully!',
      url: result.secure_url,
      public_id: result.public_id,
    });
  } catch (err) {
    console.error('Upload failed:', err);
    res.status(500).json({ error: 'Upload failed' });
  }
});

export default router;
