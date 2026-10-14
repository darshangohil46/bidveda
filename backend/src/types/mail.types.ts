import { UserRole } from './enums';

export interface LayoutOptions {
  title: string;
  /** Short text shown in the inbox preview. */
  preheader: string;
  /** Already-escaped HTML for the body. */
  bodyHtml: string;
  cta?: { label: string; url: string };
}

export interface WelcomeTemplateData {
  name: string;
  role: UserRole;
  loginUrl: string;
}

export interface NewQuoteTemplateData {
  rfqTitle: string;
  vendorCompany: string;
  totalMinor: number;
  currency: string;
  deliveryDays: number;
  isRevision: boolean;
  compareUrl: string;
}

export interface RfqAwardedTemplateData {
  rfqTitle: string;
  vendorName: string;
  totalMinor: number;
  currency: string;
  rfqUrl: string;
}

export interface QuoteRejectedTemplateData {
  rfqTitle: string;
  vendorName: string;
  rfqUrl: string;
}
