"use client";

import { useParams } from "next/navigation";
import { DealForm } from "@/components/DealForm";
import { useDeal, useDealsLoaded } from "@/lib/store";

export default function EditDealPage() {
  const params = useParams<{ id: string }>();
  const deal = useDeal(params.id);
  const loaded = useDealsLoaded();

  if (!deal) {
    return (
      <div className="p-10 text-sm text-moss">{loaded ? "Deal not found." : "Loading deal…"}</div>
    );
  }
  return <DealForm key={deal.id} existing={deal} />;
}
