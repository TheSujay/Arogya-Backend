import mongoose from 'mongoose';

const announcementSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  date: { type: String, required: true },
}, { timestamps: true });

export default mongoose.models.Announcement || mongoose.model("Announcement", announcementSchema);
