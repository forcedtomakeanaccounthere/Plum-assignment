import workerpool from 'workerpool';
import sharp from 'sharp';
import { createWorker } from 'tesseract.js';

export async function performOcr(imageBuffer: Buffer): Promise<string> {
  try {
    // Pre-process image with sharp for better OCR accuracy and potential speedup
    const processedBuffer = await sharp(imageBuffer)
      .greyscale()
      .normalize()
      .toBuffer();

    const worker = await createWorker('eng');
    const { data: { text } } = await worker.recognize(processedBuffer);
    await worker.terminate();
    return text;
  } catch (err) {
    console.error('OCR Worker Error:', err);
    throw err;
  }
}

// Register the worker tasks only when running as a worker subprocess
if (typeof process.send === 'function') {
  workerpool.worker({
    performOcr
  });
}
