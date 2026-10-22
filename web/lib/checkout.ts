// web/lib/checkout.ts
//
// From "get the report" to the report. The order asks for one thing on our page: a work email.
// During the beta that address is what the report costs; once Stripe is switched on it is passed
// on to prefill the checkout, which still collects the name and the business name itself. The
// click mints the grant, and the browser goes to the URL the order returns: the payment page with
// the grant's token as the checkout's reference, or, while payment is not configured, the access
// link itself.
//
// The newsletter box is optional and unticked. Ticking it asks the newsletter for its usual
// confirmation mail; it never decides whether the report is delivered.

import { useEffect, useState } from "react";

export type CheckoutState = "idle" | "sending" | "error";

export type OrderDetails = { email: string; newsletter?: boolean };

export async function startCheckout(asset: string, details: OrderDetails): Promise<string> {
  const response = await fetch("/api/order", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ asset, email: details.email.trim(), newsletter: Boolean(details.newsletter) }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.ok || !data.url) {
    throw new Error(data.error || "Could not open the report. Please try again.");
  }
  return String(data.url);
}

export function useCheckout(asset: string) {
  const [state, setState] = useState<CheckoutState>("idle");
  const [error, setError] = useState("");

  // Coming back from Stripe with the browser's back button restores this page from the cache,
  // button still busy. Reset it so a second attempt is possible.
  useEffect(() => {
    const reset = () => setState("idle");
    window.addEventListener("pageshow", reset);
    return () => window.removeEventListener("pageshow", reset);
  }, []);

  async function go(details: OrderDetails) {
    if (state === "sending") return;
    setState("sending");
    setError("");
    try {
      window.location.assign(await startCheckout(asset, details));
    } catch (e: any) {
      setState("error");
      setError(e?.message || "Could not open the report. Please try again.");
    }
  }

  return { state, error, go };
}
