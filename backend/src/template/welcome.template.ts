import { MailMessage } from '../types/common.types';
import { UserRole } from '../types/enums';
import { WelcomeTemplateData } from '../types/mail.types';
import { escapeHtml, renderLayout } from './layout.template';

export function welcomeTemplate({ name, role, loginUrl }: WelcomeTemplateData): MailMessage {
  const next =
    role === UserRole.BUYER
      ? 'Create your first RFQ, publish it, and compare the quotes that come in.'
      : 'Browse open RFQs and submit your first quote before the deadline.';

  return {
    subject: 'Welcome to Bidveda',
    html: renderLayout({
      title: `Welcome, ${name}`,
      preheader: next,
      bodyHtml: `<p style="margin:0">Your ${role.toLowerCase()} account is ready. ${escapeHtml(next)}</p>`,
      cta: { label: 'Open Bidveda', url: loginUrl },
    }),
    text: `Welcome, ${name}.\n\nYour ${role.toLowerCase()} account is ready. ${next}\n\n${loginUrl}`,
  };
}
