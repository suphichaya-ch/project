import React, { useState, useRef } from "react";
import {
  FiUploadCloud,
  FiCamera,
  FiCheck,
  FiX,
  FiRefreshCw,
} from "react-icons/fi";
import { TbBrain } from "react-icons/tb";
import "../styles/Analyze.css";

function Analyze() {
  const [selectedImage, setSelectedImage] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [status, setStatus] = useState("idle"); // 'idle' | 'processing' | 'result'
  const [progress, setProgress] = useState(0);

  // === State สำหรับเก็บผลลัพธ์จริงจาก API ===
  const [resultData, setResultData] = useState(null);

  // === State & Ref สำหรับกล้อง ===
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [stream, setStream] = useState(null);

  const sampleImages = [
    {
      id: 1,
      url: "/samples/train_leaf_1.jpg",
    },
    {
      id: 2,
      url: "/samples/train_leaf_2.jpg",
    },
    {
      id: 3,
      url: "/samples/train_leaf_3.jpg",
    },
    {
      id: 4,
      url: "/samples/train_leaf_4.jpg",
    },
  ];
  // ฟังก์ชันเปิดกล้อง
  const startCamera = async () => {
    setIsCameraOpen(true);
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      alert("ไม่สามารถเข้าถึงกล้องได้ หรือเบราว์เซอร์ไม่อนุญาตครับ");
      setIsCameraOpen(false);
    }
  };

  // ฟังก์ชันปิดกล้อง
  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    setIsCameraOpen(false);
  };

  // ฟังก์ชันกดถ่ายภาพ
  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      const ctx = canvas.getContext("2d");
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      const imageUrl = canvas.toDataURL("image/jpeg");
      setPreviewUrl(imageUrl);
      setSelectedImage(imageUrl); // เก็บ Base64 String
      stopCamera();
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedImage(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleSelectSample = (url) => {
    setSelectedImage(url);
    setPreviewUrl(url);
  };

  // === ฟังก์ชันเรียกยิง API วิเคราะห์ภาพจริง ===
  const startAnalysis = async () => {
    if (!previewUrl) {
      alert("กรุณาเลือกหรือถ่ายรูปภาพก่อนครับ");
      return;
    }

    setStatus("processing");
    setProgress(10);

    try {
      const formData = new FormData();

      // ตรวจสอบชนิดของรูปภาพที่ส่งเข้า
      if (selectedImage instanceof File) {
        formData.append("image", selectedImage);
      } else if (
        typeof selectedImage === "string" &&
        selectedImage.startsWith("data:image")
      ) {
        // ถ้าเป็น Base64 จากกล้อง ให้แปลงเป็น Blob
        const res = await fetch(selectedImage);
        const blob = await res.blob();
        formData.append("image", blob, "captured_image.jpg");
      } else if (typeof selectedImage === "string") {
        // ✅ ถ้าเป็น URL ตัวอย่าง แปลง URL รูปภาพเป็น Blob ก่อนส่งไป Backend
        const res = await fetch(selectedImage);
        const blob = await res.blob();
        formData.append("image", blob, "sample_image.jpg");
      }

      setProgress(40);

      const response = await fetch("http://localhost:5000/api/predict", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("เกิดข้อผิดพลาดในการประมวลผลจาก Server");
      }

      const data = await response.json();
      setProgress(90);

      setResultData({
        diseaseName: data.diseaseName || "ไม่ทราบชื่อโรค / ไม่พบโรค",
        confidence: data.confidence || 0,
        symptoms: data.symptoms || "ไม่มีข้อมูลลักษณะอาการ",
        treatment: data.treatment || [],
        isDiseaseDetected: data.isDiseaseDetected ?? true,
      });

      setProgress(100);
    } catch (error) {
      console.error("AI Analysis error:", error);
      alert("เกิดข้อผิดพลาดในการยิง API วิเคราะห์ข้อมูล กรุณาลองใหม่อีกครั้ง");
      setStatus("idle");
      setProgress(0);
    }
  };

  const handleCancelAnalysis = () => {
    setStatus("idle");
    setProgress(0);
  };

  const handleGoToResult = () => {
    setStatus("result");
  };

  return (
    <div className="analyze-content-wrapper">
      {/* 1. หน้าอัปโหลด (Idle State) */}
      {status === "idle" && (
        <div className="upload-container">
          <h2 className="page-title">วิเคราะห์โรคใบทุเรียนด้วย AI</h2>

          <canvas ref={canvasRef} style={{ display: "none" }} />

          {isCameraOpen ? (
            <div className="camera-view-container">
              <div className="video-wrapper">
                <video ref={videoRef} autoPlay playsInline />
                <button className="btn-close-camera" onClick={stopCamera}>
                  <FiX />
                </button>
              </div>
              <button className="btn-capture" onClick={capturePhoto}>
                📸 ถ่ายภาพ
              </button>
            </div>
          ) : (
            <div
              className="dropzone-box"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const file = e.dataTransfer.files[0];
                if (file) {
                  setSelectedImage(file);
                  setPreviewUrl(URL.createObjectURL(file));
                }
              }}
            >
              <input
                type="file"
                id="file-input"
                accept="image/*"
                onChange={handleImageChange}
                hidden
              />

              {previewUrl ? (
                <div className="preview-container">
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className="preview-image"
                  />
                  <label htmlFor="file-input" className="change-photo-btn">
                    <FiRefreshCw /> เปลี่ยนรูปภาพ
                  </label>
                </div>
              ) : (
                <label htmlFor="file-input" className="dropzone-label">
                  <FiUploadCloud className="upload-cloud-icon" />
                  <p className="dropzone-text">ลากและวางไฟล์ภาพที่นี่</p>
                  <p className="dropzone-sub">หรือ</p>
                  <div className="btn-select-file">เลือกไฟล์จากเครื่อง</div>
                  <p className="file-info">
                    รองรับไฟล์ JPG, PNG, JPEG (ขนาดไม่เกิน 10MB)
                  </p>
                </label>
              )}
            </div>
          )}

          {!isCameraOpen && (
            <>
              <div className="divider">
                <span>หรือถ่ายภาพด้วยกล้อง</span>
              </div>

              <button className="btn-camera" onClick={startCamera}>
                <FiCamera /> เปิดกล้องถ่ายภาพ
              </button>

              <div className="sample-section">
                <h3>ตัวอย่างภาพใบไม้</h3>
                <div className="sample-grid">
                  {sampleImages.map((sample) => (
                    <div
                      key={sample.id}
                      className={`sample-item ${
                        previewUrl === sample.url ? "selected" : ""
                      }`}
                      onClick={() => handleSelectSample(sample.url)}
                    >
                      <img src={sample.url} alt={`sample-${sample.id}`} />
                    </div>
                  ))}
                </div>
              </div>

              <button className="btn-submit-ai" onClick={startAnalysis}>
                เริ่มวิเคราะห์ด้วย AI
              </button>
            </>
          )}
        </div>
      )}

      {/* 2. หน้าประมวลผล (Processing State) */}
      {status === "processing" && (
        <div className="processing-card">
          <h2 className="card-title">กำลังประมวลผลด้วย AI</h2>

          {previewUrl && (
            <div className="processing-preview">
              <img src={previewUrl} alt="กำลังวิเคราะห์" />
            </div>
          )}

          <div className="ai-circle-outer">
            <div
              className={`ai-circle-ring ${
                progress >= 100 ? "is-complete" : ""
              }`}
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
              <button className="btn-cancel" onClick={handleCancelAnalysis}>
                ยกเลิกการวิเคราะห์
              </button>
            ) : (
              <button className="btn-view-result" onClick={handleGoToResult}>
                ดูผลการวิเคราะห์โรค
              </button>
            )}
          </div>
        </div>
      )}

      {/* 3. หน้าผลลัพธ์การวิเคราะห์ (Result State) */}
      {status === "result" && resultData && (
        <div className="result-container">
          <h2 className="page-title">ผลการวิเคราะห์โรค</h2>

          <div className="result-card-content">
            <div className="result-image-box">
              {previewUrl && (
                <img src={previewUrl} alt="ใบไม้ที่ส่งวิเคราะห์" />
              )}
              <span
                className={`badge-status ${
                  resultData.isDiseaseDetected ? "danger" : "success"
                }`}
              >
                {resultData.isDiseaseDetected ? "ตรวจพบโรค" : "ปกติ"}
              </span>
            </div>

            <div className="result-details">
              <div className="disease-header">
                <h3 className="disease-name">{resultData.diseaseName}</h3>
                <div className="confidence-tag">
                  ความแม่นยำ <span>{resultData.confidence}%</span>
                </div>
              </div>

              <hr className="result-divider" />

              <div className="info-group">
                <h4>📌 ลักษณะอาการที่พบ:</h4>
                <p>{resultData.symptoms}</p>
              </div>

              <div className="info-group">
                <h4>💡 แนวทางการรักษาและป้องกัน:</h4>
                {Array.isArray(resultData.treatment) &&
                resultData.treatment.length > 0 ? (
                  <ul>
                    {resultData.treatment.map((item, index) => (
                      <li key={index}>{item}</li>
                    ))}
                  </ul>
                ) : (
                  <p>ไม่มีข้อมูลการรักษา</p>
                )}
              </div>

              <button
                className="btn-submit-ai"
                style={{ marginTop: "20px" }}
                onClick={() => {
                  setStatus("idle");
                  setPreviewUrl(null);
                  setSelectedImage(null);
                  setResultData(null);
                  setProgress(0);
                }}
              >
                วิเคราะห์ภาพใหม่
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Analyze;
