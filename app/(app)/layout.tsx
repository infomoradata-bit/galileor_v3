import { Sidebar } from "@/components/Sidebar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-cream">
      <div className="no-print">
        <Sidebar />
      </div>
      <main className="min-h-screen pl-[260px] print:pl-0">{children}</main>
    </div>
  );
}
