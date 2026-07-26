import { redirect } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getCurrentUser } from "@/lib/supabase/server";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  // Fail closed: protected app shell always requires a real Supabase session.
  if (!isSupabaseConfigured) redirect("/login?error=" + encodeURIComponent("Supabase is not configured."));
  if (!(await getCurrentUser())) redirect("/login");

  return (
    <div className="min-h-screen bg-cream">
      <div className="no-print">
        <Sidebar />
      </div>
      <main className="min-h-screen pl-[260px] print:pl-0">{children}</main>
    </div>
  );
}
