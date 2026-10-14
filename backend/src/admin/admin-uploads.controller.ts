import {
  Controller,
  Get,
  Param,
  Post,
  Res,
  StreamableFile,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { AppException } from '../common/errors/app.exception';
import { AdminSession } from '../security/decorators';
import { FileStorageService } from '../storage/file-storage.service';

/**
 * Pictures for image fields in the admin panel. Upload first, then save the returned
 * name on the record; the panel shows it again through the GET route (images need the
 * admin token, so the UI fetches them instead of using a plain <img src>).
 */
@ApiTags('Admin')
@Controller('admin/uploads')
export class AdminUploadsController {
  constructor(private readonly storage: FileStorageService) {}

  @Post('images')
  @AdminSession()
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } },
  })
  @ApiOperation({
    summary: 'Upload a PNG, JPG or WebP picture; returns the name to save on a record',
  })
  async uploadImage(
    @UploadedFile() file: Express.Multer.File | undefined,
  ): Promise<{ name: string }> {
    const stored = await this.storage.saveImage(file);
    return { name: stored.storedName };
  }

  @Get('images/:name')
  @AdminSession()
  @ApiOperation({ summary: 'Stream an uploaded picture' })
  async image(
    @Param('name') name: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const mime = this.storage.imageMime(name);
    if (!mime) throw AppException.notFound('Image not found');

    const stream = await this.storage.open(name);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    // The name is a random uuid that never changes content, so the browser may keep it.
    res.setHeader('Cache-Control', 'private, max-age=86400');
    return new StreamableFile(stream, { type: mime, disposition: 'inline' });
  }
}
