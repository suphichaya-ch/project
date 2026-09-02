import json
import pathlib
import shutil
import tensorflow as tf
from sklearn.metrics import classification_report, confusion_matrix

# ============================================================
# 1) ตั้งค่า Path
# ============================================================
DATA_DIR = pathlib.Path(
    "../DurianDiseaseProject/src/assets/archive/DLD_FinalDataset_224_spit"
)
TEST_DIR = DATA_DIR / "test"
IMG_SIZE = (224, 224)
BATCH_SIZE = 32

# ============================================================
# 2) โหลด Test Dataset & Model
# ============================================================
print("⏳ กำลังโหลด Test Dataset และ Model...")
test_ds = tf.keras.utils.image_dataset_from_directory(
    TEST_DIR,
    image_size=IMG_SIZE,
    batch_size=BATCH_SIZE,
    shuffle=False,
)

test_file_paths = test_ds.file_paths
y_true = tf.concat([y for _, y in test_ds], axis=0).numpy()

# โหลด class names
with open("class_names.json", "r", encoding="utf-8") as f:
    class_names = json.load(f)

# โหลดโมเดลที่เทรนเสร็จแล้ว
model = tf.keras.models.load_model("durian_model.keras")

# ============================================================
# 3) Predict บน Test Set
# ============================================================
print("⏳ กำลัง Predict บน Test Set...")
test_ds_eval = test_ds.prefetch(tf.data.AUTOTUNE)
y_pred_probs = model.predict(test_ds_eval, verbose=1)
y_pred = y_pred_probs.argmax(axis=1)

# ============================================================
# 4) แยกและบันทึกรูปที่ทายผิด (Misclassified Images)
# ============================================================
misclassified_idx = [
    i for i in range(len(y_true))
    if y_true[i] != y_pred[i]
]

print(f"\nพบรูปที่ทายผิดทั้งหมด {len(misclassified_idx)} รูป จาก {len(y_true)} รูป")

output_dir = pathlib.Path("misclassified_images")
if output_dir.exists():
    shutil.rmtree(output_dir)
output_dir.mkdir(exist_ok=True)

for i in misclassified_idx:
    true_label = class_names[y_true[i]]
    pred_label = class_names[y_pred[i]]
    src_path = test_file_paths[i]

    pair_folder = output_dir / f"{true_label}_predicted_as_{pred_label}"
    pair_folder.mkdir(exist_ok=True)
    shutil.copy(src_path, pair_folder / pathlib.Path(src_path).name)

print(f"✅ บันทึกรูปที่ทายผิดเรียบร้อยแล้วที่โฟลเดอร์: {output_dir}\n")
for pair_folder in sorted(output_dir.iterdir()):
    n = len(list(pair_folder.glob("*")))
    print(f"  - {pair_folder.name}: {n} รูป")