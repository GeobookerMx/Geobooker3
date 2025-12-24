// Script para generar Apple Client Secret JWT
const jwt = require('jsonwebtoken');

// Configuración
const TEAM_ID = 'QCN4SYVAQ4';
const KEY_ID = '26SZL2T9H2';
const CLIENT_ID = 'com.geobooker.web.auth';

const privateKey = `-----BEGIN PRIVATE KEY-----
MIGTAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBHkwdwIBAQQg4BE5yvxeWgaI0UYq
cvFmKS7y+qXIClbgjRU0BJ3STBygCgYIKoZIzj0DAQehRANCAAQ0nZ23R6qSCoA3
M433WNdimWC+MC//OLH9YkAaNDwWbZlQQP50vFzzEkEx8fFJdfK++p5YLIS/+cS2
1Iof5EJu
-----END PRIVATE KEY-----`;

// Crear el JWT
const token = jwt.sign({}, privateKey, {
    algorithm: 'ES256',
    expiresIn: '180d', // 180 días
    audience: 'https://appleid.apple.com',
    issuer: TEAM_ID,
    subject: CLIENT_ID,
    keyid: KEY_ID
});

console.log('\n========================================');
console.log('🍎 APPLE CLIENT SECRET (JWT) GENERADO');
console.log('========================================\n');
console.log(token);
console.log('\n========================================');
console.log('📋 Copia este JWT y pégalo en Supabase');
console.log('   Auth → Providers → Apple → Secret Key');
console.log('========================================\n');
