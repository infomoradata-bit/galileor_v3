"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { displayNameFor, initialsFor, useSupabaseUser } from "@/lib/supabase/useUser";
import { SoonBadge } from "./ui";

type Item = {
  label: string;
  href: string;
  soon?: boolean;
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
  {
    label: "Bank Financing",
    href: "/bank-financing",
    icon: (
      <svg {...iconProps}>
        <rect x="3" y="4" width="18" height="16" rx="2" />
        <path d="M3 10h18M7 15h4M7 18h6" />
        <path d="M12 4v6" />
      </svg>
    ),
  },
  {
    label: "Map Search",
    href: "/map-search",
    soon: true,
    icon: (
      <svg {...iconProps}>
        <path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2Z" />
        <path d="M9 4v14M15 6v14" />
      </svg>
    ),
  },
  {
    label: "Comparables",
    href: "/comparables",
    soon: true,
    icon: (
      <svg {...iconProps}>
        <path d="M4 20V10M10 20V4M16 20v-8M21 20H3" />
      </svg>
    ),
  },
  {
    label: "Cashflow Simulator",
    href: "/cashflow-simulator",
    soon: true,
    icon: (
      <svg {...iconProps}>
        <path d="M3 17s3-6 6-6 4 4 7 4 5-6 5-6" />
        <path d="M3 21h18M3 3v18" />
      </svg>
    ),
  },
  {
    label: "Risk Analysis",
    href: "/risk-analysis",
    soon: true,
    icon: (
      <svg {...iconProps}>
        <path d="M12 3 2.5 20h19L12 3Z" />
        <path d="M12 10v4M12 17.5v.5" />
      </svg>
    ),
  },
  {
    label: "Portfolio",
    href: "/portfolio",
    soon: true,
    icon: (
      <svg {...iconProps}>
        <rect x="3" y="7" width="18" height="13" rx="2" />
        <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 13h18" />
      </svg>
    ),
  },
  {
    label: "Documents",
    href: "/documents",
    soon: true,
    icon: (
      <svg {...iconProps}>
        <path d="M13 3H6a1.5 1.5 0 0 0-1.5 1.5v15A1.5 1.5 0 0 0 6 21h12a1.5 1.5 0 0 0 1.5-1.5V9.5L13 3Z" />
        <path d="M13 3v6.5h6.5" />
      </svg>
    ),
  },
  {
    label: "Reports",
    href: "/reports",
    soon: true,
    icon: (
      <svg {...iconProps}>
        <rect x="4" y="3" width="16" height="18" rx="2" />
        <path d="M8 8h8M8 12h8M8 16h5" />
      </svg>
    ),
  },
  {
    label: "Settings",
    href: "/settings",
    soon: true,
    icon: (
      <svg {...iconProps}>
        <circle cx="12" cy="12" r="3" />
        <path d="M19 12a7 7 0 0 0-.1-1.2l2-1.5-2-3.4-2.3.9a7 7 0 0 0-2-1.2L14.2 3h-4l-.4 2.6a7 7 0 0 0-2 1.2l-2.3-.9-2 3.4 2 1.5a7 7 0 0 0 0 2.4l-2 1.5 2 3.4 2.3-.9a7 7 0 0 0 2 1.2l.4 2.6h4l.4-2.6a7 7 0 0 0 2-1.2l2.3.9 2-3.4-2-1.5c.07-.4.1-.8.1-1.2Z" />
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
              {item.soon && <SoonBadge />}
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
      </div>
    </aside>
  );
}
