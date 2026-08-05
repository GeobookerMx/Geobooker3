// Script seguro para generar Apple Client Secret JWT.
// No hardcodear private keys en el repositorio.
// Uso:
//   $env:APPLE_TEAM_ID='...'
//   $env:APPLE_KEY_ID='...'
//   $env:APPLE_CLIENT_ID='com.geobooker.web.auth'
//   $env:APPLE_PRIVATE_KEY_FILE='C:\ruta\AuthKey_KEYID.p8'
//   node generate-apple-jwt.js

const fs = require('fs');
const jwt = require('jsonwebtoken');

const TEAM_ID = process.env.APPLE_TEAM_ID;
const KEY_ID = process.env.APPLE_KEY_ID;
const CLIENT_ID = process.env.APPLE_CLIENT_ID || 'com.geobooker.web.auth';
const PRIVATE_KEY = process.env.APPLE_PRIVATE_KEY || (process.env.APPLE_PRIVATE_KEY_FILE
  ? fs.readFileSync(process.env.APPLE_PRIVATE_KEY_FILE, 'utf8')
  : '');

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
  keyid: KEY_ID
});

console.log(token);
