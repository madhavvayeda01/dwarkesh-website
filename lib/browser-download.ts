const ANDROID_APP_TOKEN = "DwarkeshAndroidApp";

type DownloadFieldValue = string | number | boolean;

function getHiddenFrame() {
  const iframe = document.createElement("iframe");
  iframe.name = `dwarkesh-download-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  iframe.style.display = "none";
  iframe.setAttribute("aria-hidden", "true");
  document.body.appendChild(iframe);
  window.setTimeout(() => iframe.remove(), 60_000);
  return iframe;
}

function attachJsonErrorListener(iframe: HTMLIFrameElement, onError?: (message: string) => void) {
  if (!onError) return;

  iframe.addEventListener(
    "load",
    () => {
      try {
        const bodyText = iframe.contentDocument?.body?.textContent?.trim();
        const contentType = iframe.contentDocument?.contentType || "";
        if (!bodyText) return;
        if (!contentType.includes("application/json") && !bodyText.startsWith("{")) return;

        const payload = JSON.parse(bodyText) as { message?: string };
        onError(payload.message || "Download failed.");
      } catch {
        // Ignore non-JSON download responses.
      }
    },
    { once: true }
  );
}

export function isAndroidAppWebView() {
  return typeof navigator !== "undefined" && navigator.userAgent.includes(ANDROID_APP_TOKEN);
}

export function inferFileName(
  disposition: string | null | undefined,
  fallbackFileName: string
) {
  const match = disposition?.match(/filename\*?=(?:UTF-8''|\"?)([^\";]+)/i);
  if (!match?.[1]) return fallbackFileName;
  return decodeURIComponent(match[1].replace(/"/g, "").trim());
}

export function downloadBlobFile(blob: Blob, fileName: string) {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

export async function downloadResponseBlob(response: Response, fallbackFileName: string) {
  const blob = await response.blob();
  const fileName = inferFileName(response.headers.get("Content-Disposition"), fallbackFileName);
  downloadBlobFile(blob, fileName);
  return fileName;
}

export function startAndroidGetDownload(url: string, onError?: (message: string) => void) {
  const iframe = getHiddenFrame();
  attachJsonErrorListener(iframe, onError);
  iframe.src = url;
}

export function startAndroidPostDownload(
  url: string,
  fields: Record<string, DownloadFieldValue>,
  onError?: (message: string) => void
) {
  const iframe = getHiddenFrame();
  attachJsonErrorListener(iframe, onError);

  const form = document.createElement("form");
  form.method = "POST";
  form.action = url;
  form.target = iframe.name;
  form.style.display = "none";

  Object.entries(fields).forEach(([key, value]) => {
    const input = document.createElement("input");
    input.type = "hidden";
    input.name = key;
    input.value = String(value);
    form.appendChild(input);
  });

  document.body.appendChild(form);
  form.submit();
  form.remove();
}
