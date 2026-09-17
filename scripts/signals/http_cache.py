"""Small, polite, disk-cached JSON HTTP client for enrichment sources.

Every response is cached under ``.cache/signals/<source>/<sha>.json`` so runs are
resumable, reproducible and cheap to repeat. Failed requests are not cached.
"""
from __future__ import annotations

import calendar
import hashlib
import json
import os
import threading
import time
from pathlib import Path
from typing import Any, Optional

import requests

ROOT = Path(__file__).resolve().parents[2]
CACHE_ROOT = ROOT / ".cache" / "signals"
USER_AGENT = "ClinicalTrialFailures-signals/1.0 (+https://clinicaltrialfailures.com/contact)" + (
    f" {os.environ['SIGNALS_CONTACT']}" if os.environ.get("SIGNALS_CONTACT") else "")
# Cached responses older than this are refetched (days).
MAX_AGE_DAYS = {"ctgov": 30, "rxnav": 90, "chembl": 90, "pubmed": 30, "sec": 7}

_MIN_INTERVAL = {"ctgov": 1.0, "rxnav": 0.08, "ncit": 0.15, "chembl": 0.06, "pubmed": 0.12 if os.environ.get("NCBI_API_KEY") else 0.4, "sec": 0.15}
_last_call: dict[str, float] = {}
_lock = threading.Lock()


class SourceUnavailable(RuntimeError):
    """Raised when a source cannot be reached (network policy, outage)."""


def _throttle(source: str) -> None:
    interval = _MIN_INTERVAL.get(source, 0.2)
    with _lock:
        now = time.monotonic()
        wait = _last_call.get(source, 0.0) + interval - now
        _last_call[source] = max(now, _last_call.get(source, 0.0) + interval)
    if wait > 0:
        time.sleep(wait)


def _fresh(entry: dict, source: str) -> bool:
    fetched = entry.get("fetched_at")
    if not fetched:
        return False
    age_days = (time.time() - calendar.timegm(time.strptime(fetched, "%Y-%m-%dT%H:%M:%SZ"))) / 86400
    return age_days <= MAX_AGE_DAYS.get(source, 30)


def get_json(source: str, url: str, params: Optional[dict] = None, *, cache: bool = True,
             retries: int = 3, timeout: float = 30.0, cache_salt: str = "") -> Any:
    key_raw = url + "?" + json.dumps(params or {}, sort_keys=True) + "#" + cache_salt
    key = hashlib.sha256(key_raw.encode()).hexdigest()[:32]
    path = CACHE_ROOT / source / f"{key}.json"
    if cache and path.exists():
        try:
            entry = json.loads(path.read_text())
        except (ValueError, OSError):
            entry = {}  # partial or corrupt cache file (e.g. interrupted write): refetch
        if entry and _fresh(entry, source):
            return entry["body"]

    last_error: Optional[Exception] = None
    for attempt in range(retries):
        _throttle(source)
        try:
            send_params = dict(params or {})
            if source == "pubmed" and os.environ.get("NCBI_API_KEY"):
                send_params["api_key"] = os.environ["NCBI_API_KEY"]  # not part of the cache key
            resp = requests.get(url, params=send_params, timeout=timeout, headers={"User-Agent": USER_AGENT,
                                                                             "Accept": "application/json"})
        except requests.exceptions.ProxyError as exc:
            raise SourceUnavailable(f"{source}: blocked by network policy ({exc.__class__.__name__})") from exc
        except requests.RequestException as exc:
            last_error = exc
            time.sleep(1.5 * (attempt + 1))
            continue
        if resp.status_code == 404:
            body = None
            break
        if resp.status_code in (403, 429, 500, 502, 503, 504) and attempt < retries - 1:
            # 403/429 are how registries signal throttling of shared cloud IPs; back off.
            last_error = RuntimeError(f"HTTP {resp.status_code}")
            time.sleep(min(60.0, float(resp.headers.get("Retry-After") or 0) or 5.0 * (attempt + 1)))
            continue
        if resp.status_code != 200:
            raise SourceUnavailable(f"{source}: HTTP {resp.status_code} for {resp.url}")
        try:
            body = resp.json()
        except ValueError as exc:
            raise SourceUnavailable(f"{source}: non-JSON response from {resp.url}") from exc
        break
    else:
        raise SourceUnavailable(f"{source}: request failed after {retries} attempts: {last_error}")

    if cache:
        path.parent.mkdir(parents=True, exist_ok=True)
        payload = json.dumps({"url": url, "params": params, "fetched_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()), "body": body})
        # Atomic write: concurrent threads may request the same URL; readers must never see a half-written file.
        tmp = path.with_name(f"{path.name}.{os.getpid()}.{threading.get_ident()}.tmp")
        tmp.write_text(payload)
        os.replace(tmp, path)
    return body


def probe(source: str, url: str) -> bool:
    try:
        requests.get(url, timeout=10, headers={"User-Agent": USER_AGENT})
        return True
    except requests.RequestException:
        return False
