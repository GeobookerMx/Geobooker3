import test from 'node:test';
import assert from 'node:assert/strict';

import {
  analyzeSearchIntent,
  buildIntentSearchQueries,
  inferSearchLanguage
} from '../../src/utils/searchIntentEngine.js';
import {
  expandSemanticTerms,
  matchesSemanticText
} from '../../src/utils/semanticDictionary.js';
import {
  getPlaceType,
  getSearchVariants
} from '../../src/services/googlePlacesService.js';
import { buildPublicMarketConfig } from '../international/public-market-config.mjs';

const CASES = [
  ['tyres in Toronto', 'tyres_tire_services'],
  ['tire shop near me', 'tyres_tire_services'],
  ['Mexican food in Toronto', 'mexican_food_restaurants'],
  ['reparacion de computadoras', 'computers_sales_repair'],
  ['furniture store', 'furniture_home_furnishings'],
  ['refrigerator repair', 'appliances_refrigeration_home'],
  ['espejos a medida', 'glass_mirrors'],
  ['car wash near me', 'car_wash_detailing'],
  ['auto garage', 'garage_auto_service']
];

test('resuelve intenciones internacionales de productos y servicios', () => {
  for (const [query, expectedId] of CASES) {
    assert.equal(analyzeSearchIntent(query)?.id, expectedId, query);
  }
});

test('no interpreta tire dentro de otra palabra', () => {
  assert.notEqual(analyzeSearchIntent('entire office furniture')?.id, 'tyres_tire_services');
  assert.equal(matchesSemanticText('tire', ['entire office']), false);
});

test('expande tyres hacia talleres y tiendas de llantas', () => {
  const expanded = expandSemanticTerms('tyres');
  assert.ok(expanded.includes('tire shop'));
  assert.ok(matchesSemanticText('tyres', ['Local Tire Shop and Auto Service']));
});

test('genera fallbacks acotados y conserva la consulta original', () => {
  const queries = buildIntentSearchQueries('Mexican food');
  assert.equal(queries[0], 'Mexican food');
  assert.ok(queries.length <= 4);
  assert.ok(queries.some((query) => query.toLowerCase().includes('mexican restaurant')));
});

test('detecta idioma de la consulta separado del idioma del dispositivo', () => {
  assert.equal(inferSearchLanguage('tyres near me', 'es-MX'), 'en');
  assert.equal(inferSearchLanguage('reparacion de refrigeradores', 'en-CA'), 'es');
  assert.equal(inferSearchLanguage('', 'fr-CA'), 'fr');
});

test('mapea categorias compatibles del proveedor y variantes comerciales', () => {
  assert.equal(getPlaceType('tyres'), 'car_repair');
  assert.equal(getPlaceType('furniture store'), 'furniture_store');
  assert.equal(getPlaceType('computer store'), 'electronics_store');
  assert.ok(getSearchVariants('refrigerator').includes('refrigerator repair'));
  assert.ok(getSearchVariants('mirrors').includes('mirror shop'));
});

test('publica solamente mercados activos con cobertura y centro validos', () => {
  const rollout = {
    version: 2,
    source: 'Overture Maps Places',
    sourceRelease: '2026-08-19.0',
    markets: [
      { id: 'ca-toronto', countryCode: 'CA', country: 'Canada', city: 'Toronto', defaultLanguage: 'en', timezone: 'America/Toronto', status: 'active', currentRecords: 1000 },
      { id: 'gb-london', countryCode: 'GB', country: 'United Kingdom', city: 'London', defaultLanguage: 'en', timezone: 'Europe/London', status: 'preview', currentRecords: 1000 },
      { id: 'us-empty', countryCode: 'US', country: 'United States', city: 'Empty', defaultLanguage: 'en', timezone: 'UTC', status: 'active', currentRecords: 0 }
    ]
  };
  const areas = {
    areas: [
      { id: 'ca-toronto', bbox: [-79.64, 43.58, -79.12, 43.86] },
      { id: 'gb-london', bbox: [-0.55, 51.28, 0.30, 51.70] },
      { id: 'us-empty', bbox: [-100, 30, -99, 31] }
    ]
  };

  const config = buildPublicMarketConfig(rollout, areas);
  assert.deepEqual(config.markets.map((market) => market.id), ['ca-toronto']);
  assert.deepEqual(config.markets[0].center, { lat: 43.72, lng: -79.38 });
});
