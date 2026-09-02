"""
รันไฟล์นี้ก่อนเทรน เพื่อเช็คว่าเครื่องมี GPU ให้ TensorFlow ใช้หรือไม่
วิธีรัน: python check_gpu.py
"""
import tensorflow as tf

print("TensorFlow version:", tf.__version__)
gpus = tf.config.list_physical_devices("GPU")

if gpus:
    print(f"✅ พบ GPU จำนวน {len(gpus)} ตัว:")
    for gpu in gpus:
        print("   -", gpu)
    print("การเทรนจะเร็ว (ไม่กี่นาที/epoch)")
else:
    print("⚠️ ไม่พบ GPU — จะใช้ CPU แทน")
    print("ยังเทรนได้ปกติ แต่ช้ากว่า (ประมาณ 5-15 นาที/epoch ขึ้นกับสเปกเครื่อง)")
    print("สคริปต์เทรนที่ให้ไปถูกออกแบบให้ freeze base model ไว้ก่อน จะช่วยให้เร็วขึ้นมากบน CPU")
