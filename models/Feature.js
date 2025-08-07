import mongoose from 'mongoose';

const featureSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  icon: { type: String },
}, { timestamps: true });

export default mongoose.models.Feature || mongoose.model("Feature", featureSchema);
