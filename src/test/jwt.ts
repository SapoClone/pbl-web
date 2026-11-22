/** An access token with the given claims, for tests (the web only reads the payload, the signature is not checked) */
export function fakeAccessToken(claims: Record<string, unknown>): string {
  const encode = (value: unknown) =>
    btoa(unescape(encodeURIComponent(JSON.stringify(value)))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
  return `${encode({ alg: "RS256", typ: "JWT" })}.${encode(claims)}.signature`
}
