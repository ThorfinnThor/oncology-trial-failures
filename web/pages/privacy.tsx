import Head from "next/head";
import Link from "next/link";

const TITLE = "Privacy Policy | Clinical Trial Failures";
const DESCRIPTION =
  "Privacy Policy for Clinical Trial Failures, including GDPR rights, analytics, cookies, public registry data, advertising, affiliate links, contact messages, and user rights.";
const SITE_URL = "https://clinicaltrialfailures.com";
const CANONICAL_URL = `${SITE_URL}/privacy`;
const OG_IMAGE = `${SITE_URL}/og-image.png`;
const CONTACT_EMAIL = "contact@clinicaltrialfailures.com";

export default function PrivacyPage() {
  return (
    <>
      <Head>
        <title>{TITLE}</title>
        <meta name="description" content={DESCRIPTION} />
        <meta name="robots" content="index,follow" />
        <link rel="canonical" href={CANONICAL_URL} />
        <meta property="og:title" content={TITLE} />
        <meta property="og:description" content={DESCRIPTION} />
        <meta property="og:url" content={CANONICAL_URL} />
        <meta property="og:image" content={OG_IMAGE} />
        <meta name="twitter:title" content={TITLE} />
        <meta name="twitter:description" content={DESCRIPTION} />
        <meta name="twitter:image" content={OG_IMAGE} />
      </Head>

      <main className="privacy-page">
        <div className="privacy-shell">
          <header className="privacy-header">
            <Link href="/" className="back-link">← Home</Link>
            <h1>Privacy Policy</h1>
            <p>
              Clinical Trial Failures is an informational website. You can browse the site without
              creating an account or submitting personal information.
            </p>
            <p className="privacy-updated">Last updated: August 4, 2026</p>
          </header>

          <section>
            <h2>Who operates this site and controller role</h2>
            <p>
              Clinical Trial Failures is operated as a research-support website at{" "}
              <Link href="/">clinicaltrialfailures.com</Link>. For privacy questions, corrections, or
              website feedback, use the <Link href="/contact">Contact page</Link> or email{" "}
              <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
            </p>
            <p>
              If you are located in the European Economic Area, the United Kingdom, or Switzerland, the
              website operator is the controller for personal data processed through this website, unless
              a third-party service states that it acts as an independent controller for its own processing.
            </p>
          </section>

          <section>
            <h2>What we collect from visitors</h2>
            <p>
              You do not need an account to use the site. We do not ask for your name, address, medical
              history, or other direct personal details to browse the database.
            </p>
            <p>
              Like most websites, the hosting provider may process limited technical data needed to
              serve the site, such as IP address, browser type, device information, requested page path,
              referring page, and timestamps.
            </p>
          </section>

          <section>
            <h2>Analytics and performance measurement</h2>
            <p>
              The site may use Vercel Web Analytics and Vercel Speed Insights to understand page views,
              performance, and basic usage patterns. These tools help us see which pages are useful,
              whether pages load quickly, and where technical problems occur.
            </p>
            <p>
              Analytics data is used in aggregate to improve the website. It is not used to provide
              medical advice, make clinical decisions, identify individual visitors, or sell visitor data.
            </p>
          </section>

          <section>
            <h2>Legal bases under the GDPR</h2>
            <p>
              Where the GDPR applies, technical processing that is strictly necessary to serve the website
              may be based on legitimate interests in operating a secure and functional informational
              website. Optional analytics, advertising cookies, personalized advertising, newsletter
              subscriptions, or similar non-essential processing should be based on consent where required
              by EU or German law.
            </p>
            <p>
              You can withdraw consent through the relevant consent controls when those features are
              available, or by changing your browser settings. Withdrawal does not affect processing that
              happened before consent was withdrawn.
            </p>
          </section>

          <section>
            <h2>Cookies and local storage</h2>
            <p>
              The site may use essential cookies or browser storage for basic functionality, such as
              remembering cookie-consent choices. If analytics are enabled, analytics providers may use
              privacy-preserving mechanisms to measure visits and performance.
            </p>
            <p>
              If advertising, affiliate tracking, embedded media, or newsletter forms are added, additional
              cookies or similar technologies may be used only where legally allowed and, where required,
              after consent.
            </p>
          </section>

          <section>
            <h2>Advertising, Google AdSense, and consent in Europe</h2>
            <p>
              The site may in the future display advertising, including Google AdSense. Personalized
              advertising for users in the EEA, the United Kingdom, and Switzerland should not be enabled
              unless the site uses a Google-certified Consent Management Platform integrated with the
              applicable IAB Transparency and Consent Framework, or another Google-supported consent
              setup that satisfies Google's publisher requirements.
            </p>
            <p>
              Google may process data such as cookie identifiers, device information, IP address, page
              URL, approximate location, ad interactions, and consent signals to deliver, measure, and
              protect ads. If advertising is enabled, users should be shown a consent choice before
              non-essential advertising cookies or personalized ad processing are used where consent is
              required.
            </p>
            <p>
              Until a compliant consent setup is in place, the conservative approach for a Germany-based
              operator is to avoid personalized advertising for EEA, UK, and Swiss visitors and to avoid
              loading non-essential ad tracking before consent.
            </p>
          </section>

          <section>
            <h2>Affiliate links</h2>
            <p>
              The site may in the future include affiliate links or referral links. If you click an
              affiliate link, the destination website or affiliate network may process information such as
              the referring page, click time, device information, and purchase or sign-up activity to
              attribute a referral. Affiliate links do not change the price for the visitor unless stated
              otherwise.
            </p>
            <p>
              If affiliate links are added, they should be clearly disclosed near the relevant content.
            </p>
          </section>

          <section>
            <h2>Public clinical trial data</h2>
            <p>
              The database is derived from public ClinicalTrials.gov registry records and related public
              fields such as trial status, sponsor, phase, disease area, condition, intervention, and
              sponsor-provided stop-reason language.
            </p>
            <p>
              The site does not collect patient-level medical records from visitors. Trial records should
              be treated as public registry information and verified against the original ClinicalTrials.gov
              source page before important use.
            </p>
          </section>

          <section>
            <h2>Contact messages</h2>
            <p>
              If you contact us by email or through a feedback link, we may receive your email address,
              message content, and any information you choose to include, such as an NCT ID, page URL,
              correction request, browser, or device details.
            </p>
            <p>
              We use contact messages only to respond, review corrections, improve the site, and maintain
              a reasonable record of the request.
            </p>
          </section>

          <section>
            <h2>What we do not sell</h2>
            <p>
              We do not sell visitor personal information. We do not use visitor information for medical
              profiling, clinical recommendations, or targeted medical advertising.
            </p>
          </section>

          <section>
            <h2>Data retention</h2>
            <p>
              Technical logs and analytics data may be retained by infrastructure and analytics providers
              according to their normal service settings. Contact messages may be retained as long as
              reasonably needed to handle the request, maintain records, or improve the service.
            </p>
          </section>

          <section>
            <h2>Your choices and rights</h2>
            <p>
              You can browse the site without contacting us. You can also use browser controls to block
              cookies, clear local storage, or limit tracking. Depending on where you live, you may have
              rights to request access, correction, deletion, or restriction of personal information you
              have provided to us.
            </p>
            <p>
              If the GDPR applies, you may also have the right to data portability, the right to object to
              processing based on legitimate interests, the right to withdraw consent, and the right to
              lodge a complaint with a supervisory authority. In Germany, this is usually the data
              protection authority for the federal state connected to the operator or your place of
              residence.
            </p>
          </section>

          <section>
            <h2>International transfers and third-party providers</h2>
            <p>
              Hosting, analytics, email, newsletter, advertising, and infrastructure providers may process
              data in countries outside the EEA. Where required, transfers should rely on appropriate
              safeguards such as adequacy decisions, standard contractual clauses, or provider-specific
              transfer mechanisms.
            </p>
          </section>

          <section>
            <h2>Security</h2>
            <p>
              We use normal website infrastructure and security practices for a public informational site.
              No website can guarantee perfect security, so do not send sensitive personal medical
              information through feedback links.
            </p>
          </section>

          <section>
            <h2>Children</h2>
            <p>
              This site is intended for professional and research use. It is not directed to children, and
              we do not knowingly collect personal information from children.
            </p>
          </section>

          <section>
            <h2>Legal note</h2>
            <p>
              This policy is intended to clearly explain the site's privacy practices, but it is not legal
              advice. Because the operator is based in Europe and because AdSense, affiliate tracking,
              and newsletter tools can trigger GDPR and German TTDSG consent duties, the policy and
              consent setup should be reviewed by a qualified privacy professional before monetization
              or personalized advertising is enabled.
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
        p + p { margin-top: 10px; }
        a { color: #3730a3; font-weight: 700; text-decoration: none; }
        a:hover { text-decoration: underline; }
        .privacy-updated {
          margin-top: 12px;
          color: #64748b;
          font-size: 0.95rem;
          font-weight: 700;
        }
      `}</style>
    </>
  );
}
