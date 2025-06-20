import express from "express";
import {
  loginDoctor,
  appointmentsDoctor,
  appointmentCancel,
  doctorList,
  changeAvailablity,
  appointmentComplete,
  doctorDashboard,
  doctorProfile,
  updateDoctorProfile,
  appointmentConfirm,
  searchAppointments,

} from "../controllers/doctorController.js";
import authDoctor from "../middleware/authDoctor.js";
import {
  generateAndUploadReport,
  getReport,
} from "../controllers/doctorController.js";
const doctorRouter = express.Router();

doctorRouter.post("/login", loginDoctor);
doctorRouter.post("/cancel-appointment", authDoctor, appointmentCancel);
doctorRouter.get("/appointments", authDoctor, appointmentsDoctor);
doctorRouter.get("/list", doctorList);
doctorRouter.post("/change-availability", authDoctor, changeAvailablity);
doctorRouter.post("/complete-appointment", authDoctor, appointmentComplete);
doctorRouter.get("/dashboard", authDoctor, doctorDashboard);
doctorRouter.get("/profile", authDoctor, doctorProfile);
doctorRouter.post("/update-profile", authDoctor, updateDoctorProfile);
doctorRouter.post("/confirm-appointment", authDoctor, appointmentConfirm); // ✅ New route
doctorRouter.post("/generate-report", generateAndUploadReport);
doctorRouter.get("/get-report/:appointmentId", getReport);
doctorRouter.get("/search-appointments", searchAppointments);




export default doctorRouter;
