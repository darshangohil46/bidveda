"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { PermissionAction } from "@/types/enums";
import type { PermissionMatrix, ResourceMeta } from "@/types/admin";

/** Create, read, update, delete: the enum is declared in that order. */
const ACTIONS = Object.values(PermissionAction);

interface PermissionMatrixEditorProps {
  resources: ResourceMeta[];
  value: PermissionMatrix;
  onChange: (value: PermissionMatrix) => void;
  disabled?: boolean;
}

/**
 * Resources down the side, create / read / update / delete across the top (admin.txt section 9).
 * Writing implies reading, and actions a resource does not support are greyed out.
 */
export function PermissionMatrixEditor({
  resources,
  value,
  onChange,
  disabled,
}: PermissionMatrixEditorProps) {
  function toggle(
    resource: ResourceMeta,
    action: PermissionAction,
    checked: boolean,
  ) {
    const current = value[resource.key] ?? {
      create: false,
      read: false,
      update: false,
      delete: false,
    };
    const next = { ...current, [action]: checked };
    if (checked && action !== PermissionAction.READ) next.read = true;
    if (!checked && action === PermissionAction.READ) {
      next.create = false;
      next.update = false;
      next.delete = false;
    }
    onChange({ ...value, [resource.key]: next });
  }

  const supported = (resource: ResourceMeta, action: PermissionAction) =>
    action === PermissionAction.READ || resource.capabilities[action];

  return (
    <div className="overflow-x-auto rounded-sm border bg-card">
      <table className="w-full min-w-[28rem] border-collapse text-left">
        <thead>
          <tr className="t-caption border-b bg-sunken">
            <th scope="col" className="px-3 py-2 font-medium">
              Resource
            </th>
            {ACTIONS.map((action) => (
              <th
                key={action}
                scope="col"
                className="w-20 px-3 py-2 text-center font-medium capitalize"
              >
                {action}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y">
          {resources.map((resource) => (
            <tr key={resource.key}>
              <th scope="row" className="px-3 py-2 text-left font-normal">
                <span className="block text-[0.8125rem] text-ink">
                  {resource.labelPlural}
                </span>
                <span className="text-[0.6875rem] text-ink-3">
                  {resource.group}
                </span>
              </th>
              {ACTIONS.map((action) => (
                <td key={action} className="px-3 py-2 text-center">
                  {supported(resource, action) ? (
                    <Checkbox
                      aria-label={`${action} ${resource.labelPlural}`}
                      checked={value[resource.key]?.[action] === true}
                      disabled={disabled}
                      onCheckedChange={(checked) =>
                        toggle(resource, action, checked === true)
                      }
                    />
                  ) : (
                    <span aria-hidden className="text-ink-3">
                      -
                    </span>
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
