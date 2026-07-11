export async function sendVerificationEmail(
  email: string,
  username: string,
  verificationUrl: string,
  fromName: string,
  fromEmail: string,
  apiKey?: string
): Promise<void> {
  if (apiKey) {
    await sendViaApi(email, verificationUrl, fromName, fromEmail, apiKey);
    return;
  }
  console.log(`[email] Verification email for ${username} <${email}>: ${verificationUrl}`);
}

async function sendViaApi(
  to: string,
  verificationUrl: string,
  fromName: string,
  fromEmail: string,
  apiKey: string
): Promise<void> {
  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:sans-serif;padding:32px;background:#f5f5f5">
<div style="max-width:480px;margin:0 auto;background:white;border-radius:12px;padding:32px">
<div style="text-align:center;margin-bottom:24px">
<div style="width:48px;height:48px;border-radius:12px;background:#2563eb;color:white;font-weight:bold;font-size:24px;display:inline-flex;align-items:center;justify-content:center">F</div>
</div>
<h2 style="text-align:center;color:#111">Verify your email</h2>
<p style="color:#666;line-height:1.6">
  Thanks for signing up for FediShort! Click the button below to verify your email address and activate your account.
</p>
<div style="text-align:center;margin:32px 0">
<a href="${escapeHtml(verificationUrl)}" style="display:inline-block;padding:14px 32px;background:#2563eb;color:white;text-decoration:none;border-radius:8px;font-weight:600;font-size:15px">Verify email</a>
</div>
<p style="color:#999;font-size:12px;text-align:center">
  If you didn't sign up for FediShort, you can ignore this email.<br>
  This link expires in 24 hours.
</p>
</div>
</body>
</html>`;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: `${fromName} <${fromEmail}>`,
      to: [to],
      subject: "Verify your FediShort account",
      html,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    console.error(`[email] Failed to send: ${res.status} ${body}`);
  }
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
