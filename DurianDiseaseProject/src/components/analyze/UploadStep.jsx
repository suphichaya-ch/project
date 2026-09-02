import React from "react";
import { FiUploadCloud, FiCamera, FiX, FiRefreshCw } from "react-icons/fi";

function UploadStep({
  previewUrl,
  sampleImages,
  isCameraOpen,
  videoRef,
  canvasRef,
  onImageChange,
  onDrop,
  onSelectSample,
  onStartCamera,
  onStopCamera,
  onCapturePhoto,
  onStartAnalysis,
}) {
  return (
    <div className="upload-container">
      <h2 className="page-title">วิเคราะห์โรคใบทุเรียนด้วย AI</h2>

      <canvas ref={canvasRef} style={{ display: "none" }} />

      {isCameraOpen ? (
        <div className="camera-view-container">
          <div className="video-wrapper">
            <video ref={videoRef} autoPlay playsInline />
            <button className="btn-close-camera" onClick={onStopCamera}>
              <FiX />
            </button>
          </div>
          <button className="btn-capture" onClick={onCapturePhoto}>
            📸 ถ่ายภาพ
          </button>
        </div>
      ) : (
        <div
          className="dropzone-box"
          onDragOver={(e) => e.preventDefault()}
          onDrop={onDrop}
        >
          <input
            type="file"
            id="file-input"
            accept="image/*"
            onChange={onImageChange}
            hidden
          />

          {previewUrl ? (
            <div className="preview-container">
              <img src={previewUrl} alt="Preview" className="preview-image" />
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

          <button className="btn-camera" onClick={onStartCamera}>
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
                  onClick={() => onSelectSample(sample.url)}
                >
                  <img src={sample.url} alt={`sample-${sample.id}`} />
                </div>
              ))}
            </div>
          </div>

          <button className="btn-submit-ai" onClick={onStartAnalysis}>
            เริ่มวิเคราะห์ด้วย AI
          </button>
        </>
      )}
    </div>
  );
}

export default UploadStep;
