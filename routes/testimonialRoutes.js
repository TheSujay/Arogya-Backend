import express from 'express';
import Testimonial from '../models/Testimonial.js';
import { validateTestimonial, updateTestimonial, deleteAvatarOnly } from '../controllers/testimonialController.js';
import upload from '../middleware/multer.js';
const router = express.Router();

// Get all testimonials
router.get('/', async (req, res) => {
  try {
    const testimonials = await Testimonial.find();
    res.json(testimonials);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch testimonials' });
  }
});

// Bulk replace all testimonials
router.post('/', async (req, res) => {
  const testimonials = req.body;

  if (!Array.isArray(testimonials)) {
    return res.status(400).json({ error: 'Expected an array of testimonials' });
  }

  try {
    await Testimonial.deleteMany({});
    await Testimonial.insertMany(testimonials);
    res.json({ message: 'Testimonials updated' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to save testimonials' });
  }
});

// Optional: delete a specific testimonial by ID
router.delete('/:id', async (req, res) => {
  try {
    await Testimonial.findByIdAndDelete(req.params.id);
    res.json({ message: 'Testimonial deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete testimonial' });
  }
});

router.delete('/:id/avatar', deleteAvatarOnly);

router.put('/:id', upload.single('avatar'), validateTestimonial, updateTestimonial);


export default router;
