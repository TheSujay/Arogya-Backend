import express from "express";
import { chatBotController } from "../controllers/chatBotController.js";

import authUser from "../middleware/authUser.js";

const router = express.Router();
router.post("/", authUser, chatBotController);
export default router;
