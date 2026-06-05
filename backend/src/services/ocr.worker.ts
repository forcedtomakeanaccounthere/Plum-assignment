import workerpool from 'workerpool';
import sharp from 'sharp';
import { createWorker } from 'tesseract.js';

async function performOcr(imageBuffer: Buffer): Promise<string> {
  let processedBuffer = imageBuffer;
  try {
    // Preprocess: grayscale, normalize, denoise (thresholding can binarize)
    processedBuffer = await sharp(imageBuffer)
      .greyscale()
      .normalize()
      .toBuffer();
  } catch (err) {
    console.error('Sharp preprocessing error (proceeding with raw):', err);
  }

  const worker = await createWorker('eng');
  try {
    const { data: { text } } = await worker.recognize(processedBuffer);
    return text;
  } finally {
    await worker.terminate();
  }
}

// Register the worker tasks only when running as a worker subprocess
if (typeof process.send === 'function') {
  workerpool.worker({
    performOcr
  });
}
export { performOcr };
