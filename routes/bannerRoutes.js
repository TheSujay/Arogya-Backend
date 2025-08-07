import express from 'express';
import Banner from '../models/Banner.js';

const router = express.Router();

// GET /api/banners - Always return as an array
router.get('/', async (req, res) => {
  try {
    const banners = await Banner.find();
    res.json(banners); // Always return an array
  } catch (err) {
    console.error('❌ Banner fetch error:', err.message);
    res.status(500).json({ error: 'Failed to fetch banners' });
  }
});

// POST /api/banners - Replace all banners
router.post('/', async (req, res) => {
  const banners = req.body;

  if (!Array.isArray(banners) || banners.length === 0) {
    return res.status(400).json({ error: 'No banners provided' });
  }

  // Optional: validate required fields for each banner
  for (const b of banners) {
    const { title, subtitle, ctaText, ctaLink, backgroundValue } = b;
    if (!title || !subtitle || !ctaText || !ctaLink || !backgroundValue) {
      return res.status(400).json({ error: 'All banner fields are required' });
    }
  }

  try {
    await Banner.deleteMany(); // Clean old banners
    const saved = await Banner.insertMany(banners);
    res.json(saved); // Return saved banners
  } catch (err) {
    console.error('❌ Banner save error:', err.message);
    res.status(500).json({ error: 'Failed to save banners' });
  }
});

// DELETE /api/banners/:id - Delete a single banner by ID
router.delete('/:id', async (req, res) => {
  console.log('DELETE /api/banners/:id', req.params.id); // Debug log

  try {
    const banner = await Banner.findByIdAndDelete(req.params.id);
    if (!banner) {
      return res.status(404).json({ error: 'Banner not found' });
    }
    res.json({ message: 'Banner deleted successfully' });
  } catch (err) {
    console.error('❌ Failed to delete banner:', err.message);
    res.status(500).json({ error: 'Failed to delete banner' });
  }
});


export default router;
