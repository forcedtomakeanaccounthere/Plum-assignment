import { callGemini } from '../utils/llm.util';
import { logger } from '../utils/logger';

export class ExtractionService {
  /**
   * Calls Gemini to parse the OCR text into a structured JSON schema.
   */
  static async extractFields(ocrText: string, documentType: string): Promise<Record<string, any>> {
    logger.info(`Starting LLM field extraction for document type: ${documentType}`);

    const systemInstruction = 
      "You are a medical document parser for an insurance company. Extract structured data from OCR text of medical documents. " +
      "Return ONLY valid JSON. If a field is not found, use null. Never invent data. For each extracted field, estimate your " +
      "confidence (0.0-1.0). Also return bounding box hints as rough percentage coordinates (x,y,w,h as 0-100 values) of where " +
      "you found each piece of information in the document.";

    const prompt = `
Document type: ${documentType}
OCR text:
${ocrText}

Extract the following fields and return as JSON matching this schema:
{
  "document_type": "prescription|bill|lab_report|pharmacy_bill",
  "patient_name": { "value": string|null, "confidence": float, "bbox": { "x": number, "y": number, "w": number, "h": number }|null },
  "doctor_name": { "value": string|null, "confidence": float, "bbox": { "x": number, "y": number, "w": number, "h": number }|null },
  "doctor_registration": { "value": string|null, "confidence": float, "bbox": { "x": number, "y": number, "w": number, "h": number }|null },
  "date": { "value": "YYYY-MM-DD"|null, "confidence": float },
  "diagnosis": { "value": string|null, "confidence": float, "bbox": { "x": number, "y": number, "w": number, "h": number }|null },
  "medicines": [{ "name": string, "dosage": string|null, "confidence": float }],
  "procedures": [{ "name": string, "amount": number|null, "confidence": float }],
  "total_amount": { "value": number|null, "confidence": float },
  "itemized_costs": [{ "item": string, "amount": number, "category": "consultation|medicine|diagnostic|procedure|other" }],
  "tests_prescribed": [string],
  "extraction_notes": string|null
}

Return only the JSON object, no markdown, no explanation.
`;

    try {
      const resultText = await callGemini(prompt, systemInstruction, true);
      // Clean up markdown block wraps if returned
      let cleanedJson = resultText.trim();
      if (cleanedJson.startsWith('```json')) {
        cleanedJson = cleanedJson.substring(7);
      }
      if (cleanedJson.startsWith('```')) {
        cleanedJson = cleanedJson.substring(3);
      }
      if (cleanedJson.endsWith('```')) {
        cleanedJson = cleanedJson.substring(0, cleanedJson.length - 3);
      }
      
      const parsed = JSON.parse(cleanedJson.trim());
      logger.info(`Field extraction complete for ${documentType}.`);
      return parsed;
    } catch (err) {
      logger.error('Failed to extract and parse fields using Gemini:', err);
      // Throw or return basic fallback
      throw new Error(`LLM field extraction failed for document type ${documentType}`);
    }
  }
}
