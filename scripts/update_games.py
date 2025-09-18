#!/usr/bin/env python3
"""Fetch Google Play developer apps and refresh static/data/games.json."""

import argparse
import json
import sys
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional
from urllib.parse import urljoin
from urllib.request import Request, urlopen
import ssl

try:
    import certifi
except ImportError:  # pragma: no cover - optional dependency
    certifi = None

BASE_URL = "https://play.google.com"
DEFAULT_URL = (
    "https://play.google.com/store/apps/developer?id=Rayole+Games&hl=en_US&gl=US"
)
DEFAULT_OUTPUT = Path("static/data/games.json")
USER_AGENT = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36"
)


def fetch_html(url: str) -> str:
    req = Request(url, headers={"User-Agent": USER_AGENT})
    contexts = []
    if certifi:
        contexts.append((ssl.create_default_context(cafile=certifi.where()), False))
    contexts.append((ssl.create_default_context(), False))
    # Last resort: disable certificate verification (logged)
    contexts.append((ssl._create_unverified_context(), True))

    last_error = None
    for idx, (ctx, insecure) in enumerate(contexts):
        try:
            with urlopen(req, context=ctx) as resp:  # noqa: S310 - trusted source requested by user
                if insecure:
                    print("Warning: falling back to insecure SSL context", file=sys.stderr)
                return resp.read().decode("utf-8", errors="replace")
        except ssl.SSLError as exc:
            last_error = exc
            if idx == len(contexts) - 1:
                raise
    if last_error is not None:
        raise last_error
    raise RuntimeError("Failed to fetch developer page")


def extract_data_block(html: str, key: str = "ds:3") -> str:
    marker = f"key: '{key}'"
    idx = html.find(marker)
    if idx == -1:
        raise ValueError(f"Unable to locate data block with key {key!r}")

    data_idx = html.find("data:", idx)
    if data_idx == -1:
        raise ValueError("Missing data marker after key")

    start = html.find('[', data_idx)
    if start == -1:
        raise ValueError("Missing opening bracket for data array")

    depth = 0
    in_string = False
    escape = False
    for pos in range(start, len(html)):
        ch = html[pos]
        if in_string:
            if escape:
                escape = False
            elif ch == "\\":
                escape = True
            elif ch == '"':
                in_string = False
            continue
        if ch == '"':
            in_string = True
        elif ch == '[':
            depth += 1
        elif ch == ']':
            depth -= 1
            if depth == 0:
                return html[start:pos + 1]
    raise ValueError("Unbalanced brackets while extracting data block")


def format_rating(raw_rating: Optional[str]) -> str:
    if not raw_rating:
        return "N/A"
    try:
        rating = float(raw_rating)
    except ValueError:
        return "N/A"
    if rating <= 0:
        return "N/A"
    # Google Play shows one decimal place
    return f"{rating:.1f} ★"


def resolve_url(raw: Optional[str], package: Optional[str]) -> Optional[str]:
    if raw:
        return urljoin(BASE_URL, raw)
    if package:
        return urljoin(BASE_URL, f"/store/apps/details?id={package}")
    return None


def parse_apps(data_tree: Any) -> Iterable[Dict[str, Any]]:
    try:
        clusters = data_tree[0][1][0][22][0]
    except (IndexError, TypeError) as exc:
        raise ValueError("Unexpected Google Play payload structure") from exc

    for entry in clusters:
        if not entry or not isinstance(entry, list):
            continue
        node = entry[0]
        if not node or not isinstance(node, list):
            continue
        try:
            package = node[0][0]
            title = node[3]
            rating_info = node[4] if isinstance(node[4], list) else None
            raw_rating = rating_info[0] if rating_info else None
            icon = node[1][3][2]
            publisher = node[14]
            rel_url = node[10][4][2]
        except (IndexError, TypeError):
            # Skip entries where structure is incomplete
            continue
        yield {
            "package": package,
            "title": title,
            "publisher": publisher,
            "rating": format_rating(raw_rating),
            "img": icon,
            "url": resolve_url(rel_url, package),
        }


def run(url: str, output: Path) -> List[Dict[str, Any]]:
    html = fetch_html(url)
    data_block = extract_data_block(html, key="ds:3")
    payload = json.loads(data_block)

    apps = []
    seen = set()
    for app in parse_apps(payload):
        package = app.get("package")
        if not package or package in seen:
            continue
        seen.add(package)
        # Drop package before writing JSON (not displayed on site)
        app_record = {
            "title": app["title"],
            "publisher": app["publisher"],
            "rating": app["rating"],
            "img": app["img"],
            "url": app["url"],
        }
        apps.append(app_record)

    if not apps:
        raise RuntimeError("No apps found in Google Play response")

    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(apps, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    return apps


def parse_args(argv: Optional[List[str]] = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--url", default=DEFAULT_URL, help="Google Play developer URL")
    parser.add_argument(
        "--output",
        default=str(DEFAULT_OUTPUT),
        help=f"Path to write games JSON (default: {DEFAULT_OUTPUT})",
    )
    return parser.parse_args(argv)


def main(argv: Optional[List[str]] = None) -> None:
    args = parse_args(argv)
    output_path = Path(args.output)
    apps = run(args.url, output_path)
    print(f"Wrote {len(apps)} apps to {output_path}")


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        sys.exit(130)
    except Exception as exc:  # noqa: BLE001 - surface error to CLI
        print(f"Error: {exc}", file=sys.stderr)
        sys.exit(1)
