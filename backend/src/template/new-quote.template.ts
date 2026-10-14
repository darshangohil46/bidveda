import { MailMessage } from '../types/common.types';
import { NewQuoteTemplateData } from '../types/mail.types';
import { escapeHtml, formatMinor, renderLayout } from './layout.template';

/** Sent to the buyer when a vendor submits or revises a quote. */
export function newQuoteTemplate(data: NewQuoteTemplateData): MailMessage {
  const verb = data.isRevision ? 'revised their quote' : 'submitted a quote';
  const total = formatMinor(data.totalMinor, data.currency);
  const subject = `${data.vendorCompany} ${verb} on "${data.rfqTitle}"`;

  return {
    subject,
    html: renderLayout({
      title: data.isRevision ? 'A quote was revised' : 'New quote received',
      preheader: `${data.vendorCompany}: ${total}, ${data.deliveryDays} days`,
      bodyHtml: `<p style="margin:0 0 12px"><strong>${escapeHtml(data.vendorCompany)}</strong> ${verb} on <strong>${escapeHtml(data.rfqTitle)}</strong>.</p>
        <p style="margin:0">Total: <strong>${escapeHtml(total)}</strong><br/>Delivery: <strong>${data.deliveryDays} days</strong></p>`,
      cta: { label: 'Compare quotes', url: data.compareUrl },
    }),
    text: `${subject}\n\nTotal: ${total}\nDelivery: ${data.deliveryDays} days\n\n${data.compareUrl}`,
  };
}
