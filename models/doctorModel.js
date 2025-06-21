import mongoose from "mongoose";

const doctorSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    image: { type: String, required: true },
    speciality: { type: String, required: true },
    degree: { type: String, required: true },
    experience: { type: String, required: true },
    about: { type: String, required: true },
    available: { type: Boolean, default: true },
    fees: { type: Number, required: true },

    // ✅ NEW: Dynamic visiting hours (e.g., 9 = 9AM, 17 = 5PM)
    startHour: {
      type: Number,
      default: 9, // Default start at 9 AM
    },
    endHour: {
      type: Number,
      default: 23, // Default end at 11 PM
    },

    // ✅ Booked slots structure: { "24_5_2025": ["09:00 AM", "09:30 AM"] }
    slots_booked: {
      type: Map,
      of: [String], // each date will map to an array of slot strings
      default: {},
    },
    // Ensure a new object for each document
    // ✅ Address structure

    address: { type: Object, required: true },
    date: { type: Number, required: true },
    
    signature: {
  type: String
},
signatureUploadedAt: {
  type: Date
},

  },
  {
    minimize: false, // ensures empty objects are saved as {}
  }
);

const doctorModel =
  mongoose.models.doctor || mongoose.model("doctor", doctorSchema);
export default doctorModel;
