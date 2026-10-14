import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { VendorRfqDetailPage } from "@/components/rfq/VendorRfqDetailPage";
import { isUuid } from "@/utils/general";

export const metadata: Metadata = { title: "RFQ" };

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!isUuid(id)) notFound();
  return <VendorRfqDetailPage id={id} />;
}
