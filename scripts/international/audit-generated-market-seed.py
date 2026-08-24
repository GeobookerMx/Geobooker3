"""Audit generated international seed SQL without connecting to Supabase."""

from __future__ import annotations

import argparse
import csv
import hashlib
import json
import random
import re
from collections import Counter
from pathlib import Path
from urllib.parse import urlparse


FIELDS = [
    "owner_id", "name", "description", "category", "subcategory", "address",
    "city", "state_code", "postal_code", "country_code", "latitude", "longitude",
    "website", "website_url", "phone", "slug", "source_type", "source_record_id",
    "attribution_text", "status", "business_status", "is_visible", "is_claimed",
    "is_verified", "preferred_language", "imported_at", "updated_at",
]
ALLOWED_CATEGORIES = {
    "restaurantes", "tiendas", "salud", "belleza", "servicios", "automotriz", "hoteles"
}
SUSPICIOUS_NAME = re.compile(r"^(unknown|unnamed|test|n/?a|null|none|business)$", re.IGNORECASE)


def split_sql_values(line: str) -> list[str]:
    value = line.strip().rstrip(",;")
    if not (value.startswith("(") and value.endswith(")")):
        raise ValueError("not a SQL value tuple")
    value = value[1:-1]
    tokens: list[str] = []
    current: list[str] = []
    quoted = False
    index = 0

    while index < len(value):
        char = value[index]
        if char == "'":
            if quoted and index + 1 < len(value) and value[index + 1] == "'":
                current.extend(["'", "'"])
                index += 2
                continue
            quoted = not quoted
            current.append(char)
        elif char == "," and not quoted:
            tokens.append("".join(current).strip())
            current = []
        else:
            current.append(char)
        index += 1

    tokens.append("".join(current).strip())
    return tokens


def parse_token(token: str):
    if token == "NULL":
        return None
    if token == "TRUE":
        return True
    if token == "FALSE":
        return False
    if token == "NOW()":
        return "NOW()"
    if token.startswith("'") and token.endswith("'"):
        return token[1:-1].replace("''", "'")
    try:
        return float(token) if "." in token else int(token)
    except ValueError:
        return token


def read_records(path: Path) -> list[dict]:
    records: list[dict] = []
    for line_number, line in enumerate(path.read_text(encoding="utf-8").splitlines(), start=1):
        if not line.startswith("(NULL, "):
            continue
        tokens = split_sql_values(line)
        if len(tokens) != len(FIELDS):
            raise ValueError(f"{path}:{line_number}: expected {len(FIELDS)} fields, found {len(tokens)}")
        records.append(dict(zip(FIELDS, map(parse_token, tokens))))
    return records


def valid_url(value: str | None) -> bool:
    if not value:
        return True
    parsed = urlparse(value)
    return parsed.scheme in {"http", "https"} and bool(parsed.netloc)


def valid_phone(value: str | None) -> bool:
    if not value:
        return True
    digits = re.sub(r"\D", "", value)
    return 6 <= len(digits) <= 15


def percentage(value: int, total: int) -> float:
    return round(value * 100 / total, 2) if total else 0.0


def audit(path: Path, expected: dict, sample_size: int) -> tuple[dict, list[dict]]:
    records = read_records(path)
    total = len(records)
    issues: Counter[str] = Counter()

    for record in records:
        name = str(record["name"] or "").strip()
        if len(name) < 2 or SUSPICIOUS_NAME.fullmatch(name) or name.startswith(("http://", "https://")):
            issues["suspicious_name"] += 1
        if not str(record["address"] or "").strip():
            issues["missing_address"] += 1
        if record["city"] != expected["city"]:
            issues["wrong_city"] += 1
        if record["country_code"] != expected["countryCode"]:
            issues["wrong_country"] += 1
        if record["preferred_language"] != expected["defaultLanguage"]:
            issues["wrong_language"] += 1
        if record["category"] not in ALLOWED_CATEGORIES or not record["subcategory"]:
            issues["invalid_category"] += 1
        if not valid_url(record["website"]):
            issues["invalid_website"] += 1
        if not valid_phone(record["phone"]):
            issues["invalid_phone"] += 1
        if record["is_visible"] or record["is_claimed"] or record["is_verified"]:
            issues["unsafe_visibility_flag"] += 1
        if record["source_type"] != "seed_overture" or record["status"] != "approved":
            issues["invalid_source_status"] += 1
        latitude = float(record["latitude"])
        longitude = float(record["longitude"])
        if not (-90 <= latitude <= 90 and -180 <= longitude <= 180):
            issues["invalid_coordinate"] += 1

    duplicate_source_ids = total - len({record["source_record_id"] for record in records})
    duplicate_slugs = total - len({record["slug"] for record in records})
    contactable = sum(bool(record["website"] or record["phone"]) for record in records)
    https_websites = sum(str(record["website"] or "").startswith("https://") for record in records)
    websites = sum(bool(record["website"]) for record in records)
    phones = sum(bool(record["phone"]) for record in records)
    failures = {
        key: value
        for key, value in issues.items()
        if key not in {"missing_address"} and value > 0
    }
    if total != expected["targetRecords"]:
        failures["unexpected_record_count"] = abs(total - expected["targetRecords"])
    if duplicate_source_ids:
        failures["duplicate_source_ids"] = duplicate_source_ids
    if duplicate_slugs:
        failures["duplicate_slugs"] = duplicate_slugs

    seed = int(hashlib.sha256(expected["id"].encode("utf-8")).hexdigest()[:8], 16)
    sample = random.Random(seed).sample(records, min(sample_size, total))
    report = {
        "marketId": expected["id"],
        "sqlFile": str(path),
        "recordCount": total,
        "automatedAuditPassed": not failures,
        "failures": failures,
        "warnings": {
            "missingAddress": issues["missing_address"],
            "missingAddressPercent": percentage(issues["missing_address"], total),
        },
        "completeness": {
            "websiteCount": websites,
            "websitePercent": percentage(websites, total),
            "httpsWebsiteCount": https_websites,
            "phoneCount": phones,
            "phonePercent": percentage(phones, total),
            "websiteOrPhoneCount": contactable,
            "websiteOrPhonePercent": percentage(contactable, total),
        },
        "categoryDistribution": dict(sorted(Counter(record["category"] for record in records).items())),
        "sampleSize": len(sample),
        "manualVerificationRequired": True,
    }
    return report, sample


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--directory", type=Path, required=True)
    parser.add_argument("--config", type=Path, required=True)
    parser.add_argument("--sample-size", type=int, default=100)
    args = parser.parse_args()

    config = json.loads(args.config.read_text(encoding="utf-8"))
    markets = {market["id"]: market for market in config["markets"]}
    summary: list[dict] = []

    for sql_path in sorted(args.directory.glob("*-1000.sql")):
        market_id = sql_path.stem.removesuffix("-1000")
        market = markets.get(market_id)
        if not market:
            raise ValueError(f"No market configuration for {market_id}")
        expected = {"id": market_id, "targetRecords": 1000, **market}
        report, sample = audit(sql_path, expected, args.sample_size)
        report_path = args.directory / f"{market_id}-content-audit.json"
        sample_path = args.directory / f"{market_id}-manual-sample.csv"
        report_path.write_text(json.dumps(report, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
        with sample_path.open("w", newline="", encoding="utf-8-sig") as handle:
            writer = csv.DictWriter(handle, fieldnames=[
                "name", "category", "subcategory", "address", "city", "country_code",
                "latitude", "longitude", "website", "phone", "source_record_id",
            ])
            writer.writeheader()
            writer.writerows({key: record[key] for key in writer.fieldnames} for record in sample)
        summary.append(report)
        print(
            f"{market_id}: passed={report['automatedAuditPassed']} "
            f"contactable={report['completeness']['websiteOrPhonePercent']}% "
            f"missing_address={report['warnings']['missingAddressPercent']}%"
        )

    summary_path = args.directory / "wave6-content-audit-summary.json"
    summary_path.write_text(json.dumps(summary, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    if any(not report["automatedAuditPassed"] for report in summary):
        raise SystemExit(1)


if __name__ == "__main__":
    main()
