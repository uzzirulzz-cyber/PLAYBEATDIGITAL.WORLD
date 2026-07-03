"use client";

import { STORE } from "@/lib/store-config";
import { Zap } from "lucide-react";

export function Ticker() {
  // Duplicate items so the marquee loops seamlessly (translateX -50%)
  const items = [...STORE.tickerItems, ...STORE.tickerItems];
  return (
    <div className="w-full border-y border-border bg-secondary/40 overflow-hidden">
      <div className="playbeat-ticker-track py-2.5">
        {items.map((item, i) => (
          <span key={i} className="inline-flex items-center gap-2 px-6 text-sm text-muted-foreground">
            <Zap className="h-3.5 w-3.5 text-chart-1" />
            <span className="font-medium tracking-wide">{item}</span>
            <span className="ml-6 text-border">•</span>
          </span>
        ))}
      </div>
    </div>
  );
}
