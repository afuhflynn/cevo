"use client";

import { NuqsAdapter } from "nuqs/adapters/next/app";
import type * as React from "react";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/toast";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <Toaster>
        <NuqsAdapter>{children}</NuqsAdapter>
      </Toaster>
    </ThemeProvider>
  );
}
