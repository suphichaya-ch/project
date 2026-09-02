import React, { useState, useEffect } from "react";
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

// Import หน้าย่อย
import Analyze from "./Analyze";
import History from "./History";
import Profile from "./Profile";
import "../styles/Dashboard.css";

function Dashboard() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState("dashboard");

  // ============================================================
  // User
  // ============================================================

  const [userName, setUserName] = useState("เกษตรกรทุเรียน");

  // ============================================================
  // Dashboard Statistics
  // ============================================================

  const [statsData, setStatsData] = useState({
    totalScans: 0,
    diseaseCount: 0,
    avgConfidence: "0%",
    todayScans: 0,
  });

  // ============================================================
  // Recent Diseases
  // ============================================================

  const [recentDiseases, setRecentDiseases] = useState([]);

  // ============================================================
  // API URL
  // ============================================================

  const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:5000";

  // ============================================================
  // Toggle Sidebar
  // ============================================================

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  // ============================================================
  // Logout
  // ============================================================

  const handleLogout = () => {
    localStorage.removeItem("token");
    window.location.href = "/login";
  };

  // ============================================================
  // โหลดข้อมูลเมื่อเปิด Dashboard
  // ============================================================

  useEffect(() => {
    fetchUserData();
    fetchDashboardData();
  }, []);

  // ============================================================
  // ดึงข้อมูลผู้ใช้
  // ============================================================

  const fetchUserData = async () => {
    const token = localStorage.getItem("token");

    if (!token) {
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

      console.log("User data:", data);

      if (response.ok && data.user) {
        setUserName(data.user.name || "เกษตรกรทุเรียน");
      }
    } catch (error) {
      console.error("Error fetching user info:", error);
    }
  };

  // ============================================================
  // ดึงข้อมูล Dashboard
  //
  // ใช้ GET /api/history ตัวเดียว
  // ไม่ต้องเรียก /api/history/stats
  // ============================================================

  const fetchDashboardData = async () => {
    const token = localStorage.getItem("token");

    if (!token) {
      return;
    }

    try {
      const response = await fetch(`${apiUrl}/api/history`, {
        method: "GET",

        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      console.log("History data:", data);

      if (!response.ok) {
        throw new Error(data.error || "ไม่สามารถโหลดประวัติได้");
      }

      // ========================================================
      // server.js ส่ง Array ตรง ๆ
      //
      // [
      //   {...},
      //   {...}
      // ]
      // ========================================================

      if (!Array.isArray(data)) {
        console.error("รูปแบบข้อมูล history ไม่ถูกต้อง:", data);

        return;
      }

      const historyList = data;

      // ========================================================
      // จำนวนการวิเคราะห์ทั้งหมด
      // ========================================================

      const totalScans = historyList.length;

      // ========================================================
      // จำนวนที่พบโรค
      //
      // Backend มี isDiseaseDetected
      // ========================================================

      const diseaseCount = historyList.filter(
        (item) => item.isDiseaseDetected === true,
      ).length;

      // ========================================================
      // Confidence เฉลี่ย
      //
      // server.js ส่ง confidence เป็น %
      // เช่น 95.5
      // ไม่ต้องคูณ 100
      // ========================================================

      let avgConfidence = 0;

      if (historyList.length > 0) {
        const totalConfidence = historyList.reduce(
          (sum, item) => sum + Number(item.confidence || 0),
          0,
        );

        avgConfidence = totalConfidence / historyList.length;
      }

      // ========================================================
      // จำนวนการวิเคราะห์วันนี้
      // ========================================================

      const today = new Date();

      const todayCount = historyList.filter((item) => {
        if (!item.createdAt) {
          return false;
        }

        const itemDate = new Date(item.createdAt);

        return itemDate.toDateString() === today.toDateString();
      }).length;

      // ========================================================
      // ตั้งค่า Stats
      // ========================================================

      setStatsData({
        totalScans: totalScans,

        diseaseCount: diseaseCount,

        avgConfidence: `${avgConfidence.toFixed(1)}%`,

        todayScans: todayCount,
      });

      // ========================================================
      // 3 รายการล่าสุด
      //
      // server.js orderBy createdAt desc
      // อยู่แล้ว
      // ========================================================

      const recent = historyList.slice(0, 3).map((item) => {
        let imageUrl = item.imageUrl || "";

        // ถ้า Backend ส่ง /uploads/...
        // ให้ต่อกับ http://localhost:5000
        if (imageUrl.startsWith("/")) {
          imageUrl = `${apiUrl}${imageUrl}`;
        }

        return {
          id: item.id,

          name: item.diseaseName || "ไม่ทราบชื่อโรค",

          accuracy: `${Number(item.confidence || 0).toFixed(1)}%`,

          date: item.createdAt
            ? new Date(item.createdAt).toLocaleDateString("th-TH", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })
            : "-",

          image: imageUrl || "https://via.placeholder.com/300",
        };
      });

      setRecentDiseases(recent);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    }
  };

  // ============================================================
  // Stats
  // ============================================================

  const stats = [
    {
      value: statsData.totalScans,
      label: "ครั้งที่วิเคราะห์ทั้งหมด",
    },
    {
      value: statsData.diseaseCount,
      label: "ครั้งที่พบโรค",
    },
    {
      value: statsData.avgConfidence,
      label: "ความแม่นยำเฉลี่ย",
    },
    {
      value: statsData.todayScans,
      label: "รายงานวันนี้",
    },
  ];

  // ============================================================
  // Render Tab Content
  // ============================================================

  const renderTabContent = () => {
    switch (activeTab) {
      // ========================================================
      // Dashboard
      // ========================================================

      case "dashboard":
        return (
          <>
            <section className="welcome-section">
              <h1>สวัสดี, {userName} 🌱</h1>

              <p>ยินดีต้อนรับสู่ DurianCare AI</p>
            </section>

            {/* ==================================================
                Statistics
            ================================================== */}

            <section className="stats-grid">
              {stats.map((item, index) => (
                <div key={index} className="stat-card">
                  <h2>{item.value}</h2>

                  <p>{item.label}</p>
                </div>
              ))}
            </section>

            {/* ==================================================
                CTA
            ================================================== */}

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

            {/* ==================================================
                Recent
            ================================================== */}

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

              {recentDiseases.length === 0 ? (
                <p
                  style={{
                    color: "#777",
                    textAlign: "center",
                    padding: "20px 0",
                  }}
                >
                  ยังไม่มีประวัติการวิเคราะห์
                </p>
              ) : (
                <div className="recent-grid">
                  {recentDiseases.map((disease) => (
                    <div key={disease.id} className="disease-card">
                      <img
                        src={disease.image}
                        alt={disease.name}
                        className="disease-img"
                        onError={(e) => {
                          e.currentTarget.src =
                            "https://via.placeholder.com/300";
                        }}
                      />

                      <div className="disease-info">
                        <h4>{disease.name}</h4>

                        <span className="accuracy-badge">
                          {disease.accuracy}
                        </span>

                        <p className="disease-date">{disease.date}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        );

      // ========================================================
      // Analyze
      // ========================================================

      case "analyze":
        return <Analyze />;

      // ========================================================
      // History
      // ========================================================

      case "history":
        return <History />;

      // ========================================================
      // Guide
      // ========================================================

      case "guide":
        return (
          <div className="tab-placeholder">
            <h2>📖 คู่มือโรคทุเรียน</h2>

            <p>รวบรวมข้อมูลโรค ยารักษา และการป้องกันสำหรับทุเรียน</p>
          </div>
        );

      // ========================================================
      // Profile
      // ========================================================

      case "profile":
        return <Profile />;

      // ========================================================
      // Settings
      // ========================================================

      case "settings":
        return (
          <div className="tab-placeholder">
            <h2>⚙️ ตั้งค่าระบบ</h2>

            <p>ปรับแต่งการแจ้งเตือนและภาษา ในแอปพลิเคชัน</p>
          </div>
        );

      default:
        return null;
    }
  };

  // ============================================================
  // Main Render
  // ============================================================

  return (
    <div className="dashboard-wrapper">
      {/* ======================================================
          Sidebar Overlay
      ====================================================== */}

      {isSidebarOpen && (
        <div className="sidebar-overlay" onClick={toggleSidebar}></div>
      )}

      {/* ======================================================
          Sidebar
      ====================================================== */}

      <aside className={`sidebar ${isSidebarOpen ? "open" : "closed"}`}>
        <div className="sidebar-brand">
          <FaLeaf className="brand-icon" />

          <span className="brand-name">DurianCare AI</span>

          <button className="close-sidebar-btn" onClick={toggleSidebar}>
            <FiX />
          </button>
        </div>

        <nav className="sidebar-menu">
          {/* Dashboard */}

          <button
            className={`menu-item ${activeTab === "dashboard" ? "active" : ""}`}
            onClick={() => setActiveTab("dashboard")}
          >
            <FiHome className="menu-icon" />

            <span>หน้าหลัก</span>
          </button>

          {/* Analyze */}

          <button
            className={`menu-item ${activeTab === "analyze" ? "active" : ""}`}
            onClick={() => setActiveTab("analyze")}
          >
            <FiSearch className="menu-icon" />

            <span>วิเคราะห์โรค</span>
          </button>

          {/* History */}

          <button
            className={`menu-item ${activeTab === "history" ? "active" : ""}`}
            onClick={() => setActiveTab("history")}
          >
            <FiClock className="menu-icon" />

            <span>ประวัติการวิเคราะห์</span>
          </button>

          {/* Guide */}

          <button
            className={`menu-item ${activeTab === "guide" ? "active" : ""}`}
            onClick={() => setActiveTab("guide")}
          >
            <FiBookOpen className="menu-icon" />

            <span>คู่มือโรคทุเรียน</span>
          </button>

          {/* Profile */}

          <button
            className={`menu-item ${activeTab === "profile" ? "active" : ""}`}
            onClick={() => setActiveTab("profile")}
          >
            <FiUser className="menu-icon" />

            <span>โปรไฟล์</span>
          </button>

          {/* Settings */}

          <button
            className={`menu-item ${activeTab === "settings" ? "active" : ""}`}
            onClick={() => setActiveTab("settings")}
          >
            <FiSettings className="menu-icon" />

            <span>ตั้งค่า</span>
          </button>
        </nav>

        {/* ====================================================
            Logout
        ==================================================== */}

        <div className="sidebar-footer">
          <button className="menu-item logout" onClick={handleLogout}>
            <FiLogOut className="menu-icon" />

            <span>ออกจากระบบ</span>
          </button>
        </div>
      </aside>

      {/* ======================================================
          Main Content
      ====================================================== */}

      <main className="main-content">
        {/* ====================================================
            Header
        ==================================================== */}

        <header className="top-header">
          <button className="menu-toggle-btn" onClick={toggleSidebar}>
            <FiMenu />
          </button>

          <div className="header-actions">
            <button className="icon-btn">
              <FiBell />
            </button>

            <div
              className="user-avatar"
              onClick={() => setActiveTab("profile")}
              style={{
                cursor: "pointer",
              }}
            >
              <img
                src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=100"
                alt="User Avatar"
              />
            </div>
          </div>
        </header>

        {/* ====================================================
            Content
        ==================================================== */}

        <div className="content-body">{renderTabContent()}</div>
      </main>
    </div>
  );
}

export default Dashboard;
