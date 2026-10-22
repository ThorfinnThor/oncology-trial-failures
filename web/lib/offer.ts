// web/lib/offer.ts
//
// What the diligence report costs, said in one place so every page says the same thing.
//
// During the beta the report is free, in exchange for a work email. The pages that show the price
// are static, built before the Worker's Stripe variables are readable, so this cannot follow
// isConfigured() at render time. Switching payment on is therefore two changes made together:
// set STRIPE_LINK_PACKAGE on the Worker, and set REPORT_BETA to false here. The order route does
// not read this flag — whenever the Payment Link is set it sends the buyer to Stripe — so the
// flag only decides what the pages say, never whether anybody is charged.

export const REPORT_BETA = true;

export const PACKAGE_LIST_PRICE = "€99";

/** The price as a label: on a card, a button, a badge. */
export const PACKAGE_PRICE = REPORT_BETA ? "Free during the beta" : PACKAGE_LIST_PRICE;

/** The same, mid-sentence. */
export const PACKAGE_PRICE_INLINE = REPORT_BETA ? "free during the beta" : PACKAGE_LIST_PRICE;

export const BUY_LABEL = REPORT_BETA ? "Get the report" : `Buy the report — ${PACKAGE_LIST_PRICE}`;

/** The line under the button. */
export const BUY_NOTE = REPORT_BETA
  ? "Free during the beta, in exchange for a work email. The report opens straight away."
  : "Secure checkout by Stripe. The report opens straight after payment.";

/** How a report is delivered, as a bullet. */
export const DELIVERY = REPORT_BETA
  ? "Delivered immediately, and a link that stays current for a year"
  : "One payment, delivered immediately, and a link that stays current for a year";
