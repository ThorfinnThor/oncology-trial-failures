/** Public mailbox used for support, corrections, privacy requests, and commercial enquiries. */
export const CONTACT_EMAIL = "contact@clinicaltrialfailures.com";

/** Legal operator details shared by the imprint and privacy notice. */
export const SITE_OPERATOR = {
  name: "Schayan Yousefian",
  street: "Freienwalder Str. 34",
  postalCode: "13359",
  city: "Berlin",
  country: "Germany",
} as const;

export function contactMailto(subject?: string): string {
  return `mailto:${CONTACT_EMAIL}${subject ? `?subject=${encodeURIComponent(subject)}` : ""}`;
}
