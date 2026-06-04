import winston from 'winston';

const piiFields = ['patient_name', 'memberName', 'email', 'password', 'memberId', 'doctorName', 'doctorReg', 'phone'];

const sanitizeMetadata = (obj: any): any => {
  if (!obj || typeof obj !== 'object') return obj;
  const sanitized = { ...obj };
  for (const key of Object.keys(sanitized)) {
    if (piiFields.includes(key)) {
      sanitized[key] = '[REDACTED_PII]';
    } else if (typeof sanitized[key] === 'object') {
      sanitized[key] = sanitizeMetadata(sanitized[key]);
    }
  }
  return sanitized;
};

const sanitizeFormat = winston.format((info) => {
  const sanitizedInfo = { ...info };
  if (sanitizedInfo.message && typeof sanitizedInfo.message === 'string') {
    // Basic string scrubbing if PII is mentioned
    // but primarily we sanitize metadata object
  }
  // Sanitize metadata parameters
  for (const key of Object.keys(sanitizedInfo)) {
    if (piiFields.includes(key)) {
      sanitizedInfo[key] = '[REDACTED_PII]';
    }
  }
  if (sanitizedInfo.metadata) {
    sanitizedInfo.metadata = sanitizeMetadata(sanitizedInfo.metadata);
  }
  return sanitizedInfo;
});

export const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: winston.format.combine(
    winston.format.timestamp(),
    sanitizeFormat(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    }),
  ],
});
