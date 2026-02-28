export async function launchPdfBrowser() {
  if (process.env.VERCEL || process.env.NODE_ENV === "production") {
    const chromiumModule = await import("@sparticuz/chromium");
    const puppeteerModule = await import("puppeteer-core");
    const chromium = chromiumModule.default;
    const puppeteer = puppeteerModule.default;

    return puppeteer.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath(),
      headless: true,
    });
  }

  const puppeteerModule = await import("puppeteer");
  const puppeteer = puppeteerModule.default;

  return puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
}
