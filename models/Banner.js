// models/Banner.js
import mongoose from 'mongoose';

const bannerSchema = new mongoose.Schema({
  title: { type: String, required: true },
  subtitle: { type: String, required: true },
  ctaText: { type: String, required: true },
  ctaLink: { type: String, required: true },
  backgroundType: { type: String, enum: ['gradient', 'image'], default: 'gradient' },
  backgroundValue: { type: String, required: true }, // URL or gradient class
  imageAlt: { type: String, default: 'Banner' },
}, { timestamps: true });

export default mongoose.models.Banner || mongoose.model('Banner', bannerSchema);
