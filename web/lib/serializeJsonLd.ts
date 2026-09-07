/** Serialize JSON-LD for a script element without allowing HTML tag boundaries. */
export function serializeJsonLd(value: unknown): string {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}
