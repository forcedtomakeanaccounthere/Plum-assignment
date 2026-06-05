const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

function generateKeys() {
  console.log('Generating RSA-2048 key pair for RS256 JWT signing...');
  
  const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: {
      type: 'spki',
      format: 'pem'
    },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'pem'
    }
  });

  const envPath = path.resolve(__dirname, '../.env');
  let envContent = '';
  
  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, 'utf8');
  }

  // Helper to escape newlines for .env
  const escapeKey = (key) => key.replace(/\n/g, '\\n');

  const privateKeyLine = `JWT_PRIVATE_KEY="${escapeKey(privateKey)}"`;
  const publicKeyLine = `JWT_PUBLIC_KEY="${escapeKey(publicKey)}"`;

  // Replace or append
  if (envContent.includes('JWT_PRIVATE_KEY')) {
    envContent = envContent.replace(/JWT_PRIVATE_KEY=.*/, privateKeyLine);
  } else {
    envContent += `\n${privateKeyLine}`;
  }

  if (envContent.includes('JWT_PUBLIC_KEY')) {
    envContent = envContent.replace(/JWT_PUBLIC_KEY=.*/, publicKeyLine);
  } else {
    envContent += `\n${publicKeyLine}`;
  }

  fs.writeFileSync(envPath, envContent.trim() + '\n');

  console.log('\nSUCCESS: Keys generated and added to .env');
  console.log('--------------------------------------------------');
  console.log('PRIVATE KEY (First 50 chars):', privateKey.substring(0, 50) + '...');
  console.log('PUBLIC KEY (First 50 chars):', publicKey.substring(0, 50) + '...');
  console.log('--------------------------------------------------');
  console.log('NOTE: If you are deploying to Render, copy the escaped strings from .env to your environment variables.');
}

generateKeys();
