import { clientApi } from "@/lib/clientApi";
import type { Attachment } from "@/types/rfq";

export class AttachmentService {
  uploadToRfq(rfqId: string, file: File): Promise<Attachment> {
    return clientApi.post<Attachment>(
      `/rfqs/${rfqId}/attachments`,
      this.formWith(file),
    );
  }

  uploadToQuote(quoteId: string, file: File): Promise<Attachment> {
    return clientApi.post<Attachment>(
      `/quotes/${quoteId}/attachments`,
      this.formWith(file),
    );
  }

  /** Uploads files one after another. A file that fails does not stop the rest; returns the names that failed. */
  async uploadEach(
    files: File[],
    upload: (file: File) => Promise<unknown>,
  ): Promise<string[]> {
    const failed: string[] = [];
    for (const file of files) {
      try {
        await upload(file);
      } catch {
        failed.push(file.name);
      }
    }
    return failed;
  }

  remove(id: string): Promise<void> {
    return clientApi.delete<void>(`/attachments/${id}`);
  }

  /**
   * Files need the Authorization header, so a plain <a href> cannot download them.
   * Fetch the bytes, then hand the browser a temporary object URL to save.
   */
  async download(
    attachment: Pick<Attachment, "id" | "originalName">,
  ): Promise<void> {
    const { blob, filename } = await clientApi.download(
      `/attachments/${attachment.id}/download`,
    );
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename ?? attachment.originalName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  private formWith(file: File): FormData {
    const form = new FormData();
    form.append("file", file);
    return form;
  }
}

export const attachmentService = new AttachmentService();
