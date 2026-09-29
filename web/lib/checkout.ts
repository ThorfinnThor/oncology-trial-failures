// web/lib/checkout.ts
//
// One click from "buy" to Stripe. The order used to ask for an email and a company on our page
// first, and then showed a second button to pay: two forms for one purchase, and a buyer who
// clicked "Buy" landed on a page that did not look like a checkout at all. Stripe's own checkout
// collects the email, the name and the business name, so our page asks for nothing: the click
// mints the grant, and the browser goes straight to the payment page with the grant's token as
// the checkout's reference. While payment is not configured, the same URL is the access link.

import { useEffect, useState } from "react";

export type CheckoutState = "idle" | "sending" | "error";

export async function startCheckout(asset: string): Promise<string> {
  const response = await fetch("/api/order", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ asset }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.ok || !data.url) {
    throw new Error(data.error || "Could not open the checkout. Please try again.");
  }
  return String(data.url);
}

export function useCheckout(asset: string) {
  const [state, setState] = useState<CheckoutState>("idle");
  const [error, setError] = useState("");

  // Coming back from Stripe with the browser's back button restores this page from the cache,
  // button still saying "Opening checkout…". Reset it so a second attempt is possible.
  useEffect(() => {
    const reset = () => setState("idle");
    window.addEventListener("pageshow", reset);
    return () => window.removeEventListener("pageshow", reset);
  }, []);

  async function go() {
    if (state === "sending") return;
    setState("sending");
    setError("");
    try {
      window.location.assign(await startCheckout(asset));
    } catch (e: any) {
      setState("error");
      setError(e?.message || "Could not open the checkout. Please try again.");
    }
  }

  return { state, error, go };
}
