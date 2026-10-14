import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { createReadStream, ReadStream } from 'fs';
import { access, mkdir, unlink, writeFile } from 'fs/promises';
import { basename, extname, join, resolve } from 'path';
import {
  ALLOWED_IMAGES,
  ALLOWED_UPLOADS,
  MAX_IMAGE_MB,
  STORED_IMAGE_NAME,
} from '../common/constants';
import { AppException } from '../common/errors/app.exception';
import { EnvVars } from '../types/env.types';
import { StoredFile } from '../types/storage.types';

/**
 * Disk storage with defence in depth:
 *  - extension must be on the allow-list AND the file's first bytes must match that type
 *  - the stored name is a random uuid, the user's file name never touches the filesystem
 *  - the MIME type we serve back is ours, not the one the client claimed
 */
@Injectable()
export class FileStorageService implements OnModuleInit {
  private readonly logger = new Logger(FileStorageService.name);
  private readonly dir: string;

  constructor(config: ConfigService<EnvVars, true>) {
    this.dir = resolve(config.get('UPLOAD_DIR', { infer: true }));
  }

  async onModuleInit(): Promise<void> {
    await mkdir(this.dir, { recursive: true });
  }

  async save(file: Express.Multer.File | undefined): Promise<StoredFile> {
    if (!file || !file.buffer || file.size === 0) {
      throw AppException.badRequest('NO_FILE', 'Attach a file in the "file" field.');
    }

    const originalName = this.cleanName(file.originalname);
    const extension = extname(originalName).slice(1).toLowerCase();
    const rule = ALLOWED_UPLOADS.find((allowed) => allowed.extension === extension);
    if (!rule) {
      throw AppException.badRequest(
        'FILE_TYPE_NOT_ALLOWED',
        'Only PDF and XLSX files are allowed.',
      );
    }
    if (!this.matchesContent(rule.extension, file.buffer)) {
      throw AppException.badRequest(
        'FILE_CONTENT_MISMATCH',
        `This file is not a real ${rule.extension.toUpperCase()} document.`,
      );
    }

    return this.write(rule.extension, rule.mime, originalName, file);
  }

  /** Profile pictures: PNG, JPG or WebP, small, and really that format. */
  async saveImage(file: Express.Multer.File | undefined): Promise<StoredFile> {
    if (!file || !file.buffer || file.size === 0) {
      throw AppException.badRequest('NO_FILE', 'Attach an image in the "file" field.');
    }
    if (file.size > MAX_IMAGE_MB * 1024 * 1024) {
      throw AppException.badRequest('FILE_TOO_LARGE', `Images can be at most ${MAX_IMAGE_MB} MB.`);
    }

    const originalName = this.cleanName(file.originalname);
    const typed = extname(originalName).slice(1).toLowerCase();
    const extension = typed === 'jpeg' ? 'jpg' : typed;
    const rule = ALLOWED_IMAGES.find((allowed) => allowed.extension === extension);
    if (!rule) {
      throw AppException.badRequest(
        'FILE_TYPE_NOT_ALLOWED',
        'Only PNG, JPG and WebP images are allowed.',
      );
    }
    const head = file.buffer;
    const real =
      head.subarray(0, rule.signature.length).equals(rule.signature) &&
      (rule.extension !== 'webp' || head.subarray(8, 12).toString('latin1') === 'WEBP');
    if (!real) {
      throw AppException.badRequest(
        'FILE_CONTENT_MISMATCH',
        `This file is not a real ${rule.extension.toUpperCase()} image.`,
      );
    }

    return this.write(rule.extension, rule.mime, originalName, file);
  }

  /** The MIME type we serve for a stored picture, or null if the name is not one of our pictures. */
  imageMime(storedName: string): string | null {
    if (!STORED_IMAGE_NAME.test(storedName)) return null;
    const extension = extname(storedName).slice(1);
    return ALLOWED_IMAGES.find((allowed) => allowed.extension === extension)?.mime ?? null;
  }

  /** Opens a read stream, or throws 404 if the bytes are missing from disk. */
  async open(storedName: string): Promise<ReadStream> {
    const path = this.pathFor(storedName);
    try {
      await access(path);
    } catch {
      throw AppException.notFound('File not found');
    }
    return createReadStream(path);
  }

  async remove(storedName: string): Promise<void> {
    try {
      await unlink(this.pathFor(storedName));
    } catch (error) {
      this.logger.warn(
        `Could not delete ${storedName}: ${error instanceof Error ? error.message : error}`,
      );
    }
  }

  async removeMany(storedNames: string[]): Promise<void> {
    await Promise.all(storedNames.map((name) => this.remove(name)));
  }

  /** Stored names are always `<uuid>.<ext>`; reject anything else before touching the disk. */
  private pathFor(storedName: string): string {
    if (!/^[0-9a-f-]{36}\.(pdf|xlsx|png|jpg|webp)$/.test(storedName)) {
      throw AppException.notFound('File not found');
    }
    return join(this.dir, basename(storedName));
  }

  private async write(
    extension: string,
    mimeType: string,
    originalName: string,
    file: Express.Multer.File,
  ): Promise<StoredFile> {
    const storedName = `${randomUUID()}.${extension}`;
    await writeFile(join(this.dir, storedName), file.buffer, { flag: 'wx' });
    return { storedName, originalName, mimeType, sizeBytes: file.size };
  }

  private cleanName(raw: string): string {
    // Multer decodes names as latin1; restore UTF-8 so non-English names survive.
    const decoded = Buffer.from(raw, 'latin1').toString('utf8');
    const readable = (decoded.includes('�') ? raw : decoded).replace(/[\\/]/g, '_');
    const withoutControlChars = Array.from(readable)
      .filter((char) => {
        const code = char.charCodeAt(0);
        return code > 31 && code !== 127;
      })
      .join('');
    return withoutControlChars.trim().slice(-200) || 'file';
  }

  private matchesContent(extension: string, buffer: Buffer): boolean {
    const rule = ALLOWED_UPLOADS.find((allowed) => allowed.extension === extension);
    if (!rule) return false;
    if (!buffer.subarray(0, rule.signature.length).equals(rule.signature)) return false;
    // An XLSX is a ZIP that contains the workbook part; a random zip is not accepted.
    if (extension === 'xlsx') return buffer.includes('xl/workbook.xml');
    return true;
  }
}
