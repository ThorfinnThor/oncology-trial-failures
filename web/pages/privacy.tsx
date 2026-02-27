import Head from "next/head";
import Link from "next/link";

export default function PrivacyPage() {
  return (
    <>
      <Head>
        <title>Privacy | Clinical Trial Failures</title>
        <meta
          name="description"
          content="Short privacy policy for Clinical Trial Failures, including cookies, analytics, and data handling."
        />
        <meta name="robots" content="index,follow" />
      </Head>

      <main className="privacy-page">
        <div className="privacy-shell">
          <header className="privacy-header">
            <Link href="/" className="back-link">← Home</Link>
            <h1>Privacy</h1>
            <p>
              Clinical Trial Failures is an informational website. You can browse the site without
              creating an account or submitting personal information.
            </p>
          </header>

          <section>
            <h2>What we collect</h2>
            <p>
              We may use essential site cookies and basic privacy-friendly analytics to understand
              page usage, improve performance, and maintain the service.
            </p>
          </section>

          <section>
            <h2>What we do not require</h2>
            <p>
              We do not require sign-up, and we do not ask for names, addresses, or other direct
              personal details to use the core web app.
            </p>
          </section>

          <section>
            <h2>Third-party services</h2>
            <p>
              If analytics or infrastructure providers are used, they may process limited technical
              data such as IP address, browser type, or page path to operate the service.
            </p>
          </section>

          <section>
            <h2>Updates</h2>
            <p>
              This policy may be updated as the site changes. Continued use of the site means you accept
              the current version published here.
            </p>
          </section>
        </div>
      </main>

      <style jsx>{`
        .privacy-page {
          min-height: 100vh;
          background: #f8fafc;
          color: #0f172a;
          padding: 32px 16px;
        }
        .privacy-shell {
          max-width: 760px;
          margin: 0 auto;
          background: #fff;
          border: 1px solid #e2e8f0;
          border-radius: 16px;
          padding: 24px;
          box-shadow: 0 10px 30px rgba(15, 23, 42, 0.05);
        }
        .privacy-header {
          margin-bottom: 18px;
        }
        .back-link {
          display: inline-block;
          margin-bottom: 10px;
          text-decoration: none;
        }
        h1 { margin: 0 0 10px; }
        h2 { margin: 20px 0 8px; font-size: 1.1rem; }
        p { margin: 0; line-height: 1.7; color: #334155; }
      `}</style>
    </>
  );
}
