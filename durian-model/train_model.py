import json
import logging
import pathlib
import shutil

import matplotlib.pyplot as plt
import numpy as np
import tensorflow as tf
from sklearn.metrics import classification_report, confusion_matrix
from sklearn.utils.class_weight import compute_class_weight

# ============================================================
# ตั้งค่า Logging ระบบ (UC-09 / App Debug Logs)
# ============================================================
logging.basicConfig(
    filename="training_debug.log",
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
    encoding="utf-8",
)

def cleanup_temp_files(folder_path="misclassified_images"):
    """
    ฟังก์ชันทำความสะอาดไฟล์/โฟลเดอร์ชั่วคราวหลังจบกระบวนการ (UC-10)
    """
    target_path = pathlib.Path(folder_path)
    try:
        if target_path.exists() and target_path.is_dir():
            shutil.rmtree(target_path)
            logging.info(f"[UC-10 Cleanup] เคลียร์โฟลเดอร์ชั่วคราวสำเร็จ: {folder_path}")
            print(f"🧹 [UC-10 Cleanup] ลบโฟลเดอร์ชั่วคราวเรียบร้อย: {folder_path}")
    except Exception as e:
        error_msg = f"[UC-10 Cleanup Error] เกิดข้อผิดพลาดขณะลบไฟล์ชั่วคราว: {str(e)}"
        logging.error(error_msg)
        print(error_msg)


# ============================================================
# 1) ตั้งค่าไฮเปอร์พารามิเตอร์ (ปรับปรุงขนาดภาพ)
# ============================================================
DATA_DIR = pathlib.Path(
    "../DurianDiseaseProject/src/assets/archive/DLD_FinalDataset_224_spit"
)

TRAIN_DIR = DATA_DIR / "train"
VAL_DIR = DATA_DIR / "val"
TEST_DIR = DATA_DIR / "test"

# 🛠️ ปรับ 1: เพิ่ม Resolution ภาพจาก 224x224 เป็น 384x384 เพื่อเก็บรายละเอียดจุดแผลเล็กๆ
IMG_SIZE = (384, 384)
BATCH_SIZE = 16  # ลด batch size ลงเพื่อป้องกัน Out of Memory เนื่องจากภาพใหญ่ขึ้น
SEED = 42

try:
    logging.info("เริ่มต้นกระบวนการ Training Pipeline (เวอร์ชันปรับปรุง)")

    # ============================================================
    # 2) โหลด dataset
    # ============================================================
    train_ds = tf.keras.utils.image_dataset_from_directory(
        TRAIN_DIR,
        image_size=IMG_SIZE,
        batch_size=BATCH_SIZE,
        seed=SEED,
        shuffle=True,
    )

    val_ds = tf.keras.utils.image_dataset_from_directory(
        VAL_DIR,
        image_size=IMG_SIZE,
        batch_size=BATCH_SIZE,
        seed=SEED,
        shuffle=False,
    )

    test_ds = tf.keras.utils.image_dataset_from_directory(
        TEST_DIR,
        image_size=IMG_SIZE,
        batch_size=BATCH_SIZE,
        seed=SEED,
        shuffle=False,
    )

    class_names = train_ds.class_names
    print("คลาสที่พบ:", class_names)
    logging.info(f"คลาสที่พบใน Dataset: {class_names}")

    with open("class_names.json", "w", encoding="utf-8") as f:
        json.dump(class_names, f, ensure_ascii=False, indent=2)

    # 🛠️ ปรับ 2: คำนวณ Class Weights ช่วยแก้ปัญหาคลาสไม่สมดุลและการมองข้ามแผลโรค
    y_train = np.concatenate([y.numpy() for _, y in train_ds], axis=0)
    class_weights_vals = compute_class_weight(
        class_weight="balanced",
        classes=np.unique(y_train),
        y=y_train
    )
    class_weight_dict = dict(enumerate(class_weights_vals))
    print("Class Weights ที่คำนวณได้:", class_weight_dict)

    test_file_paths = test_ds.file_paths
    y_true = tf.concat([y for _, y in test_ds], axis=0).numpy()

    AUTOTUNE = tf.data.AUTOTUNE
    train_ds = train_ds.prefetch(AUTOTUNE)
    val_ds = val_ds.prefetch(AUTOTUNE)
    test_ds_eval = test_ds.prefetch(AUTOTUNE)

    # ============================================================
    # 3) Data augmentation (ยกระดับเพื่อแก้ปัญหาแสง/เงา/จุดแผลเล็ก)
    # ============================================================
    # 🛠️ ปรับ 3: เพิ่ม Crop, Brightness และ Contrast เพื่อให้โมเดลทนต่อสภาพแสงหลากหลาย
    data_augmentation = tf.keras.Sequential(
        [
            tf.keras.layers.RandomFlip("horizontal_and_vertical"),
            tf.keras.layers.RandomRotation(0.15),
            tf.keras.layers.RandomCrop(int(IMG_SIZE[0] * 0.85), int(IMG_SIZE[1] * 0.85)),
            tf.keras.layers.Resizing(IMG_SIZE[0], IMG_SIZE[1]), # Resize กลับมาเท่าเดิม
            tf.keras.layers.RandomTranslation(0.08, 0.08),
            tf.keras.layers.RandomBrightness(factor=0.2), # ทนต่อเงาและแสงสะท้อน
            tf.keras.layers.RandomContrast(0.2),
        ],
        name="data_augmentation",
    )

    # ============================================================
    # 4) Backbone Model Architecture
    # ============================================================
    # 🛠️ ปรับ 4: เปลี่ยนมาใช้ ConvNeXtSmall หรือ EfficientNetV2M ที่เก่ง Feature สเกลเล็ก
    base_model = tf.keras.applications.EfficientNetV2M(
        input_shape=IMG_SIZE + (3,),
        include_top=False,
        weights="imagenet",
    )

    base_model.trainable = False

    inputs = tf.keras.Input(shape=IMG_SIZE + (3,))
    x = data_augmentation(inputs)
    x = tf.keras.applications.efficientnet_v2.preprocess_input(x)
    x = base_model(x, training=False)

    x = tf.keras.layers.GlobalAveragePooling2D()(x)
    x = tf.keras.layers.BatchNormalization()(x)
    x = tf.keras.layers.Dropout(0.3)(x)
    x = tf.keras.layers.Dense(256, activation="relu")(x)
    x = tf.keras.layers.Dropout(0.2)(x)

    outputs = tf.keras.layers.Dense(
        len(class_names),
        activation="softmax"
    )(x)

    model = tf.keras.Model(inputs, outputs)

    # ============================================================
    # 5) Phase 1: Train classification head
    # ============================================================
    model.compile(
        optimizer=tf.keras.optimizers.Adam(learning_rate=1e-3),
        loss="sparse_categorical_crossentropy",
        metrics=["accuracy"],
    )

    callbacks = [
        tf.keras.callbacks.EarlyStopping(
            monitor="val_accuracy",
            patience=6,
            mode="max",
            restore_best_weights=True,
            verbose=1,
        ),
        tf.keras.callbacks.ModelCheckpoint(
            "durian_model.keras",
            monitor="val_accuracy",
            mode="max",
            save_best_only=True,
            verbose=1,
        ),
        tf.keras.callbacks.ReduceLROnPlateau(
            monitor="val_loss",
            factor=0.5,
            patience=3,
            min_lr=1e-7,
            verbose=1,
        ),
    ]

    print("\n=== Phase 1: Train classification head ===")
    logging.info("เริ่ม Phase 1: Train classification head")

    history1 = model.fit(
        train_ds,
        validation_data=val_ds,
        epochs=15,
        class_weight=class_weight_dict, # ส่ง Class Weight เข้าไปช่วย
        callbacks=callbacks,
    )

    # ============================================================
    # 6) Phase 2: Fine-tuning
    # ============================================================
    print("\n=== Phase 2: Fine-tuning last 60 layers ===")
    logging.info("เริ่ม Phase 2: Fine-tuning last 60 layers")

    base_model.trainable = True

    # ปลดล็อกเลเยอร์ท้ายๆ เพื่อทำ Fine-tune
    for layer in base_model.layers[:-60]:
        layer.trainable = False

    for layer in base_model.layers:
        if isinstance(layer, tf.keras.layers.BatchNormalization):
            layer.trainable = False

    model.compile(
        optimizer=tf.keras.optimizers.Adam(learning_rate=1e-5), # ปรับ LR เพิ่มเล็กน้อย
        loss="sparse_categorical_crossentropy",
        metrics=["accuracy"],
    )

    history2 = model.fit(
        train_ds,
        validation_data=val_ds,
        epochs=30,
        class_weight=class_weight_dict,
        callbacks=callbacks,
    )

    # ============================================================
    # 7) Evaluate test set
    # ============================================================
    print("\n=== ประเมินผลบน test set ===")

    test_loss, test_acc = model.evaluate(
        test_ds_eval,
        verbose=1,
    )

    print(f"Test accuracy: {test_acc:.4f}")
    print(f"Test accuracy (%): {test_acc * 100:.2f}%")
    logging.info(f"Test accuracy: {test_acc * 100:.2f}%")

    y_pred_probs = model.predict(test_ds_eval, verbose=1)
    y_pred = y_pred_probs.argmax(axis=1)

    report = classification_report(
        y_true,
        y_pred,
        target_names=class_names,
        digits=4,
    )

    cm = confusion_matrix(y_true, y_pred)

    print("\n", report)
    print("Confusion matrix:\n", cm)

    with open("test_report.txt", "w", encoding="utf-8") as f:
        f.write(f"Test accuracy: {test_acc:.4f}\n")
        f.write(f"Test accuracy (%): {test_acc * 100:.2f}%\n\n")
        f.write(report)
        f.write("\n\nConfusion matrix:\n")
        f.write(str(cm))

    # ============================================================
    # 7.5) เก็บรูปที่ทายผิด (misclassified images)
    # ============================================================
    print("\n=== เก็บรูปที่ทายผิด (misclassified images) ===")

    misclassified_idx = [
        i for i in range(len(y_true))
        if y_true[i] != y_pred[i]
    ]

    print(
        f"พบรูปที่ทายผิดทั้งหมด {len(misclassified_idx)} รูป "
        f"จาก {len(y_true)} รูป"
    )

    output_dir = pathlib.Path("misclassified_images")

    if output_dir.exists():
        shutil.rmtree(output_dir)

    output_dir.mkdir(exist_ok=True)

    for i in misclassified_idx:
        true_label = class_names[y_true[i]]
        pred_label = class_names[y_pred[i]]
        src_path = test_file_paths[i]

        pair_folder = (
            output_dir /
            f"{true_label}_predicted_as_{pred_label}"
        )

        pair_folder.mkdir(exist_ok=True)

        shutil.copy(
            src_path,
            pair_folder / pathlib.Path(src_path).name
        )

    print(f"เซฟรูปที่ทายผิดไว้ที่โฟลเดอร์: {output_dir}")

    for pair_folder in sorted(output_dir.iterdir()):
        n = len(list(pair_folder.glob("*")))
        print(f"  - {pair_folder.name}: {n} รูป")

    # ============================================================
    # 8) Training curve
    # ============================================================
    acc = history1.history["accuracy"] + history2.history["accuracy"]
    val_acc = (
        history1.history["val_accuracy"]
        + history2.history["val_accuracy"]
    )

    loss = history1.history["loss"] + history2.history["loss"]
    val_loss = (
        history1.history["val_loss"]
        + history2.history["val_loss"]
    )

    fig, axes = plt.subplots(1, 2, figsize=(12, 4))

    axes[0].plot(acc, label="train")
    axes[0].plot(val_acc, label="val")
    axes[0].axvline(
        len(history1.history["accuracy"]),
        color="gray",
        linestyle="--",
        label="fine-tune start",
    )
    axes[0].set_title("Accuracy")
    axes[0].set_xlabel("Epoch")
    axes[0].set_ylabel("Accuracy")
    axes[0].legend()

    axes[1].plot(loss, label="train")
    axes[1].plot(val_loss, label="val")
    axes[1].axvline(
        len(history1.history["loss"]),
        color="gray",
        linestyle="--",
        label="fine-tune start",
    )
    axes[1].set_title("Loss")
    axes[1].set_xlabel("Epoch")
    axes[1].set_ylabel("Loss")
    axes[1].legend()

    plt.tight_layout()
    plt.savefig("training_curve.png", dpi=150)
    plt.close()

    print("\n✅ เสร็จแล้ว!")

except Exception as e:
    error_msg = f"เกิดข้อผิดพลาดรุนแรงใน Training Pipeline: {str(e)}"
    print(f"\n❌ {error_msg}")
    logging.critical(error_msg, exc_info=True)

finally:
    # เคลียร์ไฟล์ชั่วคราวเมื่อเสร็จสมบูรณ์
    cleanup_temp_files("misclassified_images")