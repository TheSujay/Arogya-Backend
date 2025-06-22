import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import doctorModel from "../models/doctorModel.js";
import appointmentModel from "../models/appointmentModel.js";
import sendEmail from "../utils/sendEmail.js";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import fs from "fs-extra";
import path from "path";
import puppeteer from "puppeteer-core";
import chromium from "@sparticuz/chromium";
import handlebars from "handlebars";
import mongoose from "mongoose";
import { cloudinary, connectCloudinary } from "../config/cloudinary.js";
import streamifier from "streamifier";

// Ensure you have a logo image in the correct path

chromium.setHeadlessMode = true;
chromium.setGraphicsMode = false;


const isLocal = process.env.NODE_ENV !== "production"; 

// ✅ Doctor Login
const loginDoctor = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await doctorModel.findOne({ email });

    if (!user) {
      return res.json({ success: false, message: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (isMatch) {
      const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);
      res.json({ success: true, token });
    } else {
      res.json({ success: false, message: "Invalid credentials" });
    }
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

// ✅ Get Doctor Appointments
const appointmentsDoctor = async (req, res) => {
  try {
    const { docId } = req.body;
    const appointments = await appointmentModel.find({ docId });
    res.json({ success: true, appointments });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

// ✅ Book Appointment (Proper Structure)
const bookAppointment = async (req, res) => {
  try {
    const { userId, doctorId, slotDate, slotTime, name, email, amount } =
      req.body;

    const doctor = await doctorModel.findById(doctorId);

    const newAppointment = new appointmentModel({
      userId,
      docId: doctorId,
      slotDate,
      slotTime,
      userData: { name, email },
      docData: { name: doctor.name, email: doctor.email },
      amount,
      date: Date.now(),
    });

    await newAppointment.save();

    res.status(200).json({
      success: true,
      message: "Appointment booked! Awaiting doctor confirmation.",
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ✅ Cancel Appointment
const appointmentCancel = async (req, res) => {
  try {
    const { docId, appointmentId } = req.body;

    const appointmentData = await appointmentModel.findById(appointmentId);
    if (appointmentData && appointmentData.docId === docId) {
      await appointmentModel.findByIdAndUpdate(appointmentId, {
        cancelled: true,
      });
      return res.json({ success: true, message: "Appointment Cancelled" });
    }

    res.json({ success: false, message: "Appointment Cancelled" });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

// ✅ Mark Appointment Completed
const appointmentComplete = async (req, res) => {
  try {
    const { docId, appointmentId } = req.body;

    const appointmentData = await appointmentModel.findById(appointmentId);
    if (appointmentData && appointmentData.docId === docId) {
      await appointmentModel.findByIdAndUpdate(appointmentId, {
        isCompleted: true,
      });
      return res.json({ success: true, message: "Appointment Completed" });
    }

    res.json({ success: false, message: "Appointment Cancelled" });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

// ✅ Confirm Appointment (Updated to Send Email)
const appointmentConfirm = async (req, res) => {
  try {
    const { appointmentId, docId } = req.body;

    const appointment = await appointmentModel
      .findById(appointmentId)
      .populate("userId"); // <-- FIXED: populate user to access email

    if (!appointment) {
      return res.json({ success: false, message: "Appointment not found" });
    }

    if (appointment.docId.toString() !== docId) {
      return res.json({ success: false, message: "Unauthorized doctor" });
    }

    await appointmentModel.findByIdAndUpdate(appointmentId, {
      confirmed: true,
    });

    const doctor = await doctorModel.findById(docId);

    // Ensure email exists before sending
    if (!appointment.userId?.email) {
      return res.json({
        success: false,
        message: "User email not found for this appointment",
      });
    }
    // ✅ Format date and time here

    // Format date as "date-MMM-year" (e.g., 19-Jun-2025)
    let formattedDate = "Not provided";
    if (appointment.slotDate) {
      // Replace underscores with hyphens to handle "19_06_2025" format
      const dateStr = appointment.slotDate.replace(/_/g, "-");
      const [day, month, year] = dateStr.split("-");
      const months = [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec",
      ];
      const monthShort = months[parseInt(month, 10) - 1];
      formattedDate = `${day}-${monthShort}-${year}`;
    }

    // Format slotTime → if already "11:30", you can just append AM/PM or leave it
    const formattedTime = appointment.slotTime || "Not provided";

    const userName = appointment.userData.name || "User";
    // ✅ Send confirmation email

    await sendEmail(
      appointment.userData.email,
      "Appointment Confirmed - Arogya",
      `Your appointment with Dr. ${doctor.name} has been confirmed.`,
      `<h2>Hello ${userName},</h2>
   <p>Your appointment is <strong>confirmed</strong> with <strong>Dr. ${doctor.name}</strong>.</p>
   <p><strong>Date:</strong> ${formattedDate}</p>
   <p><strong>Time:</strong> ${formattedTime}</p>
   <p>Thank you for choosing Arogya.</p>`
    );

    res.json({
      success: true,
      message: "Appointment confirmed and Email sent",
    });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

// 🔧 CREATE A DYNAMIC PDF REPORT (text-based for now)

export const generateAndUploadReport = async (req, res) => {
  try {
    const { appointmentId, diagnosis, prescription } = req.body;

    if (!appointmentId || !diagnosis || !prescription) {
      return res.status(400).json({ success: false, message: "Missing fields" });
    }

    const appointment = await appointmentModel.findById(appointmentId);
    if (!appointment) {
      return res.status(404).json({ success: false, message: "Appointment not found" });
    }

    const doctor = await doctorModel.findById(appointment.docId);
    if (!doctor) {
      return res.status(404).json({ success: false, message: "Doctor not found" });
    }

    // Compile HTML
    const templatePath = path.resolve("templates", "template.html");
    const htmlTemplate = fs.readFileSync(templatePath, "utf8");
    const compile = handlebars.compile(htmlTemplate);
    const html = compile({
      patientName: appointment.userData.name,
      dob: appointment.userData.dob || "N/A",
      doctorName: doctor.name,
      speciality: doctor.speciality,
      signatureUrl: doctor.signature || "N/A",
      diagnosis,
      prescription,
      date: appointment.slotDate || "N/A",
      time: appointment.slotTime || "N/A",
    });

    // Launch Puppeteer (Edge path for local)
    const browser = await puppeteer.launch({
      executablePath: isLocal
        ? "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe"
        : await chromium.executablePath(),
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    let pdfBuffer;

    try {
      const page = await browser.newPage();

      // Load content with minimal wait
      await page.setContent(html, {
        waitUntil: "load",
        timeout: 0, // Disable timeout to avoid race condition
      });

      pdfBuffer = await page.pdf({
        format: "A4",
        printBackground: true,
      });
    } catch (err) {
      console.error("⚠️ PDF generation failed:", err);
      await browser.close();
      return res.status(500).json({ success: false, message: "PDF generation failed" });
    }

    await browser.close();

    // Upload to Cloudinary
    connectCloudinary();

    const uploadFromBuffer = (buffer) =>
      new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            resource_type: "raw",
            type: "upload",
            folder: "reports",
            public_id: `report-${appointmentId}`,
            format: "pdf",
          },
          (error, result) => {
            if (result) resolve(result);
            else reject(error);
          }
        );

        streamifier.createReadStream(buffer).pipe(stream);
      });

    const result = await uploadFromBuffer(pdfBuffer);

    // Save and respond
    appointment.reportUrl = result.secure_url;
    appointment.diagnosis = diagnosis;
    appointment.prescription = prescription;
    await appointment.save();

    return res.status(200).json({
      success: true,
      message: "✅ Report generated and uploaded successfully",
      file: result.secure_url,
    });
  } catch (error) {
    console.error("❌ Report generation failed:", error);
    res.status(500).json({ success: false, message: "Report generation failed" });
  }
};


export const getReport = async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const appointment = await appointmentModel.findById(appointmentId);

    if (!appointment || !appointment.reportUrl) {
      return res.status(404).send("Report not available");
    }

    // ✅ Absolute file path
    if (!appointment || !appointment.reportUrl) {
  return res.status(404).send("Report not available");
}

res.redirect(appointment.reportUrl); // or send as JSON if needed
 // trigger download in frontend
  } catch (err) {
    console.error("❌ Report Download Error:", err);
    res.status(500).send("Download failed");
  }
};

// ✅ Upload Doctor Signature

export const uploadDoctorSignature = async (req, res) => {
  try {
    if (!req.file) {
      return res
        .status(400)
        .json({ success: false, message: "No file uploaded" });
    }

    const doctorId = req.doctorId || req.body.docId;
    if (!doctorId) {
      return res
        .status(400)
        .json({ success: false, message: "Missing doctor ID" });
    }

    const doctor = await doctorModel.findById(doctorId);
    if (!doctor) {
      return res
        .status(404)
        .json({ success: false, message: "Doctor not found" });
    }

    // 🔁 Upload file to Cloudinary
    const result = await cloudinary.uploader.upload(req.file.path, {
      folder: "doctor-signatures",
      public_id: `signature-${doctorId}-${Date.now()}`,
    });

    // ✅ Save Cloudinary secure URL to DB
    doctor.signature = result.secure_url;
    doctor.signatureUploadedAt = new Date();
    await doctor.save();

    return res.status(200).json({
      success: true,
      message: "Signature uploaded to Cloudinary successfully",
      signatureUrl: result.secure_url,
    });
  } catch (error) {
    console.error("❌ Cloudinary Upload Error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

// ✅ Doctor List
const doctorList = async (req, res) => {
  try {
    const doctors = await doctorModel.find({}).select(["-password", "-email"]);
    res.json({ success: true, doctors });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

// Smart Search Function
const searchAppointments = async (req, res) => {
  try {
    const { query } = req.query;

    if (!query)
      return res.status(400).json({ message: "Search query is required." });

    const searchRegex = new RegExp(query, "i"); // Case-insensitive regex

    const appointments = await appointmentModel.find({
      $or: [{ "userData.name": searchRegex }, { "userData._id": query }],
    });

    if (appointments.length === 0) {
      return res
        .status(404)
        .json({ message: "No matching appointments found." });
    }

    res.status(200).json(appointments);
  } catch (error) {
    console.error("Search Error:", error);
    res.status(500).json({ message: "Internal server error." });
  }
};

// ✅ Change Doctor Availability
const changeAvailablity = async (req, res) => {
  try {
    const { docId } = req.body;

    const docData = await doctorModel.findById(docId);
    await doctorModel.findByIdAndUpdate(docId, {
      available: !docData.available,
    });

    res.json({ success: true, message: "Availability Changed" });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

// ✅ Doctor Profile
const doctorProfile = async (req, res) => {
  try {
    const { docId } = req.body;
    const profileData = await doctorModel.findById(docId).select("-password");
    res.json({ success: true, profileData });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

// ✅ Update Doctor Profile
const updateDoctorProfile = async (req, res) => {
  try {
    const { docId, fees, address, available } = req.body;

    await doctorModel.findByIdAndUpdate(docId, { fees, address, available });
    res.json({ success: true, message: "Profile Updated" });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

// ✅ Doctor Dashboard
const doctorDashboard = async (req, res) => {
  try {
    const { docId } = req.body;

    const appointments = await appointmentModel.find({ docId });

    let earnings = 0;
    appointments.forEach((item) => {
      if (item.isCompleted || item.payment) earnings += item.amount;
    });

    let patients = [];
    appointments.forEach((item) => {
      if (!patients.includes(item.userId)) patients.push(item.userId);
    });

    const dashData = {
      earnings,
      appointments: appointments.length,
      patients: patients.length,
      latestAppointments: appointments.reverse(),
    };

    res.json({ success: true, dashData });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

// ✅ Export All
export {
  loginDoctor,
  appointmentsDoctor,
  appointmentCancel,
  appointmentComplete,
  doctorList,
  changeAvailablity,
  doctorDashboard,
  doctorProfile,
  updateDoctorProfile,
  bookAppointment,
  appointmentConfirm,
  searchAppointments,
};
