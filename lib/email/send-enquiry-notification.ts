type EnquiryNotificationInput = {
  fullName: string;
  companyName: string;
  phone: string;
  email: string;
  message: string;
  createdAt: Date;
};

export async function sendEnquiryNotification(input: EnquiryNotificationInput) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  const to = process.env.LEADS_NOTIFICATION_EMAIL || "dwarkeshconsultancyahmedabad@gmail.com";

  if (!apiKey || !from) {
    return {
      ok: false,
      skipped: true,
      error: "Email provider is not configured.",
    };
  }

  const submittedAt = input.createdAt.toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  const text = [
    "New enquiry received",
    "",
    `Full Name: ${input.fullName}`,
    `Company Name: ${input.companyName}`,
    `Phone: ${input.phone}`,
    `Email: ${input.email}`,
    `Submitted At: ${submittedAt}`,
    "",
    "Requirement / Message:",
    input.message,
  ].join("\n");

  const html = `
    <div style="font-family:Arial,Helvetica,sans-serif;line-height:1.6;color:#0f172a">
      <h2 style="margin:0 0 16px">New enquiry received</h2>
      <table style="border-collapse:collapse;width:100%;max-width:720px">
        <tbody>
          <tr><td style="padding:8px 0;font-weight:700">Full Name</td><td style="padding:8px 0">${escapeHtml(input.fullName)}</td></tr>
          <tr><td style="padding:8px 0;font-weight:700">Company Name</td><td style="padding:8px 0">${escapeHtml(input.companyName)}</td></tr>
          <tr><td style="padding:8px 0;font-weight:700">Phone</td><td style="padding:8px 0">${escapeHtml(input.phone)}</td></tr>
          <tr><td style="padding:8px 0;font-weight:700">Email</td><td style="padding:8px 0">${escapeHtml(input.email)}</td></tr>
          <tr><td style="padding:8px 0;font-weight:700">Submitted At</td><td style="padding:8px 0">${escapeHtml(submittedAt)}</td></tr>
        </tbody>
      </table>
      <div style="margin-top:20px;padding:16px;border:1px solid #cbd5e1;border-radius:12px;background:#f8fafc">
        <div style="font-weight:700;margin-bottom:8px">Requirement / Message</div>
        <div style="white-space:pre-wrap">${escapeHtml(input.message)}</div>
      </div>
    </div>
  `;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject: `New enquiry from ${input.fullName} (${input.companyName})`,
      text,
      html,
      reply_to: input.email,
    }),
  });

  if (!res.ok) {
    const errorText = await res.text().catch(() => "Unknown email provider error");
    return {
      ok: false,
      skipped: false,
      error: errorText,
    };
  }

  return {
    ok: true,
    skipped: false,
  };
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
