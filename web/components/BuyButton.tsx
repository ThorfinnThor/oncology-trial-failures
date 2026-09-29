// web/components/BuyButton.tsx
//
// The buy button used wherever a report is sold. The look comes from the caller's class, declared
// :global there, because a scoped rule cannot reach an element rendered here.

import { useCheckout } from "@/lib/checkout";

export default function BuyButton({ asset, label, className }: { asset: string; label: string; className?: string }) {
  const { state, error, go } = useCheckout(asset);
  return (
    <>
      <button type="button" className={className} onClick={go} disabled={state === "sending"} aria-busy={state === "sending"}>
        {state === "sending" ? "Opening checkout…" : label}
      </button>
      {state === "error" ? (
        <div role="alert" style={{ marginTop: 8, fontSize: 13, color: "#b91c1c" }}>
          {error}
        </div>
      ) : null}
    </>
  );
}
