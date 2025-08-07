import mongoose from 'mongoose';

// Subschema for comments
const commentSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  username: { type: String, required: true },
  comment: { type: String, required: true },
  loves: { type: Number, default: 0 },
  lovedBy: { type: [String], default: [] },
  createdAt: { type: Date, default: Date.now },
}, { _id: true }); // Enable auto _id

// Main Reel schema
const reelSchema = new mongoose.Schema(
  {
    title: { type: String, default: '' },
    videoUrl: { type: String, required: true },
    thumbnailUrl: { type: String, required: true },
    publicId: { type: String, default: '' },

    likes: { type: Number, default: 0 },
    likedBy: { type: [String], default: [] },
    savedBy: { type: [String], default: [] },

    comments: [commentSchema],

    views: { type: Number, default: 0 },
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export default mongoose.model('Reel', reelSchema);
