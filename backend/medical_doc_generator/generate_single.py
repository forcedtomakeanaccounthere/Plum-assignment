# generate_single.py

import sys
import os

try:
    import cv2
    import numpy as np
    import json
    import random
    from PIL import Image
    from xhtml2pdf import pisa
    from jinja2 import Template
    from pdf2image import convert_from_path
    from augmentations import *
    import io
except ImportError as e:
    sys.stderr.write(f"CRITICAL: Missing Python dependency: {str(e)}\n")
    sys.stderr.write("Please run: pip install -r requirements.txt\n")
    sys.exit(1)

HTML_TEMPLATE = """
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <style>
        @page {
            size: A4;
            margin: 0;
        }
        body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 40px;
            color: #333;
            line-height: 1.4;
        }
        .header {
            display: flex;
            justify-content: space-between;
            border-bottom: 2px solid #0056b3;
            padding-bottom: 10px;
            margin-bottom: 20px;
        }
        .hospital-info {
            text-align: center;
            flex: 1;
        }
        .hospital-name {
            font-size: 24px;
            font-weight: bold;
            color: #0056b3;
            text-transform: uppercase;
        }
        .hospital-details {
            font-size: 12px;
            color: #666;
        }
        .gst-nabh {
            font-size: 10px;
            border: 1px solid #ccc;
            padding: 5px;
            text-align: left;
        }
        .doc-type-banner {
            background-color: #f0f4f8;
            text-align: center;
            padding: 5px;
            font-weight: bold;
            border-radius: 15px;
            margin: 10px 0;
            border: 1px solid #d1d9e6;
            text-transform: uppercase;
        }
        .info-grid {
            display: table;
            width: 100%;
            margin-bottom: 20px;
            font-size: 12px;
        }
        .info-row {
            display: table-row;
        }
        .info-col {
            display: table-cell;
            padding: 3px 0;
        }
        .label {
            font-weight: bold;
            width: 120px;
        }
        .separator {
            width: 10px;
        }
        .table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
            font-size: 12px;
        }
        .table th {
            background-color: #d1e1f0;
            border: 1px solid #a5c2db;
            padding: 8px;
            text-align: left;
        }
        .table td {
            border: 1px solid #ccc;
            padding: 8px;
        }
        .total-section {
            float: right;
            width: 250px;
            font-size: 12px;
        }
        .total-row {
            display: table;
            width: 100%;
            padding: 3px 0;
        }
        .total-label {
            display: table-cell;
            font-weight: bold;
        }
        .total-value {
            display: table-cell;
            text-align: right;
        }
        .grand-total {
            background-color: #fff4d1;
            padding: 5px;
            border: 1px solid #e6d08a;
            font-weight: bold;
            font-size: 14px;
        }
        .footer {
            margin-top: 50px;
            font-size: 10px;
            color: #777;
        }
        .signature-section {
            margin-top: 40px;
            text-align: right;
        }
        .signature-box {
            display: inline-block;
            text-align: center;
            border-top: 1px solid #333;
            padding-top: 5px;
            width: 200px;
        }
        .prescription-section {
            margin-top: 20px;
        }
        .rx-symbol {
            font-size: 24px;
            font-weight: bold;
            color: #0056b3;
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="gst-nabh">
            GSTIN: {{ hospitalDetails.gstin }}<br>
            NABH ACCREDITED: {{ 'YES' if hospitalDetails.nabh else 'NO' }}
        </div>
        <div class="hospital-info">
            <div class="hospital-name">{{ hospitalDetails.name }}</div>
            <div class="hospital-details">
                {{ hospitalDetails.address }}<br>
                Ph: {{ hospitalDetails.phone }} | Email: {{ hospitalDetails.email }}
            </div>
        </div>
    </div>

    <div class="doc-type-banner">
        {{ docType.replace('_', ' ') }} / TAX INVOICE
    </div>

    <div class="info-grid">
        <div style="display: table-cell; width: 50%;">
            <div style="font-weight: bold; border-bottom: 1px solid #ccc; margin-bottom: 5px;">Patient Details</div>
            <div class="info-row">
                <div class="info-col label">Patient Name</div>
                <div class="info-col separator">:</div>
                <div class="info-col">{{ patientDetails.name }}</div>
            </div>
            <div class="info-row">
                <div class="info-col label">Age / Sex</div>
                <div class="info-col separator">:</div>
                <div class="info-col">{{ patientDetails.age }} / {{ patientDetails.gender }}</div>
            </div>
            <div class="info-row">
                <div class="info-col label">UHID / IP No</div>
                <div class="info-col separator">:</div>
                <div class="info-col">{{ patientDetails.uhid }} / {{ patientDetails.ipop }}</div>
            </div>
        </div>
        <div style="display: table-cell; width: 50%; padding-left: 20px;">
            <div style="font-weight: bold; border-bottom: 1px solid #ccc; margin-bottom: 5px;">Visit Details</div>
            <div class="info-row">
                <div class="info-col label">Bill No</div>
                <div class="info-col separator">:</div>
                <div class="info-col">{{ documentDetails.id }}</div>
            </div>
            <div class="info-row">
                <div class="info-col label">Date / Time</div>
                <div class="info-col separator">:</div>
                <div class="info-col">{{ documentDetails.date }} {{ documentDetails.time }}</div>
            </div>
            <div class="info-row">
                <div class="info-col label">Ref. Doctor</div>
                <div class="info-col separator">:</div>
                <div class="info-col">Dr. {{ doctorDetails.name }} ({{ doctorDetails.qualification }})</div>
            </div>
        </div>
    </div>

    {% if docType == 'prescription' %}
    <div class="prescription-section">
        <div style="font-weight: bold; margin-bottom: 10px;">DIAGNOSIS: {{ documentDetails.diagnosis }}</div>
        <div class="rx-symbol">Rx</div>
        <table class="table">
            <thead>
                <tr>
                    <th>Medicine Name</th>
                    <th>Dosage</th>
                    <th>Frequency</th>
                    <th>Duration</th>
                </tr>
            </thead>
            <tbody>
                {% for med in documentDetails.medicines %}
                <tr>
                    <td>{{ med.name }}</td>
                    <td>{{ med.dosage }}</td>
                    <td>{{ med.frequency }}</td>
                    <td>{{ med.duration }}</td>
                </tr>
                {% endfor %}
            </tbody>
        </table>
        <div style="font-weight: bold; margin-top: 10px;">ADVISED TESTS:</div>
        <ul>
            {% for test in documentDetails.tests %}
            <li>{{ test }}</li>
            {% endfor %}
        </ul>
    </div>
    {% else %}
    <table class="table">
        <thead>
            <tr>
                <th style="width: 40px;">S.No</th>
                <th>PARTICULARS</th>
                <th style="width: 80px;">HSN/SAC</th>
                <th style="width: 40px;">QTY</th>
                <th style="width: 80px;">RATE (₹)</th>
                <th style="width: 100px;">AMOUNT (₹)</th>
            </tr>
        </thead>
        <tbody>
            {% for item in documentDetails.items %}
            <tr>
                <td>{{ loop.index }}</td>
                <td>{{ item.particulars }}</td>
                <td>{{ item.hsn }}</td>
                <td>{{ item.qty }}</td>
                <td>{{ item.rate }}</td>
                <td>{{ item.amount }}</td>
            </tr>
            {% endfor %}
        </tbody>
    </table>

    <div class="total-section">
        <div class="total-row">
            <div class="total-label">SUB TOTAL</div>
            <div class="total-value">₹ {{ documentDetails.subTotal }}</div>
        </div>
        <div class="total-row">
            <div class="total-label">CGST (9%)</div>
            <div class="total-value">₹ {{ documentDetails.cgst }}</div>
        </div>
        <div class="total-row">
            <div class="total-label">SGST (9%)</div>
            <div class="total-value">₹ {{ documentDetails.sgst }}</div>
        </div>
        <div class="total-row grand-total">
            <div class="total-label">TOTAL AMOUNT</div>
            <div class="total-value">₹ {{ documentDetails.totalAmount }}</div>
        </div>
    </div>
    <div style="clear: both;"></div>
    
    <div style="font-size: 11px; margin-top: 10px;">
        <strong>Rupees in Words:</strong> {{ documentDetails.amountInWords }}
    </div>

    <div style="margin-top: 20px; font-size: 11px; border: 1px solid #ccc; padding: 10px; width: 300px;">
        <div style="font-weight: bold; border-bottom: 1px solid #eee; margin-bottom: 5px;">Payment Details</div>
        Mode: {{ documentDetails.paymentDetails.mode }}<br>
        Transaction ID: {{ documentDetails.paymentDetails.transactionId }}<br>
        Bank: {{ documentDetails.paymentDetails.bank }}
    </div>
    {% endif %}

    <div class="signature-section">
        <div class="signature-box">
            Authorized Signatory<br>
            <span style="font-size: 10px;">For {{ hospitalDetails.name }}</span>
        </div>
    </div>

    <div class="footer">
        Note: This is a computer generated invoice. No signature required. Valid for insurance claims.
    </div>
</body>
</html>
"""

def html_to_pdf(html_content, output_path):
    with open(output_path, "wb") as f:
        pisa.CreatePDF(html_content, dest=f)

def main():
    if len(sys.argv) < 2:
        print("Usage: python generate_single.py '<json_data_or_path>'")
        return

    input_data = sys.argv[1]
    try:
        if os.path.exists(input_data):
            with open(input_data, 'r') as f:
                data = json.load(f)
        else:
            data = json.loads(input_data)
    except Exception as e:
        print(f"Error parsing JSON: {e}")
        return

    doc_type = data.get('docType', 'prescription')
    variations = data.get('variations', ['clean'])
    output_dir = data.get('outputDir', 'temp_generated')
    out_format = data.get('format', 'image')
    poppler_path = data.get('popplerPath')
    os.makedirs(output_dir, exist_ok=True)

    # Render HTML
    template = Template(HTML_TEMPLATE)
    html_out = template.render(
        docType=doc_type,
        hospitalDetails=data.get('hospitalDetails', {}),
        patientDetails=data.get('patientDetails', {}),
        doctorDetails=data.get('doctorDetails', {}),
        documentDetails=data.get('documentDetails', {})
    )

    # Create temporary PDF for generation
    temp_pdf = os.path.join(output_dir, f"temp_{random.randint(1000, 9999)}.pdf")
    html_to_pdf(html_out, temp_pdf)

    # Convert PDF to Image for augmentations
    try:
        # Debug info
        sys.stderr.write(f"Converting PDF: {temp_pdf}\n")
        sys.stderr.write(f"Poppler path: {poppler_path}\n")
        
        if poppler_path and os.path.exists(poppler_path):
            images = convert_from_path(temp_pdf, dpi=200, poppler_path=poppler_path)
        else:
            images = convert_from_path(temp_pdf, dpi=200)
        
        if not images:
            raise Exception("No images generated from PDF")
            
    except Exception as e:
        error_msg = f"CRITICAL: PDF to Image conversion failed. Is Poppler installed? Error: {str(e)}"
        sys.stderr.write(error_msg + "\n")
        if os.path.exists(temp_pdf): os.remove(temp_pdf)
        # Instead of exit, we can try to return a JSON error
        print(json.dumps({"error": error_msg}))
        sys.exit(1)

    base_img_pil = images[0]
    base_img_cv = cv2.cvtColor(np.array(base_img_pil), cv2.COLOR_RGB2BGR)

    generated_files = []

    for var in variations:
        img_variant_cv = base_img_cv.copy()
        
        # Apply augmentations
        if var == 'phone':
            img_variant_cv = perspective_warp(img_variant_cv)
        elif var == 'faded':
            img_variant_cv = faded_print(img_variant_cv)
        elif var == 'stamp':
            img_variant_cv = add_stamp(img_variant_cv)
        elif var == 'shadow':
            img_variant_cv = add_shadow(img_variant_cv)
        elif var == 'ocr_hard':
            img_variant_cv = jpeg_artifacts(add_noise(perspective_warp(faded_print(img_variant_cv))))
        
        ext = "pdf" if out_format == 'pdf' else "jpg"
        filename = f"{doc_type}_{var}_{random.randint(1000, 9999)}.{ext}"
        filepath = os.path.join(output_dir, filename)
        
        if out_format == 'pdf':
            # Convert BGR back to RGB for PIL and save as PDF
            img_variant_rgb = cv2.cvtColor(img_variant_cv, cv2.COLOR_BGR2RGB)
            Image.fromarray(img_variant_rgb).save(filepath, "PDF")
        else:
            cv2.imwrite(filepath, img_variant_cv)
            
        generated_files.append({"name": f"{doc_type} ({var})", "path": filepath})

    # Cleanup temp PDF
    if os.path.exists(temp_pdf):
        os.remove(temp_pdf)

    print(json.dumps({"files": generated_files}))

if __name__ == "__main__":
    main()
