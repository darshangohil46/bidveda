import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Res,
  StreamableFile,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { CurrentUser, UserAuth } from '../security/decorators';
import { AuthUser } from '../types/auth.types';
import { UserRole } from '../types/enums';
import { AttachmentsService } from './attachments.service';

const FILE_BODY = {
  schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } },
};

function contentDisposition(name: string): string {
  const fallback = name.replace(/[^\x20-\x7e]/g, '_').replace(/["\\]/g, '_');
  return `attachment; filename="${fallback}"; filename*=UTF-8''${encodeURIComponent(name)}`;
}

@ApiTags('Attachments')
@Controller()
export class AttachmentsController {
  constructor(private readonly attachments: AttachmentsService) {}

  @Post('rfqs/:rfqId/attachments')
  @UserAuth(UserRole.BUYER)
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiBody(FILE_BODY)
  @ApiOperation({ summary: 'Attach a PDF or XLSX specification to my RFQ' })
  uploadToRfq(
    @CurrentUser() user: AuthUser,
    @Param('rfqId', ParseUUIDPipe) rfqId: string,
    @UploadedFile() file: Express.Multer.File | undefined,
  ) {
    return this.attachments.uploadToRfq(user, rfqId, file);
  }

  @Post('quotes/:quoteId/attachments')
  @UserAuth(UserRole.VENDOR)
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiBody(FILE_BODY)
  @ApiOperation({ summary: 'Attach a PDF or XLSX to my quote (before the deadline)' })
  uploadToQuote(
    @CurrentUser() user: AuthUser,
    @Param('quoteId', ParseUUIDPipe) quoteId: string,
    @UploadedFile() file: Express.Multer.File | undefined,
  ) {
    return this.attachments.uploadToQuote(user, quoteId, file);
  }

  @Get('attachments/:id/download')
  @UserAuth(UserRole.BUYER, UserRole.VENDOR)
  @ApiOperation({ summary: 'Download a file (only if you may see its RFQ or quote)' })
  async download(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const { stream, attachment } = await this.attachments.openForDownload(user, id);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'private, no-store');
    return new StreamableFile(stream, {
      type: attachment.mimeType,
      length: attachment.sizeBytes,
      disposition: contentDisposition(attachment.originalName),
    });
  }

  @Delete('attachments/:id')
  @UserAuth(UserRole.BUYER, UserRole.VENDOR)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a file I uploaded (before the lock)' })
  async remove(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    await this.attachments.remove(user, id);
  }
}
