import express from "express";
import appointmentModel from "../models/appointmentModel.js";
import authDoctor from "../middleware/authDoctor.js";
import authUser from "../middleware/authUser.js";
import Message from "../models/Message.js";
import Doctor from "../models/doctorModel.js"; 
   
const router = express.Router();

// ✅ Send message from user to doctor
router.post("/user/send", authUser, async (req, res) => {
  try {
    const { receiverId, content } = req.body; // <- changed from message → content ✅
    const senderId = req.userId;

    if (!receiverId || !content) {
      return res.status(400).json({ success: false, message: "Missing fields" });
    }

    const newMessage = new Message({
      senderId,
      receiverId,
      senderModel: "user",
      receiverModel: "doctor",
      content, // ✅
      timestamp: Date.now(),
    });

    await newMessage.save();
    res.json({ success: true, message: "Message sent" });
  } catch (error) {
    console.error("User message send error:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
});



// ✅ Get messages between user and specific doctor
router.post("/user/messages", authUser, async (req, res) => {
  try {
    const { doctorId } = req.body;
    const userId = req.userId;

    if (!doctorId) {
      return res.status(400).json({ success: false, message: "Missing doctorId" });
    }

    const messages = await Message.find({
      $or: [
        { senderId: userId, receiverId: doctorId },
        { senderId: doctorId, receiverId: userId },
      ],
    })
    .sort({ timestamp: 1 })
    .populate("senderId", "name email")
    .populate("receiverId", "name email");

    res.json({ success: true, messages });
  } catch (error) {
    console.error("Fetch user messages error:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
});


// ✅ Get doctors user has appointments with
// 👈 make sure it's imported

router.get("/user-doctors", authUser, async (req, res) => {
  try {
    const userId = req.userId;

    const appointments = await appointmentModel.find({ userId, cancelled: false });

    const doctorIds = [
      ...new Set(appointments.map(app => app.docId?.toString()).filter(Boolean))
    ];

    const doctors = await Doctor.find({ _id: { $in: doctorIds } });

    res.json({ success: true, doctors });
  } catch (error) {
    console.error("Fetch user chat doctors error:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
});




// ✅ Send message route
router.post("/messages/send", authDoctor, async (req, res) => {
  try {
    const { receiverId, message } = req.body;
    const senderId = req.body.docId;

    if (!receiverId || !message) {
      return res.status(400).json({ success: false, message: "Missing fields" });
    }

    const newMessage = new Message({
      senderId,
      receiverId,
      senderModel: "doctor",        // ✅ Add this
      receiverModel: "user",   
      content: message, // 🔁 this is the fix
      timestamp: Date.now(),
    });

    await newMessage.save();

    res.json({ success: true, message: "Message sent" });
  } catch (error) {
    console.error("Error sending message:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
});


// ✅ Get all users who have appointments with the doctor
router.get("/doctor-users", authDoctor, async (req, res) => {
  try {
    const docId = req.body.docId;

    const appointments = await appointmentModel.find({ docId, cancelled: false }).populate("userId");

    const uniqueUsersMap = new Map();

    appointments.forEach(app => {
      const user = app.userId;
      if (!uniqueUsersMap.has(user._id.toString())) {
        uniqueUsersMap.set(user._id.toString(), user);
      }
    });

    const uniqueUsers = Array.from(uniqueUsersMap.values());

    res.json({ success: true, users: uniqueUsers });
  } catch (error) {
    console.error("Error getting doctor chat users:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
});



// ✅ Get messages between doctor and a specific user
router.post("/messages", authDoctor, async (req, res) => {
  try {
    const { userId } = req.body;
    const docId = req.body.docId;

    if (!userId || !docId) {
      return res.status(400).json({ success: false, message: "Missing userId or docId" });
    }

    const messages = await Message.find({
      $or: [
        { senderId: docId, receiverId: userId },
        { senderId: userId, receiverId: docId },
      ],
    })
    .sort({ timestamp: 1 })
    .populate("senderId", "name email")
    .populate("receiverId", "name email");

    res.json({ success: true, messages });
  } catch (error) {
    console.error("Error fetching messages:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
});



export default router;
