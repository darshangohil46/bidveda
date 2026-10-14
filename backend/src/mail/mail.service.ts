import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createTransport, Transporter } from 'nodemailer';
import {
  newQuoteTemplate,
  quoteRejectedTemplate,
  rfqAwardedTemplate,
  welcomeTemplate,
} from '../template';
import { MailMessage } from '../types/common.types';
import { EnvVars } from '../types/env.types';
import {
  NewQuoteTemplateData,
  QuoteRejectedTemplateData,
  RfqAwardedTemplateData,
  WelcomeTemplateData,
} from '../types/mail.types';

/**
 * Sends transactional email. Mail is a side effect, never a dependency: failures
 * are logged and swallowed so they cannot break a quote submission or an award.
 * With no SMTP_HOST configured the message is only logged.
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transporter: Transporter | null;
  private readonly from: string;

  constructor(private readonly config: ConfigService<EnvVars, true>) {
    const host = config.get('SMTP_HOST', { infer: true });
    this.from = config.get('MAIL_FROM', { infer: true });
    this.transporter = host
      ? createTransport({
          host,
          port: config.get('SMTP_PORT', { infer: true }),
          secure: config.get('SMTP_SECURE', { infer: true }),
          auth: config.get('SMTP_USER', { infer: true })
            ? {
                user: config.get('SMTP_USER', { infer: true }),
                pass: config.get('SMTP_PASS', { infer: true }),
              }
            : undefined,
        })
      : null;
  }

  private get appUrl(): string {
    return this.config.get('FRONTEND_URL', { infer: true }).replace(/\/$/, '');
  }

  url(path: string): string {
    return `${this.appUrl}${path}`;
  }

  sendWelcome(to: string, data: Omit<WelcomeTemplateData, 'loginUrl'>): void {
    void this.deliver(to, welcomeTemplate({ ...data, loginUrl: this.url('/rfqs') }));
  }

  sendNewQuote(
    to: string,
    data: Omit<NewQuoteTemplateData, 'compareUrl'> & { rfqId: string },
  ): void {
    const { rfqId, ...rest } = data;
    void this.deliver(
      to,
      newQuoteTemplate({ ...rest, compareUrl: this.url(`/rfqs/${rfqId}/compare`) }),
    );
  }

  sendAwarded(to: string, data: Omit<RfqAwardedTemplateData, 'rfqUrl'> & { rfqId: string }): void {
    const { rfqId, ...rest } = data;
    void this.deliver(to, rfqAwardedTemplate({ ...rest, rfqUrl: this.url(`/rfqs/${rfqId}`) }));
  }

  sendRejected(
    to: string,
    data: Omit<QuoteRejectedTemplateData, 'rfqUrl'> & { rfqId: string },
  ): void {
    const { rfqId, ...rest } = data;
    void this.deliver(to, quoteRejectedTemplate({ ...rest, rfqUrl: this.url(`/rfqs/${rfqId}`) }));
  }

  private async deliver(to: string, message: MailMessage): Promise<void> {
    if (!this.transporter) {
      this.logger.debug(`SMTP not configured, skipped email to ${to}: ${message.subject}`);
      return;
    }
    try {
      await this.transporter.sendMail({
        from: this.from,
        to,
        subject: message.subject,
        html: message.html,
        text: message.text,
      });
    } catch (error) {
      this.logger.warn(
        `Could not send email to ${to}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
