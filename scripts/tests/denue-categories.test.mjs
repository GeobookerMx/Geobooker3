import { test } from 'node:test';
import assert from 'node:assert/strict';
import { classifyDenueActivity as category } from '../open-data/denue-categories.mjs';

test('SCIAN discovery categories keep beauty, beverages and pharmacies distinct', () => {
    assert.equal(category('812110'), 'salud');
    assert.equal(category('461213'), 'tiendas');
    assert.equal(category('464111'), 'salud');
    assert.equal(category('722412'), 'bares');
    assert.equal(category('722511'), 'restaurantes');
    assert.equal(category('811111'), 'hogar_autos');
    assert.equal(category('611111'), 'educacion');
    assert.equal(category('721111'), 'alojamiento');
    assert.equal(category('522110'), 'finanzas');
    assert.equal(category(null), 'servicios');
});
