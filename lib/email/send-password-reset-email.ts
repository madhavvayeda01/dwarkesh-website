type PasswordResetLink = {
  label: string;
  url: string;
};

type PasswordResetEmailInput = {
  to: string;
  links: PasswordResetLink[];
  expiresInMinutes: number;
};

export async function sendPasswordResetEmail(input: PasswordResetEmailInput) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;

  if (!apiKey || !from) {
    return {
      ok: false,
      skipped: true,
      error: "Email provider is not configured.",
    };
  }

  const text = [
    "Password reset requested",
    "",
    `This link expires in ${input.expiresInMinutes} minutes.`,
    "",
    ...input.links.map((link) => `${link.label}: ${link.url}`),
    "",
    "If you did not request this reset, you can ignore this email.",
  ].join("\n");

  const html = `
    <div style="font-family:Arial,Helvetica,sans-serif;line-height:1.6;color:#0f172a">
      <h2 style="margin:0 0 16px">Password reset requested</h2>
      <p style="margin:0 0 16px">A password reset was requested for your account. This link expires in ${escapeHtml(
        String(input.expiresInMinutes)
      )} minutes.</p>
      <div style="display:grid;gap:12px;max-width:640px">
        ${input.links
          .map(
            (link) => `
              <div style="padding:16px;border:1px solid #cbd5e1;border-radius:16px;background:#f8fafc">
                <div style="font-weight:700;margin-bottom:8px">${escapeHtml(link.label)}</div>
                <a href="${escapeHtml(link.url)}" style="display:inline-block;padding:10px 18px;border-radius:12px;background:#1d4ed8;color:#fff;text-decoration:none;font-weight:700">
                  Reset password
                </a>
                <div style="margin-top:10px;font-size:12px;word-break:break-all;color:#475569">${escapeHtml(
                  link.url
                )}</div>
              </div>
            `
          )
          .join("")}
      </div>
      <p style="margin-top:20px;color:#475569">If you did not request this reset, you can ignore this email.</p>
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
      to: [input.to],
      subject: "Reset your Dwarkesh Consultancy password",
      text,
      html,
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

