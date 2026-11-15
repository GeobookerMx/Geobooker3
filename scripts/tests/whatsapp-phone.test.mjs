import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeWhatsAppPhone as normalize } from '../../src/utils/whatsappPhone.js';

test('international numbers have the same valid destination with or without +', () => {
    for (const [phone, countryCode, expected] of [
        ['442079460018', 'GB', '+442079460018'],
        ['0034 912 34 56 78', 'ES', '+34912345678'],
        ['+31 20 123 4567', '', '+31201234567'],
        ['+420 212 345 678', '', '+420212345678'],
        ['020 7946 0018', 'UK', '+442079460018'],
        ['(212) 555-0123', 'US', '+12125550123'],
        ['+52 1 55 1234 5678', 'MX', '+525512345678'],
        ['+44 20 7946 0018 ext. 25', 'MX', '+442079460018'],
    ]) {
        assert.equal(normalize(phone, { countryCode }), expected);
        assert.equal(normalize(expected, { countryCode }), expected);
    }
});

test('rejects unknown national context and malformed phones without guessing digits', () => {
    for (const phone of ['020 7946 0018', '123', '+00000000000', '+34 9123456789', '+44 20 abc 0018', '+12125550123 / +442079460018']) {
        assert.equal(normalize(phone), '', phone);
    }
});
