// web/pages/newsletter/stop.tsx
//
// The end of the link in every mail. It deliberately does nothing on load: mail security scanners
// fetch every URL in a message before the recipient sees it, and a list that unsubscribes itself
// because a gateway opened the link is indistinguishable from a bug. One button, one click, and
// the scanner never clicks.

import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { useState } from "react";

export default function NewsletterStopPage() {
  // The router, not the effect: the key is a URL value, and reading it into state on mount
  // only creates a render where the page claims the link is broken.
  const router = useRouter();
  const key = typeof router.query.k === "string" ? router.query.k : "";
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [message, setMessage] = useState("");

  async function stop() {
    setStatus("sending");
    try {
      const res = await fetch(`/api/newsletter?stop=${encodeURIComponent(key)}`);
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "Could not stop it.");
      setMessage(data.message || "Stopped.");
      setStatus("done");
    } catch (error: any) {
      setStatus("error");
      setMessage(error?.message || "Could not stop it. Please reply to the mail.");
    }
  }

  return (
    <>
      <Head>
        <title>Stop these emails — Clinical trial failures</title>
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
                <h1>Done</h1>
                <p>{message}</p>
                <p className="fine">
                  If you want it back later, sign up again on the{" "}
                  <Link className="link" href="/newsletter">
                    newsletter page
                  </Link>
                  .
                </p>
              </>
            ) : (
              <>
                <h1>Stop these emails?</h1>
                <p>
                  This removes your address from the list. No more mail, and the address is not kept for anything else.
                </p>
                {!router.isReady ? null : key ? (
                  <button className="submit" type="button" onClick={stop} disabled={status === "sending"}>
                    {status === "sending" ? "Stopping…" : "Stop these emails"}
                  </button>
                ) : (
                  <p className="err">
                    This link is missing its identifier. Please open the link from the mail again, or reply to it and we will stop
                    it by hand.
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
