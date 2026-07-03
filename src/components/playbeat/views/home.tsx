"use client";

import { useEffect, useState } from "react";
import { CATEGORIES, STORE } from "@/lib/store-config";
import { api, type Product } from "@/lib/api";
import { useStore } from "@/store/cart";
import { ProductCard } from "../product-card";
import { CategoryIcon } from "../icon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, ArrowRight, Zap, ShieldCheck, Globe, CreditCard } from "lucide-react";

export function HomeView() {
  const { goShop } = useStore();
  const [featured, setFeatured] = useState<Product[] | null>(null);
  const [all, setAll] = useState<Product[] | null>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    api.listProducts({ featured: true, limit: 8 }).then(setFeatured).catch(() => setFeatured([]));
    api.listProducts({ limit: 12 }).then(setAll).catch(() => setAll([]));
  }, []);

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    goShop();
    if (query.trim()) window.dispatchEvent(new CustomEvent("playbeat:search", { detail: query.trim() }));
  }

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6">
      {/* Hero */}
      <section className="playbeat-sheen relative mt-6 overflow-hidden rounded-2xl border border-border bg-card">
        <div className="absolute inset-0 bg-gradient-to-br from-secondary/60 via-card to-background" />
        <div className="relative grid gap-8 p-6 sm:p-10 lg:grid-cols-2 lg:items-center">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-secondary/60 px-3 py-1 text-xs text-muted-foreground">
              <Zap className="h-3.5 w-3.5 text-chart-1" /> Instant digital delivery worldwide
            </span>
            <h1 className="mt-4 text-3xl font-bold leading-tight text-foreground sm:text-4xl lg:text-5xl">
              Digital products,<br />
              <span className="bg-gradient-to-r from-primary via-foreground to-primary bg-clip-text text-transparent">
                delivered instantly.
              </span>
            </h1>
            <p className="mt-4 max-w-md text-sm text-muted-foreground sm:text-base">
              {STORE.tagline} Game keys, gift cards, AI tools and subscriptions — all in one place, secured by the UBL Payment Gateway.
            </p>

            <form onSubmit={submitSearch} className="relative mt-6 max-w-md">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search 1000+ digital products…"
                className="h-12 rounded-xl border-border bg-background/70 pl-10 pr-28 text-base"
              />
              <Button type="submit" className="absolute right-1.5 top-1.5 h-9 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90">
                Search
              </Button>
            </form>

            {/* Stats */}
            <div className="mt-8 grid grid-cols-3 gap-4 max-w-md">
              <Stat value="17+" label="Live products" />
              <Stat value="8" label="Categories" />
              <Stat value="24/7" label="Support" />
            </div>
          </div>

          {/* Category mini-grid */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-4">
            {CATEGORIES.slice(0, 8).map((c) => (
              <button
                key={c.id}
                onClick={() => goShop(c.id)}
                className="group flex flex-col items-center gap-2 rounded-xl border border-border bg-background/50 p-4 transition-colors hover:border-primary/40 hover:bg-secondary/60"
              >
                <span className={`grid h-12 w-12 place-items-center rounded-lg bg-gradient-to-br ${c.gradient} text-white transition-transform group-hover:scale-110`}>
                  <CategoryIcon name={c.icon} className="h-6 w-6" />
                </span>
                <span className="text-center text-xs font-medium text-foreground">{c.name}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Category strip */}
      <section className="mt-10">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-foreground">Browse by category</h2>
          <Button variant="ghost" size="sm" onClick={() => goShop()} className="text-muted-foreground">
            All <ArrowRight className="ml-1 h-4 w-4" />
          </Button>
        </div>
        <div className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
          {CATEGORIES.map((c) => (
            <button
              key={c.id}
              onClick={() => goShop(c.id)}
              className="flex w-44 shrink-0 items-center gap-3 rounded-xl border border-border bg-card p-3 text-left transition-colors hover:border-primary/40"
            >
              <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-gradient-to-br ${c.gradient} text-white`}>
                <CategoryIcon name={c.icon} className="h-5 w-5" />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold text-foreground">{c.name}</span>
                <span className="block truncate text-[11px] text-muted-foreground">{c.blurb}</span>
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* Featured */}
      <section className="mt-12">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-foreground">Featured deals</h2>
          <Button variant="ghost" size="sm" onClick={() => goShop()} className="text-muted-foreground">
            View all <ArrowRight className="ml-1 h-4 w-4" />
          </Button>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {featured === null
            ? Array.from({ length: 8 }).map((_, i) => <CardSkeleton key={i} />)
            : featured.map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
      </section>

      {/* Trust banner */}
      <section className="mt-12 grid gap-4 sm:grid-cols-3">
        <TrustTile icon={CreditCard} title="UBL secure checkout" text="Pay with Visa & Mastercard through the UBL Internet Payment Gateway with 3D Secure." />
        <TrustTile icon={ShieldCheck} title="Genuine licenses" text="Every key and subscription is 100% authentic and activation-guaranteed." />
        <TrustTile icon={Globe} title="Global delivery" text="All products are digital and region-free — usable anywhere in the world." />
      </section>

      {/* All products */}
      <section className="mt-12 pb-4">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-foreground">All products</h2>
          <Button variant="ghost" size="sm" onClick={() => goShop()} className="text-muted-foreground">
            Shop all <ArrowRight className="ml-1 h-4 w-4" />
          </Button>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {all === null
            ? Array.from({ length: 8 }).map((_, i) => <CardSkeleton key={i} />)
            : all.map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
      </section>
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-lg border border-border bg-background/40 p-3">
      <p className="text-xl font-bold text-foreground">{value}</p>
      <p className="text-[11px] text-muted-foreground">{label}</p>
    </div>
  );
}

function TrustTile({ icon: Icon, title, text }: { icon: typeof Zap; title: string; text: string }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-border bg-card p-4">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-secondary text-primary">
        <Icon className="h-5 w-5" />
      </span>
      <div>
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground">{text}</p>
      </div>
    </div>
  );
}

function CardSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <Skeleton className="aspect-[4/3] w-full rounded-none bg-secondary" />
      <div className="space-y-2 p-4">
        <Skeleton className="h-3 w-1/3 bg-secondary" />
        <Skeleton className="h-4 w-full bg-secondary" />
        <Skeleton className="h-4 w-2/3 bg-secondary" />
        <div className="flex justify-between pt-2">
          <Skeleton className="h-5 w-16 bg-secondary" />
          <Skeleton className="h-8 w-16 bg-secondary" />
        </div>
      </div>
    </div>
  );
}
