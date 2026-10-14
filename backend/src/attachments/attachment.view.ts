import { Attachment } from '../schema';
import { AttachmentView } from '../types/rfq.types';

export function toAttachmentView(row: Attachment): AttachmentView {
  return {
    id: row.id,
    originalName: row.originalName,
    mimeType: row.mimeType,
    sizeBytes: row.sizeBytes,
    uploadedById: row.uploadedById,
    createdAt: row.createdAt,
  };
}
