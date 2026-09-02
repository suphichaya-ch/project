import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FiLock, FiEye, FiEyeOff, FiUser, FiMail } from "react-icons/fi";
import { FcGoogle } from "react-icons/fc";
import { SiLine } from "react-icons/si";
import { FaLeaf } from "react-icons/fa";
import "../styles/Register.css";

function Register() {
  const navigate = useNavigate();

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // State สำหรับเก็บข้อมูลในฟอร์ม
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    acceptedTerms: false,
  });

  // State สำหรับเก็บข้อความแจ้งเตือนข้อผิดพลาด
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState("");
  const [loading, setLoading] = useState(false);

  // จัดการการอัปเดตข้อมูลเมื่อพิมพ์
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));

    // เคลียร์ Error ของช่องที่กำลังพิมพ์
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
    if (serverError) setServerError("");
  };

  // ตรวจสอบความถูกต้องของข้อมูลในฟอร์ม
  const validateForm = () => {
    const newErrors = {};

    // 1. ตรวจสอบชื่อ
    if (!formData.name.trim()) {
      newErrors.name = "กรุณากรอกชื่อ-นามสกุล";
    }

    // 2. ตรวจสอบอีเมลด้วย Regex
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email.trim()) {
      newErrors.email = "กรุณากรอกอีเมล";
    } else if (!emailRegex.test(formData.email.trim())) {
      newErrors.email = "รูปแบบอีเมลไม่ถูกต้อง (เช่น name@example.com)";
    }

    // 3. ตรวจสอบรหัสผ่าน
    if (!formData.password) {
      newErrors.password = "กรุณากรอกรหัสผ่าน";
    } else if (formData.password.length < 6) {
      newErrors.password = "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร";
    }

    // 4. ตรวจสอบการยืนยันรหัสผ่าน (ต้องตรงกัน)
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = "กรุณายืนยันรหัสผ่าน";
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "รหัสผ่านไม่ตรงกัน กรุณาตรวจสอบอีกครั้ง";
    }

    // 5. ตรวจสอบการยินยอมข้อตกลง
    if (!formData.acceptedTerms) {
      newErrors.acceptedTerms = "กรุณายอมรับข้อตกลงและนโยบายความเป็นส่วนตัว";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ฟังก์ชันส่งข้อมูลสมัครสมาชิกไปยัง Backend
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    setLoading(true);
    setServerError("");

    try {
      const res = await fetch("http://localhost:5000/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          password: formData.password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setServerError(data.error || "สมัครสมาชิกไม่สำเร็จ");
        return;
      }

      // บันทึก Token และย้ายไปหน้า Dashboard
      localStorage.setItem("token", data.token);
      navigate("/dashboard");
    } catch (err) {
      setServerError("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้ กรุณาลองใหม่อีกครั้ง");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-wrapper">
      <div className="login-container">
        {/* ฝั่งซ้าย: โลโก้ และ ข้อความแบรนด์ */}
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

        {/* ฝั่งขวา: การ์ด Register */}
        <div className="login-card">
          <h2 className="login-title">สมัครสมาชิก</h2>
          <p className="login-subtitle">สร้างบัญชีเพื่อใช้งานระบบ</p>

          {/* ข้อความ Error จาก Server */}
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
            {/* ชื่อ-นามสกุล */}
            <div className="input-box">
              <FiUser className="input-icon-left" />
              <input
                type="text"
                name="name"
                placeholder="ชื่อ-นามสกุล"
                value={formData.name}
                onChange={handleChange}
              />
            </div>
            {errors.name && (
              <p
                style={{
                  color: "#e53e3e",
                  fontSize: "12px",
                  marginTop: "-8px",
                  marginBottom: "8px",
                }}
              >
                {errors.name}
              </p>
            )}

            {/* อีเมล */}
            <div className="input-box">
              <FiMail className="input-icon-left" />
              <input
                type="text"
                name="email"
                placeholder="อีเมล"
                value={formData.email}
                onChange={handleChange}
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

            {/* รหัสผ่าน */}
            <div className="input-box">
              <FiLock className="input-icon-left" />
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                placeholder="รหัสผ่าน"
                value={formData.password}
                onChange={handleChange}
              />
              <button
                type="button"
                className="toggle-password-btn"
                onClick={() => setShowPassword(!showPassword)}
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

            {/* ยืนยันรหัสผ่าน */}
            <div className="input-box">
              <FiLock className="input-icon-left" />
              <input
                type={showConfirmPassword ? "text" : "password"}
                name="confirmPassword"
                placeholder="ยืนยันรหัสผ่าน"
                value={formData.confirmPassword}
                onChange={handleChange}
              />
              <button
                type="button"
                className="toggle-password-btn"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                {showConfirmPassword ? <FiEyeOff /> : <FiEye />}
              </button>
            </div>
            {errors.confirmPassword && (
              <p
                style={{
                  color: "#e53e3e",
                  fontSize: "12px",
                  marginTop: "-8px",
                  marginBottom: "8px",
                }}
              >
                {errors.confirmPassword}
              </p>
            )}

            {/* ยอมรับข้อตกลง */}
            <div className="form-options">
              <label className="remember-me">
                <input
                  type="checkbox"
                  name="acceptedTerms"
                  className="custom-checkbox"
                  checked={formData.acceptedTerms}
                  onChange={handleChange}
                />
                <span>
                  ฉันยอมรับ ข้อตกลงการใช้งาน และ นโยบายความเป็นส่วนตัว
                </span>
              </label>
            </div>
            {errors.acceptedTerms && (
              <p
                style={{
                  color: "#e53e3e",
                  fontSize: "12px",
                  marginTop: "-4px",
                  marginBottom: "8px",
                }}
              >
                {errors.acceptedTerms}
              </p>
            )}

            <button className="login-button" type="submit" disabled={loading}>
              {loading ? "กำลังลงทะเบียน..." : "สมัครสมาชิก"}
            </button>

            <div className="divider">
              <span>หรือสมัครด้วย</span>
            </div>

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

            <p className="register-text">
              มีบัญชีอยู่แล้ว? <Link to="/login">เข้าสู่ระบบ</Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}

export default Register;
