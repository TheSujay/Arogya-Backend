import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import doctorModel from "../models/doctorModel.js";
import appointmentModel from "../models/appointmentModel.js";
import sendEmail from "../utils/sendEmail.js";

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
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
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
};
