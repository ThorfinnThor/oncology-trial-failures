import Head from "next/head";
import Link from "next/link";

const TITLE = "Disclaimer and limitations | Clinical Trial Failures";
const DESCRIPTION =
  "Important limitations, verification guidance, and liability information for the Clinical Trial Failures research database.";
const SITE_URL = "https://clinicaltrialfailures.com";
const CANONICAL_URL = `${SITE_URL}/disclaimer`;
const OG_IMAGE = `${SITE_URL}/og-image.png`;
const CONTACT_EMAIL = "contact@clinicaltrialfailures.com";

export default function DisclaimerPage() {
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

      <main className="legal-page">
        <div className="legal-shell">
          <header className="legal-header">
            <Link href="/" className="back-link">← Home</Link>
            <p className="eyebrow">IMPORTANT INFORMATION</p>
            <h1>Disclaimer and limitations</h1>
            <p>
              Clinical Trial Failures is a research-support and informational website. The database helps
              users screen public stopped-trial records, but it is not an authoritative clinical,
              regulatory, scientific, financial, or legal decision system.
            </p>
            <p className="legal-updated">Last updated: August 23, 2026</p>
          </header>

          <section className="notice">
            <h2>Verify important findings at the primary source</h2>
            <p>
              Do not rely on this website as the sole basis for a medical, scientific, regulatory,
              investment, commercial, legal, or personal decision. Important information must be checked
              against the current ClinicalTrials.gov record and, where relevant, publications, regulatory
              documents, sponsor disclosures, and qualified professional advice.
            </p>
          </section>

          <section>
            <h2>Purpose and scope</h2>
            <p>
              The website organizes public records for clinical trials reported as terminated, suspended,
              or withdrawn. It provides search tools, summaries, groupings, calculated statistics, rankings,
              and analytical classifications intended to make large volumes of registry information easier
              to explore.
            </p>
            <p>
              The presence of a study on this website does not establish that a drug, device, biological
              hypothesis, sponsor, investigator, or development program has failed. Trials stop for many
              reasons, including recruitment, funding, operations, strategy, regulation, safety, efficacy,
              futility, or incomplete and ambiguous circumstances.
            </p>
          </section>

          <section>
            <h2>No guarantee of accuracy, completeness, or timeliness</h2>
            <p>
              Clinical trial registry records are submitted and maintained by third parties, including
              sponsors and investigators. They can be incomplete, delayed, inconsistent, amended, or
              incorrect. Data can also change after it has been ingested into this website.
            </p>
            <p>
              Although reasonable efforts are made to process and present the information carefully, no
              representation, warranty, or guarantee is made that any record, category, calculation,
              summary, ranking, date, link, or other result is accurate, complete, current, error-free, or
              suitable for a particular purpose. A missing record does not prove that no relevant trial
              exists.
            </p>
          </section>

          <section>
            <h2>Analytical classifications are screening signals</h2>
            <p>
              Stop-reason categories and labels may be produced through rules, text matching, normalization,
              automated processing, manual review, or combinations of these methods. These outputs involve
              interpretation and can be wrong. Confidence labels describe the operation of the classification
              process; they are not guarantees that a conclusion is correct.
            </p>
            <p>
              Categories such as efficacy/futility, safety, operational, enrollment, funding, regulatory,
              or other/unknown are analytical conveniences. They do not establish causation, clinical
              significance, statistical significance, treatment effectiveness, patient prognosis, sponsor
              conduct, or regulatory status beyond what the underlying sources actually state.
            </p>
          </section>

          <section>
            <h2>Calculated results and comparisons</h2>
            <p>
              Counts, percentages, rankings, outlier scores, comparisons, trends, and other derived results
              depend on the available dataset, inclusion rules, normalization choices, classifications,
              filters, time window, and calculation method. Small samples, duplicate concepts, changing
              registry records, missing fields, and differences in reporting behavior can materially affect
              a result.
            </p>
            <p>
              Comparisons between sponsors, disease areas, phases, interventions, or other groups should not
              be interpreted as proof of relative quality, competence, safety, misconduct, or development
              performance without a separate and appropriately controlled analysis.
            </p>
          </section>

          <section>
            <h2>Not medical or professional advice</h2>
            <p>
              Nothing on this website constitutes medical advice, diagnosis, treatment guidance, patient
              eligibility guidance, or a recommendation to start, stop, or change care. It is also not
              scientific, regulatory, legal, investment, trading, insurance, or other professional advice.
              Consult appropriately qualified professionals and official sources for decisions in those
              areas.
            </p>
            <p>
              In an emergency or for an urgent health concern, contact local emergency services or a
              qualified healthcare professional. Do not submit confidential patient information through the
              website's feedback channels.
            </p>
          </section>

          <section>
            <h2>External sources and links</h2>
            <p>
              Links to ClinicalTrials.gov, PubMed, regulators, sponsors, or other third-party websites are
              provided for convenience and verification. Those services are outside our control. A link does
              not imply endorsement, and we are not responsible for the availability, security, accuracy, or
              content of an external service.
            </p>
          </section>

          <section>
            <h2>Availability and technical operation</h2>
            <p>
              The website and its data may be changed, corrected, interrupted, restricted, or discontinued
              without notice. No guarantee is made that the site will always be available, secure, free from
              defects, or compatible with every device or workflow. Users should preserve the source records
              and dataset version needed to reproduce important work.
            </p>
          </section>

          <section>
            <h2>User responsibility</h2>
            <p>
              You are responsible for assessing whether information from this website is appropriate for
              your intended use, checking relevant source material, documenting the dataset version and
              filters used, and obtaining professional review where the consequences of an error could be
              material. Corrections and suspected classification errors can be reported through the{" "}
              <Link href="/contact">Contact page</Link> or by email at{" "}
              <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
            </p>
          </section>

          <section>
            <h2>Limitation of liability</h2>
            <p>
              To the fullest extent permitted by applicable law, liability for losses arising solely from
              reliance on freely provided informational content, analytical labels, calculated results,
              technical availability, or external links is excluded or limited. This limitation does not
              apply where liability cannot lawfully be excluded or limited.
            </p>
            <p>
              In particular, nothing on this page excludes or limits liability for intentional misconduct,
              gross negligence, injury to life, body, or health, liability under mandatory product-liability
              rules, an expressly assumed guarantee, or any other liability that applicable law requires to
              remain unlimited. Where liability for ordinary negligence may lawfully be limited, liability
              remains for a breach of an essential obligation and is limited to the foreseeable damage
              typical for that kind of obligation.
            </p>
            <p>
              This wording is intended to describe the website's limitations transparently, not to remove
              statutory rights or reverse any burden of proof imposed by law.
            </p>
          </section>

          <section>
            <h2>Relationship to other policies</h2>
            <p>
              This page addresses informational and liability limitations. Personal-data processing is
              explained separately in the <Link href="/privacy">Privacy Policy</Link>. The{" "}
              <Link href="/methods">Data and methods page</Link> describes the source data, analytical
              categories, calculations, and known methodological limitations.
            </p>
          </section>

          <section>
            <h2>Changes to this disclaimer</h2>
            <p>
              This disclaimer may be updated when the data, functionality, legal context, or operating model
              changes. The date above identifies the current published version.
            </p>
          </section>
        </div>
      </main>

      <style jsx>{`
        .legal-page {
          min-height: 100vh;
          background: #f8fafc;
          color: #0f172a;
          padding: 32px 16px;
        }
        .legal-shell {
          max-width: 800px;
          margin: 0 auto;
          background: #fff;
          border: 1px solid #e2e8f0;
          border-radius: 16px;
          padding: 24px;
          box-shadow: 0 10px 30px rgba(15, 23, 42, 0.05);
        }
        .legal-header {
          margin-bottom: 20px;
        }
        .back-link {
          display: inline-block;
          margin-bottom: 14px;
          text-decoration: none;
        }
        .eyebrow {
          margin-bottom: 8px;
          color: #475569;
          font-size: 0.78rem;
          font-weight: 800;
          letter-spacing: 0;
        }
        h1 {
          margin: 0 0 10px;
          font-size: clamp(2rem, 5vw, 3rem);
          line-height: 1.05;
        }
        h2 {
          margin: 24px 0 8px;
          font-size: 1.12rem;
        }
        p {
          margin: 0;
          color: #334155;
          line-height: 1.7;
        }
        p + p {
          margin-top: 10px;
        }
        a {
          color: #3730a3;
          font-weight: 700;
          text-decoration: none;
        }
        a:hover {
          text-decoration: underline;
        }
        .legal-updated {
          margin-top: 12px;
          color: #64748b;
          font-size: 0.95rem;
          font-weight: 700;
        }
        .notice {
          margin: 20px 0 24px;
          padding: 18px;
          border: 1px solid #bfdbfe;
          border-left: 4px solid #2563eb;
          border-radius: 8px;
          background: #eff6ff;
        }
        .notice h2 {
          margin-top: 0;
        }
        @media (max-width: 600px) {
          .legal-page {
            padding: 16px 10px;
          }
          .legal-shell {
            padding: 20px 16px;
            border-radius: 12px;
          }
        }
      `}</style>
    </>
  );
}
