import express from "express"
import cors from 'cors'
import 'dotenv/config'
import connectDB from "./config/mongodb.js"
import pdfUploadRoute from './routes/pdfUploadRoute.js';
// ✅ CORRECT
import { connectCloudinary } from "./config/cloudinary.js";
import userRouter from "./routes/userRoute.js"
import doctorRouter from "./routes/doctorRoute.js"
import adminRouter from "./routes/adminRoute.js"
import chatRouter from './routes/chatRoute.js'; // ✅ Import the default router
import path from "path";
import { fileURLToPath } from "url";

  // app config
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express()
const port = process.env.PORT || 4000

connectDB()
connectCloudinary()

// middlewares

app.use(cors({
  origin: ["http://localhost:5174", "https://tourmaline-froyo-923d26.netlify.app"],
, // ✅ Add your frontend URL here
  credentials: true
}));
app.use(express.json());

// api endpoints
app.use("/api/user", userRouter)
app.use("/api/admin", adminRouter)
app.use("/api/doctor", doctorRouter)
app.use("/api/chat", chatRouter); // ✅ Use the chat router
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));
app.use('/api', pdfUploadRoute); // or whatever route you want
// test route

app.get("/", (req, res) => {
  res.send("API Working")
});

app.listen(port, () => console.log(`Server started on PORT:${port}`))