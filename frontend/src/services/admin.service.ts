import { adminClientApi } from "@/lib/clientApi";
import type { Paginated } from "@/types/api";
import type {
  OptionItem,
  ResourceListQuery,
  ResourceMeta,
  ResourceRow,
} from "@/types/admin";

/** Generic CRUD over the admin API. Works for every table the backend registry declares. */
export class AdminService {
  resources(): Promise<ResourceMeta[]> {
    return adminClientApi.get<ResourceMeta[]>("/admin/resources");
  }

  counts(): Promise<Record<string, number>> {
    return adminClientApi.get<Record<string, number>>(
      "/admin/dashboard/counts",
    );
  }

  list(
    resource: string,
    query: ResourceListQuery = {},
    signal?: AbortSignal,
  ): Promise<Paginated<ResourceRow>> {
    return adminClientApi.get<Paginated<ResourceRow>>(`/admin/${resource}`, {
      query,
      signal,
    });
  }

  options(
    resource: string,
    search: string,
    signal?: AbortSignal,
  ): Promise<OptionItem[]> {
    return adminClientApi.get<OptionItem[]>(`/admin/${resource}/options`, {
      query: { search, limit: 20 },
      signal,
    });
  }

  get(resource: string, id: string): Promise<ResourceRow> {
    return adminClientApi.get<ResourceRow>(`/admin/${resource}/${id}`);
  }

  create(
    resource: string,
    values: Record<string, unknown>,
  ): Promise<ResourceRow> {
    return adminClientApi.post<ResourceRow>(`/admin/${resource}`, values);
  }

  update(
    resource: string,
    id: string,
    values: Record<string, unknown>,
  ): Promise<ResourceRow> {
    return adminClientApi.patch<ResourceRow>(
      `/admin/${resource}/${id}`,
      values,
    );
  }

  remove(resource: string, id: string): Promise<void> {
    return adminClientApi.delete<void>(`/admin/${resource}/${id}`);
  }

  /** Uploads a picture; the returned name is what the record's image field stores. */
  uploadImage(file: File): Promise<{ name: string }> {
    const form = new FormData();
    form.append("file", file);
    return adminClientApi.post<{ name: string }>("/admin/uploads/images", form);
  }

  /** Pictures need the admin token, so a plain <img src> cannot load them: fetch the bytes instead. */
  async image(name: string, signal?: AbortSignal): Promise<Blob> {
    const { blob } = await adminClientApi.download(
      `/admin/uploads/images/${name}`,
      { signal },
    );
    return blob;
  }
}

export const adminService = new AdminService();
