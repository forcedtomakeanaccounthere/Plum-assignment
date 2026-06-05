#!/usr/bin/env python3
"""
Convert PDF pages to images (Poppler via pdf2image) and run Tesseract OCR.
Max 3 pages per document.
"""
import json
import sys
import os

MAX_PAGES = 3


def main():
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Usage: pdf_ocr.py <pdf_path>"}))
        sys.exit(1)

    pdf_path = sys.argv[1]
    if not os.path.isfile(pdf_path):
        print(json.dumps({"error": f"File not found: {pdf_path}"}))
        sys.exit(1)

    try:
        from pdf2image import convert_from_path
        import pytesseract
    except ImportError as e:
        print(json.dumps({
            "error": "Missing Python OCR dependencies. Run: pip install -r backend/scripts/requirements-ocr.txt",
            "detail": str(e)
        }))
        sys.exit(1)

    poppler_path = os.environ.get("POPPLER_PATH")
    convert_kwargs = {"dpi": 200, "first_page": 1, "last_page": MAX_PAGES}
    if poppler_path:
        convert_kwargs["poppler_path"] = poppler_path

    try:
        images = convert_from_path(pdf_path, **convert_kwargs)
    except Exception as e:
        print(json.dumps({
            "error": "PDF conversion failed. Ensure Poppler is installed and POPPLER_PATH is set on Windows.",
            "detail": str(e)
        }))
        sys.exit(1)

    if len(images) == 0:
        print(json.dumps({"error": "PDF has no readable pages"}))
        sys.exit(1)

    if len(images) > MAX_PAGES:
        images = images[:MAX_PAGES]

    page_texts = []
    for idx, img in enumerate(images, start=1):
        text = pytesseract.image_to_string(img, lang="eng")
        page_texts.append(f"--- PDF Page {idx} ---\n{text.strip()}")

    full_text = "\n\n".join(page_texts)
    print(json.dumps({
        "text": full_text,
        "pages_processed": len(images),
        "max_pages": MAX_PAGES
    }))


if __name__ == "__main__":
    main()
