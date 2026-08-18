"""Generate an approved Overture seed and a traceable batch manifest."""

from __future__ import annotations

import argparse
import hashlib
import json
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path


def main() -> None:
    script_directory = Path(__file__).resolve().parent
    parser = argparse.ArgumentParser()
    parser.add_argument("--area", required=True)
    parser.add_argument("--limit", type=int, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--report", type=Path, required=True)
    parser.add_argument("--max-per-category", type=int, default=1500)
    parser.add_argument("--max-per-subcategory", type=int, default=400)
    parser.add_argument("--config", type=Path, default=script_directory / "pilot-areas.json")
    parser.add_argument("--rollout-config", type=Path, default=script_directory / "expansion-markets.json")
    args = parser.parse_args()

    if args.limit <= 0:
        parser.error("limit must be positive")

    extraction_config = json.loads(args.config.read_text(encoding="utf-8"))
    rollout_config = json.loads(args.rollout_config.read_text(encoding="utf-8"))
    areas = {area["id"]: area for area in extraction_config["areas"]}
    markets = {market["id"]: market for market in rollout_config["markets"]}
    area = areas.get(args.area)
    market = markets.get(args.area)

    if not area:
        parser.error(f"{args.area}: extraction geometry is not approved")
    if not market or not market.get("extractionEnabled"):
        parser.error(f"{args.area}: extraction is disabled in the rollout manifest")
    if args.limit not in rollout_config["batchStages"]:
        parser.error("limit must match an approved batch stage")
    if args.limit > int(market["nextTargetRecords"]):
        parser.error(f"limit exceeds approved target of {market['nextTargetRecords']}")
    if args.limit > int(extraction_config.get("maxRecordsPerArea", 10000)):
        parser.error("limit exceeds the global per-market cap")

    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.report.parent.mkdir(parents=True, exist_ok=True)
    builder = script_directory / "build-overture-seed.py"
    command = [
        sys.executable,
        str(builder),
        "--config",
        str(args.config),
        "--output",
        str(args.output),
        "--limit",
        str(args.limit),
        "--max-per-category",
        str(args.max_per_category),
        "--max-per-subcategory",
        str(args.max_per_subcategory),
        "--areas",
        args.area,
    ]

    try:
        completed = subprocess.run(command, check=True, capture_output=True, text=True)
    except subprocess.CalledProcessError as error:
        details = (error.stderr or error.stdout or "unknown builder error").strip()
        raise RuntimeError(f"batch builder failed for {args.area}: {details}") from error
    checksum = hashlib.sha256(args.output.read_bytes()).hexdigest()
    report = {
        "marketId": args.area,
        "countryCode": market["countryCode"],
        "city": market["city"],
        "source": extraction_config["source"],
        "sourceRelease": extraction_config["release"],
        "targetRecords": args.limit,
        "previousRecords": market["currentRecords"],
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "sqlFile": str(args.output),
        "checksumSha256": checksum,
        "status": "generated_not_validated",
        "qualityGates": rollout_config["qualityGates"],
        "builderOutput": completed.stdout.strip().splitlines(),
    }
    args.report.write_text(json.dumps(report, indent=2), encoding="utf-8", newline="\n")

    print(completed.stdout, end="")
    print(f"batch report: {args.report}")
    print("No data was uploaded. Review the SQL and quality gates before preview application.")


if __name__ == "__main__":
    main()
