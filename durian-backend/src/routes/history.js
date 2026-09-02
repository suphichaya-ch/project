// src/routes/history.js
const express = require("express");
const jwt = require("jsonwebtoken");
const prisma = require("../prismaClient");

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";

// Middleware สำหรับตรวจสอบ Token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: "กรุณาเข้าสู่ระบบก่อนใช้งาน" });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.userId = payload.sub;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Token ไม่ถูกต้องหรือหมดอายุ" });
  }
};

// GET /api/history - ดึงประวัติทั้งหมดเฉพาะของผู้ใช้ที่ล็อกอิน
router.get("/", authenticateToken, async (req, res) => {
  try {
    const history = await prisma.analysisHistory.findMany({
      where: { userId: req.userId },
      orderBy: { createdAt: "desc" },
    });
    return res.json({ history });
  } catch (err) {
    console.error("Error in GET /api/history:", err);
    return res.status(500).json({ error: "ไม่สามารถดึงข้อมูลประวัติได้" });
  }
});

// GET /api/history/stats - สรุปสถิติผลการตรวจสำหรับหน้า Dashboard
router.get("/stats", authenticateToken, async (req, res) => {
  try {
    const history = await prisma.analysisHistory.findMany({
      where: { userId: req.userId },
    });

    const totalScans = history.length;
    const healthyCount = history.filter(
      (item) =>
        item.diseaseName === "ปกติ" ||
        item.diseaseName?.toLowerCase() === "healthy",
    ).length;
    const diseaseCount = totalScans - healthyCount;

    return res.json({
      totalScans,
      healthyCount,
      diseaseCount,
    });
  } catch (err) {
    console.error("Error in GET /api/history/stats:", err);
    return res.status(500).json({ error: "ไม่สามารถดึงข้อมูลสถิติได้" });
  }
});

// POST /api/history - บันทึกผลวิเคราะห์ใหม่พร้อมผูก userId
router.post("/", authenticateToken, async (req, res) => {
  try {
    const { imageUrl, diseaseName, confidence, description, treatment } =
      req.body;

    const newRecord = await prisma.analysisHistory.create({
      data: {
        userId: req.userId,
        imageUrl,
        diseaseName,
        confidence: parseFloat(confidence) || 0,
        description,
        treatment,
      },
    });

    return res.status(201).json({ history: newRecord });
  } catch (err) {
    console.error("Error in POST /api/history:", err);
    return res
      .status(500)
      .json({ error: "ไม่สามารถบันทึกประวัติการวิเคราะห์ได้" });
  }
});

// DELETE /api/history/:id - ลบประวัติการวิเคราะห์
router.delete("/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.analysisHistory.deleteMany({
      where: {
        id,
        userId: req.userId,
      },
    });
    return res.json({ message: "ลบประวัติการวิเคราะห์เรียบร้อยแล้ว" });
  } catch (err) {
    console.error("Error in DELETE /api/history/:id:", err);
    return res.status(500).json({ error: "ไม่สามารถลบข้อมูลได้" });
  }
});

module.exports = router;
