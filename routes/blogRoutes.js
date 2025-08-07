import express from "express";
import upload from "../middleware/multer.js";
import {
  getAllBlogs,
  getBlogById,
  createBlogs,
  updateBlog,
  deleteBlog,
  validateBlog,
} from "../controllers/blogController.js";

const router = express.Router();

// Get
router.get("/", getAllBlogs);
router.get("/:id", getBlogById);

// Create bulk blogs
router.post("/create", upload.array("images"), createBlogs);

// Update single blog
router.put("/:id", upload.single("image"), validateBlog, updateBlog);

// Delete blog
router.delete("/:id", deleteBlog);

export default router;
