# augmentations.py

import cv2
import numpy as np
import random


def add_noise(img):

    noise = np.random.normal(
        0,
        15,
        img.shape
    )

    noisy = img + noise

    return np.clip(
        noisy,
        0,
        255
    ).astype(np.uint8)

# Phone Photo Perspective
def perspective_warp(img):

    h,w = img.shape[:2]

    src = np.float32([
        [0,0],
        [w,0],
        [0,h],
        [w,h]
    ])

    dst = np.float32([
        [50,80],
        [w-80,30],
        [20,h-50],
        [w-20,h-100]
    ])

    matrix = cv2.getPerspectiveTransform(
        src,
        dst
    )

    return cv2.warpPerspective(
        img,
        matrix,
        (w,h)
    )

# Faded Print
def faded_print(img):

    alpha = random.uniform(
        0.55,
        0.8
    )

    return cv2.convertScaleAbs(
        img,
        alpha=alpha,
        beta=40
    )

# Compression Artifacts
def jpeg_artifacts(img):

    encode_param = [
        int(cv2.IMWRITE_JPEG_QUALITY),
        random.randint(20,50)
    ]

    _, enc = cv2.imencode(
        ".jpg",
        img,
        encode_param
    )

    return cv2.imdecode(
        enc,
        1
    )

# Shadow Simulation
def add_shadow(img):

    overlay = img.copy()

    h,w = img.shape[:2]

    cv2.rectangle(
        overlay,
        (0,0),
        (w//2,h),
        (0,0,0),
        -1
    )

    alpha = 0.25

    return cv2.addWeighted(
        overlay,
        alpha,
        img,
        1-alpha,
        0
    )

# Stamp Overlay
def add_stamp(img):

    overlay = img.copy()

    center = (
        img.shape[1]//2,
        img.shape[0]//2
    )

    cv2.circle(
        overlay,
        center,
        180,
        (0,0,255),
        6
    )

    cv2.putText(
        overlay,
        "APPROVED",
        (
            center[0]-120,
            center[1]
        ),
        cv2.FONT_HERSHEY_SIMPLEX,
        1.4,
        (0,0,255),
        4
    )

    return cv2.addWeighted(
        overlay,
        0.3,
        img,
        0.7,
        0
    )

# Pen Correction
def pen_correction(img):

    h,w = img.shape[:2]

    y = random.randint(
        h//3,
        h//2
    )

    cv2.line(
        img,
        (200,y),
        (800,y),
        (255,0,0),
        3
    )

    cv2.putText(
        img,
        "corrected",
        (820,y),
        cv2.FONT_HERSHEY_SIMPLEX,
        0.7,
        (255,0,0),
        2
    )

    return img

