import express from 'express';
import Announcement from '../models/Announcement.js';

const router = express.Router();

// GET /api/announcements
// GET /api/announcements
router.get('/', async (req, res) => {
  try {
    const announcements = await Announcement.find();
    res.json(announcements);
  } catch (err) {
    console.error('❌ Error fetching announcements:', err.message);
    res.status(500).json({ error: 'Failed to fetch announcements' });
  }
});

// POST /api/announcements (replace all)
router.post('/', async (req, res) => {
  const announcements = req.body;

  if (!Array.isArray(announcements)) {
    return res.status(400).json({ error: 'Expected an array of announcements' });
  }

  try {
    await Announcement.deleteMany({});
    await Announcement.insertMany(announcements);
    res.json({ message: 'Announcements updated successfully' });
  } catch (err) {
    console.error('❌ Error saving announcements:', err.message);
    res.status(500).json({ error: 'Failed to save announcements' });
  }
});

// DELETE /api/announcements/:id
router.delete('/:id', async (req, res) => {
  try {
    const announcement = await Announcement.findByIdAndDelete(req.params.id);
    if (!announcement) {
      return res.status(404).json({ error: 'Announcement not found' });
    }
    res.json({ message: 'Announcement deleted successfully' });
  } catch (err) {
    console.error('❌ Failed to delete announcement:', err.message);
    res.status(500).json({ error: 'Failed to delete announcement' });
  }
});

export default router;
