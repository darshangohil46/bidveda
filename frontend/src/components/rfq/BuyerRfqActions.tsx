"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { GitCompareArrows, Pencil, Send, Trash2 } from "lucide-react";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { RfqFormDialog } from "@/components/rfq/RfqFormDialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { canEditRfq } from "@/lib/rfq-form";
import { rfqService } from "@/services/rfq.service";
import { RfqStatus, UserRole } from "@/types/enums";
import type { RfqDetail } from "@/types/rfq";
import { rfqCompareRoute, roleHome } from "@/utils/constant";
import { getErrorMessage } from "@/utils/general";

interface BuyerRfqActionsProps {
  rfq: RfqDetail;
  /** Called after the RFQ changed (edited or published), so the page can load it again. */
  onChanged: () => void;
}

/**
 * What a buyer can do with an RFQ at its current stage:
 *  - a draft can be deleted, edited (in the modal) and published
 *  - an open RFQ can still be edited, and its quotes compared
 *  - a closed or awarded RFQ can only be compared (and awarded, once closed)
 */
export function BuyerRfqActions({ rfq, onChanged }: BuyerRfqActionsProps) {
  const router = useRouter();
  const { success, error } = useToast();
  const [confirm, setConfirm] = useState<"publish" | "delete" | null>(null);
  const [editing, setEditing] = useState(false);

  const isDraft = rfq.status === RfqStatus.DRAFT;
  const closed = rfq.status === RfqStatus.CLOSED;

  async function publish() {
    try {
      await rfqService.publish(rfq.id);
      success("RFQ published", "Vendors can now see it and submit quotes.");
      onChanged();
    } catch (caught) {
      error("Could not publish", getErrorMessage(caught));
      throw caught;
    }
  }

  async function remove() {
    try {
      await rfqService.remove(rfq.id);
      success("Draft deleted");
      router.replace(roleHome(UserRole.BUYER));
    } catch (caught) {
      error("Could not delete", getErrorMessage(caught));
      throw caught;
    }
  }

  return (
    <>
      {isDraft && (
        <Button
          type="button"
          variant="ghost"
          onClick={() => setConfirm("delete")}
        >
          <Trash2 className="size-4 text-rust" /> Delete
        </Button>
      )}
      {canEditRfq(rfq.status) && (
        <Button
          type="button"
          variant="outline"
          onClick={() => setEditing(true)}
        >
          <Pencil className="size-4" /> Edit
        </Button>
      )}
      {isDraft ? (
        <Button type="button" onClick={() => setConfirm("publish")}>
          <Send className="size-4" /> Publish
        </Button>
      ) : (
        <Button asChild variant={closed ? "default" : "outline"}>
          <Link href={rfqCompareRoute(rfq.id)}>
            <GitCompareArrows className="size-4" />
            {closed ? "Compare and award" : "Compare quotes"}
            {(rfq.quoteCount ?? 0) > 0 && (
              <span className="t-figure text-[0.75rem] opacity-80">
                ({rfq.quoteCount})
              </span>
            )}
          </Link>
        </Button>
      )}

      {editing && (
        <RfqFormDialog
          open
          rfqId={rfq.id}
          onOpenChange={(open) => !open && setEditing(false)}
          onSaved={() => {
            setEditing(false);
            onChanged();
          }}
        />
      )}
      {isDraft && (
        <>
          <ConfirmDialog
            open={confirm === "publish"}
            onOpenChange={(open) => !open && setConfirm(null)}
            title="Publish this RFQ?"
            description="Vendors will see it immediately. Once the deadline passes it can no longer be changed, so every vendor quotes against the same request."
            confirmLabel="Publish RFQ"
            onConfirm={publish}
          />
          <ConfirmDialog
            open={confirm === "delete"}
            onOpenChange={(open) => !open && setConfirm(null)}
            title="Delete this draft?"
            description="The draft and its files will be removed. This cannot be undone."
            confirmLabel="Delete draft"
            destructive
            onConfirm={remove}
          />
        </>
      )}
    </>
  );
}
