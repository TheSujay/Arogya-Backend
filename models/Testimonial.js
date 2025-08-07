import mongoose from 'mongoose';


const testimonialSchema = new mongoose.Schema({
  name: { type: String, required: true },
  quote: { type: String, required: true },
  role : { type: String, required: true }, // e.g. "Product Designer"
  image: { type: String }, // optional image URL
   rating: { type: Number, min: 1, max: 5 }, // ✅ Add this
  avatar: { type: String },
avatarPublicId: { type: String },
}, { timestamps: true });

export default mongoose.model("Testimonial", testimonialSchema);
