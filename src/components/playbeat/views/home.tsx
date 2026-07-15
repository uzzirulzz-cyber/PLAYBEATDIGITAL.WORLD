"use client";

import { useEffect, useState } from "react";
import { CATEGORIES, STORE, TRENDING_ITEMS } from "@/lib/store-config";
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
      {/* Hero — centered with video background + sakura petals overlay */}
      <section className="relative mt-6 overflow-hidden rounded-2xl border border-border">
        {/* Video background */}
        <video
          autoPlay
          muted
          loop
          playsInline
          className="absolute inset-0 h-full w-full object-cover"
          poster="/hero-bg.jpg"
        >
          <source src="https://cdn.jsdelivr.net/gh/uzzirulzz-cyber/freshcopy@main/public/hero-video.mp4" type="video/mp4" />
          <source src="/hero-video.mp4" type="video/mp4" />
        </video>
        {/* Sakura petals overlay */}
        <div
          className="absolute inset-0 bg-cover bg-center opacity-30 mix-blend-screen"
          style={{ backgroundImage: "url(/hero-sakura.webp)" }}
        />
        {/* Dark gradient overlay for readability (top + bottom fade) */}
        <div className="absolute inset-0 bg-gradient-to-b from-background/85 via-background/55 to-background/95" />
        {/* Side fades for centered focus */}
        <div className="absolute inset-0 bg-gradient-to-r from-background/70 via-transparent to-background/70" />

        {/* Centered content */}
        <div className="relative flex flex-col items-center justify-center py-16 text-center sm:py-20 lg:py-28">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-background/60 px-4 py-1.5 text-xs text-muted-foreground backdrop-blur">
            <Zap className="h-3.5 w-3.5 text-chart-1" /> Instant digital delivery worldwide
          </span>
          <h1 className="mt-5 text-4xl font-bold leading-tight text-foreground sm:text-5xl lg:text-6xl">
            Gaming top-ups,<br />
            <span className="bg-gradient-to-r from-primary via-foreground to-primary bg-clip-text text-transparent">
              delivered instantly.
            </span>
          </h1>
          <p className="mt-4 max-w-xl text-sm text-foreground/80 sm:text-base">
            {STORE.tagline} PUBG, Call of Duty, Free Fire, Steam & more — secured by Bank Alfalah Payment Gateway.
          </p>

          {/* Centered search */}
          <form onSubmit={submitSearch} className="relative mt-6 w-full max-w-md">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search gaming top-ups…"
              className="h-12 rounded-xl border-border bg-background/70 pl-10 pr-28 text-base backdrop-blur"
            />
            <Button type="submit" className="absolute right-1.5 top-1.5 h-9 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90">
              Search
            </Button>
          </form>

          {/* Centered stats */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-6">
            <Stat value="52+" label="Live products" />
            <span className="hidden h-8 w-px bg-border sm:block" />
            <Stat value="7" label="Game categories" />
            <span className="hidden h-8 w-px bg-border sm:block" />
            <Stat value="24/7" label="Support" />
          </div>

          {/* Category quick-links (centered pills) */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
            {CATEGORIES.map((c) => (
              <button
                key={c.id}
                onClick={() => goShop(c.id)}
                className="group inline-flex items-center gap-1.5 rounded-full border border-border bg-background/60 px-3 py-1.5 text-xs font-medium text-foreground backdrop-blur transition-colors hover:border-primary/40 hover:bg-secondary/60"
              >
                <CategoryIcon name={c.icon} className="h-3.5 w-3.5 text-primary" />
                {c.name}
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

      {/* Trending Items — from items.html */}
      <section className="mt-12">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-foreground">🔥 See What's Trending — Items</h2>
          <Button variant="ghost" size="sm" onClick={() => goShop()} className="text-muted-foreground">
            View all <ArrowRight className="ml-1 h-4 w-4" />
          </Button>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {TRENDING_ITEMS.map((item) => (
            <TrendingCard key={item.slug} item={item} />
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

      {/* Mid-section video banner */}
      <section className="mt-12 overflow-hidden rounded-2xl border border-border relative">
        <video
          autoPlay
          muted
          loop
          playsInline
          className="absolute inset-0 h-full w-full object-cover"
        >
          <source src="https://cdn.jsdelivr.net/gh/uzzirulzz-cyber/freshcopy@main/public/mid-video.mp4" type="video/mp4" />
          <source src="/mid-video.mp4" type="video/mp4" />
        </video>
        {/* Dark overlay for readability */}
        <div className="absolute inset-0 bg-gradient-to-b from-background/70 via-background/40 to-background/70" />
        <div className="absolute inset-0 bg-gradient-to-r from-background/60 via-transparent to-background/60" />
        {/* Centered content */}
        <div className="relative flex flex-col items-center justify-center py-16 text-center sm:py-20 lg:py-24">
          <h2 className="text-2xl font-bold text-foreground sm:text-3xl lg:text-4xl">
            Level up your game
          </h2>
          <p className="mt-3 max-w-md text-sm text-foreground/80 sm:text-base">
            Instant top-ups for PUBG, Call of Duty, Free Fire & more. Delivered to your account in seconds.
          </p>
          <Button
            className="mt-6 bg-primary text-primary-foreground hover:bg-primary/90"
            onClick={() => goShop()}
          >
            Browse all top-ups <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </section>

      {/* Trust banner */}
      <section className="mt-12 grid gap-4 sm:grid-cols-3">
        <TrustTile icon={CreditCard} title="Secure checkout" text="Pay securely with JazzCash, Bank Alfalah or Payrails. Multiple payment options.." />
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

      {/* Lower video banner — before footer */}
      <section className="mt-12 mb-4 overflow-hidden rounded-2xl border border-border relative">
        <video
          autoPlay
          muted
          loop
          playsInline
          className="absolute inset-0 h-full w-full object-cover"
        >
          <source src="https://cdn.jsdelivr.net/gh/uzzirulzz-cyber/freshcopy@main/public/lower-video.mp4" type="video/mp4" />
          <source src="/lower-video.mp4" type="video/mp4" />
        </video>
        {/* Dark overlay for readability */}
        <div className="absolute inset-0 bg-gradient-to-b from-background/70 via-background/40 to-background/70" />
        <div className="absolute inset-0 bg-gradient-to-r from-background/60 via-transparent to-background/60" />
        {/* Centered content */}
        <div className="relative flex flex-col items-center justify-center py-16 text-center sm:py-20 lg:py-24">
          <h2 className="text-2xl font-bold text-foreground sm:text-3xl lg:text-4xl">
            Ready to play?
          </h2>
          <p className="mt-3 max-w-md text-sm text-foreground/80 sm:text-base">
            Join thousands of gamers getting instant top-ups every day. Secure checkout, instant delivery, 24/7 support.
          </p>
          <Button
            className="mt-6 bg-primary text-primary-foreground hover:bg-primary/90"
            onClick={() => goShop()}
          >
            Start shopping <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </section>
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="text-center">
      <p className="text-2xl font-bold text-foreground">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
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

function TrendingCard({ item }: { item: import("@/lib/store-config").TrendingItem }) {
  const { addToCart, goCheckout } = useStore();
  const [added, setAdded] = useState(false);

  function handleAdd(e: React.MouseEvent) {
    e.stopPropagation();
    addToCart({
      productId: item.slug,
      slug: item.slug,
      name: item.name,
      category: item.category,
      icon: item.icon,
      gradient: item.gradient,
      image: item.image,
      price: item.price,
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 1400);
  }

  function handleBuyNow(e: React.MouseEvent) {
    e.stopPropagation();
    addToCart(
      {
        productId: item.slug,
        slug: item.slug,
        name: item.name,
        category: item.category,
        icon: item.icon,
        gradient: item.gradient,
        image: item.image,
        price: item.price,
      },
      1
    );
    goCheckout();
  }

  return (
    <div className="playbeat-card group relative flex cursor-pointer flex-col overflow-hidden rounded-xl border border-border bg-card">
      <div className="relative aspect-[4/3] w-full overflow-hidden">
        <img
          src={item.image}
          alt={item.name}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
        {item.badge && (
          <span className="absolute left-3 top-3 rounded-md bg-background/90 px-2 py-1 text-[10px] font-bold text-chart-1 backdrop-blur">
            {item.badge}
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col p-4">
        <h3 className="text-sm font-semibold text-foreground">{item.name}</h3>
        <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{item.description}</p>
        <div className="mt-2 flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            {item.sales.toLocaleString()} sales
          </span>
          <span className="text-sm font-bold text-foreground">${item.price}</span>
        </div>
        {/* Add to Cart + Buy Now */}
        <div className="mt-3 flex gap-2">
          <Button
            size="sm"
            variant="outline"
            className="flex-1"
            onClick={handleAdd}
          >
            {added ? "✓ Added" : "Add to Cart"}
          </Button>
          <Button
            size="sm"
            className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
            onClick={handleBuyNow}
          >
            Buy Now
          </Button>
        </div>
      </div>
    </div>
  );
}
