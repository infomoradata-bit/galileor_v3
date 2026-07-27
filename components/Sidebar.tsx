"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { displayNameFor, initialsFor, useSupabaseUser } from "@/lib/supabase/useUser";

type Item = {
  label: string;
  href: string;
  icon: React.ReactNode;
};

const iconProps = {
  className: "h-[18px] w-[18px] shrink-0",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  viewBox: "0 0 24 24",
};

const ITEMS: Item[] = [
  {
    label: "Overview",
    href: "/dashboard",
    icon: (
      <svg {...iconProps}>
        <rect x="3" y="3" width="7" height="9" rx="1.5" />
        <rect x="14" y="3" width="7" height="5" rx="1.5" />
        <rect x="14" y="12" width="7" height="9" rx="1.5" />
        <rect x="3" y="16" width="7" height="5" rx="1.5" />
      </svg>
    ),
  },
  {
    label: "Deals",
    href: "/deals",
    icon: (
      <svg {...iconProps}>
        <path d="M3 21h18" />
        <path d="M5 21V8l7-5 7 5v13" />
        <path d="M9 21v-6h6v6" />
      </svg>
    ),
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const user = useSupabaseUser();

  async function signOut() {
    await getSupabaseBrowserClient()?.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  /** Temporary preview gate — remove with PREVIEW_GATE.md */
  async function lockPreview() {
    await fetch("/api/preview-access", { method: "DELETE" });
    router.push("/preview");
    router.refresh();
  }

  return (
    <aside className="fixed inset-y-0 left-0 z-40 flex w-[260px] flex-col bg-pine text-white">
      <div className="px-6 pb-5 pt-7">
        <Link href="/dashboard" className="font-serif text-[26px] font-semibold tracking-wide">
          Paladior
        </Link>
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3">
        {ITEMS.map((item) => {
          const active =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href + "/")) ||
            (item.href === "/deals" && pathname.startsWith("/deals"));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors ${
                active
                  ? "bg-white/12 text-white"
                  : "text-white/65 hover:bg-white/8 hover:text-white"
              }`}
            >
              {item.icon}
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-white/10 px-4 py-4">
        <div className="flex items-center gap-3 px-1">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/15 text-sm font-semibold">
            {initialsFor(user)}
          </div>
          <div className="min-w-0">
            <p className="truncate text-[13px] font-medium">{displayNameFor(user)}</p>
            <p className="truncate text-[11px] text-white/50">{user?.email ?? "—"}</p>
          </div>
        </div>
        <div className="mt-3 flex items-center gap-2 px-1 text-[11px] text-white/45">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
          AI Engine: Operational
        </div>
        <button
          onClick={signOut}
          className="mt-3 flex w-full items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium text-white/65 transition-colors hover:bg-white/8 hover:text-white"
        >
          <svg {...iconProps}>
            <path d="M15 3h4a1.5 1.5 0 0 1 1.5 1.5v15A1.5 1.5 0 0 1 19 21h-4" />
            <path d="m10 17-5-5 5-5M5 12h11" />
          </svg>
          Sign out
        </button>
        {/* Temporary preview gate — remove with PREVIEW_GATE.md */}
        <button
          onClick={() => void lockPreview()}
          className="mt-1 flex w-full items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium text-white/45 transition-colors hover:bg-white/8 hover:text-white"
        >
          <svg {...iconProps}>
            <rect x="5" y="11" width="14" height="10" rx="1.5" />
            <path d="M8 11V8a4 4 0 0 1 8 0v3" />
          </svg>
          Lock preview
        </button>
      </div>
    </aside>
  );
}
