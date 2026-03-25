"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Compass, BarChart3, Wallet, Brain, Fish } from "lucide-react";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: BarChart3 },
  { href: "/portfolio", label: "Portfolio", icon: Wallet },
  { href: "/scanner", label: "Scanner", icon: Compass },
  { href: "/ai", label: "AI Consensus", icon: Brain },
  { href: "/whales", label: "Whales", icon: Fish },
];

export default function Header() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2">
          <Compass className="h-6 w-6 text-primary" />
          <span className="text-lg font-bold">
            <span className="text-primary">Alpha</span>{" "}
            <span className="text-foreground">Compass</span>
          </span>
        </Link>

        <nav className="flex items-center gap-1">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const isActive = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition-colors ${
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted hover:text-foreground"
                }`}
              >
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          <span className="rounded-full bg-success/20 px-2 py-0.5 text-xs text-success">
            Testnet
          </span>
        </div>
      </div>
    </header>
  );
}
