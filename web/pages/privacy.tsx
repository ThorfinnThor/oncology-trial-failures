import Head from "next/head";

export default function PrivacyPolicy() {
  const SITE_NAME = "Clinical Trial Failures";
  // TODO: replace with your real contact email / address
  const CONTACT_EMAIL = "privacy@yourdomain.com";
  const DATA_CONTROLLER = "Your Name / Company Name";

  return (
    <>
      <Head>
        <title>Privacy Policy | {SITE_NAME}</title>
        <meta
          name="description"
          content="Privacy policy explaining what data we collect, how cookies are used, and how Google Analytics is handled."
        />
      </Head>

      <main className="page">
        <div className="content">
          <h1>Privacy Policy</h1>
          <p>
            This Privacy Policy explains how <strong>{SITE_NAME}</strong> (“we”, “us”) processes
            personal data when you use this website.
          </p>

          <h2>1. Controller</h2>
          <p>
            Controller (data controller under the GDPR): <strong>{DATA_CONTROLLER}</strong>
            <br />
            Contact: <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
          </p>

          <h2>2. What data we process</h2>
          <ul>
            <li>
              <strong>Technical log data</strong> (e.g., IP address, user agent) may be processed
              temporarily for security and operational purposes.
            </li>
            <li>
              <strong>Analytics data</strong> only if you consent to analytics cookies (see section 4).
            </li>
          </ul>

          <h2>3. Cookies</h2>
          <p>We use the following cookies:</p>
          <ul>
            <li>
              <strong>cookie_consent</strong> (essential): stores your cookie choice for 180 days.
              Values: <code>none</code>, <code>necessary</code>, <code>all</code>.
            </li>
            <li>
              <strong>Google Analytics cookies</strong> (optional): only set if you click “Accept all”.
            </li>
          </ul>

          <h2>4. Analytics (Google Analytics)</h2>
          <p>
            If you click “Accept all”, we load{" "}
            <strong>:contentReference[oaicite:0]{index=0}</strong>{" "}
            to measure website usage (e.g., page views, approximate location, device/browser).
            We configure Google Analytics with:
          </p>
          <ul>
            <li>
              <strong>Consent Mode v2</strong> with default storage set to <code>denied</code> until
              you consent.
            </li>
            <li>
              <strong>IP anonymization</strong> (<code>anonymize_ip: true</code>).
            </li>
            <li>
              Signals / ad personalization disabled (<code>allow_google_signals: false</code>,{" "}
              <code>allow_ad_personalization_signals: false</code>).
            </li>
          </ul>

          <h2>5. Legal basis</h2>
          <ul>
            <li>
              Essential cookie (<code>cookie_consent</code>): legitimate interest / necessary for
              providing the service.
            </li>
            <li>
              Google Analytics: consent (GDPR Art. 6(1)(a)). No analytics cookies are set unless you
              consent.
            </li>
          </ul>

          <h2>6. International transfers</h2>
          <p>
            Google may process data outside the EU/EEA. Where applicable, transfers rely on
            safeguards such as Standard Contractual Clauses and other measures provided by Google.
          </p>

          <h2>7. Retention</h2>
          <p>
            Your consent choice is stored for 180 days. Analytics retention depends on your Google
            Analytics property settings.
          </p>

          <h2>8. Your rights</h2>
          <p>
            Depending on your jurisdiction, you may have rights to access, rectification, erasure,
            restriction, objection, and data portability. You can contact us at{" "}
            <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
          </p>

          <h2>9. How to change your cookie choice</h2>
          <p>
            You can withdraw consent at any time by clearing the <code>cookie_consent</code> cookie
            in your browser. After clearing, the consent dialog will reappear.
          </p>

          <p style={{ marginTop: 24, fontSize: 12, opacity: 0.75 }}>
            Last updated: {new Date().toISOString().slice(0, 10)}
          </p>
        </div>
      </main>
    </>
  );
}
