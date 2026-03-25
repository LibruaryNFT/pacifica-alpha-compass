"use client";

import { HelpCircle } from "lucide-react";

interface TooltipProps {
  text: string;
  children?: React.ReactNode;
}

export default function Tooltip({ text, children }: TooltipProps) {
  return (
    <span className="group relative inline-flex cursor-help items-center">
      {children || <HelpCircle className="h-3.5 w-3.5 text-muted/50 transition-colors group-hover:text-muted" />}
      <span className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 w-56 -translate-x-1/2 rounded-lg border border-border bg-background px-3 py-2 text-xs text-muted opacity-0 shadow-xl transition-opacity group-hover:opacity-100">
        {text}
        <span className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-border" />
      </span>
    </span>
  );
}
