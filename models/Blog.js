import mongoose from "mongoose";

const blogSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    content: { type: String, required: true },
    image: { type: String, required: true },
    date: {
    type: String, // or Date if you're using ISO date format
    required: true},
    authorName: { type: String, required: true },
    authorAvatar: { type: String, required: true }, // URL (Cloudinary or fallback)
    authorBio: { type: String }, // Optional
    imagePublicId: { type: String },
  },
  { timestamps: true }
);

export default mongoose.model("Blog", blogSchema);
