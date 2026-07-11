"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Redirect legacy new-deal route into the deals workspace metrics view. */
export default function NewDealPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/deals?new=1");
  }, [router]);
  return null;
}
