# templates/prescription.py

from PIL import Image
from PIL import ImageDraw
from PIL import ImageFont


def create_prescription(data, output_file):

    img = Image.new(
        "RGB",
        (1654,2339),
        "white"
    )

    draw = ImageDraw.Draw(img)

    font = ImageFont.truetype(
        "arial.ttf",
        32
    )

    y = 100

    draw.text(
        (100,y),
        f"Dr. {data['doctor']['name']}",
        fill="black",
        font=font
    )

    y += 60

    draw.text(
        (100,y),
        f"Reg: {data['doctor']['reg_no']}",
        fill="black",
        font=font
    )

    y += 120

    draw.text(
        (100,y),
        f"Patient: {data['patient']['name']}",
        fill="black",
        font=font
    )

    y += 60

    draw.text(
        (100,y),
        f"Diagnosis: {data['diagnosis']}",
        fill="black",
        font=font
    )

    y += 100

    draw.text(
        (100,y),
        "Rx",
        fill="black",
        font=font
    )

    y += 60

    for med in data["medicines"]:
        draw.text(
            (140,y),
            med,
            fill="black",
            font=font
        )
        y += 50

    img.save(output_file)