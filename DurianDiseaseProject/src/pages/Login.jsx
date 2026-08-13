import React, { useState } from "react";
import { Link } from "react-router-dom";
import { FiLock, FiEye, FiEyeOff, FiUser } from "react-icons/fi";
import { FcGoogle } from "react-icons/fc";
import { SiLine } from "react-icons/si";
import { FaLeaf } from "react-icons/fa";
import "../styles/Login.css";

function Login() {
  const [showPassword, setShowPassword] = useState(false);

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

        {/* ฝั่งขวา: การ์ด Login */}
        <div className="login-card">
          <h2 className="login-title">เข้าสู่ระบบ</h2>
          <p className="login-subtitle">ยินดีต้อนรับ</p>

          <form onSubmit={(e) => e.preventDefault()}>
            {/* ช่อง Username/Email - ใส่ไอคอนผู้ใช้ */}
            <div className="input-box">
              <FiUser className="input-icon-left" />
              <input type="text" placeholder="อีเมลหรือชื่อผู้ใช้" required />
            </div>

            {/* ช่อง Password - ใส่ไอคอนกุญแจ */}
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

            <div className="form-options">
              <label className="remember-me">
                <input type="checkbox" className="custom-checkbox" />
                <span>จดจำฉัน</span>
              </label>
              <a href="#" className="forgot-password">
                ลืมรหัสผ่าน?
              </a>
            </div>

            <button className="login-button" type="submit">
              เข้าสู่ระบบ
            </button>

            <div className="divider">
              <span>หรือเข้าสู่ระบบด้วย</span>
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
              ยังไม่มีบัญชี? <Link to="/register">สมัครสมาชิก</Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}

export default Login;
