import io
import os
import pathlib
import unittest

from PIL import Image

# นำเข้า app จากไฟล์ predict_api.py ที่อยู่โฟลเดอร์เดียวกัน ( Root )
from predict_api import app


class TestDurianPredictAPI(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        """
        เตรียมไฟล์รูปภาพจำลองขึ้นมา 1 รูปก่อนเริ่มการรัน Test ทั้งหมด
        """
        cls.test_dir = pathlib.Path("tests/test_assets")
        cls.test_dir.mkdir(parents=True, exist_ok=True)

        # สร้างภาพ dummy ขนาด 100x100 พิกเซล
        cls.valid_image_path = cls.test_dir / "sample_leaf.jpg"
        img = Image.new("RGB", (100, 100), color="green")
        img.save(cls.valid_image_path)

        # สร้างไฟล์ที่ไม่ใช่รูปภาพ
        cls.invalid_text_file = cls.test_dir / "invalid_file.txt"
        with open(cls.invalid_text_file, "w") as f:
            f.write("This is not an image.")

    @classmethod
    def tearDownClass(cls):
        """
        ลบไฟล์ชั่วคราวทิ้งหลังจากรัน Test ทุกเคสเสร็จสิ้น
        """
        if cls.valid_image_path.exists():
            os.remove(cls.valid_image_path)
        if cls.invalid_text_file.exists():
            os.remove(cls.invalid_text_file)
        if cls.test_dir.exists():
            os.rmdir(cls.test_dir)

    def setUp(self):
        """
        สร้าง Flask Test Client สำหรับส่ง HTTP Request ในแต่ละ Test Case
        """
        app.config["TESTING"] = True
        self.client = app.test_client()

    # ---------------------------------------------------------
    # Test Cases
    # ---------------------------------------------------------

    def test_health_check(self):
        """1. ทดสอบ Endpoint /health ต้องตอบกลับ 200 OK"""
        response = self.client.get("/health")
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertEqual(data["status"], "ok")

    def test_predict_success(self):
        """2. ทดสอบกรณีส่งไฟล์รูปภาพปกติไปยัง /predict"""
        with open(self.valid_image_path, "rb") as img_file:
            response = self.client.post(
                "/predict",
                data={"image": (img_file, "sample_leaf.jpg")},
                content_type="multipart/form-data"
            )

        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertTrue(data["success"])
        self.assertIn("class", data)
        self.assertIn("confidence", data)
        self.assertIn("disease", data)
        self.assertIn("processed_image", data)  # Bounding box base64
        self.assertGreaterEqual(data["confidence"], 0.0)
        self.assertLessEqual(data["confidence"], 1.0)

    def test_predict_no_image_file(self):
        """3. ทดสอบกรณีไม่ได้แนบไฟล์รูปมาใน Request ต้องได้ Error 400"""
        response = self.client.post("/predict")
        self.assertEqual(response.status_code, 400)
        data = response.get_json()
        self.assertFalse(data["success"])

    def test_predict_invalid_file_type(self):
        """4. ทดสอบกรณีส่งไฟล์ที่ไม่ใช่รูปภาพ (เช่น .txt) เข้ามา"""
        with open(self.invalid_text_file, "rb") as txt_file:
            response = self.client.post(
                "/predict",
                data={"image": (txt_file, "invalid_file.txt")},
                content_type="multipart/form-data"
            )

        # ฝั่ง Server จะตอบกลับ 500 หรือ 400 ขึ้นอยู่กับการดัก Exception ใน prepare_image
        data = response.get_json()
        self.assertFalse(data["success"])


if __name__ == "__main__":
    unittest.main()