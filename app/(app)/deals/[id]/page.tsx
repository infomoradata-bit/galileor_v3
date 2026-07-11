"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { getDeal, useDeal } from "@/lib/store";
import { DealAnalysisView } from "@/components/analysis/DealAnalysisView";

export default function DealAnalysisPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const deal = useDeal(params.id);
  const mounted = useRef(false);

  useEffect(() => {
    mounted.current = true;
    if (!getDeal(params.id)) router.replace("/deals");
  }, [params.id, router]);

  if (!deal) {
    return <div className="p-10 text-sm text-moss">Loading deal…</div>;
  }

  return <DealAnalysisView deal={deal} />;
}
