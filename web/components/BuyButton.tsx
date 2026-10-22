// web/components/BuyButton.tsx
//
// The order form used wherever a report is offered: a work email, an optional newsletter box, and
// the button. The button's look comes from the caller's class, declared :global there, because a
// scoped rule in the caller cannot reach an element rendered here. The field and the box are
// styled here.
//
// The email is required (during the beta it is what the report costs). The newsletter box starts
// unticked and stays optional: leaving it unticked still delivers the report.

import { forwardRef, useId, useState, type FormEvent } from "react";

import { useCheckout } from "@/lib/checkout";
import { BUY_LABEL, REPORT_BETA } from "@/lib/offer";

type Props = { asset: string; label?: string; className?: string };

const BuyButton = forwardRef<HTMLInputElement, Props>(function BuyButton({ asset, label = BUY_LABEL, className }, emailRef) {
  const { state, error, go } = useCheckout(asset);
  const [email, setEmail] = useState("");
  const [newsletter, setNewsletter] = useState(false);
  const id = useId();

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void go({ email, newsletter });
  }

  return (
    <form className="buyForm" onSubmit={submit}>
      <label className="field" htmlFor={`${id}-email`}>
        Work email
      </label>
      <input
        ref={emailRef}
        id={`${id}-email`}
        className="email"
        type="email"
        name="email"
        autoComplete="email"
        required
        maxLength={254}
        placeholder="you@company.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <label className="check" htmlFor={`${id}-newsletter`}>
        <input
          id={`${id}-newsletter`}
          type="checkbox"
          name="newsletter"
          checked={newsletter}
          onChange={(e) => setNewsletter(e.target.checked)}
        />
        <span>
          Also send me the fortnightly newsletter. Optional: we mail you a link to confirm first, and every issue has
          a one-click unsubscribe.
        </span>
      </label>
      <button type="submit" className={className} disabled={state === "sending"} aria-busy={state === "sending"}>
        {state === "sending" ? (REPORT_BETA ? "Opening your report…" : "Opening checkout…") : label}
      </button>
      {state === "error" ? (
        <div role="alert" className="err">
          {error}
        </div>
      ) : null}
      <style jsx>{`
        .buyForm {
          display: grid;
          gap: 8px;
          text-align: left;
        }
        .field {
          font-size: 12.5px;
          font-weight: 700;
          color: var(--text);
        }
        .email {
          width: 100%;
          box-sizing: border-box;
          padding: 11px 12px;
          border: 1px solid rgba(15, 23, 42, 0.2);
          border-radius: 10px;
          background: var(--surface);
          color: var(--text);
          font: inherit;
          font-size: 15px;
        }
        .email:focus {
          outline: 2px solid var(--accent);
          outline-offset: 1px;
        }
        .check {
          display: flex;
          gap: 8px;
          align-items: flex-start;
          font-size: 12.5px;
          line-height: 1.45;
          color: var(--text-muted);
          cursor: pointer;
        }
        .check input {
          margin: 2px 0 0;
          flex: none;
        }
        .err {
          font-size: 13px;
          color: #b91c1c;
        }
      `}</style>
    </form>
  );
});

export default BuyButton;
