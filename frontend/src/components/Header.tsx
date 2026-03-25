"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Compass,
  BarChart3,
  Wallet,
  Brain,
  Fish,
  ArrowRightLeft,
  Gift,
  FlaskConical,
  Zap,
  Menu,
  X,
  Layers,
} from "lucide-react";
import dynamic from "next/dynamic";

const PRIMARY_NAV = [
  { href: "/", label: "Dashboard", icon: BarChart3 },
  { href: "/alpha", label: "Alpha Score", icon: Zap },
  { href: "/ai", label: "AI Consensus", icon: Brain },
  { href: "/portfolio", label: "Portfolio", icon: Wallet },
];

const SECONDARY_NAV = [
  { href: "/scanner", label: "Scanner", icon: Compass },
  { href: "/whales", label: "Whales", icon: Fish },
  { href: "/bridge", label: "Bridge", icon: ArrowRightLeft },
  { href: "/referrals", label: "Referrals", icon: Gift },
  { href: "/testnet", label: "Testnet", icon: FlaskConical },
  { href: "/architecture", label: "Architecture", icon: Layers },
];

const WalletButton = dynamic(() => import("./WalletButton"), {
  ssr: false,
  loading: () => (
    <span className="rounded-lg bg-card px-4 py-1.5 text-sm text-muted">
      Loading...
    </span>
  ),
});

export default function Header() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <Compass className="h-6 w-6 text-primary" />
          <span className="text-lg font-bold">
            <span className="text-primary">Alpha</span>{" "}
            <span className="text-foreground">Compass</span>
          </span>
        </Link>

        {/* Desktop nav — primary items only */}
        <nav className="hidden items-center gap-1 md:flex">
          {PRIMARY_NAV.map(({ href, label, icon: Icon }) => {
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
                {label}
              </Link>
            );
          })}
          {/* More dropdown */}
          <div className="group relative">
            <button className="flex items-center gap-1 rounded-md px-3 py-1.5 text-sm text-muted transition-colors hover:text-foreground">
              More
            </button>
            <div className="pointer-events-none absolute right-0 top-full z-50 w-48 rounded-lg border border-border bg-background py-1 opacity-0 shadow-xl transition-all group-hover:pointer-events-auto group-hover:opacity-100">
              {SECONDARY_NAV.map(({ href, label, icon: Icon }) => {
                const isActive = pathname === href;
                return (
                  <Link
                    key={href}
                    href={href}
                    className={`flex items-center gap-2 px-4 py-2 text-sm transition-colors ${
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "text-muted hover:bg-card hover:text-foreground"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {label}
                  </Link>
                );
              })}
            </div>
          </div>
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-2">
          <div className="hidden sm:block">
            <WalletButton />
          </div>
          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="rounded-md p-1.5 text-muted hover:text-foreground md:hidden"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="border-t border-border bg-background md:hidden">
          <nav className="mx-auto max-w-7xl space-y-1 px-4 py-3">
            {[...PRIMARY_NAV, ...SECONDARY_NAV].map(({ href, label, icon: Icon }) => {
              const isActive = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors ${
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted hover:bg-card hover:text-foreground"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </Link>
              );
            })}
            <div className="border-t border-border pt-3">
              <WalletButton />
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
