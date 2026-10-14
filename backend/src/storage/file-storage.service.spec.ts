import { ConfigService } from '@nestjs/config';
import { existsSync, mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { EnvVars } from '../types/env.types';
import { FileStorageService } from './file-storage.service';

function upload(name: string, content: Buffer): Express.Multer.File {
  return { originalname: name, buffer: content, size: content.length } as Express.Multer.File;
}

describe('FileStorageService upload validation', () => {
  let dir: string;
  let storage: FileStorageService;

  beforeAll(async () => {
    dir = mkdtempSync(join(tmpdir(), 'bidveda-upload-'));
    const config = { get: () => dir } as unknown as ConfigService<EnvVars, true>;
    storage = new FileStorageService(config);
    await storage.onModuleInit();
  });

  afterAll(() => rmSync(dir, { recursive: true, force: true }));

  it('stores a real PDF under a random name, not the user file name', async () => {
    const stored = await storage.save(upload('../../etc/passwd.pdf', Buffer.from('%PDF-1.7 body')));
    expect(stored.storedName).toMatch(/^[0-9a-f-]{36}\.pdf$/);
    expect(stored.originalName).not.toContain('/');
    expect(stored.mimeType).toBe('application/pdf');
    expect(existsSync(join(dir, stored.storedName))).toBe(true);
  });

  it('rejects extensions that are not on the allow-list', async () => {
    await expect(storage.save(upload('run.exe', Buffer.from('MZ')))).rejects.toMatchObject({
      response: { code: 'FILE_TYPE_NOT_ALLOWED' },
    });
  });

  it('rejects a file whose content does not match its extension', async () => {
    await expect(
      storage.save(upload('invoice.pdf', Buffer.from('<html></html>'))),
    ).rejects.toMatchObject({
      response: { code: 'FILE_CONTENT_MISMATCH' },
    });
  });

  it('accepts only zip files that contain an Excel workbook as .xlsx', async () => {
    const zipHeader = Buffer.from([0x50, 0x4b, 0x03, 0x04]);
    await expect(
      storage.save(upload('plain.xlsx', Buffer.concat([zipHeader, Buffer.from('hello')]))),
    ).rejects.toMatchObject({
      response: { code: 'FILE_CONTENT_MISMATCH' },
    });
    const real = await storage.save(
      upload('book.xlsx', Buffer.concat([zipHeader, Buffer.from('xl/workbook.xml')])),
    );
    expect(real.storedName.endsWith('.xlsx')).toBe(true);
  });

  describe('pictures', () => {
    const png = Buffer.concat([
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      Buffer.from('rest'),
    ]);
    const webp = Buffer.concat([
      Buffer.from('RIFF'),
      Buffer.from([1, 2, 3, 4]),
      Buffer.from('WEBPVP8 '),
    ]);

    it('stores a real PNG and serves it back as image/png', async () => {
      const stored = await storage.saveImage(upload('me.PNG', png));
      expect(stored.storedName).toMatch(/^[0-9a-f-]{36}\.png$/);
      expect(storage.imageMime(stored.storedName)).toBe('image/png');
      expect(existsSync(join(dir, stored.storedName))).toBe(true);
    });

    it('treats .jpeg as .jpg and checks the JPEG signature', async () => {
      const jpeg = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.from('jfif')]);
      const stored = await storage.saveImage(upload('photo.jpeg', jpeg));
      expect(stored.storedName.endsWith('.jpg')).toBe(true);
    });

    it('accepts WebP only when the RIFF container really says WEBP', async () => {
      expect((await storage.saveImage(upload('a.webp', webp))).storedName.endsWith('.webp')).toBe(
        true,
      );
      const wav = Buffer.concat([
        Buffer.from('RIFF'),
        Buffer.from([1, 2, 3, 4]),
        Buffer.from('WAVEfmt '),
      ]);
      await expect(storage.saveImage(upload('a.webp', wav))).rejects.toMatchObject({
        response: { code: 'FILE_CONTENT_MISMATCH' },
      });
    });

    it('rejects SVG, PDFs renamed to .png and oversized images', async () => {
      await expect(
        storage.saveImage(upload('logo.svg', Buffer.from('<svg onload="alert(1)"/>'))),
      ).rejects.toMatchObject({ response: { code: 'FILE_TYPE_NOT_ALLOWED' } });
      await expect(
        storage.saveImage(upload('fake.png', Buffer.from('%PDF-1.7 body'))),
      ).rejects.toMatchObject({ response: { code: 'FILE_CONTENT_MISMATCH' } });
      await expect(
        storage.saveImage(upload('big.png', Buffer.concat([png, Buffer.alloc(2 * 1024 * 1024)]))),
      ).rejects.toMatchObject({ response: { code: 'FILE_TOO_LARGE' } });
    });

    it('only names its own pictures as pictures', () => {
      expect(storage.imageMime('../x.png')).toBeNull();
      expect(storage.imageMime('11111111-1111-1111-1111-111111111111.pdf')).toBeNull();
    });
  });

  it('refuses to open a stored name that is not one of ours', async () => {
    await expect(storage.open('../secret.pdf')).rejects.toMatchObject({
      response: { code: 'NOT_FOUND' },
    });
  });
});
