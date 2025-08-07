import express from 'express';
import Feature from '../models/Feature.js';

const router = express.Router();

// GET /api/features
// GET all features
router.get('/', async (req, res) => {
  try {
    const features = await Feature.find();
    res.json(features);
  } catch (err) {
    console.error('❌ Error fetching features:', err.message);
    res.status(500).json({ error: 'Failed to fetch features' });
  }
});

// POST: replace all features
router.post('/', async (req, res) => {
  const features = req.body;

  if (!Array.isArray(features)) {
    return res.status(400).json({ error: 'Expected an array of features' });
  }

  try {
    await Feature.deleteMany({});
    await Feature.insertMany(features);
    res.json({ message: 'Features updated successfully' });
  } catch (err) {
    console.error('❌ Error saving features:', err.message);
    res.status(500).json({ error: 'Failed to save features' });
  }
});

// DELETE: single feature by ID
router.delete('/:id', async (req, res) => {
  try {
    const feature = await Feature.findByIdAndDelete(req.params.id);
    if (!feature) return res.status(404).json({ error: 'Feature not found' });

    res.json({ message: 'Feature deleted successfully' });
  } catch (err) {
    console.error('❌ Failed to delete feature:', err.message);
    res.status(500).json({ error: 'Failed to delete feature' });
  }
});

export default router;
