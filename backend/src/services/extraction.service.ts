import { callGemini, callMistral } from '../utils/llm.util';
import { logger } from '../utils/logger';

export class ExtractionService {
  /**
   * Calls Gemini to parse the OCR text into a structured JSON schema.
   * Using Gemini for extraction as requested.
   */
  static async extractFields(ocrText: string, documentType: string): Promise<Record<string, any>> {
    logger.info(`Starting Gemini field extraction for document type: ${documentType}`);
    
    const systemInstruction = `You are a professional medical document parser. Extract fields from the OCR text into structured JSON.`;
    const prompt = `Extract the following fields from this medical ${documentType} text:
      - patient_name (object with value, confidence, bbox)
      - doctor_name (object with value, confidence, bbox)
      - doctor_registration (object with value, confidence, bbox)
      - date (object with value, confidence)
      - diagnosis (object with value, confidence, bbox)
      - medicines (array of objects with name, dosage, confidence)
      - procedures (array of objects with name, amount, confidence)
      - total_amount (object with value, confidence)
      - itemized_costs (array of objects with item, amount, category)
      - tests_prescribed (array of strings)
      
      OCR Text:
      ${ocrText}
      
      Return ONLY valid JSON. If a field is not found, use null.`;

    try {
      // Specifically use callGemini for extraction
      const resultText = await callGemini(prompt, systemInstruction, true);
      // Clean up markdown block wraps if returned
      let cleanedJson = resultText.trim();
      if (cleanedJson.startsWith('```json')) {
        cleanedJson = cleanedJson.replace(/^```json\n?/, '').replace(/\n?```$/, '');
      } else if (cleanedJson.startsWith('```')) {
        cleanedJson = cleanedJson.replace(/^```\n?/, '').replace(/\n?```$/, '');
      }
      
      return JSON.parse(cleanedJson);
    } catch (error) {
      logger.error('Gemini extraction failed:', error);
      throw error;
    }
  }
}
