// src/prismaClient.js
// สร้าง PrismaClient ตัวเดียวใช้ร่วมกันทั้งแอป (ป้องกันเปิด connection ซ้ำซ้อนตอน dev/reload)

const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

module.exports = prisma;
