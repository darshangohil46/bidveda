export const JWT_AUDIENCE_USER = 'bidveda:user';
export const JWT_AUDIENCE_ADMIN = 'bidveda:admin';

export const SUPER_ADMIN_ROLE = {
  name: 'Super Admin',
  slug: 'super-admin',
  description: 'Full access to every resource. Cannot be edited or deleted.',
} as const;

export const RFQ_CATEGORIES = [
  'Office Supplies',
  'Furniture',
  'IT Hardware',
  'Software & Services',
  'Construction Materials',
  'Electrical',
  'Plumbing & Sanitary',
  'Industrial Equipment',
  'Packaging',
  'Logistics',
  'Catering & Hospitality',
  'Printing & Stationery',
  'Safety & PPE',
  'Other',
] as const;

export const MAX_LINE_ITEMS = 100;
export const MAX_ATTACHMENTS_PER_PARENT = 10;

/** Only these file types are accepted. Both the extension and the file signature must agree. */
export const ALLOWED_UPLOADS = [
  {
    extension: 'pdf',
    mime: 'application/pdf',
    signature: Buffer.from('%PDF-'),
  },
  {
    extension: 'xlsx',
    mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    // XLSX is a ZIP container.
    signature: Buffer.from([0x50, 0x4b, 0x03, 0x04]),
  },
] as const;

/** Pictures (profile photos). Same two checks as documents: the extension and the first bytes must agree. */
export const MAX_IMAGE_MB = 2;
export const ALLOWED_IMAGES = [
  {
    extension: 'png',
    mime: 'image/png',
    signature: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  },
  {
    extension: 'jpg',
    mime: 'image/jpeg',
    signature: Buffer.from([0xff, 0xd8, 0xff]),
  },
  {
    // RIFF container; bytes 8-11 must spell "WEBP" (checked in the storage service).
    extension: 'webp',
    mime: 'image/webp',
    signature: Buffer.from('RIFF'),
  },
] as const;

/** What an image field holds: the name of a file we stored, never a URL someone typed. */
export const STORED_IMAGE_NAME = /^[0-9a-f-]{36}\.(png|jpg|webp)$/;

export const DEFAULT_PAGE_SIZE = 10;
export const MAX_PAGE_SIZE = 100;
