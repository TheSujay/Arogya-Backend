import Testimonial from '../models/Testimonial.js';
import { validationResult } from 'express-validator';
import fs from 'fs';
import { cloudinary } from '../config/cloudinary.js';
import { body } from 'express-validator';


export const validateTestimonial = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('quote').trim().notEmpty().withMessage('Quote is required'),
  body('role').trim().notEmpty().withMessage('Role is required'),
  body('rating').optional().isNumeric().withMessage('Rating must be a number'),
];

export const getAllTestimonials = async (req, res) => {
  try {
    const testimonials = await Testimonial.find().sort({ createdAt: -1 });
    res.json(testimonials);
  } catch {
    res.status(500).json({ error: 'Failed to fetch testimonials' });
  }
};

export const getTestimonialById = async (req, res) => {
  try {
    const testimonial = await Testimonial.findById(req.params.id);
    if (!testimonial) return res.status(404).json({ error: 'Not found' });
    res.json(testimonial);
  } catch {
    res.status(500).json({ error: 'Failed to fetch testimonial' });
  }
};

export const createTestimonial = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { name, quote, role, rating } = req.body;

    const testimonial = new Testimonial({
  name,
  quote,
  role,
  rating,
  avatar: req.file?.path,
  avatarPublicId: req.file?.filename,
});


    const saved = await testimonial.save();
    res.status(201).json(saved);
  } catch {
    res.status(500).json({ error: 'Failed to save testimonial' });
  }
};

export const updateTestimonial = async (req, res) => {
  try {
    const testimonial = await Testimonial.findById(req.params.id);
    if (!testimonial) return res.status(404).json({ error: 'Not found' });

    // If a new avatar is uploaded
    if (req.file) {
      // Delete old avatar
      if (testimonial.avatarPublicId) {
        await cloudinary.uploader.destroy(testimonial.avatarPublicId);
      }

      // Set new avatar values
      testimonial.avatar = req.file.path;
      testimonial.avatarPublicId = req.file.filename;
    }

    // Update fields from body
    testimonial.name = req.body.name || testimonial.name;
    testimonial.quote = req.body.quote || testimonial.quote;
    testimonial.role = req.body.role || testimonial.role;
    testimonial.rating = req.body.rating || testimonial.rating;

    const updated = await testimonial.save();
    res.json(updated);
  } catch {
    res.status(500).json({ error: 'Failed to update testimonial' });
  }
};

export const deleteAvatarOnly = async (req, res) => {
  try {
    const testimonial = await Testimonial.findById(req.params.id);

    if (!testimonial) {
      return res.status(404).json({ error: 'Testimonial not found' });
    }

    if (!testimonial.avatarPublicId) {
      return res.status(400).json({ error: 'No avatar to delete' });
    }

    // Delete avatar from Cloudinary
    await cloudinary.uploader.destroy(testimonial.avatarPublicId);

    // Clear avatar fields in the DB
    testimonial.avatar = undefined;
    testimonial.avatarPublicId = undefined;
    await testimonial.save();

    res.json({ message: 'Avatar deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete avatar' });
  }
};


export const deleteTestimonial = async (req, res) => {
  try {
    const testimonial = await Testimonial.findByIdAndDelete(req.params.id);

    if (!testimonial) return res.status(404).json({ error: 'Not found' });

    // Delete avatar from Cloudinary if it exists
    if (testimonial.avatarPublicId) {
      await cloudinary.uploader.destroy(testimonial.avatarPublicId);
    }

    res.json({ message: 'Deleted successfully' });
  } catch {
    res.status(500).json({ error: 'Failed to delete testimonial' });
  }
};

