import express from 'express';
import Faq from '../models/Faq.js';

const router = express.Router();

router.get('/', async (req, res) => {
  const faqs = await Faq.find();
  res.json(faqs);
});

router.post('/', async (req, res) => {
  const faqs = req.body;

  if (!Array.isArray(faqs)) {
    return res.status(400).json({ error: 'Expected an array of FAQs' });
  }

  try {
    await Faq.deleteMany({});
    await Faq.insertMany(faqs);
    res.json({ message: 'FAQs updated' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to save FAQs' });
  }
});


router.delete('/:id', async (req, res) => {
  await Faq.findByIdAndDelete(req.params.id);
  res.json({ message: 'FAQ deleted' });
});

export default router;
