"use client";

import { useState } from "react";
import { EmptyState } from "@/components/common/EmptyState";
import { DateTimePicker } from "@/components/common/DateTimePicker";
import { ErrorNotice } from "@/components/common/ErrorNotice";
import { FormField } from "@/components/common/FormField";
import { Pagination } from "@/components/common/Pagination";
import { SearchInput } from "@/components/common/SearchInput";
import { SearchSelect } from "@/components/common/SearchSelect";
import { RfqList } from "@/components/rfq/RfqList";
import { Button } from "@/components/ui/button";
import { useApiQuery } from "@/hooks/use-api-query";
import { rfqService } from "@/services/rfq.service";
import { PickerMode, RfqSort, UserRole } from "@/types/enums";
import type { RfqListQuery } from "@/types/rfq";
import { DEFAULT_PAGE_SIZE, RFQ_CATEGORY_OPTIONS } from "@/utils/constant";
import { endOfDayIso, startOfDayIso } from "@/utils/general";

type Sort = NonNullable<RfqListQuery["sort"]>;

const SORTS: Array<{ value: Sort; label: string }> = [
  { value: RfqSort.DEADLINE_ASC, label: "Closing soonest" },
  { value: RfqSort.DEADLINE_DESC, label: "Closing last" },
  { value: RfqSort.CREATED_DESC, label: "Newest first" },
];

interface Filters {
  q: string;
  category: string;
  location: string;
  from: string | null;
  to: string | null;
  sort: Sort;
}

const INITIAL: Filters = {
  q: "",
  category: "",
  location: "",
  from: null,
  to: null,
  sort: RfqSort.DEADLINE_ASC,
};

/** Open RFQs for vendors: keyword, category, location and deadline filters, with pagination. */
export function VendorRfqBrowse() {
  const [filters, setFilters] = useState<Filters>(INITIAL);
  const [page, setPage] = useState(1);
  // Changing this remounts the search boxes so "Clear filters" empties them too.
  const [resetKey, setResetKey] = useState(0);

  const query: RfqListQuery = {
    page,
    limit: DEFAULT_PAGE_SIZE,
    q: filters.q,
    category: filters.category,
    location: filters.location,
    deadlineFrom: filters.from ? startOfDayIso(filters.from) : undefined,
    deadlineTo: filters.to ? endOfDayIso(filters.to) : undefined,
    sort: filters.sort,
  };
  const { data, error, loading, reload } = useApiQuery(
    (signal) => rfqService.list(query, signal),
    JSON.stringify(query),
  );

  function patch(change: Partial<Filters>) {
    setFilters((current) => ({ ...current, ...change }));
    setPage(1);
  }

  const dirty = JSON.stringify(filters) !== JSON.stringify(INITIAL);

  return (
    <>
      <section
        aria-label="Filters"
        className="mb-5 grid gap-3 rounded-sm border bg-card p-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        <FormField label="Keyword" htmlFor="filter-q">
          <SearchInput
            id="filter-q"
            key={`q-${resetKey}`}
            placeholder="Title, description"
            onSearch={(value) => patch({ q: value })}
          />
        </FormField>

        <FormField label="Category" htmlFor="filter-category">
          <SearchSelect
            id="filter-category"
            value={filters.category || null}
            options={RFQ_CATEGORY_OPTIONS}
            placeholder="All categories"
            searchPlaceholder="Search categories"
            clearable
            onChange={(option) => patch({ category: option?.value ?? "" })}
          />
        </FormField>

        <FormField label="Delivery location" htmlFor="filter-location">
          <SearchInput
            id="filter-location"
            key={`location-${resetKey}`}
            placeholder="City, state or pincode"
            aria-label="Delivery location"
            onSearch={(value) => patch({ location: value })}
          />
        </FormField>

        <FormField label="Sort by" htmlFor="filter-sort">
          <SearchSelect
            id="filter-sort"
            value={filters.sort}
            options={SORTS}
            searchable={false}
            onChange={(option) =>
              patch({ sort: (option?.value ?? RfqSort.DEADLINE_ASC) as Sort })
            }
          />
        </FormField>

        <FormField label="Closes on or after" htmlFor="filter-from">
          <DateTimePicker
            id="filter-from"
            mode={PickerMode.DATE}
            value={filters.from}
            onChange={(value) => patch({ from: value })}
            placeholder="Any date"
          />
        </FormField>

        <FormField label="Closes on or before" htmlFor="filter-to">
          <DateTimePicker
            id="filter-to"
            mode={PickerMode.DATE}
            value={filters.to}
            onChange={(value) => patch({ to: value })}
            placeholder="Any date"
          />
        </FormField>

        {dirty && (
          <div className="flex items-end sm:col-span-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setFilters(INITIAL);
                setPage(1);
                setResetKey((current) => current + 1);
              }}
            >
              Clear filters
            </Button>
          </div>
        )}
      </section>

      {error && <ErrorNotice error={error} onRetry={reload} />}

      {!error && (
        <>
          <RfqList
            items={data?.items ?? []}
            variant={UserRole.VENDOR}
            loading={loading}
            empty={
              <EmptyState
                title={
                  dirty
                    ? "No open RFQs match these filters"
                    : "There are no open RFQs right now"
                }
                description={
                  dirty
                    ? "Widen the filters or clear them to see everything."
                    : "New requests appear here as soon as a buyer publishes them."
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
    </>
  );
}
