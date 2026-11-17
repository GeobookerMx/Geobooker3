import test from 'node:test';
import assert from 'node:assert/strict';
import { getHolidaySeason } from '../../src/config/holidaySeason.js';

test('2026 holiday discovery is limited to its local-calendar season, including Three Kings Day', () => {
  assert.equal(getHolidaySeason(new Date(2026, 10, 14, 23, 59)), null);
  assert.match(getHolidaySeason(new Date(2026, 10, 15)).title, /2026/);
  assert.match(getHolidaySeason(new Date(2026, 11, 25, 23, 59)).title, /Navidad/);
  assert.match(getHolidaySeason(new Date(2026, 11, 26)).title, /2027/);
  assert.ok(getHolidaySeason(new Date(2027, 0, 6, 23, 59)));
  assert.equal(getHolidaySeason(new Date(2027, 0, 7)), null);
  assert.equal(getHolidaySeason(new Date(2027, 11, 15)), null);
  assert.equal(getHolidaySeason(new Date('invalid')), null);
});

test('discovery copy follows Spanish/English and preserves useful real search queries', () => {
  const date = new Date(2026, 11, 1);
  assert.ok(getHolidaySeason(date, 'es-MX').suggestions.includes('Restaurantes'));
  assert.ok(getHolidaySeason(date, 'en-US').suggestions.includes('Restaurants'));
  assert.match(getHolidaySeason(date, 'fr').title, /Christmas/);
});
