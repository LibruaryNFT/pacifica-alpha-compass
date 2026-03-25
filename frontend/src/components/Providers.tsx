"use client";

import dynamic from "next/dynamic";

const PrivyProviderWrapper = dynamic(
  () => import("./PrivyWrapper"),
  { ssr: false }
);

export default function Providers({ children }: { children: React.ReactNode }) {
  return <PrivyProviderWrapper>{children}</PrivyProviderWrapper>;
}
