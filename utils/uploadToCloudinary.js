// utils/uploadToCloudinary.js
import { cloudinary } from '../config/cloudinary.js';
import streamifier from 'streamifier';

export const uploadPDFBuffer = (buffer, publicId = '') => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        resource_type: 'raw',
        public_id: `pdfs/${publicId}`,
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );

    streamifier.createReadStream(buffer).pipe(stream);
  });
};
