import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FiMail, FiArrowLeft } from "react-icons/fi";
import { FaLeaf } from "react-icons/fa";

import "../styles/ForgotPassword.css";

function ForgotPassword() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");
    setMessage("");

    const trimmedEmail = email.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!trimmedEmail) {
      setError("กรุณากรอกอีเมล");
      return;
    }

    if (!emailRegex.test(trimmedEmail)) {
      setError("รูปแบบอีเมลไม่ถูกต้อง");
      return;
    }

    setLoading(true);

    const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:5000";

    try {
      const res = await fetch(`${apiUrl}/api/auth/forgot-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: trimmedEmail,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "ไม่สามารถดำเนินการได้");
        return;
      }

      setMessage("สร้างคำขอเปลี่ยนรหัสผ่านสำเร็จ");

      // Development mode
      if (data.resetToken) {
        setTimeout(() => {
          navigate(`/reset-password?token=${data.resetToken}`);
        }, 1200);
      }
    } catch (err) {
      console.error(err);
      setError("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="forgot-page">
      <div className="forgot-card">
        <div className="forgot-logo">
          <div className="forgot-logo-circle">
            <FaLeaf />
          </div>
          <h1>DurianCare AI</h1>
        </div>

        <div className="forgot-icon">
          <FiMail />
        </div>

        <h2>ลืมรหัสผ่าน?</h2>

        <p className="forgot-description">
          กรอกอีเมลที่ใช้สมัครสมาชิก
          <br />
          เพื่อดำเนินการตั้งรหัสผ่านใหม่
        </p>

        {error && <div className="forgot-error">{error}</div>}

        {message && <div className="forgot-success">{message}</div>}

        <form onSubmit={handleSubmit}>
          <div className="forgot-input-box">
            <FiMail />
            <input
              type="email"
              placeholder="อีเมล"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setError("");
              }}
              autoComplete="email"
            />
          </div>

          <button type="submit" className="forgot-submit" disabled={loading}>
            {loading ? "กำลังตรวจสอบ..." : "ดำเนินการต่อ"}
          </button>
        </form>

        <Link to="/login" className="back-login">
          <FiArrowLeft />
          กลับไปหน้าเข้าสู่ระบบ
        </Link>
      </div>
    </div>
  );
}

export default ForgotPassword;
