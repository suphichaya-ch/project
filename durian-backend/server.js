import express from "express";
import cors from "cors";
import multer from "multer";
import dotenv from "dotenv";
import { GoogleGenerativeAI } from "@google/generative-ai";

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const upload = multer({ storage: multer.memoryStorage() });

if (!process.env.GEMINI_API_KEY) {
  console.error("❌ ERROR: ไม่พบ GEMINI_API_KEY ในไฟล์ .env");
}

// ใช้ SDK ตัวมาตรฐาน
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

app.post("/api/predict", upload.single("image"), async (req, res) => {
  console.log("📸 ได้รับ Request วิเคราะห์รูปภาพ...");

  try {
    if (!req.file) {
      console.log("⚠️ ไม่มีไฟล์ถูกส่งมา");
      return res.status(400).json({ error: "กรุณาอัปโหลดรูปภาพ" });
    }

    const imagePart = {
      inlineData: {
        data: req.file.buffer.toString("base64"),
        mimeType: req.file.mimetype,
      },
    };

    const prompt = `คุณคือผู้เชี่ยวชาญด้านโรคพืช โดยเฉพาะ "โรคใบทุเรียน" 
ให้วิเคราะห์ภาพใบทุเรียนนี้ แล้วตอบกลับมาในรูปแบบ JSON เท่านั้น โดยมีโครงสร้างดังนี้:
{
  "diseaseName": "ชื่อโรคภาษาไทย (ภาษาอังกฤษ)",
  "confidence": 95.0,
  "symptoms": "อธิบายลักษณะอาการที่พบจากภาพแบบละเอียด",
  "treatment": [
    "แนวทางรักษาและป้องกันข้อที่ 1",
    "แนวทางรักษาและป้องกันข้อที่ 2",
    "แนวทางรักษาและป้องกันข้อที่ 3"
  ],
  "isDiseaseDetected": true
}`;

    // กำหนดโมเดลและสั่งให้คืนค่าเป็น JSON
    const model = genAI.getGenerativeModel({
      model: "gemini-flash-latest",
      generationConfig: { responseMimeType: "application/json" },
    });

    const result = await model.generateContent([prompt, imagePart]);
    const responseText = result.response.text().trim();
    console.log("🤖 AI ตอบกลับมาว่า:", responseText);

    const jsonResult = JSON.parse(responseText);
    return res.json(jsonResult);
  } catch (error) {
    console.error("❌ Error analyzing image:", error);
    return res.status(500).json({
      error: "เกิดข้อผิดพลาดในการวิเคราะห์ด้วย AI",
      details: error.message,
    });
  }
});

app.listen(port, () => {
  console.log(`Backend Server running on http://localhost:5000`);
});
