import React, { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { FiLock, FiEye, FiEyeOff, FiCheckCircle } from "react-icons/fi";
import { FaLeaf } from "react-icons/fa";

import "../styles/ResetPassword.css";

function ResetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!token) {
      setError("ไม่พบ Token หรือลิงก์สำหรับเปลี่ยนรหัสผ่านไม่ถูกต้อง");
      return;
    }

    if (!password) {
      setError("กรุณากรอกรหัสผ่านใหม่");
      return;
    }

    if (password.length < 6) {
      setError("รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร");
      return;
    }

    if (password !== confirmPassword) {
      setError("รหัสผ่านไม่ตรงกัน");
      return;
    }

    setLoading(true);

    const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:5000";

    try {
      const res = await fetch(`${apiUrl}/api/auth/reset-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token,
          password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "ไม่สามารถเปลี่ยนรหัสผ่านได้");
        return;
      }

      alert("เปลี่ยนรหัสผ่านสำเร็จ กรุณาเข้าสู่ระบบใหม่");
      navigate("/login");
    } catch (err) {
      console.error(err);
      setError("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="reset-page">
      <div className="reset-card">
        <div className="reset-logo">
          <div className="reset-logo-circle">
            <FaLeaf />
          </div>
          <h1>DurianCare AI</h1>
        </div>

        <div className="reset-icon">
          <FiCheckCircle />
        </div>

        <h2>ตั้งรหัสผ่านใหม่</h2>

        <p className="reset-description">
          กรุณากำหนดรหัสผ่านใหม่
          <br />
          สำหรับบัญชีของคุณ
        </p>

        {error && <div className="reset-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          {/* Password */}
          <div className="reset-input-box">
            <FiLock />
            <input
              type={showPassword ? "text" : "password"}
              placeholder="รหัสผ่านใหม่"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError("");
              }}
              autoComplete="new-password"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
            >
              {showPassword ? <FiEyeOff /> : <FiEye />}
            </button>
          </div>

          {/* Confirm Password */}
          <div className="reset-input-box">
            <FiLock />
            <input
              type={showConfirmPassword ? "text" : "password"}
              placeholder="ยืนยันรหัสผ่านใหม่"
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                setError("");
              }}
              autoComplete="new-password"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              aria-label={showConfirmPassword ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
            >
              {showConfirmPassword ? <FiEyeOff /> : <FiEye />}
            </button>
          </div>

          <button type="submit" className="reset-submit" disabled={loading}>
            {loading ? "กำลังเปลี่ยนรหัสผ่าน..." : "เปลี่ยนรหัสผ่าน"}
          </button>
        </form>

        <Link to="/login" className="reset-back">
          กลับไปหน้าเข้าสู่ระบบ
        </Link>
      </div>
    </div>
  );
}

export default ResetPassword;
