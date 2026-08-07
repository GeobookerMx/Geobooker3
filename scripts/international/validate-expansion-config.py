"""Validate international rollout configuration without network access."""

from __future__ import annotations

import argparse
import json
import re
from pathlib import Path


ALLOWED_STATUSES = {"candidate", "planned", "extracting", "qa", "preview", "active", "paused", "retired"}
MARKET_ID_PATTERN = re.compile(r"^[a-z]{2}-[a-z0-9]+(?:-[a-z0-9]+)*$")


def validate(config: dict) -> list[str]:
    errors: list[str] = []
    stages = config.get("batchStages") or []
    markets = config.get("markets") or []

    if stages != sorted(set(stages)) or not stages or stages[-1] > 10000:
        errors.append("batchStages must be unique, ascending, and capped at 10000")
    if config.get("searchResultLimit") not in range(1, 51):
        errors.append("searchResultLimit must be between 1 and 50")
    if config.get("databasePausePercent") not in range(50, 91):
        errors.append("databasePausePercent must be between 50 and 90")

    seen_ids: set[str] = set()
    seen_locations: set[tuple[str, str]] = set()
    for market in markets:
        market_id = market.get("id", "")
        location = (market.get("countryCode", ""), market.get("city", "").casefold())

        if not MARKET_ID_PATTERN.fullmatch(market_id):
            errors.append(f"invalid market id: {market_id!r}")
        if market_id in seen_ids:
            errors.append(f"duplicate market id: {market_id}")
        if location in seen_locations:
            errors.append(f"duplicate market location: {location[0]} / {market.get('city')}")
        if market.get("status") not in ALLOWED_STATUSES:
            errors.append(f"{market_id}: invalid status {market.get('status')!r}")
        if market.get("nextTargetRecords") not in stages:
            errors.append(f"{market_id}: nextTargetRecords must use a configured batch stage")
        if market.get("currentRecords", 0) > market.get("nextTargetRecords", 0):
            errors.append(f"{market_id}: currentRecords exceeds nextTargetRecords")
        if market.get("extractionEnabled") and market.get("status") not in {"planned", "extracting", "qa", "preview", "active", "paused"}:
            errors.append(f"{market_id}: extraction cannot be enabled for status {market.get('status')}")

        seen_ids.add(market_id)
        seen_locations.add(location)

    return errors


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "config",
        type=Path,
        nargs="?",
        default=Path(__file__).with_name("expansion-markets.json"),
    )
    args = parser.parse_args()

    config = json.loads(args.config.read_text(encoding="utf-8"))
    errors = validate(config)
    if errors:
        for error in errors:
            print(f"ERROR: {error}")
        raise SystemExit(1)

    print(f"OK: {len(config['markets'])} markets; stages={config['batchStages']}")


if __name__ == "__main__":
    main()
