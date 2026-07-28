#!/usr/bin/env python3
"""
Merge the researched roster slices into the game's player database.

    python3 merge_roster.py            # report only
    python3 merge_roster.py --write    # also write src/data/roster.js

Reads every roster/*.json produced by the research agents, deduplicates across
slices, validates each record, and reports what is usable.

This deliberately refuses to invent anything. A field the researchers could not
verify stays null and is reported, because the guess grid compares these values
directly — a plausible-looking wrong number is worse than a visible gap.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
import unicodedata
from collections import Counter, defaultdict
from datetime import date
from pathlib import Path

HERE = Path(__file__).parent
ROSTER_DIR = HERE / "roster"

# Sanity bounds. Anything outside these is a research error, not a real value.
LIMITS = {
    "heightCm": (150, 215),
    "majors": (0, 20),
    "pgaTourWins": (0, 90),
    "worldwideWins": (0, 200),
    "bornYear": (1890, 2010),
}

# `tour` is deliberately not required: the researchers were told to emit null
# rather than guess, and an honest unknown should not drop a real player.
REQUIRED = ["id", "name", "country"]
GRID_FIELDS = ["country", "tour", "majors", "born", "heightCm", "pgaTourWins"]


def slugify(name: str) -> str:
    ascii_name = unicodedata.normalize("NFD", name).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]+", "-", ascii_name.lower()).strip("-")


def born_year(born) -> int | None:
    if not born:
        return None
    match = re.match(r"(\d{4})", str(born))
    return int(match.group(1)) if match else None


def validate(player: dict, slice_name: str) -> tuple[list[str], list[str]]:
    """
    Return (errors, warnings). Only errors exclude a record.

    An id that differs from a strict slug is usually a deliberate, better
    choice ("jumbo-ozaki" for Masashi Ozaki, "jp-hayes" for J.P. Hayes), so it
    is a warning — dropping real players over a naming nicety would be worse
    than the inconsistency.
    """
    problems: list[str] = []
    warnings: list[str] = []

    for field in REQUIRED:
        if not player.get(field):
            problems.append(f"missing {field}")

    name = player.get("name", "")
    if name and player.get("id") and player["id"] != slugify(name):
        warnings.append(f"id '{player['id']}' is not the strict slug of '{name}'")

    for field, (lo, hi) in LIMITS.items():
        value = born_year(player.get("born")) if field == "bornYear" else player.get(field)
        if value is None:
            continue
        if not isinstance(value, (int, float)):
            problems.append(f"{field} is not numeric: {value!r}")
        elif not lo <= value <= hi:
            problems.append(f"{field}={value} outside plausible range {lo}-{hi}")

    # A major champion with zero majors means the slices disagree with themselves.
    if slice_name == "major-champions" and player.get("majors") in (0, None):
        problems.append("listed as a major champion but majors is 0/null")

    if player.get("majors") is not None and player.get("pgaTourWins") is not None:
        if player["majors"] > player["pgaTourWins"] and player.get("tour") == "PGA":
            # Majors are PGA Tour events for PGA players, so this cannot exceed wins.
            problems.append(
                f"majors ({player['majors']}) > pgaTourWins ({player['pgaTourWins']})"
            )

    if not player.get("sources"):
        problems.append("no sources cited")

    return problems, warnings


def load_slices() -> tuple[list[dict], list[str]]:
    if not ROSTER_DIR.is_dir():
        sys.exit(f"No roster directory at {ROSTER_DIR}")

    files = sorted(ROSTER_DIR.glob("*.json"))
    if not files:
        sys.exit(f"No slice files in {ROSTER_DIR} yet — the research agents write them.")

    records, notes = [], []
    for path in files:
        try:
            data = json.loads(path.read_text())
        except json.JSONDecodeError as exc:
            notes.append(f"{path.name}: invalid JSON ({exc})")
            continue

        slice_name = data.get("slice", path.stem)
        if data.get("incomplete"):
            notes.append(f"{path.name}: flagged INCOMPLETE — {data.get('generatedNote', '')}")

        for player in data.get("players", []):
            player["_slice"] = slice_name
            records.append(player)

    return records, notes


def dedupe(records: list[dict]) -> tuple[dict, list[str]]:
    """
    Collapse players appearing in more than one slice.

    Slices are meant to be disjoint, so an overlap is worth reporting rather
    than silently resolving — it usually means an agent ignored an exclusion.
    """
    by_id: dict[str, dict] = {}
    conflicts = []

    for player in records:
        pid = player.get("id") or slugify(player.get("name", ""))
        if pid not in by_id:
            by_id[pid] = player
            continue

        existing = by_id[pid]
        conflicts.append(f"{pid}: in both '{existing['_slice']}' and '{player['_slice']}'")
        by_id[pid] = combine(existing, player)

    return by_id, conflicts


def combine(a: dict, b: dict) -> dict:
    """
    Field-level merge of two records for the same player.

    Taking one record wholesale would throw away verified fields the other one
    has, so start from whichever is more complete and backfill the gaps.
    """
    def filled(p):
        return sum(1 for f in GRID_FIELDS if p.get(f) is not None)

    base, other = (a, b) if filled(a) >= filled(b) else (b, a)
    merged = dict(base)

    for field, value in other.items():
        if merged.get(field) is None and value is not None:
            merged[field] = value

    # The LIV slice is the authority on who currently plays LIV. Other slices
    # were built from historical win lists and go stale when a player moves.
    if "LIV" in (a.get("tour"), b.get("tour")):
        merged["tour"] = "LIV"

    # Keep the more cautious confidence of the two.
    ranking = {"low": 0, "medium": 1, "high": 2}
    merged["confidence"] = min(
        (a.get("confidence"), b.get("confidence")),
        key=lambda c: ranking.get(c, 0),
    )

    merged["sources"] = list(dict.fromkeys((a.get("sources") or []) + (b.get("sources") or [])))
    merged["_slice"] = f"{a.get('_slice')}+{b.get('_slice')}"
    return merged


def to_js(players: list[dict]) -> str:
    """Emit a JS module the game can import directly."""
    rows = []
    for p in sorted(players, key=lambda x: x["name"]):
        rows.append(
            "  {\n"
            f"    id: {json.dumps(p['id'])},\n"
            f"    name: {json.dumps(p['name'])},\n"
            f"    aliases: {json.dumps(p.get('aliases') or [])},\n"
            f"    tour: {json.dumps(p.get('tour'))},\n"
            f"    country: {json.dumps(p.get('country'))},\n"
            f"    born: {json.dumps(p.get('born'))},\n"
            f"    heightCm: {json.dumps(p.get('heightCm'))},\n"
            f"    majors: {json.dumps(p.get('majors'))},\n"
            f"    pgaTourWins: {json.dumps(p.get('pgaTourWins'))},\n"
            f"    worldwideWins: {json.dumps(p.get('worldwideWins'))},\n"
            "  },"
        )
    return (
        "/**\n"
        " * Researched roster — GENERATED by pipeline/merge_roster.py. Do not hand-edit;\n"
        " * fix the source slice in pipeline/roster/ and re-run the merge.\n"
        " *\n"
        " * `null` means the researchers could not verify that value. Treat null as\n"
        " * unknown and exclude it from grid comparison rather than showing a guess.\n"
        " */\n\n"
        "export const ROSTER = [\n" + "\n".join(rows) + "\n]\n"
    )


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--write", action="store_true", help="write src/data/roster.js")
    parser.add_argument("--strict", action="store_true", help="exit non-zero if any record is invalid")
    args = parser.parse_args()

    records, notes = load_slices()
    by_id, conflicts = dedupe(records)

    valid, invalid, warned = [], [], []
    for pid, player in by_id.items():
        problems, warnings = validate(player, player["_slice"])
        (invalid if problems else valid).append((player, problems))
        if warnings:
            warned.append((player, warnings))

    print(f"Slices read      : {len({r['_slice'] for r in records})}")
    print(f"Records total    : {len(records)}")
    print(f"Unique players   : {len(by_id)}")
    print(f"Clean            : {len(valid)}")
    print(f"With problems    : {len(invalid)}")

    if notes:
        print("\nSlice notes:")
        for n in notes:
            print(f"  ! {n}")

    if conflicts:
        print(f"\nCross-slice duplicates ({len(conflicts)}):")
        for c in conflicts[:20]:
            print(f"  · {c}")
        if len(conflicts) > 20:
            print(f"  … and {len(conflicts) - 20} more")

    # Coverage per field is the number that decides whether a grid column is usable.
    print("\nField coverage (non-null, of unique players):")
    total = len(by_id) or 1
    for field in GRID_FIELDS:
        have = sum(1 for p in by_id.values() if p.get(field) is not None)
        bar = "█" * round(20 * have / total)
        print(f"  {field:14s} {have:4d}/{total}  {100*have/total:5.1f}%  {bar}")

    if warned:
        print(f"\nWarnings ({len(warned)}) — kept, but worth a glance:")
        for player, warnings in warned[:10]:
            print(f"  · {player['id']}: {warnings[0]}")
        if len(warned) > 10:
            print(f"  … and {len(warned) - 10} more")

    conf = Counter(p.get("confidence", "unstated") for p in by_id.values())
    print(f"\nConfidence: {dict(conf)}")

    if invalid:
        print(f"\nRecords needing attention ({len(invalid)}):")
        grouped = defaultdict(list)
        for player, problems in invalid:
            for problem in problems:
                grouped[re.sub(r"[0-9']+", "", problem)].append(player["id"])
        for kind, ids in sorted(grouped.items(), key=lambda kv: -len(kv[1])):
            print(f"  · {kind.strip()} — {len(ids)}: {', '.join(ids[:6])}{' …' if len(ids) > 6 else ''}")

    if args.write:
        players = [p for p, _ in valid]
        out = HERE.parent / "src" / "data" / "roster.js"
        out.write_text(to_js(players))
        print(f"\nWrote {len(players)} players → {out}")
        print("Records with problems were EXCLUDED. Fix the slices and re-run to include them.")
    else:
        print("\n(dry run — pass --write to generate src/data/roster.js)")

    return 1 if args.strict and invalid else 0


if __name__ == "__main__":
    raise SystemExit(main())
