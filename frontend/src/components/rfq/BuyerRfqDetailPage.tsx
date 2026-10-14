"use client";

import { useUser } from "@/components/auth/AuthProvider";
import { ErrorNotice } from "@/components/common/ErrorNotice";
import { BuyerRfqActions } from "@/components/rfq/BuyerRfqActions";
import {
  RfqDetailLayout,
  RfqDetailSkeleton,
} from "@/components/rfq/RfqDetailLayout";
import { Fact } from "@/components/rfq/RfqFacts";
import { useApiQuery } from "@/hooks/use-api-query";
import { rfqService } from "@/services/rfq.service";
import { RfqStatus, UserRole } from "@/types/enums";

/**
 * One RFQ as its buyer sees it.
 * The buyer gets the actions for the RFQ's stage (edit, publish, compare), the number of quotes
 * received, and may remove their own files until the RFQ is awarded.
 */
export function BuyerRfqDetailPage({ id }: { id: string }) {
  const user = useUser();
  const {
    data: rfq,
    error,
    reload,
  } = useApiQuery((signal) => rfqService.get(id, signal), id);

  if (error) return <ErrorNotice error={error} onRetry={reload} />;
  if (!rfq) return <RfqDetailSkeleton />;

  return (
    <RfqDetailLayout
      rfq={rfq}
      role={UserRole.BUYER}
      subtitle={rfq.category}
      actions={<BuyerRfqActions rfq={rfq} onChanged={reload} />}
      facts={
        <Fact label="Quotes received">
          <span className="t-figure">{rfq.quoteCount ?? 0}</span>
        </Fact>
      }
      canRemoveFile={(file) =>
        rfq.status !== RfqStatus.AWARDED && file.uploadedById === user.id
      }
      onFileRemoved={reload}
    />
  );
}
