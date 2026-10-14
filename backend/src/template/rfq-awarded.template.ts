import { MailMessage } from '../types/common.types';
import { RfqAwardedTemplateData } from '../types/mail.types';
import { escapeHtml, formatMinor, renderLayout } from './layout.template';

/** Sent to the winning vendor. */
export function rfqAwardedTemplate(data: RfqAwardedTemplateData): MailMessage {
  const total = formatMinor(data.totalMinor, data.currency);
  const subject = `You won "${data.rfqTitle}"`;
  return {
    subject,
    html: renderLayout({
      title: 'Your quote was accepted',
      preheader: `The buyer accepted your quote of ${total}.`,
      bodyHtml: `<p style="margin:0">Hi ${escapeHtml(data.vendorName)}, the buyer accepted your quote of <strong>${escapeHtml(total)}</strong> for <strong>${escapeHtml(data.rfqTitle)}</strong>.</p>`,
      cta: { label: 'View RFQ', url: data.rfqUrl },
    }),
    text: `${subject}\n\nThe buyer accepted your quote of ${total}.\n\n${data.rfqUrl}`,
  };
}
