import os
import csv
import math
from pathlib import Path

import numpy as np
import tensorflow as tf
from tensorflow import keras
from PIL import Image, ImageDraw, ImageFont

# ========= แก้ค่าตรงนี้ให้ตรงกับโปรเจกต์ =========
DATASET_DIR = "../DurianDiseaseProject/src/assets/archive/DLD_FinalDataset_224_spit/train"
MODEL_PATH = "durian_model.keras"
CLASS_NAMES_PATH = "class_names.json"
IMG_SIZE = (224, 224)                   # ต้องตรงกับตอนเทรนโมเดล
CONFIDENCE_THRESHOLD = 0.70              # ความมั่นใจขั้นต่ำที่ถือว่า "น่าสงสัย"
# ===================================================

OUTPUT_CSV = "suspect_report.csv"
REVIEW_DIR = "suspect_review"
MAX_PER_GRID = 20
COLS = 5
THUMB_SIZE = 200
LABEL_HEIGHT = 30
PADDING = 8


def load_class_names():
    import json
    with open(CLASS_NAMES_PATH, "r", encoding="utf-8") as f:
        data = json.load(f)
    # รองรับทั้งกรณีเป็น list ตรงๆ หรือ dict {index: name}
    if isinstance(data, dict):
        return [data[str(i)] for i in range(len(data))]
    return data


def collect_images(dataset_dir, class_names):
    """คืนค่า list ของ (filepath, true_label) จากโครงสร้างโฟลเดอร์ตามคลาส"""
    items = []
    base = Path(dataset_dir)
    for cls in class_names:
        cls_dir = base / cls
        if not cls_dir.exists():
            print(f"  [ข้าม] ไม่พบโฟลเดอร์: {cls_dir}")
            continue
        for img_path in cls_dir.iterdir():
            if img_path.suffix.lower() in (".jpg", ".jpeg", ".png"):
                items.append((str(img_path), cls))
    return items


def predict_batch(model, filepaths, class_names, batch_size=32):
    results = []
    for i in range(0, len(filepaths), batch_size):
        batch_paths = filepaths[i : i + batch_size]
        batch_imgs = []
        for p in batch_paths:
            img = keras.utils.load_img(p, target_size=IMG_SIZE)
            arr = keras.utils.img_to_array(img)
            batch_imgs.append(arr)
        batch_arr = np.stack(batch_imgs, axis=0)
        preds = model.predict(batch_arr, verbose=0)
        for pred in preds:
            pred_idx = int(np.argmax(pred))
            results.append((class_names[pred_idx], float(pred[pred_idx]), pred))
        print(f"  ทำนายแล้ว {min(i + batch_size, len(filepaths))}/{len(filepaths)} รูป")
    return results


def get_font(size=14):
    try:
        return ImageFont.truetype("DejaVuSans-Bold.ttf", size)
    except Exception:
        return ImageFont.load_default()


def build_grid(image_paths, title, out_path):
    n = len(image_paths)
    cols = min(COLS, n) if n > 0 else 1
    rows = math.ceil(n / cols)
    cell_w = THUMB_SIZE + PADDING * 2
    cell_h = THUMB_SIZE + LABEL_HEIGHT + PADDING * 2
    title_h = 40

    canvas = Image.new("RGB", (cell_w * cols, cell_h * rows + title_h), "white")
    draw = ImageDraw.Draw(canvas)
    draw.text((10, 10), title, fill="black", font=get_font(18))
    font_label = get_font(12)

    for idx, (img_path, conf) in enumerate(image_paths):
        row, col = divmod(idx, cols)
        x = col * cell_w + PADDING
        y = row * cell_h + title_h + PADDING
        try:
            img = Image.open(img_path).convert("RGB")
            img.thumbnail((THUMB_SIZE, THUMB_SIZE))
            paste_x = x + (THUMB_SIZE - img.width) // 2
            paste_y = y + (THUMB_SIZE - img.height) // 2
            canvas.paste(img, (paste_x, paste_y))
        except Exception as e:
            draw.rectangle([x, y, x + THUMB_SIZE, y + THUMB_SIZE], outline="red")

        fname = Path(img_path).name
        if len(fname) > 20:
            fname = fname[:17] + "..."
        draw.text((x, y + THUMB_SIZE + 2), f"{fname}", fill="black", font=font_label)
        draw.text(
            (x, y + THUMB_SIZE + 16),
            f"conf: {conf:.2f}",
            fill="darkred",
            font=font_label,
        )

    canvas.save(out_path)
    print(f"  saved: {out_path} ({n} รูป)")


def main():
    print("=== โหลดโมเดลและ class names ===")
    class_names = load_class_names()
    model = keras.models.load_model(MODEL_PATH)
    print(f"  คลาสทั้งหมด: {class_names}")

    print(f"\n=== รวบรวมรูปจาก {DATASET_DIR} ===")
    items = collect_images(DATASET_DIR, class_names)
    print(f"  พบทั้งหมด {len(items)} รูป")
    if not items:
        print("ไม่พบรูปเลย เช็ค DATASET_DIR ให้ถูกต้องก่อนนะครับ")
        return

    filepaths = [x[0] for x in items]
    true_labels = [x[1] for x in items]

    print(f"\n=== ให้โมเดลทำนายทุกรูป ({len(filepaths)} รูป) ===")
    predictions = predict_batch(model, filepaths, class_names)

    print("\n=== หารูปที่น่าสงสัย (label != prediction และมั่นใจสูง) ===")
    suspects = []
    for (fpath, true_label), (pred_label, conf, _) in zip(items, predictions):
        if pred_label != true_label and conf >= CONFIDENCE_THRESHOLD:
            suspects.append(
                {
                    "filepath": fpath,
                    "true_label": true_label,
                    "predicted_label": pred_label,
                    "confidence": conf,
                }
            )

    suspects.sort(key=lambda x: x["confidence"], reverse=True)
    print(f"  พบรูปน่าสงสัยทั้งหมด {len(suspects)} รูป (จาก threshold {CONFIDENCE_THRESHOLD})")

    # เขียน CSV รายงานทั้งหมด
    with open(OUTPUT_CSV, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(
            f, fieldnames=["filepath", "true_label", "predicted_label", "confidence"]
        )
        writer.writeheader()
        writer.writerows(suspects)
    print(f"  เซฟรายงานที่: {OUTPUT_CSV}")

    # จัดกลุ่มตามคู่ true_label -> predicted_label แล้วสร้าง grid ให้ดู
    out_dir = Path(REVIEW_DIR)
    out_dir.mkdir(exist_ok=True)

    groups = {}
    for s in suspects:
        key = f"{s['true_label']}_labeled_but_predicted_as_{s['predicted_label']}"
        groups.setdefault(key, []).append((s["filepath"], s["confidence"]))

    print(f"\n=== สร้างภาพ grid สำหรับตรวจสอบด้วยตา ({len(groups)} กลุ่ม) ===")
    for group_name, image_confs in sorted(
        groups.items(), key=lambda kv: -len(kv[1])
    ):
        print(f"- {group_name}: {len(image_confs)} รูป")
        chunks = [
            image_confs[i : i + MAX_PER_GRID]
            for i in range(0, len(image_confs), MAX_PER_GRID)
        ]
        for i, chunk in enumerate(chunks):
            suffix = f"_part{i+1}" if len(chunks) > 1 else ""
            out_path = out_dir / f"{group_name}{suffix}.png"
            build_grid(chunk, f"{group_name} ({len(image_confs)} รูป)", str(out_path))

    print(f"\n✅ เสร็จแล้ว! ดูผลได้ที่: {OUTPUT_CSV} และโฟลเดอร์ {REVIEW_DIR}/")
    print("⚠️  อย่าลืม: เปิดดูรูปด้วยตาก่อนตัดสินใจลบ/แก้ label ทุกครั้ง")


if __name__ == "__main__":
    main()