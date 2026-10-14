import { LayoutOptions } from '../types/mail.types';

/** Shared HTML shell for every email. Plain tables + inline styles so mail clients render it. */

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function formatMinor(minor: number, currency: string): string {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency }).format(minor / 100);
}

export function renderLayout({ title, preheader, bodyHtml, cta }: LayoutOptions): string {
  const button = cta
    ? `<p style="margin:24px 0 0"><a href="${escapeHtml(cta.url)}" style="background:#1F5A46;color:#ffffff;text-decoration:none;padding:10px 18px;border-radius:4px;font-size:14px;display:inline-block">${escapeHtml(cta.label)}</a></p>`
    : '';

  return `<!doctype html>
<html lang="en">
  <body style="margin:0;background:#FBFAF7;font-family:Helvetica,Arial,sans-serif;color:#1C1B18">
    <span style="display:none;max-height:0;overflow:hidden">${escapeHtml(preheader)}</span>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:32px 16px">
      <tr>
        <td align="center">
          <table role="presentation" width="560" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border:1px solid #E6E2D9;border-radius:4px">
            <tr>
              <td style="padding:24px 32px;border-bottom:1px solid #E6E2D9;font-family:Georgia,serif;font-size:20px">Bidveda</td>
            </tr>
            <tr>
              <td style="padding:32px;font-size:15px;line-height:24px">
                <h1 style="margin:0 0 16px;font-family:Georgia,serif;font-size:24px;line-height:30px;font-weight:normal">${escapeHtml(title)}</h1>
                ${bodyHtml}
                ${button}
              </td>
            </tr>
            <tr>
              <td style="padding:16px 32px;border-top:1px solid #E6E2D9;font-size:12px;color:#8A867B">
                You are receiving this because of activity on your Bidveda account.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}
