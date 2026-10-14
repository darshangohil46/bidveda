import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ComparisonPage } from "@/components/quote/ComparisonPage";
import { isUuid } from "@/utils/general";

export const metadata: Metadata = { title: "Compare quotes" };

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!isUuid(id)) notFound();
  return <ComparisonPage rfqId={id} />;
}
