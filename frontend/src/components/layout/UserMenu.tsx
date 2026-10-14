"use client";

import { ChevronsUpDown, LogOut } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { USER_ROLE_LABEL } from "@/utils/constant";
import { initials } from "@/utils/general";

export function UserMenu() {
  const { user, logout } = useAuth();
  if (!user) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Account menu"
          className="flex items-center gap-2 rounded-sm px-1.5 py-1 text-left transition-colors hover:bg-line/60 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-ink text-[0.6875rem] font-medium text-paper">
            {initials(user.name)}
          </span>
          <span className="hidden min-w-0 max-w-44 sm:block">
            <span className="block truncate text-[0.8125rem] font-medium text-ink">
              {user.name}
            </span>
            <span className="block truncate text-[0.75rem] text-ink-3">
              {user.companyName}
            </span>
          </span>
          <ChevronsUpDown className="hidden size-4 shrink-0 text-ink-3 sm:block" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="font-normal">
          <span className="block truncate text-[0.8125rem] text-ink">
            {user.email}
          </span>
          <span className="block text-[0.75rem] text-ink-3">
            {USER_ROLE_LABEL[user.role]} account
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => void logout()}>
          <LogOut className="size-4" /> Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
