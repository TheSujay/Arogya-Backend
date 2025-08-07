import express from 'express';
import multer from 'multer';
import { Readable } from 'stream';
import { cloudinary } from '../config/cloudinary.js';

const router = express.Router();
const upload = multer();

function streamUpload(buffer, folder = 'reels/videos') {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { resource_type: 'video', folder },
      (err, result) => (err ? reject(err) : resolve(result))
    );
    Readable.from(buffer).pipe(stream);
  });
}

router.post('/file', upload.single('file'), async (req, res) => {
  try {
    const result = await streamUpload(req.file.buffer);
    const thumbnail = cloudinary.url(`${result.public_id}.jpg`, {
      resource_type: 'video',
      width: 480,
      height: 270,
      crop: 'fill',
    });

    res.json({
      url: result.secure_url,
      thumbnail,
      publicId: result.public_id, // ⬅️ Added for deletion
    });
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ error: 'Upload failed' });
  }
});

export default router;
