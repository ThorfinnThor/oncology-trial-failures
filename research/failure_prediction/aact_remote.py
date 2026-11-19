"""Read single tables out of an AACT flat-file snapshot without downloading the whole ZIP.

The API redirects to a signed link that supports HTTP byte ranges, so zipfile can seek inside the
remote archive and only the central directory and the requested members are transferred. The API key
is read from ~/.aact_api_key and never printed; signed links expire after five minutes, so a fresh
one is requested whenever a read needs it.
"""
from __future__ import annotations

import io
import os
import time
import zipfile

import truststore

truststore.inject_into_ssl()
import requests  # noqa: E402

API = "https://aact.ctti-clinicaltrials.org/api/v1"
KEY = open(os.path.expanduser("~/.aact_api_key")).read().strip()
session = requests.Session()


def signed_url(snapshot_id: int) -> str:
    for attempt in range(12):
        r = session.get(f"{API}/snapshots/flat/{snapshot_id}/download", allow_redirects=False,
                        headers={"Authorization": f"Bearer {KEY}"}, timeout=60)
        if r.status_code in (301, 302, 303, 307, 308):
            return r.headers["Location"]
        # Downloads have their own rate limit; wait as long as the server asks, else back off.
        wait = int(r.headers.get("Retry-After") or 0) or min(600, 30 * (attempt + 1))
        print(f"  waiting {wait}s for a download link (HTTP {r.status_code})", flush=True)
        time.sleep(wait)
    raise RuntimeError(f"no download link for snapshot {snapshot_id}: HTTP {r.status_code}")


class RemoteFile(io.RawIOBase):
    """A read-only, seekable view of a remote file through HTTP range requests."""

    def __init__(self, snapshot_id: int, size: int, url: str, block: int = 8 << 20):
        self.snapshot_id, self.size, self.block = snapshot_id, size, block
        self.pos, self.url, self.url_at = 0, url, time.time()
        self.cache: dict[int, bytes] = {}
        self.transferred = 0

    def readable(self): return True
    def seekable(self): return True
    def tell(self): return self.pos

    def seek(self, offset, whence=io.SEEK_SET):
        self.pos = {io.SEEK_SET: offset, io.SEEK_CUR: self.pos + offset, io.SEEK_END: self.size + offset}[whence]
        return self.pos

    def _block(self, i: int) -> bytes:
        if i not in self.cache:
            if time.time() - self.url_at > 240:
                self.url, self.url_at = signed_url(self.snapshot_id), time.time()
            start, end = i * self.block, min(self.size, (i + 1) * self.block) - 1
            for attempt in range(5):
                try:
                    r = session.get(self.url, headers={"Range": f"bytes={start}-{end}"}, timeout=120)
                    if r.status_code == 206:
                        break
                    if r.status_code in (400, 403):
                        self.url, self.url_at = signed_url(self.snapshot_id), time.time()
                except requests.RequestException:
                    pass
                time.sleep(2 ** attempt)
            else:
                raise RuntimeError(f"range read failed at {start}")
            if len(self.cache) > 8:
                self.cache.pop(next(iter(self.cache)))
            self.cache[i] = r.content
            self.transferred += len(r.content)
        return self.cache[i]

    def read(self, n=-1):
        if n is None or n < 0:
            n = self.size - self.pos
        out = bytearray()
        while n > 0 and self.pos < self.size:
            i, off = divmod(self.pos, self.block)
            chunk = self._block(i)[off:off + n]
            out += chunk
            self.pos += len(chunk)
            n -= len(chunk)
        return bytes(out)

    def readinto(self, b):
        data = self.read(len(b))
        b[:len(data)] = data
        return len(data)


def open_snapshot(snapshot_id: int) -> tuple[zipfile.ZipFile, RemoteFile]:
    # One signed link per snapshot: links are rate-limited per hour, so the size probe and the reads share it.
    url = signed_url(snapshot_id)
    head = session.get(url, headers={"Range": "bytes=0-0"}, timeout=60)
    size = int(head.headers["Content-Range"].split("/")[-1])
    remote = RemoteFile(snapshot_id, size, url)
    return zipfile.ZipFile(io.BufferedReader(remote, buffer_size=1 << 20)), remote
