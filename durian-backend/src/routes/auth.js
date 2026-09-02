// src/routes/auth.js
// จัดการ Authentication + Profile + Reset Password

const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");

const prisma = require("../prismaClient");

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";

const JWT_EXPIRES_IN = "7d";
const SALT_ROUNDS = 10;

// ============================================================
// Helper
// ============================================================

function signToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
    },
    JWT_SECRET,
    {
      expiresIn: JWT_EXPIRES_IN,
    },
  );
}

function toPublicUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
  };
}

// ============================================================
// POST /api/auth/register
// ============================================================

router.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        error: "กรุณากรอกอีเมลและรหัสผ่าน",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        error: "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร",
      });
    }

    const cleanEmail = email.trim().toLowerCase();

    const existing = await prisma.user.findUnique({
      where: {
        email: cleanEmail,
      },
    });

    if (existing) {
      return res.status(409).json({
        error: "อีเมลนี้ถูกใช้สมัครสมาชิกไปแล้ว",
      });
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    const user = await prisma.user.create({
      data: {
        name: name?.trim() || null,
        email: cleanEmail,
        passwordHash,
      },
    });

    const token = signToken(user);

    return res.status(201).json({
      token,
      user: toPublicUser(user),
    });
  } catch (err) {
    console.error("Error in POST /api/auth/register:", err);

    return res.status(500).json({
      error: "สมัครสมาชิกไม่สำเร็จ กรุณาลองใหม่",
    });
  }
});

// ============================================================
// POST /api/auth/login
// ============================================================

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        error: "กรุณากรอกอีเมลและรหัสผ่าน",
      });
    }

    const cleanEmail = email.trim().toLowerCase();

    const user = await prisma.user.findUnique({
      where: {
        email: cleanEmail,
      },
    });

    if (!user) {
      return res.status(401).json({
        error: "อีเมลหรือรหัสผ่านไม่ถูกต้อง",
      });
    }

    const passwordMatches = await bcrypt.compare(password, user.passwordHash);

    if (!passwordMatches) {
      return res.status(401).json({
        error: "อีเมลหรือรหัสผ่านไม่ถูกต้อง",
      });
    }

    const token = signToken(user);

    return res.json({
      token,
      user: toPublicUser(user),
    });
  } catch (err) {
    console.error("Error in POST /api/auth/login:", err);

    return res.status(500).json({
      error: "เข้าสู่ระบบไม่สำเร็จ กรุณาลองใหม่",
    });
  }
});

// ============================================================
// GET /api/auth/me
// ============================================================

router.get("/me", async (req, res) => {
  try {
    const authHeader = req.headers.authorization || "";

    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

    if (!token) {
      return res.status(401).json({
        error: "ไม่พบ token",
      });
    }

    const payload = jwt.verify(token, JWT_SECRET);

    const user = await prisma.user.findUnique({
      where: {
        id: payload.sub,
      },
    });

    if (!user) {
      return res.status(401).json({
        error: "ไม่พบผู้ใช้นี้",
      });
    }

    return res.json({
      user: toPublicUser(user),
    });
  } catch (err) {
    return res.status(401).json({
      error: "token ไม่ถูกต้องหรือหมดอายุ",
    });
  }
});

// ============================================================
// PUT /api/auth/me
// ============================================================

router.put("/me", async (req, res) => {
  try {
    const authHeader = req.headers.authorization || "";

    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

    if (!token) {
      return res.status(401).json({
        error: "ไม่พบ token",
      });
    }

    const payload = jwt.verify(token, JWT_SECRET);

    const { name, email } = req.body;

    if (!name || !email) {
      return res.status(400).json({
        error: "กรุณากรอกชื่อและอีเมล",
      });
    }

    const cleanEmail = email.trim().toLowerCase();

    const existingUser = await prisma.user.findFirst({
      where: {
        email: cleanEmail,
        NOT: {
          id: payload.sub,
        },
      },
    });

    if (existingUser) {
      return res.status(409).json({
        error: "อีเมลนี้ถูกใช้งานโดยบัญชีอื่นแล้ว",
      });
    }

    const updatedUser = await prisma.user.update({
      where: {
        id: payload.sub,
      },
      data: {
        name: name.trim(),
        email: cleanEmail,
      },
    });

    return res.json({
      user: toPublicUser(updatedUser),
    });
  } catch (err) {
    console.error("Error in PUT /api/auth/me:", err);

    return res.status(500).json({
      error: "แก้ไขข้อมูลไม่สำเร็จ กรุณาลองใหม่",
    });
  }
});

// ============================================================
// POST /api/auth/forgot-password
// ขอ Reset Password
// ============================================================

router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        error: "กรุณากรอกอีเมล",
      });
    }

    const cleanEmail = email.trim().toLowerCase();

    const user = await prisma.user.findUnique({
      where: {
        email: cleanEmail,
      },
    });

    // ไม่เปิดเผยว่าอีเมลมีอยู่หรือไม่
    if (!user) {
      return res.json({
        success: true,
        message: "หากอีเมลนี้มีอยู่ในระบบ จะสามารถดำเนินการตั้งรหัสผ่านใหม่ได้",
      });
    }

    // สร้าง Token
    const resetToken = crypto.randomBytes(32).toString("hex");

    // Token ใช้งานได้ 15 นาที
    const resetTokenExpiry = new Date(Date.now() + 15 * 60 * 1000);

    await prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        resetToken,
        resetTokenExpiry,
      },
    });

    // ======================================================
    // สำหรับ Development
    // ตอนทำระบบจริงควรส่ง Token ผ่าน Email
    // ======================================================

    console.log("=================================");

    console.log("PASSWORD RESET TOKEN:");

    console.log(resetToken);

    console.log("=================================");

    return res.json({
      success: true,
      message: "สร้างคำขอเปลี่ยนรหัสผ่านสำเร็จ",

      // ใช้สำหรับทดสอบระบบในเครื่อง
      resetToken,
    });
  } catch (err) {
    console.error("Error in forgot-password:", err);

    return res.status(500).json({
      error: "ไม่สามารถดำเนินการลืมรหัสผ่านได้",
    });
  }
});

// ============================================================
// POST /api/auth/reset-password
// ตั้งรหัสผ่านใหม่
// ============================================================

router.post("/reset-password", async (req, res) => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      return res.status(400).json({
        error: "ข้อมูลสำหรับเปลี่ยนรหัสผ่านไม่ครบ",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        error: "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร",
      });
    }

    const user = await prisma.user.findFirst({
      where: {
        resetToken: token,
      },
    });

    if (!user) {
      return res.status(400).json({
        error: "ลิงก์เปลี่ยนรหัสผ่านไม่ถูกต้อง",
      });
    }

    if (!user.resetTokenExpiry || user.resetTokenExpiry < new Date()) {
      return res.status(400).json({
        error: "ลิงก์เปลี่ยนรหัสผ่านหมดอายุแล้ว กรุณาขอใหม่",
      });
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    await prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        passwordHash,

        // ใช้ Token ได้ครั้งเดียว
        resetToken: null,
        resetTokenExpiry: null,
      },
    });

    return res.json({
      success: true,
      message: "เปลี่ยนรหัสผ่านสำเร็จ กรุณาเข้าสู่ระบบใหม่",
    });
  } catch (err) {
    console.error("Error in reset-password:", err);

    return res.status(500).json({
      error: "ไม่สามารถเปลี่ยนรหัสผ่านได้",
    });
  }
});

module.exports = router;
