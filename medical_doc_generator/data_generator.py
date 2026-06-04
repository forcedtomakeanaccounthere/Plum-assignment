# data_generator.py

from faker import Faker
import random

fake = Faker("en_IN")

DIAGNOSIS = [
    "Viral fever",
    "Upper respiratory tract infection",
    "Gastroenteritis",
    "Hypertension",
    "Type 2 Diabetes",
    "Migraine",
    "Allergic rhinitis",
    "Lower back pain"
]

MEDICINES = {
    "Viral fever": [
        "Paracetamol 650mg",
        "Cetirizine 10mg"
    ],
    "Upper respiratory tract infection": [
        "Azithromycin 500mg",
        "Paracetamol 650mg"
    ],
    "Type 2 Diabetes": [
        "Metformin 500mg"
    ],
    "Hypertension": [
        "Amlodipine 5mg"
    ]
}

TESTS = [
    "CBC",
    "LFT",
    "KFT",
    "Lipid Profile",
    "Blood Sugar",
    "ECG"
]

DOCTOR_REGS = [
    "KA/12345/2015",
    "MH/67890/2018",
    "DL/34567/2020",
    "TN/45678/2016"
]


def generate_patient():
    return {
        "name": fake.name(),
        "age": random.randint(18,80),
        "gender": random.choice(["Male","Female"]),
        "address": fake.address()
    }


def generate_doctor():
    return {
        "name": fake.name(),
        "qualification": "MBBS, MD",
        "reg_no": random.choice(DOCTOR_REGS)
    }


def generate_case():
    diagnosis = random.choice(DIAGNOSIS)

    return {
        "patient": generate_patient(),
        "doctor": generate_doctor(),
        "diagnosis": diagnosis,
        "medicines": MEDICINES.get(
            diagnosis,
            ["Paracetamol 650mg"]
        ),
        "tests": random.sample(TESTS, k=2)
    }