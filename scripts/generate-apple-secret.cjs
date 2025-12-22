// Script para generar el Apple Client Secret
const jwt = require('jsonwebtoken');
const fs = require('fs');

const TEAM_ID = 'QCN4SYVAQ4';
const KEY_ID = '26SZL2T9H2';
const CLIENT_ID = 'mx.com.geobooker.auth';

const PRIVATE_KEY = `-----BEGIN PRIVATE KEY-----
MIGTAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBHkwdwIBAQQg4BE5yvxeWgaI0UYq
cvFmKS7y+qXIClbgjRU0BJ3STBygCgYIKoZIzj0DAQehRANCAAQ0nZ23R6qSCoA3
M433WNdimWC+MC//OLH9YkAaNDwWbZlQQP50vFzzEkEx8fFJdfK++p5YLIS/+cS2
1Iof5EJu
-----END PRIVATE KEY-----`;

const token = jwt.sign({}, PRIVATE_KEY, {
    algorithm: 'ES256',
    expiresIn: '180d',
    audience: 'https://appleid.apple.com',
    issuer: TEAM_ID,
    subject: CLIENT_ID,
    keyid: KEY_ID,
});

fs.writeFileSync('apple-client-secret.txt', token, 'utf8');
console.log('Token guardado en apple-client-secret.txt');
