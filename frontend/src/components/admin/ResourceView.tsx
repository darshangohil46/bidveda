"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { useAdmin } from "@/components/admin/AdminProvider";
import { ResourceForm } from "@/components/admin/ResourceForm";
import { ResourceTable } from "@/components/admin/ResourceTable";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorNotice } from "@/components/common/ErrorNotice";
import { LoadingRows } from "@/components/common/LoadingRows";
import { PageHeader } from "@/components/common/PageHeader";
import { Pagination } from "@/components/common/Pagination";
import { SearchInput } from "@/components/common/SearchInput";
import { Button } from "@/components/ui/button";
import { useApiQuery } from "@/hooks/use-api-query";
import { useToast } from "@/hooks/use-toast";
import { nextAdminSort, type AdminSort } from "@/lib/admin-sort";
import { adminService } from "@/services/admin.service";
import type { FieldMeta, ResourceListQuery, ResourceRow } from "@/types/admin";
import { FormMode, PermissionAction } from "@/types/enums";
import { DEFAULT_PAGE_SIZE } from "@/utils/constant";
import { getErrorMessage } from "@/utils/general";

interface ResourceViewProps {
  resource: string;
}

/**
 * The page for ANY table the admin panel manages: a searchable, sortable, paged list with create,
 * edit and delete. Nothing here is specific to one table; the columns, the form fields and what
 * the signed-in admin is allowed to do all come from the backend (the resource registry).
 */
export function ResourceView({ resource }: ResourceViewProps) {
  const { resources, can } = useAdmin();
  const { success, error } = useToast();
  const meta = resources.find((candidate) => candidate.key === resource);

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<AdminSort | null>(null);
  const [formState, setFormState] = useState<{
    mode: FormMode;
    id: string | null;
  } | null>(null);
  const [toDelete, setToDelete] = useState<ResourceRow | null>(null);

  const allowed = !!meta && can(resource, PermissionAction.READ);
  const query: ResourceListQuery = {
    page,
    limit: DEFAULT_PAGE_SIZE,
    search,
    sortBy: sort?.by,
    sortOrder: sort?.order,
  };
  const {
    data,
    error: loadError,
    loading,
    reload,
  } = useApiQuery(
    (signal) => adminService.list(resource, query, signal),
    `${resource}:${JSON.stringify(query)}`,
    { enabled: allowed },
  );

  if (!meta)
    return (
      <EmptyState
        title="Unknown resource"
        description="This table is not registered in the admin API."
      />
    );
  if (!allowed) {
    return (
      <EmptyState
        title="You do not have access"
        description={`Your role cannot view ${meta.labelPlural.toLowerCase()}.`}
      />
    );
  }

  // Columns the table declares for the list; a table that declares none shows its first four fields.
  const columns: FieldMeta[] = meta.fields.some((field) => field.listVisible)
    ? meta.fields.filter((field) => field.listVisible)
    : meta.fields.slice(0, 4);
  // A table must allow the action AND the admin's role must have the permission.
  const canCreate =
    meta.capabilities.create && can(resource, PermissionAction.CREATE);
  const canUpdate =
    meta.capabilities.update && can(resource, PermissionAction.UPDATE);
  const canDelete =
    meta.capabilities.delete && can(resource, PermissionAction.DELETE);
  const searchable = meta.fields.some((field) => field.searchable);

  async function remove(row: ResourceRow) {
    try {
      await adminService.remove(resource, row.id);
      success(`${meta?.label} deleted`);
      reload();
    } catch (caught) {
      error("Could not delete", getErrorMessage(caught));
      throw caught;
    }
  }

  return (
    <>
      <PageHeader
        title={meta.labelPlural}
        description={
          data
            ? `${data.total} ${data.total === 1 ? meta.label.toLowerCase() : meta.labelPlural.toLowerCase()}`
            : meta.group
        }
        actions={
          canCreate && (
            <Button
              type="button"
              onClick={() => setFormState({ mode: FormMode.CREATE, id: null })}
            >
              <Plus className="size-4" /> New {meta.label.toLowerCase()}
            </Button>
          )
        }
      />

      {searchable && (
        <div className="mb-4">
          <SearchInput
            className="w-full sm:w-80"
            placeholder={`Search ${meta.labelPlural.toLowerCase()}`}
            onSearch={(value) => {
              setSearch(value);
              setPage(1);
            }}
          />
        </div>
      )}

      {loadError && <ErrorNotice error={loadError} onRetry={reload} />}
      {!loadError && !data && <LoadingRows rows={6} />}
      {!loadError && data && data.items.length === 0 && (
        <EmptyState
          title={
            search
              ? "Nothing matches your search"
              : `No ${meta.labelPlural.toLowerCase()} yet`
          }
        />
      )}

      {!loadError && data && data.items.length > 0 && (
        <>
          <ResourceTable
            columns={columns}
            rows={data.items}
            sort={sort}
            onSort={(field) => {
              setSort((current) => nextAdminSort(current, field.name));
              setPage(1);
            }}
            canUpdate={canUpdate}
            canDelete={canDelete}
            onOpen={(row) =>
              setFormState({
                mode: canUpdate ? FormMode.EDIT : FormMode.VIEW,
                id: row.id,
              })
            }
            onDelete={setToDelete}
            loading={loading}
          />
          <Pagination
            page={data.page}
            totalPages={data.totalPages}
            total={data.total}
            limit={data.limit}
            onPageChange={setPage}
          />
        </>
      )}

      {formState && (
        <ResourceForm
          meta={meta}
          allResources={resources}
          mode={formState.mode}
          recordId={formState.id}
          open
          onOpenChange={(open) => !open && setFormState(null)}
          onSaved={() => {
            setFormState(null);
            reload();
          }}
        />
      )}

      <ConfirmDialog
        open={toDelete !== null}
        onOpenChange={(open) => !open && setToDelete(null)}
        title={`Delete this ${meta.label.toLowerCase()}?`}
        description="This cannot be undone. Records that other data depends on cannot be deleted."
        confirmLabel="Delete"
        destructive
        onConfirm={() => (toDelete ? remove(toDelete) : undefined)}
      />
    </>
  );
}
