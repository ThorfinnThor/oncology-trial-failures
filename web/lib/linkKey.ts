// web/lib/linkKey.ts
//
// The identifier out of a link in a mail, read from wherever it can be read.
//
// Both mail pages used to gate their only button on router.isReady. That flag depends on the
// router having hydrated its query, and anything that stops it — a stale manifest, a cached
// shell, a page opened from a context Next does not route — leaves a page with a heading, a
// paragraph and no way to act on it. That already happened once on /access and is written down
// as mistake 11; these two pages are worse, because a subscriber who cannot confirm has no
// second route and no reason to suspect the page rather than the link.
//
// So: the address bar is read directly, the router is used when it arrives, and "no key" is only
// concluded once one of them has actually answered.

import { useRouter } from "next/router";
import { useEffect, useState } from "react";

export function useLinkKey(param = "k"): { key: string; resolved: boolean } {
  const router = useRouter();
  const [key, setKey] = useState("");
  const [resolved, setResolved] = useState(false);

  useEffect(() => {
    const fromRouter = typeof router.query[param] === "string" ? (router.query[param] as string) : "";
    const fromUrl =
      typeof window === "undefined" ? "" : new URLSearchParams(window.location.search).get(param) || "";
    const found = fromRouter || fromUrl;
    if (found) {
      setKey(found);
      setResolved(true);
      return;
    }
    // Nothing yet. Only the router saying it is ready turns that into "there is none".
    if (router.isReady) setResolved(true);
  }, [param, router.isReady, router.query]);

  return { key, resolved };
}
