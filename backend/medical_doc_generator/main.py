# main.py

import cv2
import os

from data_generator import generate_case
from templates.prescription import create_prescription
from augmentations import *

os.makedirs("dataset", exist_ok=True)

for i in range(1000):

    data = generate_case()

    clean_path = f"dataset/doc_{i}.png"

    create_prescription(
        data,
        clean_path
    )

    img = cv2.imread(clean_path)

    variants = {
        "clean": img,
        "phone": perspective_warp(img),
        "faded": faded_print(img),
        "stamp": add_stamp(img),
        "shadow": add_shadow(img),
        "correction": pen_correction(img.copy()),
        "ocr_hard": jpeg_artifacts(
            add_noise(
                perspective_warp(
                    faded_print(img)
                )
            )
        )
    }

    for name, variant in variants.items():

        cv2.imwrite(
            f"dataset/{i}_{name}.jpg",
            variant
        )