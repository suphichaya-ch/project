import React, { useState, useRef, useEffect } from "react";
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
  const [status, setStatus] = useState("idle");
  const [progress, setProgress] = useState(0);

  // ผลลัพธ์จาก API
  const [resultData, setResultData] = useState(null);

  // กล้อง
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [stream, setStream] = useState(null);

  // Sample Images
  const sampleImages = [
    { id: 1, url: "/samples/train_leaf_1.jpg" },
    { id: 2, url: "/samples/train_leaf_2.jpg" },
    { id: 3, url: "/samples/train_leaf_3.jpg" },
    { id: 4, url: "/samples/train_leaf_4.jpg" },
  ];

  // Helper function สำหรับ render ข้อมูลแต่ละรายการที่รองรับทั้ง Object และ String
  const renderItemContent = (item) => {
    if (typeof item === "object" && item !== null) {
      return (
        <>
          {item.active_ingredient && (
            <strong>{item.active_ingredient}: </strong>
          )}
          {item.instruction || item.description || JSON.stringify(item)}
          {item.purpose && ` (${item.purpose})`}
        </>
      );
    }
    return item;
  };

  // Cleanup Effects
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
      if (previewUrl && previewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [stream, previewUrl]);

  // เปิดกล้อง
  const startCamera = async () => {
    setIsCameraOpen(true);
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("Browser ไม่รองรับการเปิดกล้อง");
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });

      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      console.error("Camera error:", err);
      alert("ไม่สามารถเข้าถึงกล้องได้ หรือเบราว์เซอร์ไม่อนุญาต");
      setIsCameraOpen(false);
    }
  };

  // ปิดกล้อง
  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    setIsCameraOpen(false);
  };

  // ถ่ายภาพจากกล้อง
  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const imageUrl = canvas.toDataURL("image/jpeg", 0.9);

    if (previewUrl && previewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(previewUrl);
    }

    setPreviewUrl(imageUrl);
    setSelectedImage(imageUrl);
    stopCamera();
  };

  // เลือกรูปจากเครื่อง
  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("กรุณาเลือกไฟล์รูปภาพเท่านั้น");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      alert("ขนาดไฟล์ต้องไม่เกิน 10MB");
      return;
    }

    if (previewUrl && previewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(previewUrl);
    }

    setSelectedImage(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  // เลือกรูปตัวอย่าง
  const handleSelectSample = (url) => {
    if (previewUrl && previewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(previewUrl);
    }
    setSelectedImage(url);
    setPreviewUrl(url);
  };

  // เริ่มวิเคราะห์
  const startAnalysis = async () => {
    if (!previewUrl || !selectedImage) {
      alert("กรุณาเลือกหรือถ่ายรูปภาพก่อน");
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) {
      alert("กรุณาเข้าสู่ระบบก่อนวิเคราะห์ภาพ");
      return;
    }

    setStatus("processing");
    setProgress(10);

    try {
      const formData = new FormData();

      if (selectedImage instanceof File) {
        formData.append("image", selectedImage);
      } else if (
        typeof selectedImage === "string" &&
        selectedImage.startsWith("data:image")
      ) {
        const imageResponse = await fetch(selectedImage);
        const blob = await imageResponse.blob();
        formData.append("image", blob, "captured_image.jpg");
      } else if (typeof selectedImage === "string") {
        const imageResponse = await fetch(selectedImage);
        if (!imageResponse.ok) {
          throw new Error("ไม่สามารถโหลดรูปตัวอย่างได้");
        }
        const blob = await imageResponse.blob();
        formData.append("image", blob, "sample_image.jpg");
      } else {
        throw new Error("ไม่สามารถเตรียมไฟล์ภาพได้");
      }

      setProgress(40);

      const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:5000";
      const response = await fetch(`${apiUrl}/api/predict`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "เกิดข้อผิดพลาดในการประมวลผลจาก Server");
      }

      setProgress(90);

      const treatment =
        data.treatment &&
        typeof data.treatment === "object" &&
        !Array.isArray(data.treatment)
          ? {
              immediate_actions: Array.isArray(data.treatment.immediate_actions)
                ? data.treatment.immediate_actions
                : [],
              chemical_control: Array.isArray(data.treatment.chemical_control)
                ? data.treatment.chemical_control
                : [],
              nutrition: Array.isArray(data.treatment.nutrition)
                ? data.treatment.nutrition
                : [],
              prevention: Array.isArray(data.treatment.prevention)
                ? data.treatment.prevention
                : [],
              warning: data.treatment.warning || "",
            }
          : {
              immediate_actions: [],
              chemical_control: [],
              nutrition: [],
              prevention: [],
              warning: "",
            };

      // ลำดับการเลือกรูป: 1. รูปที่มี Bounding Box (processed_image) -> 2. imageUrl -> 3. previewUrl เดิม
      let imageUrl = data.processed_image || data.imageUrl || previewUrl;
      if (
        imageUrl &&
        imageUrl.startsWith("/") &&
        !imageUrl.startsWith("data:")
      ) {
        imageUrl = `${apiUrl}${imageUrl}`;
      }

      let rawConfidence =
        typeof data.confidence === "number" ? data.confidence : 0;
      if (rawConfidence <= 1 && rawConfidence > 0) {
        rawConfidence = rawConfidence * 100;
      }

      // ตรวจสอบว่าเป็นโรคหรือไม่ (กรณีไม่ใช่ HEALTHY_LEAF)
      const isDisease = data.class !== "HEALTHY_LEAF";

      const formattedResult = {
        id: data.id,
        imageUrl: imageUrl,
        diseaseName:
          data.disease ||
          data.diseaseName ||
          data.name_th ||
          "ไม่ทราบชื่อโรค / ไม่พบโรค",
        confidence: rawConfidence.toFixed(1),
        symptoms: data.symptoms || "ไม่มีข้อมูลลักษณะอาการ",
        treatment: treatment,
        isDiseaseDetected: isDisease,
      };

      setResultData(formattedResult);
      setProgress(100);
    } catch (error) {
      console.error("AI Analysis error:", error);
      alert(
        error.message || "เกิดข้อผิดพลาดในการวิเคราะห์ภาพ กรุณาลองใหม่อีกครั้ง",
      );
      setStatus("idle");
      setProgress(0);
    }
  };

  const handleCancelAnalysis = () => {
    setStatus("idle");
    setProgress(0);
  };

  const handleGoToResult = () => {
    if (resultData) setStatus("result");
  };

  const handleNewAnalysis = () => {
    if (previewUrl && previewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(previewUrl);
    }
    setStatus("idle");
    setPreviewUrl(null);
    setSelectedImage(null);
    setResultData(null);
    setProgress(0);
  };

  return (
    <div className="analyze-content-wrapper">
      {/* 1. Upload Section */}
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
                const file = e.dataTransfer.files?.[0];
                if (!file) return;
                if (!file.type.startsWith("image/")) {
                  alert("กรุณาเลือกไฟล์รูปภาพเท่านั้น");
                  return;
                }
                if (file.size > 10 * 1024 * 1024) {
                  alert("ขนาดไฟล์ต้องไม่เกิน 10MB");
                  return;
                }
                if (previewUrl && previewUrl.startsWith("blob:")) {
                  URL.revokeObjectURL(previewUrl);
                }
                setSelectedImage(file);
                setPreviewUrl(URL.createObjectURL(file));
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
                    <FiRefreshCw />
                    เปลี่ยนรูปภาพ
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
                <FiCamera />
                เปิดกล้องถ่ายภาพ
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

      {/* 2. Processing Section */}
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
            />
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
              />
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

      {/* 3. Result Section */}
      {status === "result" && resultData && (
        <div className="result-container">
          <h2 className="page-title">ผลการวิเคราะห์โรค</h2>

          <div className="result-card-content">
            <div className="result-image-box">
              {resultData.imageUrl && (
                <img src={resultData.imageUrl} alt="ใบไม้ที่ส่งวิเคราะห์" />
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

                {resultData.treatment ? (
                  <div className="treatment-content">
                    {resultData.treatment.immediate_actions?.length > 0 && (
                      <div>
                        <strong>การดูแลเบื้องต้น</strong>
                        <ul>
                          {resultData.treatment.immediate_actions.map(
                            (item, index) => (
                              <li key={index}>{renderItemContent(item)}</li>
                            ),
                          )}
                        </ul>
                      </div>
                    )}

                    {resultData.treatment.chemical_control?.length > 0 && (
                      <div>
                        <strong>การควบคุมด้วยสารเคมี</strong>
                        <ul>
                          {resultData.treatment.chemical_control.map(
                            (item, index) => (
                              <li key={index}>{renderItemContent(item)}</li>
                            ),
                          )}
                        </ul>
                      </div>
                    )}

                    {resultData.treatment.nutrition?.length > 0 && (
                      <div>
                        <strong>การบำรุงธาตุอาหาร</strong>
                        <ul>
                          {resultData.treatment.nutrition.map((item, index) => (
                            <li key={index}>{renderItemContent(item)}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {resultData.treatment.prevention?.length > 0 && (
                      <div>
                        <strong>การป้องกัน</strong>
                        <ul>
                          {resultData.treatment.prevention.map(
                            (item, index) => (
                              <li key={index}>{renderItemContent(item)}</li>
                            ),
                          )}
                        </ul>
                      </div>
                    )}

                    {resultData.treatment.warning && (
                      <p>⚠️ {resultData.treatment.warning}</p>
                    )}

                    {resultData.treatment.immediate_actions?.length === 0 &&
                      resultData.treatment.chemical_control?.length === 0 &&
                      resultData.treatment.nutrition?.length === 0 &&
                      resultData.treatment.prevention?.length === 0 &&
                      !resultData.treatment.warning && (
                        <p>ไม่มีข้อมูลการรักษา</p>
                      )}
                  </div>
                ) : (
                  <p>ไม่มีข้อมูลการรักษา</p>
                )}
              </div>

              <button
                className="btn-submit-ai"
                style={{ marginTop: "20px" }}
                onClick={handleNewAnalysis}
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
