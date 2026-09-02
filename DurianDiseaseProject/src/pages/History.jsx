import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  FiSearch,
  FiClock,
  FiTrash2,
  FiEye,
  FiX,
  FiAlertCircle,
} from "react-icons/fi";
import "../styles/History.css";

function History() {
  const [historyList, setHistoryList] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState(null);

  // =========================================================
  // โหลดประวัติเมื่อเปิดหน้า
  // =========================================================
  const fetchHistory = useCallback(async () => {
    setLoading(true);

    const token = localStorage.getItem("token");
    const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:5000";

    try {
      const response = await fetch(`${apiUrl}/api/history`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        console.error("โหลดประวัติไม่สำเร็จ:", response.status);
        setHistoryList([]);
        return;
      }

      const data = await response.json();

      const records = Array.isArray(data)
        ? data
        : Array.isArray(data?.history)
          ? data.history
          : [];

      // กรองเฉพาะ item ที่ไม่ใช่ null/undefined
      setHistoryList(records.filter(Boolean));
    } catch (error) {
      console.error("Error fetching history:", error);
      setHistoryList([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  // =========================================================
  // ปิด Modal ด้วยปุ่ม ESC
  // =========================================================
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        setSelectedItem(null);
      }
    };

    if (selectedItem) {
      window.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [selectedItem]);

  // =========================================================
  // ลบประวัติ
  // =========================================================
  const handleDelete = async (id) => {
    if (!id) return;

    const confirmed = window.confirm(
      "คุณต้องการลบประวัติการวิเคราะห์รายการนี้ใช่หรือไม่?",
    );

    if (!confirmed) return;

    const token = localStorage.getItem("token");
    const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:5000";

    try {
      const response = await fetch(`${apiUrl}/api/history/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        setHistoryList((prev) => prev.filter((item) => item && item.id !== id));

        if (selectedItem?.id === id) {
          setSelectedItem(null);
        }
      } else {
        console.error("ลบประวัติไม่สำเร็จ");
        alert("ไม่สามารถลบประวัติได้");
      }
    } catch (error) {
      console.error("Error deleting history item:", error);
      alert("เกิดข้อผิดพลาดในการลบประวัติ");
    }
  };

  // =========================================================
  // แปลงข้อมูล Treatment ให้เป็นรูปแบบเดียวกัน
  // =========================================================
  const normalizeTreatment = useCallback((treatment) => {
    const emptyTreatment = {
      immediate_actions: [],
      chemical_control: [],
      nutrition: [],
      prevention: [],
      warning: "",
    };

    if (!treatment) return emptyTreatment;

    let parsed = treatment;

    if (typeof treatment === "string") {
      if (!treatment.trim()) return emptyTreatment;

      try {
        parsed = JSON.parse(treatment);
      } catch (error) {
        return {
          ...emptyTreatment,
          immediate_actions: [treatment],
        };
      }
    }

    if (Array.isArray(parsed)) {
      return {
        ...emptyTreatment,
        immediate_actions: parsed,
      };
    }

    if (typeof parsed !== "object") return emptyTreatment;

    return {
      immediate_actions: Array.isArray(parsed.immediate_actions)
        ? parsed.immediate_actions
        : [],
      chemical_control: Array.isArray(parsed.chemical_control)
        ? parsed.chemical_control
        : [],
      nutrition: Array.isArray(parsed.nutrition) ? parsed.nutrition : [],
      prevention: Array.isArray(parsed.prevention) ? parsed.prevention : [],
      warning: typeof parsed.warning === "string" ? parsed.warning : "",
    };
  }, []);

  // =========================================================
  // ค้นหาประวัติ
  // =========================================================
  const filteredList = useMemo(() => {
    const search = searchTerm.toLowerCase().trim();

    if (!search) return historyList;

    return historyList.filter((item) => {
      if (!item) return false;
      const disease = String(item.diseaseName || "").toLowerCase();
      const symptoms = String(
        item.symptoms || item.description || "",
      ).toLowerCase();

      return disease.includes(search) || symptoms.includes(search);
    });
  }, [historyList, searchTerm]);

  // =========================================================
  // แสดง Confidence
  // =========================================================
  const formatConfidence = (confidence) => {
    const value = Number(confidence);
    if (!Number.isFinite(value)) return "0%";
    if (value > 1) return `${value.toFixed(0)}%`;
    return `${(value * 100).toFixed(0)}%`;
  };

  // =========================================================
  // แสดงวันที่
  // =========================================================
  const formatDate = (date, includeTime = true) => {
    if (!date) return "-";
    const parsedDate = new Date(date);
    if (Number.isNaN(parsedDate.getTime())) return "-";

    return parsedDate.toLocaleDateString("th-TH", {
      day: "numeric",
      month: includeTime ? "short" : "long",
      year: "numeric",
      ...(includeTime && {
        hour: "2-digit",
        minute: "2-digit",
      }),
    });
  };

  // =========================================================
  // แสดงชื่อสารเคมีอย่างปลอดภัย (ป้องกัน Object Crash)
  // =========================================================
  const getChemicalValue = (item, key) => {
    if (!item) return "-";
    if (typeof item === "string") return item;

    const val = item[key];
    if (typeof val === "object" && val !== null) {
      return JSON.stringify(val);
    }
    return val || "-";
  };

  // Helper สำหรับการ Render ค่าที่เป็นได้ทั้ง string หรือ object
  const renderSafeText = (val) => {
    if (typeof val === "string") return val;
    if (typeof val === "number") return String(val);
    return JSON.stringify(val);
  };

  return (
    <div className="history-page-wrapper">
      <div className="history-header">
        <div className="title-group">
          <h2>
            <FiClock /> ประวัติการวิเคราะห์โรค
          </h2>
          <p>เรียกดูผลการวิเคราะห์ใบทุเรียนย้อนหลังทั้งหมดของคุณ</p>
        </div>
      </div>

      <div className="search-filter-card">
        <div className="search-box-wrapper">
          <FiSearch className="search-icon" />
          <input
            type="text"
            className="search-input-field"
            placeholder="ค้นหาตามชื่อโรคหรืออาการ..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button
              type="button"
              className="clear-search-btn"
              onClick={() => setSearchTerm("")}
              aria-label="ล้างการค้นหา"
            >
              <FiX />
            </button>
          )}
        </div>
        <div className="total-count-badge">
          ทั้งหมด {filteredList.length} รายการ
        </div>
      </div>

      {loading ? (
        <div className="history-loading-state">
          <div className="loading-spinner"></div>
          <p>กำลังโหลดประวัติ...</p>
        </div>
      ) : filteredList.length === 0 ? (
        <div className="empty-history-state">
          <div className="empty-icon-circle">
            <FiAlertCircle />
          </div>
          <h3>ไม่พบประวัติการวิเคราะห์</h3>
          <p>
            {searchTerm
              ? `ไม่พบข้อมูลที่ตรงกับ "${searchTerm}"`
              : "คุณยังไม่มีประวัติการวิเคราะห์ภาพใบทุเรียน"}
          </p>
        </div>
      ) : (
        <div className="history-cards-grid">
          {filteredList.map((item, idx) => (
            <div key={item.id || idx} className="history-card-item">
              <div className="card-img-container">
                <img
                  src={item.imageUrl || "https://via.placeholder.com/300"}
                  alt={item.diseaseName || "ภาพใบทุเรียน"}
                  onError={(e) => {
                    e.currentTarget.src = "https://via.placeholder.com/300";
                  }}
                />
                <span className="card-confidence-badge">
                  ความมั่นใจ {formatConfidence(item.confidence)}
                </span>
              </div>

              <div className="card-body-content">
                <div className="disease-title-row">
                  <h3>{item.diseaseName || "ไม่ระบุผลการวิเคราะห์"}</h3>
                </div>

                <div className="card-date-info">
                  <FiClock /> {formatDate(item.createdAt)}
                </div>

                <p className="card-desc-text">
                  {item.symptoms ||
                    item.description ||
                    "ไม่มีรายละเอียดอาการเพิ่มเติม"}
                </p>

                <div className="card-actions-row">
                  <button
                    type="button"
                    className="btn-card-detail"
                    onClick={() => setSelectedItem(item)}
                  >
                    <FiEye /> ดูรายละเอียด
                  </button>

                  <button
                    type="button"
                    className="btn-card-delete"
                    onClick={() => handleDelete(item.id)}
                    title="ลบรายการนี้"
                    aria-label="ลบรายการนี้"
                  >
                    <FiTrash2 />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedItem && (
        <div
          className="history-modal-overlay"
          onClick={() => setSelectedItem(null)}
        >
          <div
            className="history-modal-card"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="modal-close-btn"
              onClick={() => setSelectedItem(null)}
              aria-label="ปิดรายละเอียด"
            >
              <FiX />
            </button>

            <div className="modal-img-wrapper">
              <img
                src={selectedItem.imageUrl || "https://via.placeholder.com/600"}
                alt={selectedItem.diseaseName || "ภาพใบทุเรียน"}
                onError={(e) => {
                  e.currentTarget.src = "https://via.placeholder.com/600";
                }}
              />
            </div>

            <div className="modal-body-content">
              <h3 className="modal-disease-title">
                {selectedItem.diseaseName || "ไม่ระบุผลการวิเคราะห์"}
              </h3>

              <div className="modal-meta-bar">
                <span>
                  <strong>ความแม่นยำ:</strong>{" "}
                  {formatConfidence(selectedItem.confidence)}
                </span>
                <span className="meta-divider">•</span>
                <span>
                  <strong>วันที่สแกน:</strong>{" "}
                  {formatDate(selectedItem.createdAt, false)}
                </span>
              </div>

              <div className="modal-info-block">
                <h4>📌 อาการที่พบ</h4>
                <p>
                  {selectedItem.symptoms ||
                    selectedItem.description ||
                    "ไม่มีข้อมูล"}
                </p>
              </div>

              <div className="modal-info-block">
                <h4>💊 แนวทางการดูแลรักษาแบบละเอียด</h4>
                {(() => {
                  const treatment = normalizeTreatment(selectedItem.treatment);

                  return (
                    <div className="detailed-treatment">
                      <div className="treatment-group">
                        <h5>🚨 สิ่งที่ควรทำทันที</h5>
                        {treatment.immediate_actions.length > 0 ? (
                          <ol>
                            {treatment.immediate_actions.map(
                              (action, index) => (
                                <li key={index}>{renderSafeText(action)}</li>
                              ),
                            )}
                          </ol>
                        ) : (
                          <p>ไม่มีข้อมูล</p>
                        )}
                      </div>

                      <div className="treatment-group">
                        <h5>💊 สารป้องกันกำจัดโรค/แมลง</h5>
                        {treatment.chemical_control.length > 0 ? (
                          <div className="chemical-treatment-list">
                            {treatment.chemical_control.map(
                              (chemical, index) => (
                                <div
                                  key={index}
                                  className="chemical-treatment-card"
                                >
                                  <h6>
                                    {getChemicalValue(
                                      chemical,
                                      "active_ingredient",
                                    )}
                                  </h6>
                                  <p>
                                    <strong>ใช้เพื่อ:</strong>{" "}
                                    {getChemicalValue(chemical, "purpose")}
                                  </p>
                                  <p>
                                    <strong>วิธีใช้:</strong>{" "}
                                    {getChemicalValue(chemical, "instruction")}
                                  </p>
                                </div>
                              ),
                            )}
                          </div>
                        ) : (
                          <p>ไม่มีคำแนะนำให้ใช้สารเคมีในกรณีนี้</p>
                        )}
                      </div>

                      <div className="treatment-group">
                        <h5>🌱 การบำรุงต้นและปุ๋ย</h5>
                        {treatment.nutrition.length > 0 ? (
                          <ul>
                            {treatment.nutrition.map((item, index) => (
                              <li key={index}>{renderSafeText(item)}</li>
                            ))}
                          </ul>
                        ) : (
                          <p>ไม่มีข้อมูล</p>
                        )}
                      </div>

                      <div className="treatment-group">
                        <h5>🛡️ การป้องกันไม่ให้กลับมาเป็นซ้ำ</h5>
                        {treatment.prevention.length > 0 ? (
                          <ul>
                            {treatment.prevention.map((item, index) => (
                              <li key={index}>{renderSafeText(item)}</li>
                            ))}
                          </ul>
                        ) : (
                          <p>ไม่มีข้อมูล</p>
                        )}
                      </div>

                      {treatment.warning && (
                        <div className="treatment-warning-box">
                          <strong>⚠️ คำเตือน</strong>
                          <p>{treatment.warning}</p>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default History;
