export function getAppBaseUrl(request?: Request) {
  const configured =
    process.env.APP_BASE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : null) ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null);

  if (configured) {
    return configured.replace(/\/+$/, "");
  }

  if (request) {
    return new URL(request.url).origin.replace(/\/+$/, "");
  }

  return "http://localhost:3000";
}

