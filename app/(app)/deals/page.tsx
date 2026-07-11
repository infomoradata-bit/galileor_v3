import { Suspense } from "react";
import DealsPageContent from "./DealsPageContent";

export default function DealsPage() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center text-sm text-moss">Loading deals…</div>}>
      <DealsPageContent />
    </Suspense>
  );
}
