import Head from "next/head";
import Link from "next/link";

export default function NotFoundPage() {
  return (
    <>
      <Head>
        <title>Page not found | Clinical Trial Failures</title>
        <meta
          name="description"
          content="The requested Clinical Trial Failures page could not be found."
        />
        <meta name="robots" content="noindex,follow" />
      </Head>

      <main className="notFoundPage">
        <section className="notFoundCard">
          <p className="eyebrow">404</p>
          <h1>Page not found</h1>
          <p>
            This page does not exist or may have moved. Start from the clinical trial explorer or return to the
            homepage.
          </p>
          <div className="notFoundActions">
            <Link href="/explore" className="btn-primary">
              Explore trials
            </Link>
            <Link href="/" className="btn">
              Home
            </Link>
          </div>
        </section>
      </main>

      <style jsx>{`
        .notFoundPage {
          min-height: 100vh;
          min-height: 100dvh;
          display: grid;
          place-items: center;
          padding: 24px;
          background: #f8fafc;
        }
        .notFoundCard {
          width: min(640px, 100%);
          padding: 28px;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          background: #ffffff;
          box-shadow: 0 18px 50px rgba(15, 23, 42, 0.08);
        }
        .eyebrow {
          margin: 0 0 8px;
          color: #475569;
          font-size: 0.78rem;
          font-weight: 800;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }
        h1 {
          margin: 0;
          color: #0f172a;
          font-size: clamp(2rem, 7vw, 3rem);
          line-height: 1.08;
        }
        p {
          margin: 14px 0 0;
          color: #334155;
          line-height: 1.65;
        }
        .notFoundActions {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          margin-top: 22px;
        }
        @media (max-width: 520px) {
          .notFoundPage {
            padding: 16px;
          }
          .notFoundCard {
            padding: 18px;
          }
          .notFoundActions {
            display: grid;
          }
        }
      `}</style>
    </>
  );
}
