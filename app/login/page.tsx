import { Suspense } from "react";
import { AuthCard } from "@/components/AuthCard";

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-cream" />}>
      <AuthCard mode="login" />
    </Suspense>
  );
}
