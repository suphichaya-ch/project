import React, { useState } from "react";
import { Link } from "react-router-dom";
import { FiLock, FiEye, FiEyeOff, FiUser, FiMail } from "react-icons/fi";
import { FcGoogle } from "react-icons/fc";
import { SiLine } from "react-icons/si";
import { FaLeaf } from "react-icons/fa";
import "../styles/Register.css";

function Register() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  return (
    <div className="page-wrapper">
      <div className="login-container">
        {/* ฝั่งซ้าย: โลโก้ และ ข้อความแบรนด์ (ดึงมาจาก Login) */}
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

          <form onSubmit={(e) => e.preventDefault()}>
            <div className="input-box">
              <FiUser className="input-icon-left" />
              <input type="text" placeholder="ชื่อ-นามสกุล" required />
            </div>

            <div className="input-box">
              <FiMail className="input-icon-left" />
              <input type="email" placeholder="อีเมล" required />
            </div>

            <div className="input-box">
              <FiLock className="input-icon-left" />
              <input
                type={showPassword ? "text" : "password"}
                placeholder="รหัสผ่าน"
                required
              />
              <button
                type="button"
                className="toggle-password-btn"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <FiEyeOff /> : <FiEye />}
              </button>
            </div>

            <div className="input-box">
              <FiLock className="input-icon-left" />
              <input
                type={showConfirmPassword ? "text" : "password"}
                placeholder="ยืนยันรหัสผ่าน"
                required
              />
              <button
                type="button"
                className="toggle-password-btn"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                {showConfirmPassword ? <FiEyeOff /> : <FiEye />}
              </button>
            </div>

            <div className="form-options">
              <label className="remember-me">
                <input type="checkbox" className="custom-checkbox" required />
                <span>
                  ฉันยอมรับ ข้อตกลงการใช้งาน และ นโยบายความเป็นส่วนตัว
                </span>
              </label>
            </div>

            <button className="login-button" type="submit">
              สมัครสมาชิก
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
