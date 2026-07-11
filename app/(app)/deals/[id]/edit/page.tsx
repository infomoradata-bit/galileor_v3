"use client";

import { useParams } from "next/navigation";
import { DealForm } from "@/components/DealForm";
import { useDeal } from "@/lib/store";

export default function EditDealPage() {
  const params = useParams<{ id: string }>();
  const deal = useDeal(params.id);

  if (!deal) {
    return <div className="p-10 text-sm text-moss">Deal not found.</div>;
  }
  return <DealForm key={deal.id} existing={deal} />;
}
