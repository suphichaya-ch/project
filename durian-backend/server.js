/**
 * server.js
 * ---------
 * Backend (Node/Express + Prisma ORM) ของ DurianCare AI
 *
 * - Auth Routes
 * - Profile Routes
 * - รับภาพจาก Frontend
 * - ส่งภาพให้ Flask CNN API
 * - รับผลวิเคราะห์ + ข้อมูลการดูแลแบบละเอียด
 * - บันทึกประวัติลง PostgreSQL ผ่าน Prisma
 */

const path = require("path");
const fs = require("fs");
const express = require("express");
const multer = require("multer");
const FormData = require("form-data");
const fetch = require("node-fetch");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const { randomUUID } = require("crypto");

const prisma = require("./src/prismaClient");
const authRoutes = require("./src/routes/auth");
const requireAuth = require("./src/middleware/requireAuth");

const app = express();

const PORT = process.env.PORT || 5000;

const CNN_API_URL = process.env.CNN_API_URL || "http://localhost:5001/predict";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";

// ============================================================
// Upload directory
// ============================================================

const UPLOAD_DIR = path.join(__dirname, "uploads");

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, {
    recursive: true,
  });
}

// ============================================================
// Middleware
// ============================================================

app.use(cors());
app.use(express.json());

app.use("/uploads", express.static(UPLOAD_DIR));

app.use("/api/auth", authRoutes);

// ============================================================
// Multer
// ============================================================

const upload = multer({
  storage: multer.memoryStorage(),
});

// ============================================================
// Healthy labels
// ============================================================

const HEALTHY_LABELS = [
  "HEALTHY_LEAF",
  "Healthy",
  "healthy",
  "ใบปกติ / ใบสุขภาพดี",
];

// ============================================================
// PROFILE
// ============================================================

// GET /api/profile
// ดึงข้อมูลผู้ใช้งานที่ Login อยู่
app.get("/api/profile", requireAuth, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: {
        id: req.userId,
      },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: "ไม่พบข้อมูลผู้ใช้งาน",
      });
    }

    return res.json({
      success: true,
      user,
    });
  } catch (err) {
    console.error("Error in GET /api/profile:", err);

    return res.status(500).json({
      success: false,
      error: "ไม่สามารถโหลดข้อมูลโปรไฟล์ได้",
      detail: err.message,
    });
  }
});

// ============================================================
// UPDATE PROFILE
// ============================================================

// PUT /api/profile
// แก้ไขชื่อและอีเมลของผู้ใช้งาน
app.put("/api/profile", requireAuth, async (req, res) => {
  try {
    const { name, email } = req.body;

    // --------------------------------------------------------
    // ตรวจสอบข้อมูล
    // --------------------------------------------------------

    if (email !== undefined && email !== null && email.trim() === "") {
      return res.status(400).json({
        success: false,
        error: "กรุณาระบุอีเมล",
      });
    }

    const newEmail =
      email !== undefined && email !== null
        ? email.trim().toLowerCase()
        : undefined;

    const newName =
      name !== undefined && name !== null ? name.trim() : undefined;

    // --------------------------------------------------------
    // ตรวจสอบ Email ซ้ำ
    // --------------------------------------------------------

    if (newEmail) {
      const existingUser = await prisma.user.findFirst({
        where: {
          email: newEmail,
          NOT: {
            id: req.userId,
          },
        },
      });

      if (existingUser) {
        return res.status(409).json({
          success: false,
          error: "อีเมลนี้ถูกใช้งานแล้ว",
        });
      }
    }

    // --------------------------------------------------------
    // เตรียมข้อมูลสำหรับ Update
    // --------------------------------------------------------

    const updateData = {};

    if (newName !== undefined) {
      updateData.name = newName;
    }

    if (newEmail !== undefined) {
      updateData.email = newEmail;
    }

    // ถ้าไม่มีข้อมูลให้แก้
    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        error: "ไม่มีข้อมูลสำหรับแก้ไข",
      });
    }

    // --------------------------------------------------------
    // Update User
    // --------------------------------------------------------

    const updatedUser = await prisma.user.update({
      where: {
        id: req.userId,
      },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return res.json({
      success: true,
      message: "แก้ไขข้อมูลโปรไฟล์สำเร็จ",
      user: updatedUser,
    });
  } catch (err) {
    console.error("Error in PUT /api/profile:", err);

    return res.status(500).json({
      success: false,
      error: "ไม่สามารถแก้ไขข้อมูลโปรไฟล์ได้",
      detail: err.message,
    });
  }
});

// ============================================================
// POST /api/predict
// ============================================================

app.post("/api/predict", upload.single("image"), async (req, res) => {
  try {
    // --------------------------------------------------------
    // 1. ตรวจสอบไฟล์
    // --------------------------------------------------------

    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: "ไม่พบไฟล์ภาพที่อัปโหลด",
      });
    }

    // --------------------------------------------------------
    // 2. ตรวจสอบ JWT และหา userId
    // --------------------------------------------------------

    let userId = null;

    const authHeader = req.headers.authorization || "";

    if (!authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        error: "กรุณาเข้าสู่ระบบก่อนบันทึกประวัติการวิเคราะห์",
      });
    }

    try {
      const token = authHeader.slice(7);

      const payload = jwt.verify(token, JWT_SECRET);

      console.log("JWT payload:", payload);

      userId = payload.sub || payload.userId || payload.id || null;
    } catch (jwtError) {
      console.error("JWT verification error:", jwtError.message);

      return res.status(401).json({
        success: false,
        error: "Token ไม่ถูกต้องหรือหมดอายุ กรุณาเข้าสู่ระบบใหม่",
      });
    }

    // --------------------------------------------------------
    // ตรวจ userId
    // --------------------------------------------------------

    if (!userId) {
      console.error("ไม่พบ userId ใน JWT");

      return res.status(401).json({
        success: false,
        error: "ไม่พบข้อมูลผู้ใช้จาก Token กรุณาเข้าสู่ระบบใหม่",
      });
    }

    console.log("userId ที่จะใช้บันทึกประวัติ:", userId);

    // --------------------------------------------------------
    // 3. ส่งรูปไป Flask CNN API
    // --------------------------------------------------------

    const formData = new FormData();

    formData.append("image", req.file.buffer, {
      filename: req.file.originalname || "upload.jpg",
      contentType: req.file.mimetype || "image/jpeg",
    });

    console.log("กำลังส่งภาพไป CNN API...");

    const cnnResponse = await fetch(CNN_API_URL, {
      method: "POST",
      body: formData,
      headers: formData.getHeaders(),
    });

    // --------------------------------------------------------
    // 4. ตรวจ Flask response
    // --------------------------------------------------------

    if (!cnnResponse.ok) {
      const errText = await cnnResponse.text();

      console.error("CNN API error:", errText);

      return res.status(502).json({
        success: false,
        error: "โมเดล CNN ประมวลผลไม่สำเร็จ",
        detail: errText,
      });
    }

    // --------------------------------------------------------
    // 5. อ่านผล AI
    // --------------------------------------------------------

    const result = await cnnResponse.json();

    console.log("ผลจาก CNN:", result);

    // --------------------------------------------------------
    // 6. Disease
    // --------------------------------------------------------

    const rawClass = result.diseaseName || result.class || "UNKNOWN";

    const diseaseName = result.disease || result.name_th || rawClass;

    const isDiseaseDetected = !HEALTHY_LABELS.includes(rawClass);

    // --------------------------------------------------------
    // 7. Treatment
    // --------------------------------------------------------

    let formattedTreatment;

    if (
      result.treatment &&
      typeof result.treatment === "object" &&
      !Array.isArray(result.treatment)
    ) {
      formattedTreatment = {
        immediate_actions: Array.isArray(result.treatment.immediate_actions)
          ? result.treatment.immediate_actions
          : [],

        chemical_control: Array.isArray(result.treatment.chemical_control)
          ? result.treatment.chemical_control
          : [],

        nutrition: Array.isArray(result.treatment.nutrition)
          ? result.treatment.nutrition
          : [],

        prevention: Array.isArray(result.treatment.prevention)
          ? result.treatment.prevention
          : [],

        warning: result.treatment.warning || "",
      };
    } else if (Array.isArray(result.treatment)) {
      formattedTreatment = {
        immediate_actions: result.treatment,
        chemical_control: [],
        nutrition: [],
        prevention: [],
        warning: "",
      };
    } else if (
      typeof result.treatment === "string" &&
      result.treatment.trim() !== ""
    ) {
      formattedTreatment = {
        immediate_actions: [result.treatment],
        chemical_control: [],
        nutrition: [],
        prevention: [],
        warning: "",
      };
    } else {
      formattedTreatment = {
        immediate_actions: [],
        chemical_control: [],
        nutrition: [],
        prevention: [],
        warning: "ไม่มีข้อมูลคำแนะนำการดูแลรักษา",
      };
    }

    // --------------------------------------------------------
    // 8. JSON string สำหรับ PostgreSQL
    // --------------------------------------------------------

    const treatmentString = JSON.stringify(formattedTreatment);

    // --------------------------------------------------------
    // 9. Confidence
    // --------------------------------------------------------

    let formattedConfidence = 0;

    if (typeof result.confidence === "number") {
      formattedConfidence =
        result.confidence <= 1
          ? Number((result.confidence * 100).toFixed(1))
          : Number(result.confidence.toFixed(1));
    }

    // --------------------------------------------------------
    // 10. Save image
    // --------------------------------------------------------

    const ext = path.extname(req.file.originalname || "") || ".jpg";

    const savedFilename = `${randomUUID()}${ext}`;

    const savedPath = path.join(UPLOAD_DIR, savedFilename);

    fs.writeFileSync(savedPath, req.file.buffer);

    // ใช้ URL ของ Backend โดยตรง
    const imageUrl = `${req.protocol}://${req.get("host")}/uploads/${savedFilename}`;

    // --------------------------------------------------------
    // 11. เตรียมข้อมูล
    // --------------------------------------------------------

    const formatted = {
      diseaseName: rawClass,

      disease: diseaseName,

      confidence: formattedConfidence,

      symptoms: result.symptoms || "ไม่มีข้อมูลลักษณะอาการ",

      treatment: formattedTreatment,

      isDiseaseDetected: isDiseaseDetected,

      imageUrl,
    };

    // --------------------------------------------------------
    // 12. บันทึกประวัติลง PostgreSQL
    // --------------------------------------------------------

    console.log("=================================");

    console.log("กำลังบันทึกประวัติ...");

    console.log("userId:", userId);

    console.log("diseaseName:", formatted.diseaseName);

    console.log("confidence:", formatted.confidence);

    let savedRecord = null;

    try {
      savedRecord = await prisma.analysisHistory.create({
        data: {
          userId: userId,

          imageUrl: imageUrl,

          diseaseName: formatted.diseaseName,

          confidence: formatted.confidence,

          symptoms: formatted.symptoms,

          treatment: treatmentString,

          isDiseaseDetected: formatted.isDiseaseDetected,
        },
      });

      console.log("✅ บันทึกประวัติสำเร็จ");

      console.log("History ID:", savedRecord.id);

      console.log("=================================");
    } catch (dbErr) {
      console.error("❌ DATABASE ERROR");

      console.error(dbErr);

      console.error("=================================");

      return res.status(500).json({
        success: false,

        error: "วิเคราะห์ภาพสำเร็จ แต่ไม่สามารถบันทึกประวัติได้",

        detail: dbErr.message,
      });
    }

    // --------------------------------------------------------
    // 13. ส่งผลกลับ Frontend
    // --------------------------------------------------------

    return res.json({
      success: true,

      ...formatted,

      id: savedRecord.id,
    });
  } catch (err) {
    console.error("Error in /api/predict:", err);

    return res.status(500).json({
      success: false,

      error: "เกิดข้อผิดพลาดฝั่งเซิร์ฟเวอร์ระหว่างวิเคราะห์ภาพ",

      detail: err.message,
    });
  }
});

// ============================================================
// GET /api/history
// ============================================================

app.get("/api/history", requireAuth, async (req, res) => {
  try {
    console.log("โหลดประวัติของ userId:", req.userId);

    const records = await prisma.analysisHistory.findMany({
      where: {
        userId: req.userId,
      },

      orderBy: {
        createdAt: "desc",
      },

      take: 100,
    });

    // --------------------------------------------------------
    // แปลง treatment กลับเป็น object
    // --------------------------------------------------------

    const formattedRecords = records.map((record) => {
      let treatment = record.treatment;

      if (typeof treatment === "string") {
        try {
          treatment = JSON.parse(treatment);
        } catch (error) {
          treatment = {
            immediate_actions: treatment ? [treatment] : [],

            chemical_control: [],

            nutrition: [],

            prevention: [],

            warning: "",
          };
        }
      }

      return {
        ...record,
        treatment,
      };
    });

    console.log(`พบประวัติ ${formattedRecords.length} รายการ`);

    return res.json(formattedRecords);
  } catch (err) {
    console.error("Error in GET /api/history:", err);

    return res.status(500).json({
      error: "ดึงประวัติการวิเคราะห์ไม่สำเร็จ",

      detail: err.message,
    });
  }
});

// ============================================================
// GET /api/history/:id
// ============================================================

app.get("/api/history/:id", requireAuth, async (req, res) => {
  try {
    const record = await prisma.analysisHistory.findUnique({
      where: {
        id: req.params.id,
      },
    });

    if (!record || record.userId !== req.userId) {
      return res.status(404).json({
        error: "ไม่พบประวัติการวิเคราะห์นี้",
      });
    }

    let treatment = record.treatment;

    if (typeof treatment === "string") {
      try {
        treatment = JSON.parse(treatment);
      } catch (error) {
        treatment = {
          immediate_actions: treatment ? [treatment] : [],

          chemical_control: [],

          nutrition: [],

          prevention: [],

          warning: "",
        };
      }
    }

    return res.json({
      ...record,
      treatment,
    });
  } catch (err) {
    console.error("Error in GET /api/history/:id:", err);

    return res.status(500).json({
      error: "ดึงประวัติการวิเคราะห์ไม่สำเร็จ",

      detail: err.message,
    });
  }
});

// ============================================================
// DELETE /api/history/:id
// ============================================================

app.delete("/api/history/:id", requireAuth, async (req, res) => {
  try {
    const record = await prisma.analysisHistory.findUnique({
      where: {
        id: req.params.id,
      },
    });

    if (!record || record.userId !== req.userId) {
      return res.status(404).json({
        error: "ไม่พบประวัติการวิเคราะห์นี้",
      });
    }

    await prisma.analysisHistory.delete({
      where: {
        id: req.params.id,
      },
    });

    return res.json({
      success: true,

      message: "ลบประวัติการวิเคราะห์สำเร็จ",
    });
  } catch (err) {
    console.error("Error in DELETE /api/history/:id:", err);

    return res.status(500).json({
      error: "ลบประวัติการวิเคราะห์ไม่สำเร็จ",

      detail: err.message,
    });
  }
});

// ============================================================
// Root
// ============================================================

app.get("/", (req, res) => {
  res.send("DurianCare AI backend is running");
});

// ============================================================
// Start server
// ============================================================

app.listen(PORT, () => {
  console.log("=================================");

  console.log(`durian-backend listening on port ${PORT}`);

  console.log(`CNN API: ${CNN_API_URL}`);

  console.log("=================================");
});
