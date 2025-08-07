import Blog from "../models/Blog.js";
import { validationResult, body } from "express-validator";
import { cloudinary } from "../config/cloudinary.js";
import { fetchAndUploadAvatar } from "../utils/avatar.js";


// ✅ Validation middleware
export const validateBlog = [
  body("title").trim().notEmpty().withMessage("Title is required"),
  body("content").trim().notEmpty().withMessage("Content is required"),
];

// ✅ Get all blogs
export const getAllBlogs = async (req, res) => {
  try {
    const blogs = await Blog.find().sort({ createdAt: -1 });
    res.json(blogs);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch blogs" });
  }
};

// ✅ Get single blog
export const getBlogById = async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);
    if (!blog) return res.status(404).json({ error: "Not found" });
    res.json(blog);
  } catch {
    res.status(500).json({ error: "Failed to fetch blog" });
  }
};

// ✅ Create multiple blogs with images
export const createBlogs = async (req, res) => {
  try {
    const { blogs } = req.body;
    const files = req.files;

    const parsedBlogs = JSON.parse(blogs);

    if (!Array.isArray(parsedBlogs)) {
      return res.status(400).json({ error: "Invalid blog payload" });
    }

    if (parsedBlogs.length !== files.length) {
      return res.status(400).json({ error: "Mismatch between blogs and images" });
    }

    const createdBlogs = await Promise.all(
      parsedBlogs.map(async (blog, index) => {
        const file = files[index];

        if (!file) {
          throw new Error(`Missing image for blog at index ${index}`);
        }

        const imageUrl = file.path;
        const imagePublicId = file.filename;

        let avatarUrl = blog.authorAvatar;

        // ✅ Generate and upload avatar if not provided
        if (!avatarUrl) {
          avatarUrl = await fetchAndUploadAvatar(blog.authorName);
        }

        const newBlog = new Blog({
          title: blog.title,
          content: blog.content,
          image: imageUrl,
          imagePublicId,
          date: blog.date,
          authorName: blog.authorName,
          authorAvatar: avatarUrl,
          authorBio: blog.authorBio || "",
        });

        return await newBlog.save();
      })
    );

    res.status(201).json({ message: "Blogs created", blogs: createdBlogs });
  } catch (err) {
    console.error("Bulk create error:", err);
    res.status(500).json({ error: "Failed to create blogs" });
  }
};


// ✅ Update blog (including optional image replace and date)
export const updateBlog = async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);
    if (!blog) return res.status(404).json({ error: "Blog not found" });

    // Replace image if a new one is uploaded
    if (req.file) {
      if (blog.imagePublicId) {
        await cloudinary.uploader.destroy(blog.imagePublicId);
      }
      blog.image = req.file.path;
      blog.imagePublicId = req.file.filename;
    }

    blog.title = req.body.title || blog.title;
    blog.content = req.body.content || blog.content;
    blog.date = req.body.date || blog.date; // ✅ Update the date

    const updated = await blog.save();
    res.json(updated);
  } catch (err) {
    console.error("Update blog error:", err);
    res.status(500).json({ error: "Failed to update blog" });
  }
};

// ✅ Delete blog + Cloudinary image
export const deleteBlog = async (req, res) => {
  try {
    const blog = await Blog.findByIdAndDelete(req.params.id);
    if (!blog) return res.status(404).json({ error: "Blog not found" });

    if (blog.imagePublicId) {
      await cloudinary.uploader.destroy(blog.imagePublicId);
    }

    res.json({ message: "Blog deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete blog" });
  }
};
