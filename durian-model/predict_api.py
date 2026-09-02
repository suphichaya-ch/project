import base64
import csv
from datetime import datetime
import io
import logging
import os

import cv2
from flask import Flask, request, jsonify
from flask_cors import CORS
import numpy as np
from PIL import Image
from tensorflow.keras.applications.mobilenet_v2 import preprocess_input
from tensorflow.keras.models import load_model

# ---------------------------------------------------------------------------
# ตั้งค่า Logging ระบบ (พ่นลงไฟล์ app_debug.log)
# ---------------------------------------------------------------------------

APP_LOG_FILE = os.path.join(
    os.path.dirname(__file__),
    "app_debug.log"
)

logging.basicConfig(
    filename=APP_LOG_FILE,
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
    encoding="utf-8"
)

# ---------------------------------------------------------------------------
# ตั้งค่าระบบและ Path ต่างๆ
# ---------------------------------------------------------------------------

MODEL_PATH = os.path.join(
    os.path.dirname(__file__),
    "durian_model.keras"
)

LOG_FILE = os.path.join(
    os.path.dirname(__file__),
    "prediction_logs.csv"
)

IMG_SIZE = (224, 224)

# Threshold ขั้นต่ำสำหรับการตัดสินว่าเป็นโรค (หากต่ำกว่านี้ถือว่าใบปกติ/ไม่มั่นใจ)
CONFIDENCE_THRESHOLD = 0.50

# ต้องตรงกับลำดับ class ตอน train
CLASS_NAMES = [
    "ALGAL_LEAF_SPOT",
    "ALLOCARIDARA_ATTACK",
    "HEALTHY_LEAF",
    "LEAF_BLIGHT",
    "PHOMOPSIS_LEAF_SPOT",
]

# ---------------------------------------------------------------------------
# ฟังก์ชันบันทึก Log ลงไฟล์ CSV (UC-09)
# ---------------------------------------------------------------------------

def log_prediction(image_name, predicted_class, confidence, is_low_confidence=False, error=None):
    """
    ฟังก์ชันสำหรับบันทึก Log การทำนายลง CSV โดยใช้ csv.writer เพื่อความถูกต้องของ Data Integrity
    """
    file_exists = os.path.isfile(LOG_FILE)
    
    try:
        # ใช้ utf-8-sig เพื่อให้เปิดไฟล์บน Excel ภาษาไทยได้ถูกต้องโดยตัวอักษรไม่ต่างดาว
        with open(LOG_FILE, mode="a", newline="", encoding="utf-8-sig") as f:
            writer = csv.writer(f, quoting=csv.QUOTE_MINIMAL)
            
            # หากยังไม่มีไฟล์ ให้เขียน Header เป็นบรรทัดแรก
            if not file_exists:
                writer.writerow(["timestamp", "image_name", "predicted_class", "confidence", "is_low_confidence", "error"])

            # ทำความสะอาดข้อมูลก่อนเขียนลงไฟล์
            timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            clean_image_name = str(image_name or "-").replace("\n", " ").strip()
            clean_predicted_class = str(predicted_class or "-").strip()
            
            if isinstance(confidence, (int, float)):
                conf_val = f"{float(confidence):.4f}"
            else:
                conf_val = "-"

            clean_error = str(error or "-").replace("\n", " ").replace("\r", " ").strip()

            # เขียนแถวข้อมูลลง CSV
            writer.writerow([
                timestamp,
                clean_image_name,
                clean_predicted_class,
                conf_val,
                is_low_confidence,
                clean_error
            ])

    except Exception as e:
        error_msg = f"[CSV Log Error] ไม่สามารถบันทึก Log ลง CSV ได้: {str(e)}"
        print(error_msg)
        logging.error(error_msg)


# ---------------------------------------------------------------------------
# ฟังก์ชันประมวลผล UC-03: Contour & Bounding Box
# ---------------------------------------------------------------------------

def process_bounding_box(image_bytes, is_healthy=False):
    """
    ตรวจจับพื้นที่จุด/แผลบนใบพืชและวาด Bounding Box คืนค่าเป็น Base64 String
    """
    try:
        logging.info("[UC-03] เริ่มประมวลผล Contour & Bounding Box")
        nparr = np.frombuffer(image_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if img is None:
            raise ValueError("ไม่สามารถถอดรหัสภาพ OpenCV (imdecode) ได้")

        # หากไม่ใช่ใบปกติ ให้ตรวจจับจุดรอยแผลและวาดกรอบ
        if not is_healthy:
            hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
            
            # ขยายช่วงสีครอบคลุมน้ำตาลเข้ม น้ำตาลเหลือง และเหลืองไหม้
            lower_bound = np.array([0, 30, 30])
            upper_bound = np.array([35, 255, 255])
            mask = cv2.inRange(hsv, lower_bound, upper_bound)

            contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            
            box_count = 0
            for cnt in contours:
                area = cv2.contourArea(cnt)
                if area > 100:  # กรอง noise ขนาดเล็กออก
                    x, y, w, h = cv2.boundingRect(cnt)
                    cv2.rectangle(img, (x, y), (x + w, y + h), (0, 0, 255), 2)  # สี่เหลี่ยมสีแดง
                    box_count += 1
            logging.info(f"[UC-03] วาด Bounding Box สำเร็จ ทั้งหมด {box_count} จุด")
        else:
            logging.info("[UC-03] ข้ามการวาด Bounding Box เนื่องจากเป็น HEALTHY_LEAF")

        # แปลงภาพ OpenCV กลับเป็น Base64 Data URL ให้ Frontend นำไปแสดงผลได้ทันที
        _, buffer = cv2.imencode('.jpg', img)
        img_base64 = base64.b64encode(buffer).decode('utf-8')
        return f"data:image/jpeg;base64,{img_base64}"

    except Exception as e:
        logging.error(f"[UC-03 Error] เกิดข้อผิดพลาดใน process_bounding_box: {str(e)}", exc_info=True)
        return None


# ---------------------------------------------------------------------------
# ข้อมูลโรค + แนวทางการดูแลรักษา
# ---------------------------------------------------------------------------

DISEASE_INFO = {
    "ALGAL_LEAF_SPOT": {
        "name_th": "โรคสาหร่ายใบจุด",
        "symptoms": (
            "พบจุดสีเขียวอมเทาหรือสีน้ำตาลคล้ายสนิมบนผิวใบ "
            "ลักษณะอาจนูนคล้ายกำมะหยี่ และอาจขยายเป็นวงกลม"
        ),
        "treatment": {
            "immediate_actions": [
                "ตัดใบหรือส่วนของใบที่มีอาการรุนแรงออกจากต้น",
                "เก็บใบที่ร่วงและส่วนที่เป็นโรคออกจากบริเวณโคนต้น",
                "นำส่วนที่เป็นโรคออกจากแปลงเพื่อช่วยลดแหล่งสะสมของเชื้อ",
                "ตัดแต่งทรงพุ่มให้โปร่งเพื่อช่วยให้อากาศถ่ายเทได้ดีขึ้น",
            ],
            "chemical_control": [
                {
                    "active_ingredient": "สารประกอบทองแดง (Copper-based fungicide)",
                    "purpose": (
                        "ใช้เพื่อช่วยป้องกันและลดการแพร่กระจายของโรค "
                        "ในกรณีที่ผลิตภัณฑ์ขึ้นทะเบียนสำหรับการใช้งานดังกล่าว"
                    ),
                    "instruction": (
                        "เลือกผลิตภัณฑ์ที่ขึ้นทะเบียนสำหรับทุเรียนและโรคเป้าหมาย "
                        "จากนั้นใช้ตามอัตรา วิธีผสม และระยะเว้นก่อนเก็บเกี่ยว "
                        "ที่ระบุบนฉลากผลิตภัณฑ์"
                    ),
                }
            ],
            "nutrition": [
                "ดูแลต้นให้ได้รับน้ำอย่างเหมาะสมและไม่เกิดน้ำขัง",
                "ให้ธาตุอาหารอย่างสมดุลตามระยะการเจริญเติบโต",
                "ตรวจสภาพดินก่อนเพิ่มปริมาณปุ๋ย",
                "หลีกเลี่ยงการใส่ปุ๋ยไนโตรเจนมากเกินความจำเป็น",
            ],
            "prevention": [
                "รักษาทรงพุ่มให้โปร่ง",
                "ลดความชื้นสะสมภายในทรงพุ่ม",
                "ตรวจใบเป็นประจำ โดยเฉพาะในช่วงฝนตกหรือความชื้นสูง",
                "เก็บใบที่เป็นโรคออกจากแปลงอย่างสม่ำเสมอ",
            ],
            "warning": (
                "การใช้สารป้องกันกำจัดโรคพืชต้องใช้ผลิตภัณฑ์ที่ขึ้นทะเบียนถูกต้อง "
                "และปฏิบัติตามฉลากอย่างเคร่งครัด"
            ),
        },
    },
    "ALLOCARIDARA_ATTACK": {
        "name_th": "การเข้าทำลายของแมลง Allocaridara",
        "symptoms": (
            "พบร่องรอยแมลง Allocaridara ดูดกินน้ำเลี้ยงบริเวณใบอ่อน "
            "ทำให้ใบอ่อนบิดงอ หงิกงอ ชะงักการเจริญเติบโต "
            "และอาจพบคราบเหนียวจากมูลแมลง"
        ),
        "treatment": {
            "immediate_actions": [
                "ตรวจดูยอดอ่อนและใบอ่อนทั่วต้นเพื่อประเมินการระบาด",
                "ตัดส่วนที่ถูกทำลายอย่างรุนแรงออกหากจำเป็น",
                "เก็บและกำจัดส่วนพืชที่มีแมลงจำนวนมาก",
                "ติดตามจำนวนแมลงอย่างสม่ำเสมอ โดยเฉพาะช่วงแตกยอดอ่อน",
            ],
            "chemical_control": [
                {
                    "active_ingredient": (
                        "สารกำจัดแมลงที่ขึ้นทะเบียนสำหรับศัตรูพืชเป้าหมายในทุเรียน"
                    ),
                    "purpose": (
                        "ใช้ควบคุมแมลงที่เข้าทำลายใบและยอดอ่อน "
                        "เมื่อพบการระบาดถึงระดับที่จำเป็นต้องควบคุม"
                    ),
                    "instruction": (
                        "เลือกผลิตภัณฑ์ที่มีฉลากระบุการใช้กับทุเรียนและศัตรูพืชเป้าหมาย "
                        "ใช้ตามอัตรา วิธีการ และจำนวนครั้งตามฉลาก "
                        "และควรสลับกลุ่มสารออกฤทธิ์เพื่อลดความเสี่ยงต่อการดื้อยา"
                    ),
                }
            ],
            "nutrition": [
                "ดูแลต้นให้สมบูรณ์และไม่ขาดน้ำ",
                "ให้ธาตุอาหารครบถ้วนและสมดุลตามระยะการเจริญเติบโต",
                "หลีกเลี่ยงการเร่งไนโตรเจนมากเกินไปจนแตกยอดอ่อนจำนวนมาก",
                "ตรวจสภาพดินก่อนเพิ่มปริมาณปุ๋ย",
            ],
            "prevention": [
                "สำรวจยอดอ่อนและใบอ่อนเป็นประจำ",
                "กำจัดวัชพืชหรือส่วนพืชที่เป็นแหล่งสะสมของแมลง",
                "รักษาความสมบูรณ์ของต้นเพื่อช่วยให้ต้นทนต่อการเข้าทำลาย",
                "ติดตามการระบาดอย่างต่อเนื่องก่อนตัดสินใจใช้สารกำจัดแมลง",
            ],
            "warning": (
                "ควรตรวจสอบชนิดของแมลงและระดับการระบาดก่อนใช้สารกำจัดแมลง "
                "และใช้เฉพาะผลิตภัณฑ์ที่ขึ้นทะเบียนสำหรับพืชและศัตรูพืชเป้าหมาย"
            ),
        },
    },
    "HEALTHY_LEAF": {
        "name_th": "ใบปกติ / ใบสุขภาพดี",
        "symptoms": (
            "ไม่พบอาการผิดปกติที่ชัดเจนจากภาพ ใบมีสีเขียว "
            "และไม่พบลักษณะของโรคตามกลุ่มที่โมเดลตรวจจับ"
        ),
        "treatment": {
            "immediate_actions": [
                "ยังไม่พบอาการของโรคจากภาพที่ส่งเข้ามา",
                "ดูแลต้นตามแนวทางการจัดการสวนตามปกติ",
                "ตรวจใบและยอดใหม่อย่างสม่ำเสมอ",
            ],
            "chemical_control": [],
            "nutrition": [
                "ให้ปุ๋ยตามระยะการเจริญเติบโตของต้น",
                "พิจารณาสภาพดินก่อนเพิ่มปริมาณปุ๋ย",
                "ให้ธาตุอาหารอย่างสมดุล ไม่เน้นธาตุใดธาตุหนึ่งมากเกินไป",
                "รักษาความชื้นในดินให้เหมาะสมและหลีกเลี่ยงน้ำขัง",
            ],
            "prevention": [
                "ตรวจสุขภาพใบและยอดอย่างสม่ำเสมอ",
                "รักษาทรงพุ่มให้โปร่งและมีอากาศถ่ายเท",
                "กำจัดใบที่ร่วงหรือส่วนพืชที่เป็นโรคออกจากแปลง",
                "ติดตามความผิดปกติหลังช่วงฝนตกหรือสภาพอากาศชื้น",
            ],
            "warning": (
                "ผลการวิเคราะห์เป็นการประเมินจากภาพเท่านั้น "
                "การไม่พบโรคจากภาพไม่ได้หมายความว่าต้นไม่มีปัญหาทุกชนิด"
            ),
        },
    },
    "LEAF_BLIGHT": {
        "name_th": "โรคใบไหม้",
        "symptoms": (
            "ใบแสดงอาการเป็นแผลสีน้ำตาลหรือแห้งไหม้ "
            "โดยอาจเริ่มจากขอบใบและลุกลามเข้าสู่ส่วนกลางของใบ"
        ),
        "treatment": {
            "immediate_actions": [
                "ตัดใบที่มีอาการรุนแรงออกจากต้น",
                "เก็บใบที่เป็นโรคและใบที่ร่วงออกจากใต้ทรงพุ่ม",
                "นำส่วนที่เป็นโรคไปทำลายและไม่กองทิ้งไว้ใต้ต้น",
                "ลดความชื้นและเพิ่มการถ่ายเทอากาศภายในทรงพุ่ม",
            ],
            "chemical_control": [
                {
                    "active_ingredient": (
                        "สารป้องกันกำจัดเชื้อราที่ขึ้นทะเบียน "
                        "สำหรับทุเรียนและโรคเป้าหมาย"
                    ),
                    "purpose": (
                        "ช่วยป้องกันหรือลดการแพร่กระจายของเชื้อรา "
                        "ในกรณีที่สาเหตุของอาการเกี่ยวข้องกับเชื้อรา"
                    ),
                    "instruction": (
                        "เลือกผลิตภัณฑ์ที่มีฉลากระบุการใช้กับทุเรียน "
                        "และโรคเป้าหมายโดยตรง และใช้ตามอัตราที่ระบุบนฉลาก"
                    ),
                }
            ],
            "nutrition": [
                "ตรวจสอบความสมบูรณ์ของต้นและสภาพดิน",
                "ให้ธาตุอาหารอย่างสมดุลตามระยะการเจริญเติบโต",
                "หลีกเลี่ยงการใส่ปุ๋ยไนโตรเจนมากเกินไป",
                "หากพบอาการขาดธาตุอาหารควรตรวจสอบเพิ่มเติมก่อนเพิ่มปริมาณปุ๋ย",
            ],
            "prevention": [
                "ตัดแต่งทรงพุ่มให้โปร่ง",
                "ลดความชื้นสะสมภายในทรงพุ่ม",
                "จัดการระบบน้ำไม่ให้ใบเปียกเป็นเวลานาน",
                "ตรวจแปลงเป็นประจำโดยเฉพาะหลังฝนตกหนัก",
            ],
            "warning": (
                "อาการใบไหม้อาจเกิดจากหลายสาเหตุ เช่น โรคเชื้อรา "
                "ความเครียดจากน้ำ หรือปัจจัยแวดล้อม "
                "ควรตรวจสอบสาเหตุร่วมกับผลการวิเคราะห์"
            ),
        },
    },
    "PHOMOPSIS_LEAF_SPOT": {
        "name_th": "โรคใบจุด Phomopsis",
        "symptoms": (
            "พบจุดสีน้ำตาลหรือสีดำกระจายบนใบ "
            "บางจุดอาจมีวงสีเหลืองล้อมรอบ "
            "และอาจเกิดจากเชื้อราในกลุ่ม Phomopsis"
        ),
        "treatment": {
            "immediate_actions": [
                "ตัดใบที่มีอาการรุนแรงออก",
                "เก็บใบที่ร่วงและใบที่เป็นโรคออกจากบริเวณโคนต้น",
                "นำใบที่เป็นโรคไปทำลายนอกแปลง",
                "ลดความชื้นสะสมบนใบและเพิ่มการไหลเวียนของอากาศ",
            ],
            "chemical_control": [
                {
                    "active_ingredient": (
                        "สารป้องกันกำจัดเชื้อราที่ขึ้นทะเบียน "
                        "สำหรับทุเรียนและโรคเป้าหมาย"
                    ),
                    "purpose": (
                        "ช่วยควบคุมและลดการแพร่กระจายของเชื้อรา "
                        "เมื่อมีการระบาดและจำเป็นต้องควบคุม"
                    ),
                    "instruction": (
                        "ตรวจสอบฉลากว่าผลิตภัณฑ์ขึ้นทะเบียนสำหรับทุเรียน "
                        "และโรคเป้าหมายก่อนใช้งาน "
                        "จากนั้นปฏิบัติตามอัตราและวิธีใช้ที่ระบุบนฉลาก"
                    ),
                }
            ],
            "nutrition": [
                "ตรวจสภาพดินและความสมบูรณ์ของต้น",
                "ให้ปุ๋ยอย่างสมดุลตามระยะการเจริญเติบโต",
                "หลีกเลี่ยงการใส่ปุ๋ยมากเกินความต้องการของต้น",
                "หากสงสัยว่าขาดธาตุอาหารควรตรวจวิเคราะห์ก่อนเพิ่มปุ๋ย",
            ],
            "prevention": [
                "เก็บใบที่เป็นโรคออกจากแปลงอย่างสม่ำเสมอ",
                "ตัดแต่งทรงพุ่มให้โปร่ง",
                "ลดความชื้นสะสมบนใบ",
                "สำรวจใบใหม่อย่างสม่ำเสมอเพื่อพบอาการตั้งแต่ระยะเริ่มต้น",
            ],
            "warning": (
                "ไม่ควรใช้สารเคมีโดยกำหนดอัตราเอง "
                "ควรใช้ผลิตภัณฑ์ที่ขึ้นทะเบียนและทำตามฉลากอย่างเคร่งครัด"
            ),
        },
    },
}


# ---------------------------------------------------------------------------
# สร้าง Flask App และโหลดโมเดล
# ---------------------------------------------------------------------------

app = Flask(__name__)
CORS(app)

print("Loading model...")
logging.info("เริ่มต้นเปิดใช้งาน API Server")

if not os.path.exists(MODEL_PATH):
    error_msg = f"ไม่พบไฟล์โมเดล: {MODEL_PATH}"
    logging.critical(error_msg)
    raise FileNotFoundError(error_msg)

try:
    model = load_model(MODEL_PATH)
    print("Model loaded from:", MODEL_PATH)
    logging.info(f"โหลดโมเดลสำเร็จจาก Path: {MODEL_PATH}")
except Exception as e:
    logging.critical(f"ไม่สามารถโหลดโมเดลได้: {str(e)}", exc_info=True)
    raise e


# ---------------------------------------------------------------------------
# ฟังก์ชันเตรียมรูปภาพ
# ---------------------------------------------------------------------------

def prepare_image(file_bytes: bytes) -> np.ndarray:
    """
    รับ bytes ของรูปภาพ resize เป็น 224x224 และ preprocess ตาม MobileNetV2
    """
    try:
        img = Image.open(io.BytesIO(file_bytes)).convert("RGB")
        img = img.resize(IMG_SIZE)
        arr = np.array(img, dtype=np.float32)
        arr = preprocess_input(arr)
        return np.expand_dims(arr, axis=0)
    except Exception as e:
        logging.error(f"เกิดข้อผิดพลาดระหว่างเตรียมรูปภาพ (prepare_image): {str(e)}", exc_info=True)
        raise e


# ---------------------------------------------------------------------------
# Health Check Endpoint
# ---------------------------------------------------------------------------

@app.route("/health", methods=["GET"])
def health():
    return jsonify({
        "status": "ok",
        "model_loaded": model is not None,
        "model_path": MODEL_PATH
    })


# ---------------------------------------------------------------------------
# Prediction Endpoint
# ---------------------------------------------------------------------------

@app.route("/predict", methods=["POST"])
def predict():
    # ตรวจสอบว่าส่งไฟล์มาหรือไม่
    if "image" not in request.files:
        error_msg = "ไม่พบไฟล์ภาพ (field name ต้องเป็น 'image')"
        logging.warning(f"Request ปฏิเสธ: {error_msg}")
        log_prediction(image_name=None, predicted_class=None, confidence=None, error=error_msg)
        return jsonify({"success": False, "error": error_msg}), 400

    file = request.files["image"]

    if file.filename == "":
        error_msg = "ไม่ได้เลือกไฟล์"
        logging.warning(f"Request ปฏิเสธ: {error_msg}")
        log_prediction(image_name=None, predicted_class=None, confidence=None, error=error_msg)
        return jsonify({"success": False, "error": error_msg}), 400

    try:
        file_bytes = file.read()

        if not file_bytes:
            error_msg = "ไฟล์ภาพว่างหรือไม่สามารถอ่านไฟล์ได้"
            logging.warning(f"Request ปฏิเสธ ({file.filename}): {error_msg}")
            log_prediction(image_name=file.filename, predicted_class=None, confidence=None, error=error_msg)
            return jsonify({"success": False, "error": error_msg}), 400

        logging.info(f"รับไฟล์ภาพ '{file.filename}' เข้ามาประมวลผล")

        # เตรียมภาพและประมวลผลทำนาย
        x = prepare_image(file_bytes)
        preds = model.predict(x, verbose=0)[0]

        if len(preds) != len(CLASS_NAMES):
            error_msg = f"จำนวน class ของโมเดล ({len(preds)}) ไม่ตรงกับ CLASS_NAMES ({len(CLASS_NAMES)})"
            logging.error(error_msg)
            log_prediction(image_name=file.filename, predicted_class=None, confidence=None, error=error_msg)
            return jsonify({"success": False, "error": error_msg}), 500

        # หาค่าการทำนายสูงสุด
        top_idx = int(np.argmax(preds))
        top_class = CLASS_NAMES[top_idx]
        confidence = float(preds[top_idx])

        # ตรวจสอบ Confidence Threshold
        is_low_confidence = False
        if confidence < CONFIDENCE_THRESHOLD and top_class != "HEALTHY_LEAF":
            is_low_confidence = True
            top_class = "HEALTHY_LEAF"
            logging.info(f"ค่า Confidence ({confidence:.4f}) ต่ำกว่า Threshold ({CONFIDENCE_THRESHOLD}) ปรับเป็น HEALTHY_LEAF")

        logging.info(f"ผลการทำนายภาพ '{file.filename}': Class = {top_class}, Confidence = {confidence:.4f}")

        # ประมวลผล UC-03: ตรวจจับพื้นที่แผลและวาด Bounding Box
        processed_img_base64 = process_bounding_box(file_bytes, is_healthy=(top_class == "HEALTHY_LEAF"))

        # บันทึก Log ลง CSV ด้วยฟังก์ชัน log_prediction (UC-09)
        log_prediction(
            image_name=file.filename,
            predicted_class=top_class,
            confidence=confidence,
            is_low_confidence=is_low_confidence,
            error=None
        )

        # ดึงข้อมูลการรักษา
        info = DISEASE_INFO.get(
            top_class,
            {
                "name_th": top_class,
                "symptoms": "ไม่มีข้อมูลอาการ",
                "treatment": {
                    "immediate_actions": [],
                    "chemical_control": [],
                    "nutrition": [],
                    "prevention": [],
                    "warning": "ไม่มีข้อมูลคำแนะนำ"
                }
            }
        )

        all_scores = {CLASS_NAMES[i]: float(preds[i]) for i in range(len(CLASS_NAMES))}

        return jsonify({
            "success": True,
            "class": top_class,
            "disease": info["name_th"],
            "confidence": confidence,
            "is_low_confidence": is_low_confidence,
            "symptoms": info["symptoms"],
            "treatment": info["treatment"],
            "all_scores": all_scores,
            "processed_image": processed_img_base64  # ส่งรูปที่มี Bounding Box กลับไป
        })

    except Exception as e:
        error_msg = f"เกิดข้อผิดพลาดระหว่างทำนาย: {str(e)}"
        print("Prediction error:", str(e))
        logging.error(f"[Prediction Error] {file.filename}: {str(e)}", exc_info=True)

        log_prediction(
            image_name=getattr(file, "filename", "-"),
            predicted_class=None,
            confidence=None,
            error=error_msg
        )

        return jsonify({"success": False, "error": error_msg}), 500


# ---------------------------------------------------------------------------
# Run Server
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    print("------------------------------------------")
    print("Durian Disease AI API")
    print("------------------------------------------")
    print("Model     :", MODEL_PATH)
    print("Image     :", IMG_SIZE)
    print("Threshold :", CONFIDENCE_THRESHOLD)
    print("Log CSV   :", LOG_FILE)
    print("Debug Log :", APP_LOG_FILE)
    print("Port      : 5001")
    print("------------------------------------------")

    app.run(
        host="0.0.0.0",
        port=5001,
        debug=False
    )