import { Suspense } from "react";
import { AuthCard } from "@/components/AuthCard";

export default function SignupPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-cream" />}>
      <AuthCard mode="signup" />
    </Suspense>
  );
}
