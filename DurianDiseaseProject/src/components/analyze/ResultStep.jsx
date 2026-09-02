import React from "react";

function ResultStep({ previewUrl, resultData, onAnalyzeAgain }) {
  return (
    <div className="result-container">
      <h2 className="page-title">ผลการวิเคราะห์โรค</h2>

      <div className="result-card-content">
        <div className="result-image-box">
          {previewUrl && <img src={previewUrl} alt="ใบไม้ที่ส่งวิเคราะห์" />}
          <span
            className={`badge-status ${
              resultData?.isDiseaseDetected ? "danger" : "success"
            }`}
          >
            {resultData?.isDiseaseDetected ? "ตรวจพบโรค" : "ปกติ"}
          </span>
        </div>

        <div className="result-details">
          <div className="disease-header">
            <h3 className="disease-name">{resultData?.diseaseName}</h3>
            <div className="confidence-tag">
              ความแม่นยำ <span>{resultData?.confidence}%</span>
            </div>
          </div>

          <hr className="result-divider" />

          <div className="info-group">
            <h4>📌 ลักษณะอาการที่พบ:</h4>
            <p>{resultData?.symptoms || "ไม่มีข้อมูลลักษณะอาการ"}</p>
          </div>

          <div className="info-group">
            <h4>💡 แนวทางการรักษาและป้องกัน:</h4>
            {Array.isArray(resultData?.treatment) &&
            resultData.treatment.length > 0 ? (
              <ul className="treatment-list">
                {resultData.treatment.map((item, index) => (
                  <li key={index} style={{ marginBottom: "12px" }}>
                    {typeof item === "object" && item !== null ? (
                      <div>
                        {item.active_ingredient && (
                          <div>
                            <strong>สารออกฤทธิ์ / ยา:</strong>{" "}
                            {item.active_ingredient}
                          </div>
                        )}
                        {item.purpose && (
                          <div>
                            <strong>วัตถุประสงค์:</strong> {item.purpose}
                          </div>
                        )}
                        {item.instruction && (
                          <div>
                            <strong>คำแนะนำ:</strong> {item.instruction}
                          </div>
                        )}
                      </div>
                    ) : (
                      <span>{item}</span>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p>
                {typeof resultData?.treatment === "string"
                  ? resultData.treatment
                  : "ไม่มีข้อมูลการรักษา"}
              </p>
            )}
          </div>

          <button
            className="btn-submit-ai"
            style={{ marginTop: "20px" }}
            onClick={onAnalyzeAgain}
          >
            วิเคราะห์ภาพใหม่
          </button>
        </div>
      </div>
    </div>
  );
}

export default ResultStep;
