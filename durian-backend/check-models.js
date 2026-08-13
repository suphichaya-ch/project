import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function listModels() {
  try {
    // เรียกดูรายการโมเดลทั้งหมดที่ API Key นี้ใช้ได้
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GEMINI_API_KEY}`,
    );
    const data = await response.json();

    console.log("--- รายชื่อโมเดลที่ใช้ได้ ---");
    data.models.forEach((m) => {
      if (m.supportedGenerationMethods.includes("generateContent")) {
        console.log(`👉 ${m.name.replace("models/", "")}`);
      }
    });
  } catch (error) {
    console.error("Error listing models:", error);
  }
}

listModels();
