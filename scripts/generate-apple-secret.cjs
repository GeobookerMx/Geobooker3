// Script seguro para generar Apple Client Secret.
// No hardcodear private keys ni escribir secretos en archivos trackeados.
// Uso:
//   set APPLE_TEAM_ID=...
//   set APPLE_KEY_ID=...
//   set APPLE_CLIENT_ID=mx.com.geobooker.auth
//   set APPLE_PRIVATE_KEY_FILE=C:\ruta\AuthKey_KEYID.p8
//   node scripts/generate-apple-secret.cjs

const fs = require('fs');
const jwt = require('jsonwebtoken');

const TEAM_ID = process.env.APPLE_TEAM_ID;
const KEY_ID = process.env.APPLE_KEY_ID;
const CLIENT_ID = process.env.APPLE_CLIENT_ID || 'mx.com.geobooker.auth';
const PRIVATE_KEY = process.env.APPLE_PRIVATE_KEY || (process.env.APPLE_PRIVATE_KEY_FILE
  ? fs.readFileSync(process.env.APPLE_PRIVATE_KEY_FILE, 'utf8')
  : '');
const OUTPUT_FILE = process.env.APPLE_CLIENT_SECRET_OUTPUT || '';

if (!TEAM_ID || !KEY_ID || !CLIENT_ID || !PRIVATE_KEY) {
  console.error('Faltan APPLE_TEAM_ID, APPLE_KEY_ID, APPLE_CLIENT_ID y APPLE_PRIVATE_KEY o APPLE_PRIVATE_KEY_FILE.');
  process.exit(1);
}

const token = jwt.sign({}, PRIVATE_KEY, {
  algorithm: 'ES256',
  expiresIn: '180d',
  audience: 'https://appleid.apple.com',
  issuer: TEAM_ID,
  subject: CLIENT_ID,
  keyid: KEY_ID,
});

if (OUTPUT_FILE) {
  fs.writeFileSync(OUTPUT_FILE, token, 'utf8');
  console.log('Token guardado en archivo local definido por APPLE_CLIENT_SECRET_OUTPUT.');
} else {
  console.log(token);
}
