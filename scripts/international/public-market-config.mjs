import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const modulePath = fileURLToPath(import.meta.url);
const moduleDir = path.dirname(modulePath);

const isFiniteCoordinate = (value, min, max) =>
  Number.isFinite(Number(value)) && Number(value) >= min && Number(value) <= max;

export const buildPublicMarketConfig = (rollout, areas) => {
  const areaById = new Map((areas?.areas || []).map((area) => [area.id, area]));

  const markets = (rollout?.markets || [])
    .filter((market) => market.status === 'active')
    .filter((market) => Number(market.currentRecords) > 0)
    .map((market) => {
      const area = areaById.get(market.id);
      const bbox = area?.bbox;
      if (!Array.isArray(bbox) || bbox.length !== 4) return null;

      const [west, south, east, north] = bbox.map(Number);
      if (
        !isFiniteCoordinate(west, -180, 180)
        || !isFiniteCoordinate(east, -180, 180)
        || !isFiniteCoordinate(south, -90, 90)
        || !isFiniteCoordinate(north, -90, 90)
        || west >= east
        || south >= north
      ) return null;

      return {
        id: market.id,
        countryCode: market.countryCode,
        country: market.country,
        city: market.city,
        cityAliases: Array.isArray(area.cityAliases) ? area.cityAliases : [],
        defaultLanguage: market.defaultLanguage,
        timezone: market.timezone,
        status: 'active',
        currentRecords: Number(market.currentRecords),
        source: rollout.source,
        sourceRelease: rollout.sourceRelease,
        center: {
          lat: Number(((south + north) / 2).toFixed(6)),
          lng: Number(((west + east) / 2).toFixed(6))
        }
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.id.localeCompare(b.id));

  return {
    version: Number(rollout?.version) || 1,
    generatedFrom: 'scripts/international/expansion-markets.json',
    markets
  };
};

export const writePublicMarketConfig = ({ rolloutPath, areasPath, outputPath }) => {
  const rollout = JSON.parse(fs.readFileSync(rolloutPath, 'utf8'));
  const areas = JSON.parse(fs.readFileSync(areasPath, 'utf8'));
  const config = buildPublicMarketConfig(rollout, areas);
  fs.writeFileSync(outputPath, `${JSON.stringify(config, null, 2)}\n`, 'utf8');
  return config;
};

const runtimeArgs = globalThis.process?.argv || [];

if (runtimeArgs[1] && path.resolve(runtimeArgs[1]) === modulePath) {
  const outputPath = path.resolve(moduleDir, '../../src/config/publicGlobalMarkets.json');
  const config = writePublicMarketConfig({
    rolloutPath: path.join(moduleDir, 'expansion-markets.json'),
    areasPath: path.join(moduleDir, 'pilot-areas.json'),
    outputPath
  });
  globalThis.console?.log(`Public markets written: ${config.markets.length}`);
}
