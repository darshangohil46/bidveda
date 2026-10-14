import { MailMessage } from '../types/common.types';
import { QuoteRejectedTemplateData } from '../types/mail.types';
import { escapeHtml, renderLayout } from './layout.template';

/** Sent to every vendor whose quote was not chosen. Deliberately does not reveal the winner. */
export function quoteRejectedTemplate(data: QuoteRejectedTemplateData): MailMessage {
  const subject = `Update on "${data.rfqTitle}"`;
  return {
    subject,
    html: renderLayout({
      title: 'The RFQ was awarded',
      preheader: 'The buyer chose another vendor.',
      bodyHtml: `<p style="margin:0">Hi ${escapeHtml(data.vendorName)}, thank you for quoting on <strong>${escapeHtml(data.rfqTitle)}</strong>. The buyer has awarded it to another vendor this time.</p>`,
      cta: { label: 'View RFQ', url: data.rfqUrl },
    }),
    text: `${subject}\n\nThe buyer has awarded this RFQ to another vendor.\n\n${data.rfqUrl}`,
  };
}
