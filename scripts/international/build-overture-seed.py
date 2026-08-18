"""Build a deterministic, bounded Overture Places SQL seed for Supabase."""

from __future__ import annotations

import argparse
import json
import re
import time
import unicodedata
from collections import Counter, defaultdict, deque
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


def normalize_for_match(value: object | None) -> str:
    normalized = unicodedata.normalize("NFKD", str(value or ""))
    return normalized.encode("ascii", "ignore").decode("ascii").casefold().strip()


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
        and normalize_for_match(item.get("locality")) == normalize_for_match(city)
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


def select_balanced_records(
    records: list[dict],
    limit: int,
    max_per_category: int,
    max_per_subcategory: int,
) -> list[dict]:
    buckets: dict[tuple[str, str], deque[dict]] = defaultdict(deque)
    for record in records:
        buckets[(record["category"], record["subcategory"])].append(record)

    category_counts: Counter[str] = Counter()
    subcategory_counts: Counter[tuple[str, str]] = Counter()
    selected: list[dict] = []

    while len(selected) < limit:
        eligible = []
        for bucket_key, bucket in buckets.items():
            if not bucket:
                continue
            category, _ = bucket_key
            if category_counts[category] >= max_per_category:
                continue
            if subcategory_counts[bucket_key] >= max_per_subcategory:
                continue
            candidate = bucket[0]
            eligible.append((
                category_counts[category],
                subcategory_counts[bucket_key],
                -candidate["score"],
                candidate["name"].casefold(),
                candidate["source_id"],
                bucket_key,
            ))

        if not eligible:
            break

        *_, chosen_bucket = min(eligible)
        chosen = buckets[chosen_bucket].popleft()
        selected.append(chosen)
        category_counts[chosen["category"]] += 1
        subcategory_counts[chosen_bucket] += 1

    if len(selected) < limit:
        raise RuntimeError(
            f"balanced selection produced {len(selected)} of {limit}; "
            "increase --max-per-category or --max-per-subcategory"
        )
    return selected


def fetch_area(
    area: dict,
    release: str,
    limit: int,
    max_per_category: int,
    max_per_subcategory: int,
) -> list[dict]:
    reader = record_batch_reader(
        "place",
        bbox=area["bbox"],
        release=release,
        connect_timeout=60,
        request_timeout=180,
    )
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
    try:
        return select_balanced_records(
            selected,
            limit,
            max_per_category=max_per_category,
            max_per_subcategory=max_per_subcategory,
        )
    except RuntimeError as error:
        raise RuntimeError(f"{area['id']}: {error}") from error


def fetch_area_with_retry(
    area: dict,
    release: str,
    limit: int,
    max_per_category: int,
    max_per_subcategory: int,
    attempts: int = 3,
) -> list[dict]:
    for attempt in range(1, attempts + 1):
        try:
            return fetch_area(area, release, limit, max_per_category, max_per_subcategory)
        except OSError:
            if attempt == attempts:
                raise
            time.sleep(attempt * 5)

    raise RuntimeError(f"{area['id']}: exhausted Overture retries")


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
            "IF (SELECT COUNT(*) FROM public.international_businesses WHERE source_type = 'seed_overture' "
            f"AND country_code = {sql_text(sample['country_code'])} AND city = {sql_text(sample['city'])}) < {len(records)} "
            f"THEN RAISE EXCEPTION 'Incomplete Overture seed for {sample['city']}'; END IF;"
        )

    return f"""-- Generated by scripts/international/build-overture-seed.py
-- Release: {release}; bounded pilot: {sum(map(len, records_by_area.values()))} records.

BEGIN;

CREATE TABLE IF NOT EXISTS public.international_businesses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  subcategory TEXT,
  address TEXT,
  city TEXT NOT NULL,
  state_code TEXT,
  postal_code TEXT,
  country_code TEXT NOT NULL,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  website TEXT,
  website_url TEXT,
  phone TEXT,
  slug TEXT NOT NULL,
  source_type TEXT NOT NULL DEFAULT 'seed_overture',
  source_record_id TEXT NOT NULL,
  attribution_text TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'approved',
  business_status TEXT NOT NULL DEFAULT 'active',
  is_visible BOOLEAN NOT NULL DEFAULT TRUE,
  is_claimed BOOLEAN NOT NULL DEFAULT FALSE,
  is_verified BOOLEAN NOT NULL DEFAULT FALSE,
  preferred_language TEXT DEFAULT 'en',
  imported_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_international_businesses_source_record
  ON public.international_businesses(source_record_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_international_businesses_slug
  ON public.international_businesses(slug);
CREATE INDEX IF NOT EXISTS idx_international_businesses_location
  ON public.international_businesses(country_code, city);

ALTER TABLE public.international_businesses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS international_businesses_public_read_v1
  ON public.international_businesses;
CREATE POLICY international_businesses_public_read_v1
  ON public.international_businesses
  FOR SELECT TO anon, authenticated
  USING (status = 'approved' AND is_visible = TRUE);

GRANT SELECT ON public.international_businesses TO anon, authenticated;
GRANT ALL ON public.international_businesses TO service_role;

INSERT INTO public.international_businesses (
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
    parser.add_argument("--max-per-category", type=int, default=500)
    parser.add_argument("--max-per-subcategory", type=int, default=100)
    parser.add_argument("--areas", nargs="+", required=True)
    args = parser.parse_args()

    if min(args.limit, args.max_per_category, args.max_per_subcategory) <= 0:
        parser.error("limits must be positive integers")

    config = json.loads(args.config.read_text(encoding="utf-8"))
    release = config["release"]
    area_map = {area["id"]: area for area in config["areas"]}
    records_by_area = {
        area_id: fetch_area_with_retry(
            area_map[area_id],
            release,
            args.limit,
            args.max_per_category,
            args.max_per_subcategory,
        )
        for area_id in args.areas
    }
    args.output.write_text(render_sql(records_by_area, release), encoding="utf-8", newline="\n")
    for area_id, records in records_by_area.items():
        category_counts = Counter(record["category"] for record in records)
        subcategory_counts = Counter(record["subcategory"] for record in records)
        distribution = dict(sorted(category_counts.items()))
        print(f"{area_id}: {len(records)} records; categories={distribution}; largest_subcategory={max(subcategory_counts.values())}")
    print(f"output: {args.output}")


if __name__ == "__main__":
    main()
