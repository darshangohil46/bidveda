import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { QuoteFormPage } from "@/components/quote/QuoteFormPage";
import { isUuid } from "@/utils/general";

export const metadata: Metadata = { title: "Submit a quote" };

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!isUuid(id)) notFound();
  return <QuoteFormPage rfqId={id} />;
}
