import { Html, Head, Main, NextScript } from "next/document";

export default function Document() {
  return (
    <Html lang="en">
      <Head>
         {/* Critical for correct mobile breakpoints (iOS Safari renders desktop-width without it). */}
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      <meta
    name="google-site-verification"
    content="gyQuOWSA5PAUhcrIwJ1YcQhy44f3d4gkYn7-vPIs4UI"
       />
      </Head>

      <body className="antialiased">
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
