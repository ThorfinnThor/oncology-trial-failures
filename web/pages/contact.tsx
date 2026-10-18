import Head from "next/head";
import { serializeJsonLd } from "@/lib/serializeJsonLd";
import Link from "next/link";
import { type FormEvent, useState } from "react";

import PrimaryNav from "@/components/PrimaryNav";
import { staticRobotsForPath } from "@/lib/seoStaticPolicy";
import { CONTACT_EMAIL, contactMailto } from "@/lib/siteContact";

const SITE_URL = "https://clinicaltrialfailures.com";
const TITLE = "Contact | Clinical Trial Failures";
const DESCRIPTION =
  "Contact Clinical Trial Failures for data corrections, source issues, methodology questions, and website feedback.";
const CANONICAL_URL = `${SITE_URL}/contact`;
const OG_IMAGE = `${SITE_URL}/og-image.png`;
const DATA_CORRECTION_MAILTO =
  `${contactMailto("Clinical Trial Failures data correction")}&body=Please%20include%3A%0A-%20NCT%20ID%3A%0A-%20Page%20URL%3A%0A-%20Current%20source%20text%3A%0A-%20Suggested%20correction%3A%0A-%20Primary%20source%20link%3A`;
const WEBSITE_FEEDBACK_MAILTO =
  `${contactMailto("Clinical Trial Failures website feedback")}&body=Please%20include%3A%0A-%20Page%20URL%3A%0A-%20Browser%20and%20device%3A%0A-%20What%20is%20broken%20or%20unclear%3A`;

export default function ContactPage() {
  const [formState, setFormState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [formMessage, setFormMessage] = useState("");

  async function submitContact(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setFormState("sending");
    setFormMessage("");

    try {
      const payload = Object.fromEntries(new FormData(form).entries());
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "We could not send your message. Please try again.");
      form.reset();
      setFormState("sent");
      setFormMessage(result.message || "Thank you. Your message has been sent.");
    } catch (error) {
      setFormState("error");
      setFormMessage(error instanceof Error ? error.message : "We could not send your message. Please try again.");
    }
  }

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "ContactPage",
      name: TITLE,
      description: DESCRIPTION,
      url: CANONICAL_URL,
      email: CONTACT_EMAIL,
      isPartOf: {
        "@type": "WebSite",
        name: "Clinical Trial Failures",
        url: SITE_URL,
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
        { "@type": "ListItem", position: 2, name: "Contact", item: CANONICAL_URL },
      ],
    },
  ];

  return (
    <>
      <Head>
        <title>{TITLE}</title>
        <meta name="description" content={DESCRIPTION} />
        <meta name="robots" content={staticRobotsForPath("/contact")} />
        <link rel="canonical" href={CANONICAL_URL} />
        <meta property="og:title" content={TITLE} />
        <meta property="og:description" content={DESCRIPTION} />
        <meta property="og:url" content={CANONICAL_URL} />
        <meta property="og:type" content="website" />
        <meta property="og:image" content={OG_IMAGE} />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={TITLE} />
        <meta name="twitter:description" content={DESCRIPTION} />
        <meta name="twitter:image" content={OG_IMAGE} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }}
        />
      </Head>

      <div className="min-h-screen contactPage">
        <header className="topbar">
          <div className="topbar-inner">
            <div className="topbar-left">
              <Link href="/" className="brand">
                Clinical trial failures
              </Link>
              <PrimaryNav />
            </div>
          </div>
        </header>

        <main className="page">
          <article className="contactShell">
            <header className="contactHeader">
              <p className="facet-title">Contact</p>
              <h1>Contact Clinical Trial Failures</h1>
              <p>
                Use this page for data corrections, source questions, methodology feedback, and website issues.
                For any trial-specific concern, please include the NCT ID and the exact source text you want reviewed.
              </p>
              <p className="contactEmail">
                Email: <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
              </p>
            </header>

            <section className="contactFormSection" aria-labelledby="contact-form-heading">
              <div className="contactFormIntro">
                <p className="facet-title">Send a message</p>
                <h2 id="contact-form-heading">Write to the team</h2>
                <p>
                  Messages submitted here are delivered to <strong>{CONTACT_EMAIL}</strong>. When we reply,
                  the response will come from the same address.
                </p>
                <p>
                  Do not include patient-level data, medical records, or other sensitive health information.
                </p>
              </div>

              <form className="contactForm" onSubmit={submitContact}>
                <label>
                  What is this about?
                  <select name="topic" defaultValue="correction" required>
                    <option value="correction">Data correction</option>
                    <option value="methodology">Methodology or source question</option>
                    <option value="privacy">Privacy request</option>
                    <option value="licensing">Licensing or custom research</option>
                    <option value="website">Website issue</option>
                    <option value="other">Other</option>
                  </select>
                </label>

                <div className="contactFormRow">
                  <label>
                    Name <span>optional</span>
                    <input name="name" type="text" autoComplete="name" maxLength={120} />
                  </label>
                  <label>
                    Email address
                    <input name="email" type="email" autoComplete="email" maxLength={254} required />
                  </label>
                </div>

                <label>
                  Relevant page URL <span>optional</span>
                  <input name="pageUrl" type="url" inputMode="url" maxLength={500} placeholder="https://clinicaltrialfailures.com/..." />
                </label>

                <label>
                  Message
                  <textarea name="message" rows={7} minLength={10} maxLength={5000} required />
                </label>

                <label className="contactHoneypot" aria-hidden="true">
                  Website
                  <input name="website" type="text" tabIndex={-1} autoComplete="off" />
                </label>

                <div className="contactFormFooter">
                  <button type="submit" disabled={formState === "sending"}>
                    {formState === "sending" ? "Sending…" : "Send message"}
                  </button>
                  <p>
                    Your details are used only to handle this request. See the <Link href="/privacy">Privacy Policy</Link>.
                  </p>
                </div>

                {formMessage ? (
                  <p className={`contactFormStatus ${formState}`} role={formState === "error" ? "alert" : "status"}>
                    {formMessage}
                  </p>
                ) : null}
              </form>
            </section>

            <section className="contactGrid" aria-label="Contact options">
              <div className="contactCard">
                <h2>Data corrections</h2>
                <p>
                  If a record looks incomplete, misclassified, or outdated, please verify the ClinicalTrials.gov
                  source page first and include the NCT ID, the current source text, and the correction you suggest.
                </p>
                <a href={DATA_CORRECTION_MAILTO}>
                  Email a correction →
                </a>
              </div>

              <div className="contactCard">
                <h2>Methodology questions</h2>
                <p>
                  The site classifies registry stop language into research buckets such as efficacy/futility,
                  safety, operational, enrollment, regulatory, and other/unknown. These are screening signals,
                  not medical conclusions.
                </p>
                <Link href="/methods">Read how classification works →</Link>
              </div>

              <div className="contactCard">
                <h2>Website feedback</h2>
                <p>
                  If something is broken, unclear, or hard to use on mobile or desktop, send the page URL,
                  browser, device, and a short description of the issue.
                </p>
                <a href={WEBSITE_FEEDBACK_MAILTO}>
                  Email website feedback →
                </a>
              </div>
            </section>

            <section className="contactNote">
              <h2>Important note</h2>
              <p>
                Clinical Trial Failures is a research-support website. It does not provide medical advice,
                investment advice, clinical recommendations, or a substitute for primary source review.
              </p>
              <div className="contactLinks">
                <Link href="/about">About and data trust</Link>
                <Link href="/privacy">Privacy Policy</Link>
                <Link href="/imprint">Imprint</Link>
              </div>
            </section>
          </article>
        </main>
      </div>

      <style jsx>{`
        .contactPage {
          background: #f8fafc;
          color: #0f172a;
        }

        .contactShell {
          max-width: 980px;
          margin: 0 auto;
          background: #ffffff;
          border: 1px solid #dbe4f0;
          border-radius: 14px;
          padding: clamp(20px, 3vw, 32px);
          box-shadow: 0 18px 48px rgba(15, 23, 42, 0.06);
        }

        .contactHeader {
          max-width: 760px;
        }

        .contactHeader h1 {
          margin: 0 0 12px;
          font-size: clamp(30px, 4vw, 46px);
          line-height: 1.04;
          letter-spacing: 0;
        }

        .contactHeader p,
        .contactEmail,
        .contactCard p,
        .contactNote p {
          margin: 0;
          color: #334155;
          font-size: 16px;
          line-height: 1.7;
        }

        .contactEmail {
          margin-top: 12px;
          font-weight: 800;
        }

        .contactEmail a {
          color: #3730a3;
          text-decoration: none;
        }

        .contactEmail a:hover {
          text-decoration: underline;
        }

        .contactFormSection {
          display: grid;
          grid-template-columns: minmax(220px, 0.72fr) minmax(0, 1.28fr);
          gap: clamp(22px, 4vw, 42px);
          margin-top: 28px;
          padding: clamp(20px, 3vw, 28px);
          border: 1px solid #cbd5e1;
          border-radius: 14px;
          background: #f8fafc;
        }

        .contactFormIntro h2 {
          margin: 4px 0 10px;
          font-size: 24px;
          line-height: 1.15;
        }

        .contactFormIntro p:not(.facet-title) {
          margin: 0;
          color: #475569;
          line-height: 1.65;
        }

        .contactFormIntro p + p {
          margin-top: 12px;
        }

        .contactForm {
          display: grid;
          gap: 14px;
        }

        .contactFormRow {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px;
        }

        .contactForm label {
          display: grid;
          gap: 6px;
          color: #0f172a;
          font-size: 14px;
          font-weight: 800;
        }

        .contactForm label span {
          color: #64748b;
          font-size: 12px;
          font-weight: 600;
        }

        .contactForm input,
        .contactForm select,
        .contactForm textarea {
          width: 100%;
          border: 1px solid #94a3b8;
          border-radius: 8px;
          background: #ffffff;
          padding: 11px 12px;
          color: #0f172a;
          font: inherit;
          font-weight: 500;
        }

        .contactForm textarea {
          min-height: 150px;
          resize: vertical;
        }

        .contactForm input:focus,
        .contactForm select:focus,
        .contactForm textarea:focus {
          outline: 3px solid rgba(79, 70, 229, 0.2);
          border-color: #4f46e5;
        }

        .contactFormFooter {
          display: flex;
          align-items: center;
          gap: 14px;
        }

        .contactFormFooter button {
          flex: 0 0 auto;
          border: 0;
          border-radius: 8px;
          background: #4f46e5;
          padding: 12px 18px;
          color: #ffffff;
          font: inherit;
          font-weight: 800;
          cursor: pointer;
        }

        .contactFormFooter button:hover:not(:disabled) {
          background: #4338ca;
        }

        .contactFormFooter button:disabled {
          cursor: wait;
          opacity: 0.7;
        }

        .contactFormFooter p {
          margin: 0;
          color: #64748b;
          font-size: 12px;
          line-height: 1.5;
        }

        .contactFormFooter :global(a) {
          color: #3730a3;
          font-weight: 700;
        }

        .contactFormStatus {
          margin: 0;
          border-radius: 8px;
          padding: 11px 12px;
          font-size: 14px;
          font-weight: 700;
        }

        .contactFormStatus.sent {
          border: 1px solid #86efac;
          background: #f0fdf4;
          color: #166534;
        }

        .contactFormStatus.error {
          border: 1px solid #fca5a5;
          background: #fef2f2;
          color: #991b1b;
        }

        .contactHoneypot {
          position: absolute;
          width: 1px;
          height: 1px;
          overflow: hidden;
          clip: rect(0 0 0 0);
          clip-path: inset(50%);
          white-space: nowrap;
        }

        .contactGrid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 14px;
          margin-top: 28px;
        }

        .contactCard,
        .contactNote {
          border: 1px solid #dbe4f0;
          border-radius: 12px;
          background: #ffffff;
          padding: 18px;
        }

        .contactCard h2,
        .contactNote h2 {
          margin: 0 0 10px;
          font-size: 18px;
          line-height: 1.25;
        }

        .contactCard a,
        .contactLinks :global(a) {
          display: inline-block;
          margin-top: 14px;
          color: #3730a3;
          font-weight: 800;
          text-decoration: none;
        }

        .contactCard a:hover,
        .contactLinks :global(a:hover) {
          text-decoration: underline;
        }

        .contactNote {
          margin-top: 14px;
          background: #f8fafc;
        }

        .contactLinks {
          display: flex;
          flex-wrap: wrap;
          gap: 14px 20px;
          margin-top: 2px;
        }

        @media (max-width: 860px) {
          .contactFormSection {
            grid-template-columns: 1fr;
          }

          .contactGrid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 580px) {
          .contactFormRow {
            grid-template-columns: 1fr;
          }

          .contactFormFooter {
            align-items: stretch;
            flex-direction: column;
          }
        }
      `}</style>
    </>
  );
}
