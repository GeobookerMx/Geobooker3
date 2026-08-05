#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';

const trackedListPath = process.argv[2];
const trackedFiles = trackedListPath && existsSync(trackedListPath)
  ? readFileSync(trackedListPath, 'utf8').split(/\r?\n/).filter(Boolean)
  : process.argv.slice(2).filter(Boolean);

if (!trackedFiles.length) {
  console.error('No tracked file list provided. Usage: node scripts/security/secret-scan.mjs .security-tracked-files.txt');
  process.exit(1);
}

const allowedPublicEnvKeys = new Set([
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_ANON_KEY',
  'VITE_GOOGLE_MAPS_API_KEY',
  'VITE_STRIPE_PUBLIC_KEY',
  'VITE_GA4_MEASUREMENT_ID',
  'VITE_APP_URL'
]);

const placeholderPattern = /^(|changeme|change_me|your_|tu_|xxx|xxxx|example|placeholder|<.+>|\$\{.+\})/i;
const findings = [];

function isExampleFile(file) {
  return /(^|\/)\.env.*\.example$/i.test(file) || /(^|\/)\.env\.example$/i.test(file) || /\.example$/i.test(file);
}

function isRealEnvFile(file) {
  return /(^|\/)\.env(\.|$)/i.test(file) && !isExampleFile(file);
}

function isSensitiveTrackedName(file) {
  const normalized = file.replace(/\\/g, '/');
  return (
    normalized === '.env.production' ||
    /(^|\/)apple-(client-secret|jwt-secret|secret-output)\.txt$/i.test(normalized) ||
    /(^|\/)[^/]*(private-key|service-role|credentials)[^/]*\.(txt|json|pem|key)$/i.test(normalized)
  );
}

function looksLikeRealValue(value = '') {
  const clean = String(value || '').trim().replace(/^['"]|['"]$/g, '');
  if (!clean || placeholderPattern.test(clean)) return false;
  return clean.length >= 12;
}

for (const file of trackedFiles) {
  const normalized = file.replace(/\\/g, '/');

  if (isSensitiveTrackedName(normalized)) {
    findings.push({ file, reason: 'Sensitive filename is tracked by git' });
  }

  if (/\.(png|jpg|jpeg|webp|gif|ico|pdf|aab|apk|zip|gz|csv|mp4|mov)$/i.test(file)) continue;

  let content = '';
  try {
    content = readFileSync(file, 'utf8');
  } catch {
    continue;
  }

  if (isRealEnvFile(normalized)) {
    for (const line of content.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
      const [rawKey, ...rawValueParts] = trimmed.split('=');
      const key = rawKey.trim();
      const value = rawValueParts.join('=').trim();
      if (!allowedPublicEnvKeys.has(key) && looksLikeRealValue(value)) {
        findings.push({ file, reason: `Tracked non-public env key has a real-looking value: ${key}` });
      }
    }
  }

  if (/-----BEGIN (?:RSA |EC |OPENSSH |PRIVATE )?PRIVATE KEY-----/.test(content)) {
    findings.push({ file, reason: 'Hardcoded private key block detected' });
  }

  if (/(sk_live|rk_live)_[A-Za-z0-9_]+/.test(content)) {
    findings.push({ file, reason: 'Hardcoded live Stripe secret detected' });
  }

  if (/apple.*secret|jwt-secret|secret-output/i.test(normalized) && /eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}/.test(content)) {
    findings.push({ file, reason: 'JWT-like Apple secret detected in tracked file' });
  }
}

if (findings.length > 0) {
  console.error('\nSecurity secret scan failed. Values are intentionally not printed.');
  for (const finding of findings) {
    console.error(`- ${finding.file}: ${finding.reason}`);
  }
  console.error('\nRotate exposed secrets, remove them from git, and keep only .example files tracked.');
  process.exit(1);
}

console.log('Security secret scan passed: no tracked secret patterns found.');
