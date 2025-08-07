// middleware/multer.js
import multer from 'multer';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import { cloudinary } from '../config/cloudinary.js';

const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'doctor-signatures',
    allowed_formats: ['jpg', 'jpeg', 'png','mp4', 'mov', 'avi', 'webm'],
    public_id: (req, file) => `signature-${Date.now()}-${file.originalname}`,
  },
});

const upload = multer({ storage });

export default upload;
