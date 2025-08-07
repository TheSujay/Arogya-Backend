// middleware/videoUpload.js
import multer from 'multer';

// This memory storage lets us access req.file.buffer
const storage = multer.memoryStorage();

const videoUpload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // optional: 100MB limit
});

export default videoUpload;
