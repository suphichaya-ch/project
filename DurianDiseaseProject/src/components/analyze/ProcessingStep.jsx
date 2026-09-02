import React from "react";
import { FiCheck } from "react-icons/fi";
import { TbBrain } from "react-icons/tb";

function ProcessingStep({ previewUrl, progress, onCancel, onViewResult }) {
  return (
    <div className="processing-card">
      <h2 className="card-title">กำลังประมวลผลด้วย AI</h2>

      {previewUrl && (
        <div className="processing-preview">
          <img src={previewUrl} alt="กำลังวิเคราะห์" />
        </div>
      )}

      <div className="ai-circle-outer">
        <div
          className={`ai-circle-ring ${progress >= 100 ? "is-complete" : ""}`}
        ></div>
        <div className="ai-circle-inner">
          <TbBrain className="brain-icon" />
          <span className="brain-text">AI</span>
        </div>
      </div>

      <h3 className="status-title">กำลังวิเคราะห์ภาพใบไม้...</h3>
      <p className="status-desc">
        กรุณารอสักครู่ ระบบกำลังตรวจสอบ
        <br />
        ลักษณะอาการและร่องรอยของโรค
      </p>

      <div className="progress-section">
        <div className="progress-bar-bg">
          <div
            className="progress-bar-fill"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
        <span className="progress-value">{progress}%</span>
      </div>

      <div className="steps-list">
        <div className={`step-item ${progress >= 25 ? "active" : ""}`}>
          <div className="check-icon-bg">
            <FiCheck />
          </div>
          <span>กำลังเตรียมภาพ</span>
        </div>
        <div className={`step-item ${progress >= 50 ? "active" : ""}`}>
          <div className="check-icon-bg">
            <FiCheck />
          </div>
          <span>กำลังตรวจจับลักษณะใบ</span>
        </div>
        <div className={`step-item ${progress >= 75 ? "active" : ""}`}>
          <div className="check-icon-bg">
            <FiCheck />
          </div>
          <span>กำลังวิเคราะห์โรค</span>
        </div>
        <div className={`step-item ${progress >= 100 ? "active" : ""}`}>
          <div className="check-icon-bg">
            <FiCheck />
          </div>
          <span>กำลังสรุปผล</span>
        </div>
      </div>

      <div className="processing-actions">
        {progress < 100 ? (
          <button className="btn-cancel" onClick={onCancel}>
            ยกเลิกการวิเคราะห์
          </button>
        ) : (
          <button className="btn-view-result" onClick={onViewResult}>
            ดูผลการวิเคราะห์โรค
          </button>
        )}
      </div>
    </div>
  );
}

export default ProcessingStep;
