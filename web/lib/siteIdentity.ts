export const SITE_NAME = "Clinical Trial Failures";
export const SITE_URL = "https://clinicaltrialfailures.com";
export const CONTACT_EMAIL = "contact@clinicaltrialfailures.com";
export const ORGANIZATION_ID = `${SITE_URL}/#organization`;
export const DATABASE_SERVICE_ID = `${SITE_URL}/#database-service`;
export const DATABASE_OFFER_ID = `${SITE_URL}/#free-database-offer`;

export const ORGANIZATION_DESCRIPTION =
  "Clinical Trial Failures publishes a research-support website and ClinicalTrials.gov-derived database for reviewing terminated, suspended, and withdrawn clinical trial records.";

export const DATABASE_SERVICE_DESCRIPTION =
  "A searchable research database that organizes stopped ClinicalTrials.gov records by registered stop-reason language and separates likely biological failure signals from non-biological causes and unresolved records.";

export const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "@id": ORGANIZATION_ID,
  name: SITE_NAME,
  url: SITE_URL,
  logo: {
    "@type": "ImageObject",
    url: `${SITE_URL}/icon-512.png`,
    width: 512,
    height: 512,
  },
  email: CONTACT_EMAIL,
  description: ORGANIZATION_DESCRIPTION,
  contactPoint: {
    "@type": "ContactPoint",
    contactType: "Data corrections and website support",
    email: CONTACT_EMAIL,
    url: `${SITE_URL}/contact`,
    availableLanguage: "English",
  },
  makesOffer: {
    "@id": DATABASE_OFFER_ID,
  },
  publishingPrinciples: `${SITE_URL}/methods`,
};

export const databaseServiceJsonLd = {
  "@context": "https://schema.org",
  "@type": "Service",
  "@id": DATABASE_SERVICE_ID,
  name: "Clinical Trial Failures database",
  alternateName: "Clinical Trial Failures V2",
  serviceType: "Clinical trial registry research database",
  url: `${SITE_URL}/explore`,
  description: DATABASE_SERVICE_DESCRIPTION,
  provider: {
    "@id": ORGANIZATION_ID,
  },
  audience: {
    "@type": "Audience",
    audienceType: "Researchers and analysts reviewing stopped clinical trial records",
  },
  availableChannel: {
    "@type": "ServiceChannel",
    serviceUrl: `${SITE_URL}/explore`,
  },
  offers: {
    "@type": "Offer",
    "@id": DATABASE_OFFER_ID,
    name: "Free access to the Clinical Trial Failures database",
    url: `${SITE_URL}/explore`,
    price: "0",
    priceCurrency: "EUR",
    availability: "https://schema.org/OnlineOnly",
  },
  termsOfService: `${SITE_URL}/disclaimer`,
};
