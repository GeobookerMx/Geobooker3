"""Build a deterministic, bounded Overture Places SQL seed for Supabase."""

from __future__ import annotations

import argparse
import json
import re
import unicodedata
from pathlib import Path

from overturemaps import record_batch_reader


ROOT_CATEGORY_MAP = {
    "food_and_drink": "restaurantes",
    "shopping": "tiendas",
    "health_care": "salud",
    "lifestyle_services": "belleza",
    "services_and_business": "servicios",
    "automotive": "automotriz",
    "accommodation": "hoteles",
}


def sql_text(value: object | None) -> str:
    if value is None or value == "":
        return "NULL"
    return "'" + str(value).replace("'", "''") + "'"


def slugify(value: str) -> str:
    normalized = unicodedata.normalize("NFKD", value).encode("ascii", "ignore").decode("ascii")
    return re.sub(r"[^a-z0-9]+", "-", normalized.lower()).strip("-")[:90]


def first_value(value: object) -> object | None:
    if isinstance(value, list) and value:
        return value[0]
    return None


def normalize_record(row: dict, area: dict, release: str) -> dict | None:
    name = (row.get("names") or {}).get("primary")
    taxonomy = row.get("taxonomy") or {}
    hierarchy = taxonomy.get("hierarchy") or []
    root_category = hierarchy[0] if hierarchy else None
    primary_category = taxonomy.get("primary") or (row.get("categories") or {}).get("primary")
    confidence = float(row.get("confidence") or 0)

    if not name or confidence < 0.75 or root_category not in ROOT_CATEGORY_MAP:
        return None
    if row.get("operating_status") == "permanently_closed":
        return None

    addresses = row.get("addresses") or []
    country_code = area["countryCode"]
    city = area["city"]
    matching_addresses = [
        item for item in addresses
        if (item.get("country") or "").upper() == country_code
        and (item.get("locality") or "").casefold() == city.casefold()
    ]
    if not matching_addresses:
        return None
    address = matching_addresses[0]

    bbox = row.get("bbox") or {}
    longitude = bbox.get("xmin")
    latitude = bbox.get("ymin")
    if longitude is None or latitude is None:
        return None

    website = first_value(row.get("websites"))
    phone = first_value(row.get("phones"))
    source_id = row["id"]
    score = confidence + (0.04 if website else 0) + (0.03 if phone else 0) + (0.03 if address.get("freeform") else 0)

    return {
        "source_id": source_id,
        "name": str(name).strip(),
        "slug": f"{slugify(name)}-{slugify(city)}-{source_id[:8]}",
        "category": ROOT_CATEGORY_MAP[root_category],
        "subcategory": primary_category or root_category,
        "address": address.get("freeform"),
        "city": city,
        "state_code": address.get("region"),
        "postal_code": address.get("postcode"),
        "country_code": country_code,
        "latitude": float(latitude),
        "longitude": float(longitude),
        "website": website,
        "phone": phone,
        "confidence": confidence,
        "score": score,
        "release": release,
    }


def fetch_area(area: dict, release: str, limit: int) -> list[dict]:
    reader = record_batch_reader("place", bbox=area["bbox"], release=release)
    selected: list[dict] = []
    seen: set[tuple] = set()

    for batch in reader:
        for row in batch.to_pylist():
            record = normalize_record(row, area, release)
            if not record:
                continue
            key = (
                record["name"].casefold(),
                record["address"].casefold() if record["address"] else "",
                round(record["latitude"], 5),
                round(record["longitude"], 5),
            )
            if key in seen:
                continue
            seen.add(key)
            selected.append(record)

    selected.sort(key=lambda item: (-item["score"], item["name"].casefold(), item["source_id"]))
    if len(selected) < limit:
        raise RuntimeError(f"{area['id']}: only {len(selected)} eligible records; expected {limit}")
    return selected[:limit]


def render_sql(records_by_area: dict[str, list[dict]], release: str) -> str:
    rows: list[str] = []
    for area_id, records in records_by_area.items():
        for item in records:
            description = (
                "Business listing imported from Overture Maps Places. "
                "Contact details should be verified by the business owner."
            )
            rows.append(
                "(" + ", ".join([
                    "NULL",
                    sql_text(item["name"]),
                    sql_text(description),
                    sql_text(item["category"]),
                    sql_text(item["subcategory"]),
                    sql_text(item["address"]),
                    sql_text(item["city"]),
                    sql_text(item["state_code"]),
                    sql_text(item["postal_code"]),
                    sql_text(item["country_code"]),
                    str(item["latitude"]),
                    str(item["longitude"]),
                    sql_text(item["website"]),
                    sql_text(item["website"]),
                    sql_text(item["phone"]),
                    sql_text(item["slug"]),
                    "'seed_overture'",
                    sql_text(item["source_id"]),
                    sql_text(f"Overture Maps Foundation, Places {release}"),
                    "'approved'",
                    "'active'",
                    "TRUE",
                    "FALSE",
                    "FALSE",
                    "'en'" if item["country_code"] in {"US", "CA"} else "'es'",
                    "NOW()",
                    "NOW()",
                ]) + ")"
            )

    values_sql = ",\n".join(rows)
    assertions = []
    for records in records_by_area.values():
        sample = records[0]
        assertions.append(
            "IF (SELECT COUNT(*) FROM public.businesses WHERE source_type = 'seed_overture' "
            f"AND country_code = {sql_text(sample['country_code'])} AND city = {sql_text(sample['city'])}) < {len(records)} "
            f"THEN RAISE EXCEPTION 'Incomplete Overture seed for {sample['city']}'; END IF;"
        )

    return f"""-- Generated by scripts/international/build-overture-seed.py
-- Release: {release}; bounded pilot: {sum(map(len, records_by_area.values()))} records.

BEGIN;

ALTER TABLE public.businesses ALTER COLUMN owner_id DROP NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_businesses_overture_source_record
  ON public.businesses(source_record_id)
  WHERE source_type = 'seed_overture' AND source_record_id IS NOT NULL;

INSERT INTO public.businesses (
  owner_id, name, description, category, subcategory, address, city, state_code,
  postal_code, country_code, latitude, longitude, website, website_url, phone,
  slug, source_type, source_record_id, attribution_text, status, business_status,
  is_visible, is_claimed, is_verified, preferred_language, imported_at, updated_at
) VALUES
{values_sql}
ON CONFLICT DO NOTHING;

DO $$
BEGIN
  {' '.join(assertions)}
END $$;

COMMIT;
"""


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--config", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--limit", type=int, default=1000)
    parser.add_argument("--areas", nargs="+", required=True)
    args = parser.parse_args()

    config = json.loads(args.config.read_text(encoding="utf-8"))
    release = config["release"]
    area_map = {area["id"]: area for area in config["areas"]}
    records_by_area = {
        area_id: fetch_area(area_map[area_id], release, args.limit)
        for area_id in args.areas
    }
    args.output.write_text(render_sql(records_by_area, release), encoding="utf-8", newline="\n")
    for area_id, records in records_by_area.items():
        print(f"{area_id}: {len(records)} records")
    print(f"output: {args.output}")


if __name__ == "__main__":
    main()
