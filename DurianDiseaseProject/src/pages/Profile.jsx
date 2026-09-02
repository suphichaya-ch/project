import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiUser,
  FiMail,
  FiEdit3,
  FiSave,
  FiArrowLeft,
  FiCheckCircle,
  FiAlertCircle,
} from "react-icons/fi";

import "../styles/Profile.css";

function Profile() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: "",
    email: "",
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:5000";

  // =====================================================
  // โหลดข้อมูลผู้ใช้
  // =====================================================
  useEffect(() => {
    const fetchProfile = async () => {
      const token = localStorage.getItem("token");

      if (!token) {
        navigate("/login");
        return;
      }

      try {
        const response = await fetch(`${apiUrl}/api/auth/me`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await response.json();

        if (!response.ok) {
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          navigate("/login");
          return;
        }

        setFormData({
          name: data.user?.name || "",
          email: data.user?.email || "",
        });
      } catch (err) {
        console.error("Profile loading error:", err);
        setError("ไม่สามารถโหลดข้อมูลโปรไฟล์ได้");
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [navigate, apiUrl]);

  // =====================================================
  // จัดการการเปลี่ยนข้อมูล
  // =====================================================
  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    setMessage("");
    setError("");
  };

  // =====================================================
  // บันทึกข้อมูล
  // =====================================================
  const handleSubmit = async (e) => {
    e.preventDefault();

    setMessage("");
    setError("");

    const trimmedName = formData.name.trim();
    const trimmedEmail = formData.email.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!trimmedName) {
      setError("กรุณากรอกชื่อผู้ใช้งาน");
      return;
    }

    if (!trimmedEmail) {
      setError("กรุณากรอกอีเมล");
      return;
    }

    if (!emailRegex.test(trimmedEmail)) {
      setError("รูปแบบอีเมลไม่ถูกต้อง");
      return;
    }

    setSaving(true);
    const token = localStorage.getItem("token");

    try {
      const response = await fetch(`${apiUrl}/api/auth/me`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: trimmedName,
          email: trimmedEmail,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "ไม่สามารถบันทึกข้อมูลได้");
        return;
      }

      const updatedUser = {
        name: data.user?.name || trimmedName,
        email: data.user?.email || trimmedEmail,
      };

      setFormData(updatedUser);

      // อัปเดต localStorage เพื่อให้ส่วนอื่นของ App ได้ข้อมูลล่าสุด
      const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
      localStorage.setItem(
        "user",
        JSON.stringify({ ...currentUser, ...updatedUser }),
      );

      setMessage("บันทึกข้อมูลโปรไฟล์เรียบร้อยแล้ว");
    } catch (err) {
      console.error("Profile update error:", err);
      setError("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้");
    } finally {
      setSaving(false);
    }
  };

  // =====================================================
  // Loading
  // =====================================================
  if (loading) {
    return (
      <div className="profile-loading">
        <div className="profile-loading-spinner"></div>
        <p>กำลังโหลดข้อมูลโปรไฟล์...</p>
      </div>
    );
  }

  // =====================================================
  // Profile UI
  // =====================================================
  return (
    <div className="profile-page">
      <div className="profile-wrapper">
        {/* Header */}
        <div className="profile-header">
          <button
            className="profile-back-btn"
            onClick={() => navigate("/dashboard")}
          >
            <FiArrowLeft />
            <span>กลับหน้าหลัก</span>
          </button>

          <div className="profile-header-text">
            <h1>โปรไฟล์ผู้ใช้งาน</h1>
            <p>จัดการข้อมูลส่วนตัวและบัญชีผู้ใช้งาน</p>
          </div>
        </div>

        {/* Main Card */}
        <div className="profile-card">
          {/* Profile Avatar */}
          <div className="profile-avatar-section">
            <div className="profile-avatar">
              <FiUser />
            </div>

            <h2>{formData.name || "ผู้ใช้งาน"}</h2>
            <p>{formData.email}</p>

            <div className="profile-status">
              <FiCheckCircle />
              <span>บัญชีผู้ใช้งาน</span>
            </div>
          </div>

          {/* Divider */}
          <div className="profile-divider"></div>

          {/* Message */}
          {message && (
            <div className="profile-message success">
              <FiCheckCircle />
              <span>{message}</span>
            </div>
          )}

          {error && (
            <div className="profile-message error">
              <FiAlertCircle />
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="profile-form">
            {/* Name */}
            <div className="profile-field">
              <label htmlFor="name">ชื่อผู้ใช้งาน</label>

              <div className="profile-input-wrapper">
                <FiUser className="profile-input-icon" />

                <input
                  id="name"
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="กรอกชื่อผู้ใช้งาน"
                  autoComplete="name"
                />

                <FiEdit3 className="profile-edit-icon" />
              </div>
            </div>

            {/* Email */}
            <div className="profile-field">
              <label htmlFor="email">อีเมล</label>

              <div className="profile-input-wrapper">
                <FiMail className="profile-input-icon" />

                <input
                  id="email"
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="กรอกอีเมล"
                  autoComplete="email"
                />

                <FiEdit3 className="profile-edit-icon" />
              </div>
            </div>

            {/* Save */}
            <button
              type="submit"
              className="profile-save-btn"
              disabled={saving}
            >
              <FiSave />
              <span>{saving ? "กำลังบันทึก..." : "บันทึกข้อมูล"}</span>
            </button>
          </form>
        </div>

        {/* Information */}
        <div className="profile-info-card">
          <div className="profile-info-icon">
            <FiAlertCircle />
          </div>

          <div>
            <h3>ข้อมูลบัญชี</h3>
            <p>
              ข้อมูลที่แก้ไขจะถูกบันทึกลงในระบบฐานข้อมูล
              และใช้สำหรับการเข้าสู่ระบบและจัดเก็บประวัติการวิเคราะห์ของคุณ
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Profile;
