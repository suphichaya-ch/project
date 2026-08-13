import React, { useState } from "react";
import {
  FiHome,
  FiSearch,
  FiClock,
  FiBookOpen,
  FiUser,
  FiSettings,
  FiLogOut,
  FiBell,
  FiMenu,
  FiCamera,
  FiX,
} from "react-icons/fi";
import { FaLeaf } from "react-icons/fa";

// Import หน้า Analyze เข้ามาใช้งาน
import Analyze from "./Analyze";
import "../styles/Dashboard.css";

function Dashboard() {
  // State สำหรับเปิด-ปิด Sidebar
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // State สำหรับเก็บแท็บ/เมนูที่เลือกอยู่ปัจจุบัน
  const [activeTab, setActiveTab] = useState("dashboard");

  // ฟังก์ชั่นสลับสถานะ Sidebar
  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  // ข้อมูลจำลองสำหรับตัวเลขสถิติ
  const stats = [
    { value: "0", label: "ครั้งที่วิเคราะห์ทั้งหมด" },
    { value: "0", label: "โรคที่พบทั้งหมด" },
    { value: "0%", label: "ความแม่นยำเฉลี่ย" },
    { value: "0", label: "รายงานวันนี้" },
  ];

  // ข้อมูลจำลองสำหรับโรคล่าสุด
  const recentDiseases = [
    {
      id: 1,
      name: "โรคใบติด",
      accuracy: "98%",
      date: "12 พ.ค. 2567",
      image:
        "https://images.unsplash.com/photo-1592417817098-8f3d6eb12765?auto=format&fit=crop&q=80&w=300",
    },
    {
      id: 2,
      name: "โรคใบไหม้",
      accuracy: "95%",
      date: "10 พ.ค. 2567",
      image:
        "https://images.unsplash.com/photo-1530836369250-ef72a3f5cda8?auto=format&fit=crop&q=80&w=300",
    },
    {
      id: 3,
      name: "โรครากเน่า",
      accuracy: "96%",
      date: "8 พ.ค. 2567",
      image:
        "https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?auto=format&fit=crop&q=80&w=300",
    },
  ];

  // ฟังก์ชั่นแสดงเนื้อหาตามแท็บที่เลือก
  const renderTabContent = () => {
    switch (activeTab) {
      case "dashboard":
        return (
          <>
            <section className="welcome-section">
              <h1>สวัสดี, เกษตรกรทุเรียน 🌱</h1>
              <p>ยินดีต้อนรับสู่ DurianCare AI</p>
            </section>

            <section className="stats-grid">
              {stats.map((item, index) => (
                <div key={index} className="stat-card">
                  <h2>{item.value}</h2>
                  <p>{item.label}</p>
                </div>
              ))}
            </section>

            <section className="cta-banner">
              <div className="cta-text">
                <h2>วิเคราะห์ใบใหม่ตอนนี้</h2>
                <p>อัปโหลดภาพใบไม้เพื่อให้ AI วิเคราะห์โรค</p>
                <button
                  className="cta-button"
                  onClick={() => setActiveTab("analyze")}
                >
                  เริ่มวิเคราะห์
                </button>
              </div>
              <div className="cta-icon-wrapper">
                <div className="camera-circle">
                  <FiCamera />
                </div>
              </div>
            </section>

            <section className="recent-section">
              <div className="section-header">
                <h3>โรคที่พบล่าสุด</h3>
                <button
                  className="see-all-btn"
                  onClick={() => setActiveTab("history")}
                >
                  ดูทั้งหมด
                </button>
              </div>

              <div className="recent-grid">
                {recentDiseases.map((disease) => (
                  <div key={disease.id} className="disease-card">
                    <img
                      src={disease.image}
                      alt={disease.name}
                      className="disease-img"
                    />
                    <div className="disease-info">
                      <h4>{disease.name}</h4>
                      <span className="accuracy-badge">{disease.accuracy}</span>
                      <p className="disease-date">{disease.date}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </>
        );

      case "analyze":
        // เรียกใช้คอมโพเนนต์ Analyze หน้าวิเคราะห์โรคจริงตรงนี้
        return <Analyze />;

      case "history":
        return (
          <div className="tab-placeholder">
            <h2>📜 ประวัติการวิเคราะห์</h2>
            <p>รายการและผลประเมินโรคทุเรียนย้อนหลังทั้งหมด</p>
          </div>
        );

      case "guide":
        return (
          <div className="tab-placeholder">
            <h2>📖 คู่มือโรคทุเรียน</h2>
            <p>รวบรวมข้อมูลโรค ยารักษา และการป้องกันสำหรับทุเรียน</p>
          </div>
        );

      case "profile":
        return (
          <div className="tab-placeholder">
            <h2>👤 โปรไฟล์ส่วนตัว</h2>
            <p>จัดการข้อมูลผู้ใช้งานและข้อมูลสวนทุเรียน</p>
          </div>
        );

      case "settings":
        return (
          <div className="tab-placeholder">
            <h2>⚙️ ตั้งค่าระบบ</h2>
            <p>ปรับแต่งการแจ้งเตือนและภาษาในแอปพลิเคชัน</p>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="dashboard-wrapper">
      {/* Overlay สีดำจางๆ เวลาเปิด Sidebar บนมือถือ */}
      {isSidebarOpen && (
        <div className="sidebar-overlay" onClick={toggleSidebar}></div>
      )}

      {/* ================= Sidebar ฝั่งซ้าย ================= */}
      <aside className={`sidebar ${isSidebarOpen ? "open" : "closed"}`}>
        <div className="sidebar-brand">
          <FaLeaf className="brand-icon" />
          <span className="brand-name">DurianCare AI</span>
          <button className="close-sidebar-btn" onClick={toggleSidebar}>
            <FiX />
          </button>
        </div>

        <nav className="sidebar-menu">
          <button
            className={`menu-item ${activeTab === "dashboard" ? "active" : ""}`}
            onClick={() => setActiveTab("dashboard")}
          >
            <FiHome className="menu-icon" />
            <span>หน้าหลัก</span>
          </button>

          <button
            className={`menu-item ${activeTab === "analyze" ? "active" : ""}`}
            onClick={() => setActiveTab("analyze")}
          >
            <FiSearch className="menu-icon" />
            <span>วิเคราะห์โรค</span>
          </button>

          <button
            className={`menu-item ${activeTab === "history" ? "active" : ""}`}
            onClick={() => setActiveTab("history")}
          >
            <FiClock className="menu-icon" />
            <span>ประวัติการวิเคราะห์</span>
          </button>

          <button
            className={`menu-item ${activeTab === "guide" ? "active" : ""}`}
            onClick={() => setActiveTab("guide")}
          >
            <FiBookOpen className="menu-icon" />
            <span>คู่มือโรคทุเรียน</span>
          </button>

          <button
            className={`menu-item ${activeTab === "profile" ? "active" : ""}`}
            onClick={() => setActiveTab("profile")}
          >
            <FiUser className="menu-icon" />
            <span>โปรไฟล์</span>
          </button>

          <button
            className={`menu-item ${activeTab === "settings" ? "active" : ""}`}
            onClick={() => setActiveTab("settings")}
          >
            <FiSettings className="menu-icon" />
            <span>ตั้งค่า</span>
          </button>
        </nav>

        <div className="sidebar-footer">
          <button
            className="menu-item logout"
            onClick={() => alert("ออกจากระบบเรียบร้อย")}
          >
            <FiLogOut className="menu-icon" />
            <span>ออกจากระบบ</span>
          </button>
        </div>
      </aside>

      {/* ================= เนื้อหาฝั่งขวา ================= */}
      <main className="main-content">
        {/* Header ส่วนบน */}
        <header className="top-header">
          {/* ปุ่ม Hamburger Toggle ซ่อน/แสดง Sidebar */}
          <button className="menu-toggle-btn" onClick={toggleSidebar}>
            <FiMenu />
          </button>

          <div className="header-actions">
            <button className="icon-btn">
              <FiBell />
            </button>
            <div className="user-avatar">
              <img
                src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=100"
                alt="User Avatar"
              />
            </div>
          </div>
        </header>

        {/* เนื้อหาหน้าหลักตามแท็บ */}
        <div className="content-body">{renderTabContent()}</div>
      </main>
    </div>
  );
}

export default Dashboard;
