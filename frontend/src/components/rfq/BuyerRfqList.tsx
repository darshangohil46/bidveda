"use client";

import { useState } from "react";
import { Pencil, Plus } from "lucide-react";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorNotice } from "@/components/common/ErrorNotice";
import { PageHeader } from "@/components/common/PageHeader";
import { Pagination } from "@/components/common/Pagination";
import { SearchInput } from "@/components/common/SearchInput";
import { RfqFormDialog } from "@/components/rfq/RfqFormDialog";
import { RfqList } from "@/components/rfq/RfqList";
import {
  RfqStatusTabs,
  type StatusFilter,
} from "@/components/rfq/RfqStatusTabs";
import { Button } from "@/components/ui/button";
import { useApiQuery } from "@/hooks/use-api-query";
import { canEditRfq } from "@/lib/rfq-form";
import { rfqService } from "@/services/rfq.service";
import { UserRole } from "@/types/enums";
import type { RfqListQuery } from "@/types/rfq";
import { DEFAULT_PAGE_SIZE } from "@/utils/constant";

/**
 * The buyer's own RFQs. A status tab and the search box narrow the list; the page number picks
 * which slice is shown. Any change reloads the list from the API.
 * "New RFQ" and the pencil on a draft or open RFQ open the same modal (RfqFormDialog) to create or edit.
 */
export function BuyerRfqList() {
  const [status, setStatus] = useState<StatusFilter>("");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  // The open modal: an RFQ id to edit it, null to start a new one, or no modal at all.
  const [form, setForm] = useState<{ rfqId: string | null } | null>(null);

  const query: RfqListQuery = { page, limit: DEFAULT_PAGE_SIZE, status, q };
  const { data, error, loading, reload } = useApiQuery(
    (signal) => rfqService.list(query, signal),
    JSON.stringify(query),
  );

  function selectStatus(next: StatusFilter) {
    setStatus(next);
    setPage(1);
  }

  return (
    <>
      <PageHeader
        title="My RFQs"
        description="Everything you have asked vendors to quote on."
        actions={
          <Button type="button" onClick={() => setForm({ rfqId: null })}>
            <Plus className="size-4" /> New RFQ
          </Button>
        }
      />

      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <RfqStatusTabs
          value={status}
          onChange={selectStatus}
          counts={data?.statusCounts}
        />
        <SearchInput
          className="w-full lg:w-72"
          placeholder="Search your RFQs"
          onSearch={(value) => {
            setQ(value);
            setPage(1);
          }}
        />
      </div>

      {error && <ErrorNotice error={error} onRetry={reload} />}

      {!error && (
        <>
          <RfqList
            items={data?.items ?? []}
            variant={UserRole.BUYER}
            loading={loading}
            renderAction={(rfq) =>
              canEditRfq(rfq.status) ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Edit ${rfq.title}`}
                  onClick={() => setForm({ rfqId: rfq.id })}
                >
                  <Pencil className="size-4" />
                </Button>
              ) : null
            }
            empty={
              <EmptyState
                title={
                  q || status
                    ? "No RFQs match these filters"
                    : "You have not created an RFQ yet"
                }
                description={
                  q || status
                    ? "Try a different status or clear the search."
                    : "Describe what you need, set a deadline, and invite vendors to quote."
                }
                action={
                  !q && !status ? (
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => setForm({ rfqId: null })}
                    >
                      Create your first RFQ
                    </Button>
                  ) : undefined
                }
              />
            }
          />
          {data && (
            <Pagination
              page={data.page}
              totalPages={data.totalPages}
              total={data.total}
              limit={data.limit}
              onPageChange={setPage}
            />
          )}
        </>
      )}

      {form && (
        <RfqFormDialog
          open
          rfqId={form.rfqId}
          onOpenChange={(open) => !open && setForm(null)}
          onSaved={() => {
            setForm(null);
            reload();
          }}
        />
      )}
    </>
  );
}
