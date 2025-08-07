import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { createServer } from "http";
import { Server } from "socket.io";

// DB and Cloudinary config
import connectDB from "./config/mongodb.js";
import { connectCloudinary } from "./config/cloudinary.js";

// Routes
import pdfUploadRoute from "./routes/pdfUploadRoute.js";
import userRouter from "./routes/userRoute.js";
import doctorRouter from "./routes/doctorRoute.js";
import adminRouter from "./routes/adminRoute.js";
import chatRouter from "./routes/chatRoute.js";
import faqRoutes from "./routes/faqRoutes.js";
import testimonialRoutes from "./routes/testimonialRoutes.js";
import featureRoutes from "./routes/featureRoutes.js";
import announcementRoutes from "./routes/announcementRoutes.js";
import bannerRoutes from "./routes/bannerRoutes.js";
import reelsRoutes from "./routes/reelsRoutes.js";
import reelsUpload from "./routes/reelsUpload.js"; // 👈 Add Cloudinary upload route if used
import blogRoutes from "./routes/blogRoutes.js"; // 👈 New route for blog management
import MessageRoute from "./routes/MessageRoute.js"; // 👈 Import message route



import Message from "./models/Message.js";

// Setup
dotenv.config();
connectDB();
connectCloudinary();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const server = createServer(app); // 👈 Create HTTP server for socket.io

// Set up Socket.IO
export const io = new Server(server, {
  cors: {
    origin: [
      "http://localhost:5173",
      "http://localhost:5174",
      "https://tourmaline-froyo-923d26.netlify.app",
      "https://arogyaforall.netlify.app"
    ],
    credentials: true,
  },
});

const onlineUsers = new Map(); // userId => socketId

io.on("connection", (socket) => {
  console.log("🔌 A user connected");



  // ✅ Register the user to track their socket
  socket.on("register", ({ userId }) => {

    onlineUsers.set(userId, socket.id);
    socket.join(userId.toString()); 
    console.log(`✅ Registered user ${userId} with socket ID ${socket.id}`);
  });

  // 📩 Handle message sending
  socket.on("privateMessage", async (data) => {
    const { senderId, receiverId, senderModel, receiverModel, content } = data;

    // Save to DB
    const message = new Message({
      senderId,
      receiverId,
      senderModel,
      receiverModel,
      content,
    });

    await message.save();

    const payload = {
      senderId: { _id: senderId },
      receiverId: { _id: receiverId },
      content,
      timestamp: message.timestamp,
    };

    // ✅ Emit to receiver if online
    const receiverSocket = onlineUsers.get(receiverId);
    if (receiverSocket) {
      io.to(receiverSocket).emit("privateMessage", payload);
    }

    // ✅ Emit to sender so they update UI instantly
    const senderSocket = onlineUsers.get(senderId);
    if (senderSocket) {
      io.to(senderSocket).emit("privateMessage", payload);
    }
  });


   socket.on("typing", ({ senderId, receiverId, isTyping }) => {
    const receiverSocket = onlineUsers.get(receiverId);
    if (receiverSocket) {
      io.to(receiverSocket).emit("typing", { senderId, receiverId, isTyping });
    }
  });
  

  // 🔌 Clean up on disconnect
  socket.on("disconnect", () => {
    for (let [key, value] of onlineUsers.entries()) {
      if (value === socket.id) {
        onlineUsers.delete(key);
        console.log(`❌ Disconnected and removed user ${key}`);
        break;
      }
    }
  });
});


// Middleware
app.use(cors({
  origin: [
    "http://localhost:5173",
    "http://localhost:5174",
    "https://tourmaline-froyo-923d26.netlify.app",
    "https://arogyaforall.netlify.app"
  ],
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "dtoken", "atoken"],
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));
app.use('/thumbnails', express.static(path.join(process.cwd(), 'thumbnails')));

// Routes
app.use("/api/user", userRouter);
app.use("/api/admin", adminRouter);
app.use("/api/doctor", doctorRouter);
app.use("/api/chat", chatRouter);
app.use("/api", pdfUploadRoute);
app.use("/api/faqs", faqRoutes);
app.use("/api/testimonials", testimonialRoutes);
app.use("/api/features", featureRoutes);
app.use("/api/announcements", announcementRoutes);
app.use("/api/banner", bannerRoutes);
app.use("/api/reels", reelsRoutes);
app.use("/api/reels/upload", reelsUpload); // 👈 Optional if uploading to Cloudinary
app.use("/api/blogs", blogRoutes); // 👈 New route for blog management
app.use("/api/messages", MessageRoute); // 👈 Add message route

// Default
app.get("/", (req, res) => {
  res.send("API Working");
});

// Start server
const port = process.env.PORT || 4000;
server.listen(port, () => console.log(`🚀 Server with Socket.IO started on PORT: ${port}`));
