import Reel from "../models/Reel.js";
import { io } from "../server.js";
import { cloudinary } from "../config/cloudinary.js";

// GET all reels
export const getReels = async (req, res) => {
  try {
    const reels = await Reel.find().sort({ order: 1 });
    res.json(reels);
  } catch (err) {
    console.error("❌ Get reels error:", err);
    res.status(500).json({ error: "Failed to fetch reels" });
  }
};

// DELETE a reel
export const deleteReel = async (req, res) => {
  const { id } = req.params;

  try {
    const reel = await Reel.findById(id);
    if (!reel) return res.status(404).json({ error: "Reel not found" });

    res.json({ success: true }); // Respond early

    await Reel.findByIdAndDelete(id);

    if (reel.publicId) {
      cloudinary.uploader.destroy(reel.publicId, {
        resource_type: "video",
      }).then(result => {
        console.log("✅ Cloudinary deleted:", result);
      }).catch(err => {
        console.warn("⚠️ Cloudinary deletion failed:", err.message);
      });
    }
  } catch (err) {
    console.error("❌ Delete reel error:", err.message);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// CREATE reel
export const createReel = async (req, res) => {
  const { title = '', videoUrl, thumbnailUrl, publicId = '' } = req.body;

  if (!videoUrl || !thumbnailUrl) {
    return res.status(400).json({ error: "Video URL and thumbnail are required" });
  }

  try {
    const newReel = new Reel({ title, videoUrl, thumbnailUrl, publicId });
    await newReel.save();
    res.status(201).json(newReel);
  } catch (err) {
    console.error("❌ Create reel error:", err.message);
    res.status(500).json({ error: "Failed to create reel" });
  }
};

// LIKE/UNLIKE reel
export const likeReel = async (req, res) => {
  try {
    const { id } = req.params; // 🔧 Fixed from reelId
    const { userId } = req.body;

    const reel = await Reel.findById(id);
    if (!reel) return res.status(404).json({ message: "Reel not found" });

    const hasLiked = reel.likedBy.includes(userId);

    const update = hasLiked
      ? { $inc: { likes: -1 }, $pull: { likedBy: userId } }
      : { $inc: { likes: 1 }, $addToSet: { likedBy: userId } };

    const updatedReel = await Reel.findByIdAndUpdate(id, update, { new: true });

    req.io?.emit("reel:updated", updatedReel);
    res.status(200).json(updatedReel);
  } catch (err) {
    console.error("❌ Like reel error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// SAVE/UNSAVE reel
export const saveReel = async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.body;

    const reel = await Reel.findById(id);
    if (!reel) return res.status(404).json({ message: "Reel not found" });

    if (reel.savedBy.includes(userId)) {
      reel.savedBy = reel.savedBy.filter(uid => uid !== userId);
    } else {
      reel.savedBy.push(userId);
    }

    await reel.save();
    req.io?.emit("reel:updated", reel);
    res.json(reel);
  } catch (err) {
    console.error("❌ Save reel error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ADD comment
export const addComment = async (req, res) => {
  try {
    const { id } = req.params;
    const { userId, username, comment } = req.body;

    const reel = await Reel.findById(id);
    if (!reel) return res.status(404).json({ message: "Reel not found" });

    const newComment = { userId, username, comment };
    reel.comments.push(newComment);
    await reel.save();

    io.emit("reel:updated", reel);
    res.json(newComment);
  } catch (err) {
    console.error("❌ Add comment error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// REORDER reels
export const reorderReels = async (req, res) => {
  try {
    const updates = req.body;

    const bulkOps = updates.map(({ _id, order }) => ({
      updateOne: {
        filter: { _id },
        update: { $set: { order } },
      },
    }));

    await Reel.bulkWrite(bulkOps);
    res.json({ message: "Reels reordered successfully" });
  } catch (err) {
    console.error("❌ Reorder error:", err);
    res.status(500).json({ error: "Failed to reorder reels" });
  }
};

// LOVE/UNLOVE comment
export const loveComment = async (req, res) => {
  try {
    const { reelId, commentId } = req.params;
    const { userId } = req.body;

    const reel = await Reel.findById(reelId);
    if (!reel) return res.status(404).json({ message: "Reel not found" });

    const c = reel.comments.id(commentId);
    if (!c) return res.status(404).json({ message: "Comment not found" });

    if (c.lovedBy.includes(userId)) {
      c.lovedBy = c.lovedBy.filter(uid => uid !== userId);
      c.loves--;
    } else {
      c.lovedBy.push(userId);
      c.loves++;
    }

    await reel.save();
    io.emit("reel:commentLoved", { reelId, commentId, loves: c.loves });
    res.json({ commentId, loves: c.loves });
  } catch (err) {
    console.error("❌ Love comment error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// EDIT comment
export const editComment = async (req, res) => {
  try {
    const { reelId, commentId } = req.params;
    const { userId, comment: newText } = req.body;

    const reel = await Reel.findById(reelId);
    const c = reel?.comments.id(commentId);

    if (!c) return res.status(404).json({ error: "Comment not found" });
    if (c.userId !== userId) return res.status(403).json({ error: "Not allowed" });

    c.comment = newText;
    await reel.save();

    io.emit("reel:commentEdited", { reelId, commentId, comment: newText });
    res.json({ commentId, comment: newText });
  } catch (err) {
    console.error("❌ Edit comment error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// DELETE comment
export const deleteComment = async (req, res) => {
  try {
    const { reelId, commentId } = req.params;
    const { userId } = req.body;

    const reel = await Reel.findById(reelId);
    if (!reel) return res.status(404).json({ message: "Reel not found" });

    const commentIndex = reel.comments.findIndex(c => c._id.toString() === commentId);
    if (commentIndex === -1) return res.status(404).json({ message: "Comment not found" });

    const comment = reel.comments[commentIndex];
    if (comment.userId !== userId) {
      return res.status(403).json({ message: "Not authorized" });
    }

    reel.comments.splice(commentIndex, 1);
    await reel.save();

    req.io?.emit("reel:commentDeleted", { reelId, commentId });
    res.json({ message: "Comment deleted" });
  } catch (err) {
    console.error("❌ Delete comment error:", err);
    res.status(500).json({ message: "Server error" });
  }
};
