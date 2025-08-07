// middleware/authAndAttachDoctor.js

import jwt from 'jsonwebtoken';
import doctorModel from '../models/doctorModel.js';

const authDoctor = async (req, res, next) => {
  let token;

  // Accepts either dtoken or Bearer token
  if (req.headers.dtoken) {
    token = req.headers.dtoken;
  } else if (req.headers.authorization && req.headers.authorization.startsWith("Bearer ")) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    return res.status(401).json({ success: false, message: 'Not Authorized Login Again' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const doctor = await doctorModel.findById(decoded.id);

    if (!doctor) {
      return res.status(404).json({ success: false, message: "Doctor not found" });
    }

    req.body.docId = doctor._id;  // for existing code support
    req.doctor = doctor;          // for easy access to whole document
    next();
  } catch (err) {
    console.error("authAndAttachDoctor error:", err);
    return res.status(401).json({ success: false, message: 'Invalid or Expired Token' });
  }
};

export default authDoctor;
