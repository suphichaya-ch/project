import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FiLock, FiEye, FiEyeOff, FiUser } from "react-icons/fi";
import { FcGoogle } from "react-icons/fc";
import { SiLine } from "react-icons/si";
import { FaLeaf } from "react-icons/fa";
import "../styles/Login.css";

function Login() {
  const navigate = useNavigate();

  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState("");
  const [loading, setLoading] = useState(false);

  // จัดการข้อมูลในฟอร์ม
  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: "",
      }));
    }

    if (serverError) {
      setServerError("");
    }
  };

  // ตรวจสอบข้อมูลก่อนเข้าสู่ระบบ
  const validateForm = () => {
    const newErrors = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!formData.email.trim()) {
      newErrors.email = "กรุณากรอกอีเมล";
    } else if (!emailRegex.test(formData.email.trim())) {
      newErrors.email = "รูปแบบอีเมลไม่ถูกต้อง (เช่น user@example.com)";
    }

    if (!formData.password) {
      newErrors.password = "กรุณากรอกรหัสผ่าน";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // เข้าสู่ระบบ
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    setLoading(true);
    setServerError("");

    const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:5000";

    try {
      const res = await fetch(`${apiUrl}/api/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: formData.email.trim(),
          password: formData.password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setServerError(data.error || "อีเมลหรือรหัสผ่านไม่ถูกต้อง");
        return;
      }

      // บันทึก Token
      localStorage.setItem("token", data.token);

      // เก็บข้อมูลผู้ใช้
      if (data.user) {
        localStorage.setItem("user", JSON.stringify(data.user));
      }

      // ไป Dashboard
      navigate("/dashboard");
    } catch (err) {
      console.error(err);
      setServerError("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้ กรุณาลองใหม่อีกครั้ง");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-wrapper">
      <div className="login-container">
        {/* ฝั่งซ้าย */}
        <div className="brand-section">
          <div className="brand-logo-wrapper">
            <FaLeaf className="brand-icon-logo" />
            <div className="brand-title-group">
              <h1 className="brand-title">DurianCare AI</h1>
            </div>
          </div>

          <p className="brand-description">
            ระบบช่วยวินิจฉัยโรคต้นทุเรียน
            <br />
            จากภาพถ่ายใบด้วยปัญญาประดิษฐ์
          </p>
        </div>

        {/* ฝั่งขวา */}
        <div className="login-card">
          <h2 className="login-title">เข้าสู่ระบบ</h2>
          <p className="login-subtitle">ยินดีต้อนรับ</p>

          {/* Server Error */}
          {serverError && (
            <div
              style={{
                color: "#e53e3e",
                backgroundColor: "#fff5f5",
                padding: "8px 12px",
                borderRadius: "6px",
                marginBottom: "12px",
                fontSize: "14px",
                textAlign: "center",
                border: "1px solid #feb2b2",
              }}
            >
              {serverError}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {/* Email */}
            <div className="input-box">
              <FiUser className="input-icon-left" />
              <input
                type="email"
                name="email"
                placeholder="อีเมล"
                value={formData.email}
                onChange={handleChange}
                autoComplete="email"
              />
            </div>

            {errors.email && (
              <p
                style={{
                  color: "#e53e3e",
                  fontSize: "12px",
                  marginTop: "-8px",
                  marginBottom: "8px",
                }}
              >
                {errors.email}
              </p>
            )}

            {/* Password */}
            <div className="input-box">
              <FiLock className="input-icon-left" />
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                placeholder="รหัสผ่าน"
                value={formData.password}
                onChange={handleChange}
                autoComplete="current-password"
              />

              <button
                type="button"
                className="toggle-password-btn"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
              >
                {showPassword ? <FiEyeOff /> : <FiEye />}
              </button>
            </div>

            {errors.password && (
              <p
                style={{
                  color: "#e53e3e",
                  fontSize: "12px",
                  marginTop: "-8px",
                  marginBottom: "8px",
                }}
              >
                {errors.password}
              </p>
            )}

            {/* Remember + Forgot Password */}
            <div className="form-options">
              <label className="remember-me">
                <input type="checkbox" className="custom-checkbox" />
                <span>จดจำฉัน</span>
              </label>

              <Link to="/forgot-password" className="forgot-password">
                ลืมรหัสผ่าน?
              </Link>
            </div>

            {/* Login Button */}
            <button className="login-button" type="submit" disabled={loading}>
              {loading ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
            </button>

            {/* Divider */}
            <div className="divider">
              <span>หรือเข้าสู่ระบบด้วย</span>
            </div>

            {/* Social Login */}
            <div className="social-buttons">
              <button type="button" className="social-btn google-btn">
                <FcGoogle className="social-icon" />
                <span>Google</span>
              </button>

              <button type="button" className="social-btn line-btn">
                <SiLine className="social-icon line-icon" />
                <span>LINE</span>
              </button>
            </div>

            {/* Register */}
            <p className="register-text">
              ยังไม่มีบัญชี? <Link to="/register">สมัครสมาชิก</Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}

export default Login;
