import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import validator from "validator";
import userModel from "../models/userModel.js";
import doctorModel from "../models/doctorModel.js";
import appointmentModel from "../models/appointmentModel.js";
import { v2 as cloudinary } from "cloudinary";
import stripe from "stripe";
import razorpay from "razorpay";
  import { v4 as uuidv4 } from "uuid";
import sendEmail  from "../utils/sendEmail.js";
import { OAuth2Client } from "google-auth-library";
import admin from "../utils/firebaseAdmin.js"



const { UAParser } = await import('ua-parser-js'); // ✅ Dynamic import with named export




const JWT_SECRET = process.env.JWT_SECRET;
const OTP_EXPIRY = 15 * 60 * 1000; // 15 minutes  

let stripeInstance = null;
let razorpayInstance = null;

try {
  if (process.env.STRIPE_SECRET_KEY) {
    const stripeImport = await import("stripe");
    stripeInstance = new stripeImport.default(process.env.STRIPE_SECRET_KEY);
    console.log("✅ Stripe initialized");
  } else {
    console.warn("⚠️ STRIPE_SECRET_KEY not found. Stripe disabled.");
  }
} catch (err) {
  console.error("❌ Stripe init error:", err.message);
}

try {
  if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
    const razorpayImport = await import("razorpay");
    razorpayInstance = new razorpayImport.default({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
    console.log("✅ Razorpay initialized");
  } else {
    console.warn("⚠️ Razorpay keys missing. Razorpay disabled.");
  }
} catch (err) {
  console.error("❌ Razorpay init error:", err.message);
}
const signToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });
};
// 1. Register + send email OTP
export const registerUser = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password)
      return res.json({ success: false, message: "Missing details" });

    if (!validator.isEmail(email))
      return res.json({ success: false, message: "Invalid email" });
    if (password.length < 8)
      return res.json({ success: false, message: "Weak password" });

    const exists = await userModel.findOne({ email });
    if (exists)
      return res.json({ success: false, message: "Email already used" });

    const hashed = await bcrypt.hash(password, 10);
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiry = Date.now() + OTP_EXPIRY;

    const newUser = await userModel.create({
      name, email, password: hashed, otp, otpExpiry
    });

    await sendEmail(email, "Verify your account", `<p>Your OTP is <b>${otp}</b></p>`);
    return res.json({ success: true, message: "OTP sent to email" });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// 2. Validate OTP and send token
export const verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res
        .status(400)
        .json({ success: false, message: "Email and OTP are required" });
    }

    const user = await userModel.findOne({ email }); // ✅ FIXED HERE

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    const now = Date.now();
    const expiry = new Date(user.otpExpiry).getTime(); // in case stored as Date

    if (user.otp !== otp || now > expiry) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid or expired OTP" });
    }

    user.otp = null;
    user.otpExpiry = null;
    await user.save();

    const token = signToken(user._id);

    return res.status(200).json({ success: true, token });
  } catch (err) {
    console.error("Verify OTP Error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};
// 3. Password login
export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await userModel.findOne({ email });
    if (!user) return res.json({ success: false, message: "User not found" });

    const match = await bcrypt.compare(password, user.password);
    user.loginHistory = user.loginHistory.slice(-9); // keep last 10
    user.loginHistory.push({
      ip: req.ip || req.headers["x-forwarded-for"] || "unknown",
      userAgent: req.get("User-Agent") || "unknown",
      success: match
    });
    await user.save();

    if (!match)
      return res.json({ success: false, message: "Invalid credentials" });

    const token = signToken(user._id);
    return res.json({ success: true, token });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// 4. Send OTP for login on demand
export const sendLoginOtp = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await userModel.findOne({ email });
    if (!user) return res.json({ success: false, message: "User not found" });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    user.otp = otp;
    user.otpExpiry = Date.now() + OTP_EXPIRY;
    await user.save();

    await sendEmail(email, "Your OTP Login Code", `<p>Your OTP is <b>${otp}</b></p>`);
    return res.json({ success: true, message: "OTP sent" });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// 5. Google login
export const googleLogin = async (req, res) => {
  try {
    const { credential } = req.body;

    if (!credential) {
      return res.status(400).json({ success: false, message: "Missing credential" });
    }

    // ✅ Verify the token using Firebase Admin
    const decodedToken = await admin.auth().verifyIdToken(credential);
    

    const { email, name, picture } = decodedToken;

    if (!email) {
      return res.status(400).json({ success: false, message: "No email in Google account" });
    }

    // Check if user exists
    let user = await userModel.findOne({ email });

    if (!user) {
      // Create new user
      user = await userModel.create({
        email,
        name,
        avatar: picture,
        provider: "google",
      });
    }

        user.loginHistory = user.loginHistory.slice(-9); // Keep last 10
    user.loginHistory.push({
      ip: req.ip || req.headers["x-forwarded-for"] || "unknown",
      userAgent: req.get("User-Agent") || "unknown",
      success: true,
    });
    await user.save();

    // Sign your own JWT (for backend auth)
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    return res.status(200).json({
      success: true,
      token,
      message: "Login successful",
    });
  } catch (err) {
    console.error("🔴 Firebase login error:", err.message);
    return res.status(500).json({ success: false, message: "Login failed" });
  }
};
// API to get user profile data
const getProfile = async (req, res) => {
  try {
    const userId = req.userId;
    const userData = await userModel.findById(userId).select("-password");

    if (!userData) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    res.json({ success: true, userData });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};


// API to update user profile
const updateProfile = async (req, res) => {
  try {
    const userId = req.userId;

    const { name, phone, address, dob, gender } = req.body;
    const imageFile = req.file;

    if (!name || !phone || !dob || !gender) {
      return res.json({ success: false, message: "Data Missing" });
    }

    await userModel.findByIdAndUpdate(userId, {
      name,
      phone,
      address: JSON.parse(address),
      dob,
      gender,
    });

    if (imageFile) {
      // upload image to cloudinary
      const imageUpload = await cloudinary.uploader.upload(imageFile.path, {
        resource_type: "image",
      });
      const imageURL = imageUpload.secure_url;

      await userModel.findByIdAndUpdate(userId, { image: imageURL });
    }

    res.json({ success: true, message: "Profile Updated" });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

// API to book appointment
const bookAppointment = async (req, res) => {
  try {
    const userId = req.userId;
    const { docId, slotDate, slotTime } = req.body;

    // Fetch doctor and user
    const doctor = await doctorModel.findById(docId);
    const user = await userModel.findById(userId);

    if (!doctor) {
      return res.status(404).json({ success: false, message: "Doctor not found" });
    }

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    if (!doctor.available) {
      return res.status(400).json({ success: false, message: "Doctor not available" });
    }

    // Prevent double booking
    const existingAppointment = await appointmentModel.findOne({
      docId,
      slotDate,
      slotTime,
      cancelled: { $ne: true },
    });

    if (existingAppointment) {
      return res.status(400).json({ success: false, message: "This slot is already booked" });
    }

    // Ensure doctor's slots_booked is in proper format
    if (!doctor.slots_booked) doctor.slots_booked = {};
    if (!Array.isArray(doctor.slots_booked[slotDate])) {
      doctor.slots_booked[slotDate] = [];
    }
    doctor.slots_booked[slotDate].push(slotTime);
    await doctor.save();

    // Structure userData and docData to match your required format
    const appointment = await appointmentModel.create({
      userId,
      docId,
      slotDate,
      slotTime,
      cancelled: false,
      isCompleted: false,
      payment: false,
      date: Date.now(), // timestamp format
      amount: doctor.fees,
      userData: {
        _id: user._id,
        name: user.name,
        email: user.email,
        image: user.image || "",
        phone: user.phone,
        address: {
          line1: user.address?.line1 || "",
          line2: user.address?.line2 || ""
        },
        gender: user.gender || "",
        dob: user.dob || "",
        __v: 0 // optional - depends if your schema has it
      },
      docData: {
        name: doctor.name,
        image: doctor.image || "",
        speciality: doctor.speciality,
        fees: doctor.fees,
        experience: doctor.experience,
        address: doctor.address || "",
      },
    });

    return res.json({ success: true, message: "Appointment Booked Successfully", appointment });

  } catch (error) {
    console.error("Booking Error:", error.message);
    return res.status(500).json({ success: false, message: "Server Error: " + error.message });
  }
};


// API to cancel appointment
const cancelAppointment = async (req, res) => {
  try {
    const userId = req.userId;
    const { appointmentId } = req.body;

    const appointmentData = await appointmentModel.findById(appointmentId);
    if (!appointmentData) {
      return res.status(404).json({ success: false, message: "Appointment not found" });
    }

    await appointmentModel.findByIdAndUpdate(appointmentId, { cancelled: true });

    const { docId, slotDate, slotTime } = appointmentData;

    const doctor = await doctorModel.findById(docId);
    if (!doctor) {
      return res.status(404).json({ success: false, message: "Doctor not found" });
    }

    // 🔍 Add this debug block here
    console.log("📆 slotDate received:", slotDate);
    console.log("📦 slots_booked keys:", Object.keys(doctor.slots_booked || {}));
    console.log("🕓 doctor.slots_booked[slotDate]:", doctor.slots_booked?.[slotDate]);

    // This is the line that causes the error if doctor.slots_booked[slotDate] is undefined
    let slotArray = doctor.slots_booked[slotDate];
    if (!Array.isArray(slotArray)) {
      console.warn("⚠️ slots_booked[slotDate] is not an array:", slotArray);
      slotArray = [];
    }

    doctor.slots_booked[slotDate] = slotArray.filter((s) => s !== slotTime);

    await doctor.save();

    return res.json({ success: true, message: "Appointment Cancelled Successfully" });
  } catch (error) {
    console.error("❌ Cancel Error:", error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};







// API to get user appointments for frontend my-appointments page
// ✅ API to get user appointments for frontend my-appointments page
const listAppointment = async (req, res) => {
  try {
    const userId = req.userId;

    const appointments = await appointmentModel.find({ userId });

    // ✅ Format each appointment to ensure `reportUrl` is always included
    const formattedAppointments = appointments.map((appointment) => ({
      ...appointment._doc,
      reportUrl: appointment.reportUrl || null, // Ensure it's passed
    }));

    res.json({ success: true, appointments: formattedAppointments });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

// API to get unique doctors visited by the user
const getVisitedDoctors = async (req, res) => {
  try {
    const userId = req.userId;

    const appointments = await appointmentModel
      .find({ userId, cancelled: false })
      .populate("docId");

    const uniqueDoctors = new Map();

    appointments.forEach((appointment) => {
      let docId = appointment.docId?._id || appointment.docId; // Either populated object or raw ObjectId
      docId = docId?.toString(); // Always convert to string key

      if (!docId) return; // skip if null

      if (!uniqueDoctors.has(docId)) {
        if (appointment.docId && appointment.docId.name) {
          // Use populated doc
          const doctor = appointment.docId;
          uniqueDoctors.set(docId, {
            _id: doctor._id,
            name: doctor.name,
            speciality: doctor.speciality,
            image: doctor.image,
            experience: doctor.experience,
            fees: doctor.fees,
            address: doctor.address || "",
          });
        } else if (appointment.docData && appointment.docData.name) {
          // Use stored docData backup
          uniqueDoctors.set(docId, {
            _id: docId,
            name: appointment.docData.name,
            speciality: appointment.docData.speciality,
            image: appointment.docData.image,
            experience: appointment.docData.experience,
            fees: appointment.docData.fees,
            address: appointment.docData.address,
          });
        }
      }
    });

    res.json({ success: true, doctors: Array.from(uniqueDoctors.values()) });
  } catch (error) {
    console.error("getVisitedDoctors error:", error.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
};







// API to make payment of appointment using razorpay
const paymentRazorpay = async (req, res) => {
  try {
    const { appointmentId } = req.body;
    const appointmentData = await appointmentModel.findById(appointmentId);

    if (!appointmentData || appointmentData.cancelled) {
      return res.json({
        success: false,
        message: "Appointment Cancelled or not found",
      });
    }

    // creating options for razorpay payment
    const options = {
      amount: appointmentData.amount * 100,
      currency: process.env.CURRENCY,
      receipt: appointmentId,
    };

    // creation of an order
    const order = await razorpayInstance.orders.create(options);

    res.json({ success: true, order });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};




// API to verify payment of razorpay
const verifyRazorpay = async (req, res) => {
  try {
    const { razorpay_order_id } = req.body;
    const orderInfo = await razorpayInstance.orders.fetch(razorpay_order_id);

    if (orderInfo.status === "paid") {
      await appointmentModel.findByIdAndUpdate(orderInfo.receipt, {
        payment: true,
      });
      res.json({ success: true, message: "Payment Successful" });
    } else {
      res.json({ success: false, message: "Payment Failed" });
    }
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

// API to make payment of appointment using Stripe
const paymentStripe = async (req, res) => {
  try {
    const { appointmentId } = req.body;
    const { origin } = req.headers;

    const appointmentData = await appointmentModel.findById(appointmentId);

    if (!appointmentData || appointmentData.cancelled) {
      return res.json({
        success: false,
        message: "Appointment Cancelled or not found",
      });
    }

    const currency = process.env.CURRENCY.toLocaleLowerCase();

    const line_items = [
      {
        price_data: {
          currency,
          product_data: {
            name: "Appointment Fees",
          },
          unit_amount: appointmentData.amount * 100,
        },
        quantity: 1,
      },
    ];

    const session = await stripeInstance.checkout.sessions.create({
      success_url: `${origin}/verify?success=true&appointmentId=${appointmentData._id}`,
      cancel_url: `${origin}/verify?success=false&appointmentId=${appointmentData._id}`,
      line_items: line_items,
      mode: "payment",
    });

    res.json({ success: true, session_url: session.url });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

const verifyStripe = async (req, res) => {
  try {
    const { appointmentId, success } = req.body;

    if (success === "true") {
      await appointmentModel.findByIdAndUpdate(appointmentId, {
        payment: true,
      });
      return res.json({ success: true, message: "Payment Successful" });
    }

    res.json({ success: false, message: "Payment Failed" });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

const handleError = (res, error, context = "Unknown") => {
  console.error(`❌ [${context}]`, error);
  return res.status(500).json({ success: false, message: error.message });
};

export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: "Missing fields" });
    }

    console.log("🔐 Authenticated userId:", req.userId);
    const user = await userModel.findById(req.userId);

    if (!user) {
      console.log("❌ User not found for ID:", req.userId);
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);

    if (!isMatch) {
      console.log("❌ Password mismatch for:", user.email);
      return res.status(403).json({ success: false, message: "Incorrect current password" });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    return res.json({ success: true, message: "Password updated successfully" });
  } catch (error) {
    console.error("🔥 changePassword error:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

export const toggleTwoFactor = async (req, res) => {
  try {
    const { enabled } = req.body;

    if (typeof enabled !== "boolean") {
      return res.status(400).json({ success: false, message: "Invalid value for 'enabled'" });
    }

    await userModel.findByIdAndUpdate(req.userId, { twoFactorEnabled: enabled });
    return res.json({ success: true, message: `2FA ${enabled ? "enabled" : "disabled"}` });
  } catch (error) {
    return handleError(res, error, "toggleTwoFactor");
  }
};

export const getLoginHistory = async (req, res) => {
  try {
    const user = await userModel.findById(req.userId).select("loginHistory");

    const formattedHistory = user.loginHistory.map(entry => {
      const parser = new UAParser(entry.userAgent || "");
      const parsedUA = parser.getResult();

      return {
        date: new Date(entry.timestamp).toLocaleString(),
        ip: entry.ip === "::1" ? "Localhost" : entry.ip,
        browser: `${parsedUA.browser.name || "Unknown"} ${parsedUA.browser.version || ""}`,
        os: `${parsedUA.os.name || "Unknown"} ${parsedUA.os.version || ""}`,
        success: entry.success,
      };
    });

    return res.json({ success: true, history: formattedHistory });
  } catch (error) {
    return handleError(res, error, "getLoginHistory");
  }
};
 
export {
 
  
  getProfile,
  updateProfile,
  bookAppointment,
  listAppointment,
  cancelAppointment,
  paymentRazorpay,
  verifyRazorpay,
  paymentStripe,
  verifyStripe,
  getVisitedDoctors,
};
