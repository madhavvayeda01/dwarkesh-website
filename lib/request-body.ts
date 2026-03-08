export async function readJsonOrFormData(req: Request): Promise<Record<string, FormDataEntryValue | unknown>> {
  const contentType = req.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    return (await req.json().catch(() => ({}))) as Record<string, unknown>;
  }

  if (
    contentType.includes("application/x-www-form-urlencoded") ||
    contentType.includes("multipart/form-data")
  ) {
    const formData = await req.formData();
    return Object.fromEntries(formData.entries());
  }

  return {};
}
