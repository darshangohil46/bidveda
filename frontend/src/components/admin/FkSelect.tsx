"use client";

import { useCallback, useState } from "react";
import { SearchSelect } from "@/components/common/SearchSelect";
import { adminService } from "@/services/admin.service";
import type { FkValue } from "@/types/admin";
import type { SelectOption } from "@/types/ui";

interface FkSelectProps {
  id: string;
  /** Resource the foreign key points to, e.g. "admin_roles". */
  resource: string;
  value: FkValue | null;
  onChange: (value: FkValue | null) => void;
  disabled?: boolean;
  invalid?: boolean;
  clearable?: boolean;
}

/** Foreign-key picker: searches the target table on the server as you type (admin.txt: /:resource/options). */
export function FkSelect({
  id,
  resource,
  value,
  onChange,
  disabled,
  invalid,
  clearable,
}: FkSelectProps) {
  const [options, setOptions] = useState<SelectOption[]>([]);
  const [loading, setLoading] = useState(false);

  const search = useCallback(
    (query: string) => {
      setLoading(true);
      adminService
        .options(resource, query)
        .then((items) =>
          setOptions(
            items.map((item) => ({ value: item.id, label: item.label })),
          ),
        )
        .catch(() => setOptions([]))
        .finally(() => setLoading(false));
    },
    [resource],
  );

  return (
    <SearchSelect
      id={id}
      value={value?.id ?? null}
      selectedLabel={value?.label}
      options={options}
      loading={loading}
      onSearch={search}
      onChange={(option) =>
        onChange(option ? { id: option.value, label: option.label } : null)
      }
      placeholder="Select"
      searchPlaceholder="Type to search"
      disabled={disabled}
      invalid={invalid}
      clearable={clearable}
    />
  );
}
