"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useDeal, useDealsLoaded, deleteDeal } from "@/lib/store";
import { DealAnalysisView } from "@/components/analysis/DealAnalysisView";

export default function DealAnalysisPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const deal = useDeal(params.id);
  const loaded = useDealsLoaded();

  useEffect(() => {
    if (loaded && !deal) router.replace("/deals");
  }, [loaded, deal, router]);

  if (!deal) {
    return <div className="p-10 text-sm text-moss">Loading deal…</div>;
  }

  return (
    <DealAnalysisView
      deal={deal}
      onDelete={(id) => {
        deleteDeal(id);
        router.replace("/deals");
      }}
    />
  );
}
