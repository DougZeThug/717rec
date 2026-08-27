/**
 * Shared admin-email sending. Both contact channels notify the league the same
 * way, so the Resend call lives here rather than being copied per function.
 *
 * `sendAdminEmail` never throws: a message that is already stored durably must
 * not be reported as a failure just because the notification did not go out.
 * Callers decide what a false return means for their response.
 */

/** Where every league notification goes. */
export const ADMIN_EMAIL = 'admin@717rec.com';

/** The verified Resend sending address for this project. */
export const FROM_ADDRESS = 'noreply@717rec.com';

/** Default display name on the From header. Callers may pass their own. */
const DEFAULT_FROM = `717REC <${FROM_ADDRESS}>`;

export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Remove ASCII control characters (including CR/LF and NUL) from a string.
 * Defense-in-depth against header/subject injection: names flow into the email
 * Subject line, where a raw newline could otherwise split headers.
 */
export function stripControlChars(str: string): string {
  // Drop ASCII control chars (0x00–0x1F and 0x7F). Built with a char-code
  // filter rather than a control-char regex literal so both deno lint and
  // eslint (no-control-regex) stay happy without inline disables.
  let out = '';
  for (const ch of str) {
    const code = ch.charCodeAt(0);
    if (code > 0x1f && code !== 0x7f) out += ch;
  }
  return out;
}

export interface AdminEmailInput {
  /** Already stripped of control chars by the caller if it embeds user text. */
  subject: string;
  html: string;
  replyTo?: string;
  /** Full From header. Defaults to `717REC <noreply@717rec.com>`. */
  from?: string;
  /** Log prefix, e.g. "[Support]" or "[ContactRequest]". */
  logLabel: string;
}

/**
 * Send one notification to the league admin address.
 * Returns false — never throws — when the key is missing, the API refuses, or
 * the network fails.
 */
export async function sendAdminEmail({
  subject,
  html,
  replyTo,
  from = DEFAULT_FROM,
  logLabel,
}: AdminEmailInput): Promise<boolean> {
  const apiKey = Deno.env.get('RESEND_API_KEY');
  if (!apiKey) {
    console.log(`${logLabel} No Resend API key — email not sent`);
    return false;
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from,
        to: [ADMIN_EMAIL],
        ...(replyTo ? { reply_to: replyTo } : {}),
        subject,
        html,
      }),
    });

    if (response.ok) {
      const data = (await response.json()) as { id?: string };
      console.log(`${logLabel} Email sent successfully:`, data.id);
      return true;
    }

    const errorText = await response.text();
    console.error(`${logLabel} Resend API error:`, errorText);
    return false;
  } catch (err) {
    // A network-level failure (fetch rejects, body parse throws) must NOT bubble
    // up: the caller has usually already stored the message durably, and a 500
    // here would make the client retry and duplicate it.
    console.error(`${logLabel} Resend request failed:`, err instanceof Error ? err.message : err);
    return false;
  }
}
