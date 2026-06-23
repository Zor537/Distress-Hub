/**
 * Outbound lead notifications.
 *
 * Today this sends a "new Express Interest" email via Resend's REST API. We call
 * the HTTP endpoint with a single `fetch` rather than pulling in the `resend`
 * SDK — same env-gated philosophy as the Anthropic call in lib/insights.ts, and
 * one less dependency to ship to the serverless bundle.
 *
 * Design contract: this module is *side-effect safe*. It is fully env-gated and
 * NEVER throws. A failed (or unconfigured) notification must not break the
 * lead-capture API response — the InvestorInterest row is already persisted by
 * the time we get here, so the worst case is a logged warning and a missed ping.
 *
 * To go live, set in .env.local + Vercel env:
 *   RESEND_API_KEY    — re_... from https://resend.com/api-keys
 *   LEAD_NOTIFY_EMAIL — inbox that should receive new-lead alerts
 * Optional:
 *   RESEND_FROM       — verified sender, e.g. "DistressHub <alerts@distresshub.in>".
 *                       Defaults to "DistressHub <onboarding@resend.dev>", which
 *                       Resend only delivers to your own account email — set a
 *                       verified-domain sender for real delivery to LEAD_NOTIFY_EMAIL.
 */
import { formatINR } from "@/lib/utils";

const RESEND_ENDPOINT = "https://api.resend.com/emails";
const DEFAULT_FROM = "DistressHub <onboarding@resend.dev>";

export type NewInterestPayload = {
  investor: {
    name: string;
    email: string;
    phone?: string | null;
    type: string;
    ticketSize?: number | null;
  };
  property: { id: string; title: string; city: string; state: string };
  message?: string | null;
  dealUrl?: string | null;
};

/**
 * Email the configured inbox about a fresh Express Interest submission.
 * Resolves silently (no-op) when RESEND_API_KEY / LEAD_NOTIFY_EMAIL are unset.
 */
export async function notifyNewInterest(payload: NewInterestPayload): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.LEAD_NOTIFY_EMAIL;

  if (!apiKey || !to) {
    console.warn(
      "[notify] RESEND_API_KEY or LEAD_NOTIFY_EMAIL not set — skipping new-lead email (lead is still saved to DB)."
    );
    return;
  }

  const from = process.env.RESEND_FROM || DEFAULT_FROM;

  try {
    const res = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: {
        authorization: `Bearer ${apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [to],
        // Reply goes straight to the investor from the alert inbox.
        reply_to: payload.investor.email,
        subject: buildSubject(payload),
        html: buildHtml(payload),
        text: buildText(payload),
      }),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.warn(`[notify] Resend responded ${res.status}: ${detail.slice(0, 300)}`);
    }
  } catch (err) {
    console.warn("[notify] lead email failed to send:", err);
  }
}

function buildSubject(p: NewInterestPayload): string {
  return `New lead: ${p.investor.name} → ${p.property.title} (${p.property.city})`;
}

const fieldRows = (p: NewInterestPayload): Array<[string, string]> => {
  const rows: Array<[string, string]> = [
    ["Name", p.investor.name],
    ["Email", p.investor.email],
  ];
  if (p.investor.phone) rows.push(["Phone", p.investor.phone]);
  rows.push(["Investor type", p.investor.type.replace(/_/g, " ")]);
  if (p.investor.ticketSize != null) rows.push(["Ticket size", formatINR(p.investor.ticketSize)]);
  rows.push(["Property", `${p.property.title} — ${p.property.city}, ${p.property.state}`]);
  if (p.dealUrl) rows.push(["Deal page", p.dealUrl]);
  if (p.message) rows.push(["Message", p.message]);
  return rows;
};

function buildText(p: NewInterestPayload): string {
  const lines = fieldRows(p).map(([k, v]) => `${k}: ${v}`);
  return [`New Express Interest submission on DistressHub`, "", ...lines].join("\n");
}

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildHtml(p: NewInterestPayload): string {
  const rows = fieldRows(p)
    .map(([label, value]) => {
      const isLink = label === "Deal page";
      const cell = isLink
        ? `<a href="${esc(value)}" style="color:#c9a961;text-decoration:none;">${esc(value)}</a>`
        : esc(value);
      return `<tr>
        <td style="padding:8px 14px;border-bottom:1px solid #2a2a2a;color:#9a9a9a;font-size:13px;white-space:nowrap;vertical-align:top;">${esc(label)}</td>
        <td style="padding:8px 14px;border-bottom:1px solid #2a2a2a;color:#f7f4ed;font-size:14px;">${cell}</td>
      </tr>`;
    })
    .join("");

  return `<!doctype html>
<html>
  <body style="margin:0;background:#0f0f0f;padding:24px;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:#161616;border:1px solid #2a2a2a;border-radius:10px;overflow:hidden;">
      <tr>
        <td style="padding:20px 22px;border-bottom:1px solid #2a2a2a;">
          <p style="margin:0;color:#c9a961;font-size:11px;letter-spacing:0.18em;text-transform:uppercase;">DistressHub</p>
          <h1 style="margin:6px 0 0;color:#f7f4ed;font-size:18px;font-weight:600;">New Express Interest</h1>
        </td>
      </tr>
      <tr>
        <td style="padding:8px 8px 14px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows}</table>
        </td>
      </tr>
      <tr>
        <td style="padding:14px 22px;border-top:1px solid #2a2a2a;">
          <p style="margin:0;color:#6a6a6a;font-size:12px;">Reply to this email to reach ${esc(p.investor.name)} directly.</p>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}
