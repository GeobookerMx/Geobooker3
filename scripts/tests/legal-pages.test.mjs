import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(path, import.meta.url), 'utf8');

test('Terms and public data-deletion URLs are routable and discoverable', async () => {
  const [router, footer, sitemap, terms, deletion] = await Promise.all([
    read('../../src/router.jsx'),
    read('../../src/components/layout/Footer.jsx'),
    read('../../netlify/functions/sitemap-generator.js'),
    read('../../src/pages/TermsOfServicePage.jsx'),
    read('../../src/pages/DataDeletionPage.jsx')
  ]);

  assert.match(router, /path="\/terms"/);
  assert.match(router, /path="\/data-deletion"/);
  assert.match(footer, /to="\/data-deletion"/);
  assert.match(sitemap, /\['\/data-deletion'/);
  assert.match(terms, /CRM, Leads y datos de clientes/);
  assert.match(terms, /Correo y WhatsApp/);
  assert.match(deletion, /integraciones de Meta, Facebook o WhatsApp/);
  assert.match(deletion, /No envíes contraseñas, códigos, tokens/);
});

test('Account deletion remains authenticated and server-side', async () => {
  const [page, handler] = await Promise.all([
    read('../../src/pages/DeleteAccountPage.jsx'),
    read('../../netlify/functions/delete-account.js')
  ]);

  assert.match(page, /Authorization.*Bearer/);
  assert.match(page, /DELETE_MY_ACCOUNT/);
  assert.match(handler, /getOptionalRequestUser\(event\)/);
  assert.match(handler, /SUPABASE_SERVICE_ROLE_KEY/);
  assert.doesNotMatch(page, /SUPABASE_SERVICE_ROLE_KEY/);
});
