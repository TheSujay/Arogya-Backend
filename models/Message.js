import mongoose from "mongoose";


const messageSchema = new mongoose.Schema({
  senderId: { type: mongoose.Schema.Types.ObjectId, refPath: 'doctorModel', required: true },
  receiverId: { type: mongoose.Schema.Types.ObjectId, refPath: 'userModel', required: true },
  senderModel: { type: String, enum: ['user', 'doctor'], required: true },
  receiverModel: { type: String, enum: ['user', 'doctor'], required: true },
  content: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  read: { type: Boolean, default: false }
});

const Message = mongoose.model("Message", messageSchema);
export default Message;
