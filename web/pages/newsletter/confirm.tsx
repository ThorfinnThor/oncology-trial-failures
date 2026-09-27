// web/pages/newsletter/confirm.tsx
//
// The other end of the double opt-in. Nothing happens on load, and here that is not a nicety: a
// corporate mail gateway fetches every URL in a message before the recipient sees it, so a page
// that confirmed on load would manufacture consent for somebody who never read the mail — which
// is the one thing the confirmation exists to rule out. One button, and the scanner never clicks.

import Head from "next/head";
import Link from "next/link";
import { useState } from "react";

import { useLinkKey } from "@/lib/linkKey";

export default function NewsletterConfirmPage() {
  const { key, resolved } = useLinkKey();
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [message, setMessage] = useState("");

  async function subscribe() {
    setStatus("sending");
    try {
      const res = await fetch(`/api/newsletter?confirm=${encodeURIComponent(key)}`);
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "Could not confirm it.");
      setMessage(data.message || "Confirmed.");
      setStatus("done");
    } catch (error: any) {
      setStatus("error");
      setMessage(error?.message || "Could not confirm it. Please open the link from the mail again.");
    }
  }

  return (
    <>
      <Head>
        <title>Confirm your subscription — Clinical trial failures</title>
        <meta name="robots" content="noindex,nofollow" />
      </Head>

      <header className="topbar">
        <div className="topbar-inner">
          <div className="topbar-left">
            <Link href="/" className="brand">
              Clinical trial failures
            </Link>
          </div>
        </div>
      </header>

      <main className="page">
        <div className="narrow">
          <div className="card box">
            {status === "done" ? (
              <>
                <h1>Confirmed</h1>
                <p>{message}</p>
                <p className="fine">
                  Every issue carries an unsubscribe link. Until then, the{" "}
                  <Link className="link" href="/briefs">
                    briefs
                  </Link>{" "}
                  are free and need no address at all.
                </p>
              </>
            ) : (
              <>
                <h1>Confirm your subscription</h1>
                <p>
                  One mail every second week: the trials that entered the dataset and the records sponsors changed.
                  Nothing else is ever sent to this address, and every issue carries a link that unsubscribes it.
                </p>
                {!resolved ? null : key ? (
                  <button className="submit" type="button" onClick={subscribe} disabled={status === "sending"}>
                    {status === "sending" ? "Confirming…" : "Yes, subscribe me"}
                  </button>
                ) : (
                  <p className="err">
                    This link is missing its identifier. Please open the link from the mail again, or sign up once more on the
                    newsletter page.
                  </p>
                )}
                {status === "error" ? <p className="err">{message}</p> : null}
              </>
            )}
          </div>
        </div>
      </main>

      <style jsx>{`
        .narrow {
          max-width: 560px;
          margin: 40px auto 0;
        }
        .box {
          padding: 28px;
        }
        h1 {
          margin: 0;
          font-size: 22px;
          font-weight: 900;
          letter-spacing: -0.015em;
        }
        p {
          margin: 12px 0 0;
          font-size: 14px;
          line-height: 1.6;
          color: var(--text-muted);
        }
        .fine {
          font-size: 12.5px;
        }
        .err {
          color: #b91c1c;
        }
        .submit {
          margin-top: 18px;
          width: 100%;
          background: var(--accent);
          color: #fff;
          border: 0;
          border-radius: 12px;
          padding: 12px 16px;
          font-size: 14px;
          font-weight: 800;
          cursor: pointer;
          font-family: inherit;
        }
        .submit:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
      `}</style>
    </>
  );
}
