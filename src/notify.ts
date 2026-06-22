/**
 * notify.ts — deliver a "someone wants to connect" message to the owner.
 *
 * This is the ONLY side effect in the whole server, and it is inbound-only: it
 * notifies YOU. It never emails third parties on your behalf (that would be a spam
 * cannon). We call the Resend HTTP API directly with fetch — no SDK dependency, and
 * you can see exactly what goes over the wire.
 *
 * Graceful degradation: if the env isn't configured (local dev, a fresh fork before
 * the owner adds keys), we DON'T throw — we log a dry run and report it. The tool
 * still "works" end to end so anyone can try the template immediately.
 */
export interface ContactPayload {
  from: string;
  message: string;
  context?: string;
}

export interface NotifyResult {
  delivered: boolean;
  detail: string;
}

export async function notifyOwner(p: ContactPayload): Promise<NotifyResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.CONTACT_TO_EMAIL;
  // Resend's onboarding@resend.dev works for testing (delivers to your own account
  // email). For production, verify a domain and set CONTACT_FROM_EMAIL.
  const from =
    process.env.CONTACT_FROM_EMAIL ?? "neuromancer-mcp <onboarding@resend.dev>";

  // Defense in depth: collapse newlines in the value that goes into the subject
  // line. We send via Resend's JSON API (not raw SMTP), so header injection isn't
  // possible regardless, but a clean single-line subject is correct anyway.
  const oneLine = (s: string) => s.replace(/[\r\n]+/g, " ").trim();
  const subject = `MCP contact from ${oneLine(p.from).slice(0, 120)}`;
  const body = [
    "Someone reached out through your MCP server.",
    "",
    `From: ${p.from}`,
    ...(p.context ? [`Context: ${p.context}`] : []),
    "",
    "Message:",
    p.message,
  ].join("\n");

  if (!apiKey || !to) {
    console.warn(
      "[notify] RESEND_API_KEY / CONTACT_TO_EMAIL not set — dry run. Would send:\n" +
        body,
    );
    return { delivered: false, detail: "logged locally (email not configured)" };
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from, to: [to], subject, text: body }),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => res.statusText);
      console.error("[notify] Resend error:", res.status, detail);
      return { delivered: false, detail: `email provider error (${res.status})` };
    }
    return { delivered: true, detail: "email sent" };
  } catch (err) {
    console.error("[notify] network error:", err);
    return { delivered: false, detail: "network error contacting email provider" };
  }
}
