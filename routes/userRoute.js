import express from 'express';
import { loginUser, registerUser, verifyOtp, sendLoginOtp, googleLogin, getProfile, updateProfile, bookAppointment, listAppointment, cancelAppointment, paymentRazorpay, verifyRazorpay, paymentStripe, verifyStripe, getVisitedDoctors, changePassword,  toggleTwoFactor , getLoginHistory  } from '../controllers/userController.js';
import upload from '../middleware/multer.js';
import authUser from '../middleware/authUser.js';
import User from '../models/userModel.js'
import authDoctor from '../middleware/authDoctor.js';
const userRouter = express.Router();

userRouter.post("/register", registerUser);
userRouter.post("/verify-otp", verifyOtp);
userRouter.post("/login", loginUser);
userRouter.post("/send-login-otp", sendLoginOtp);
userRouter.post("/google-login", googleLogin);

userRouter.get("/get-profile", authUser, getProfile)
userRouter.post("/update-profile", upload.single('image'), authUser, updateProfile)
userRouter.post("/book-appointment", authUser, bookAppointment)
userRouter.get("/appointments", authUser, listAppointment)
userRouter.post("/cancel-appointment", authUser, cancelAppointment)
userRouter.post("/payment-razorpay", authUser, paymentRazorpay)
userRouter.post("/verifyRazorpay", authUser, verifyRazorpay)
userRouter.post("/payment-stripe", authUser, paymentStripe)
userRouter.post("/verifyStripe", authUser, verifyStripe)

// 🔐 Security Settings Routes
userRouter.post("/change-password", authUser, changePassword);
userRouter.post("/toggle-2fa", authUser, toggleTwoFactor);
userRouter.get("/login-history", authUser, getLoginHistory);

userRouter.get("/my-doctors", authUser, getVisitedDoctors);

userRouter.get("/all", authDoctor, async (req, res) => {
  try {
    const users = await User.find({}, "_id name email");
    res.json({ success: true, users });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch users" });
  }
});

export default userRouter;