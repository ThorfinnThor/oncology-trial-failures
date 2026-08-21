const decodeJwtPayload = (token) => {
  try {
    const part = String(token || '').split('.')[1];
    if (!part) return null;
    return JSON.parse(Buffer.from(part, 'base64url').toString('utf8'));
  } catch {
    return null;
  }
};

console.log(
  `AUDIT_CONNECT_META\t${JSON.stringify({
    useApiConnectors: process.env.VERCEL_USE_API_CONNECTORS || null,
    oidcClaims: decodeJwtPayload(process.env.VERCEL_OIDC_TOKEN),
    path: process.env.PATH || null,
  })}`,
);
