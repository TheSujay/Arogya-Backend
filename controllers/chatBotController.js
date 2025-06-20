import { Groq } from "groq-sdk";
import dotenv from "dotenv";
import doctorModel from "../models/doctorModel.js";
import userModel from "../models/userModel.js";

dotenv.config();

// ✅ Accurate age calculator
function calculateAgeFromDOB(dobStr) {
  if (!dobStr || typeof dobStr !== "string") return "Unknown";

  const [yearStr, monthStr, dayStr] = dobStr.split("-");
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10) - 1; // Month is 0-indexed
  const day = parseInt(dayStr, 10);

  if (isNaN(day) || isNaN(month) || isNaN(year)) {
    console.warn("⚠️ Invalid DOB parsed:", dobStr);
    return "Unknown";
  }

  const birthDate = new Date(year, month, day);
  const today = new Date();

  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();

  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }

  return age;
}



const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

const SYSTEM_PROMPT = `

Name of the website is Arogya. It is a healthcare platform that helps users book appointments with doctors, check doctor availability, and navigate the hospital system.
You are Arogya AI Assistant. Help users book appointments, check doctor availability, and guide them through the hospital system.

If the user's profile data is available, and they ask questions like "my age", "my gender", or "where do I live", use the profile data to answer.

Always greet users by their name if provided. Be helpful, polite, and concise.

⚠️ Never calculate age yourself. Always use the "✅ Calculated Age" from user data passed in the context.
`;

export const chatBotController = async (req, res) => {
  try {
    const userId = req.userId;
    const userPrompt = req.body.message;
    let userName = "User";
    let userInfoText = "";
    let age;
    let userData;

    if (userId) {
      userData = await userModel.findById(userId);
      if (userData) {
        userName = userData.name;
        age = calculateAgeFromDOB(userData.dob);

        userInfoText = `
User Details:
- Name: ${userData.name}
- Email: ${userData.email}
- Gender: ${userData.gender}
- Date of Birth: ${userData.dob}
- ✅ Calculated Age: ${age}
- Address: ${userData.address?.line1 || ""}, ${userData.address?.line2 || ""}
- Phone: ${userData.phone}
`;
      }
    }

    // 🟢 Quick response: age
    if (/my age|how old/i.test(userPrompt)) {
      return res.status(200).json({
        reply: `Hello ${userName}!\n\nAccording to our records, you were born on ${userData?.dob}, which makes you ${age} years old.\n\nIs there anything else I can help you with?`,
      });
    }

    // 🟢 Doctor availability (local logic)
    if (/available|doctor|book/i.test(userPrompt)) {
      const doctors = await doctorModel.find({ available: true });
      if (doctors.length === 0) {
        return res.json({
          reply: `Hello ${userName}, currently no doctors are available.`,
        });
      }

      const summary = doctors
        .map((doc) => `👨‍⚕️ Dr. ${doc.name} (${doc.speciality}) - ₹${doc.fees}`)
        .join("\n");

      return res.json({
        reply: `Hello ${userName}, here are available doctors:\n\n${summary}`,
      });
    }

    // 🧠 Fallback to Groq AI
    const completion = await groq.chat.completions.create({
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: `${userInfoText}\n\nQuery: ${userPrompt}` },
      ],
      model: "llama3-70b-8192",
    });

    const reply =
      completion.choices[0]?.message?.content ||
      "I'm not sure how to respond to that.";

    res.status(200).json({ reply });

  } catch (error) {
    console.error("❌ Ollama Chatbot Error:", error.message || error);
    res
      .status(500)
      .json({ reply: "❌ Chatbot failed. Please try again later." });
  }
};
