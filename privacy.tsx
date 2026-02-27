import Head from "next/head";

export default function PrivacyPolicy() {
  const SITE_NAME = "Clinical Trial Failures";

  return (
    <>
      <Head>
        <title>Privacy Policy | {SITE_NAME}</title>
        <meta
          name="description"
          content="Short privacy policy covering cookies, optional analytics, and how this site handles basic usage data."
        />
      </Head>

      <main className="page">
        <div className="content">
          <h1>Privacy Policy</h1>
          <p>
            <strong>{SITE_NAME}</strong> is designed to be usable without creating an account or
            providing personal details.
          </p>

          <h2>What we collect</h2>
          <ul>
            <li>Basic technical request data may be processed by the hosting provider for security and performance.</li>
            <li>Optional analytics data is collected only if you consent to analytics cookies.</li>
            <li>We do not require sign-up, account creation, or direct submission of personal information to use the site.</li>
          </ul>

          <h2>Cookies</h2>
          <ul>
            <li><strong>Essential cookie:</strong> stores your cookie consent preference.</li>
            <li><strong>Optional analytics cookies:</strong> used only after consent.</li>
          </ul>

          <h2>Analytics</h2>
          <p>
            If you accept analytics cookies, Google Analytics may be used to measure site usage,
            such as page views, device type, and general traffic patterns. If you do not consent,
            analytics cookies are not loaded.
          </p>

          <h2>Your choice</h2>
          <p>
            You can change your cookie decision at any time by clearing the consent cookie in your
            browser. When cleared, the cookie banner will appear again.
          </p>

          <p style={{ marginTop: 24, fontSize: 12, opacity: 0.75 }}>
            Last updated: {new Date().toISOString().slice(0, 10)}
          </p>
        </div>
      </main>
    </>
  );
}
