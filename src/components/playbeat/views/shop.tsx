"use client";

import { useEffect, useMemo, useState } from "react";
import { CATEGORIES } from "@/lib/store-config";
import { api, type Product } from "@/lib/api";
import { ProductCard } from "../product-card";
import { CategoryIcon } from "../icon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, SlidersHorizontal, X } from "lucide-react";

export function ShopView({ initialCategory }: { initialCategory?: string }) {
  const [products, setProducts] = useState<Product[] | null>(null);
  const [loadedFor, setLoadedFor] = useState<string | undefined | null>(null);
  const [category, setCategory] = useState<string | undefined>(initialCategory);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<"featured" | "price-asc" | "price-desc" | "name">("featured");

  // Listen to navbar search events
  useEffect(() => {
    function onSearch(e: Event) {
      setQuery((e as CustomEvent<string>).detail as string);
    }
    window.addEventListener("playbeat:search", onSearch as EventListener);
    return () => window.removeEventListener("playbeat:search", onSearch as EventListener);
  }, []);

  // Load when category changes (no synchronous setState — derive loading from loadedFor)
  useEffect(() => {
    let cancelled = false;
    api
      .listProducts({ category, limit: 100 })
      .then((list) => {
        if (!cancelled) {
          setProducts(list);
          setLoadedFor(category);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setProducts([]);
          setLoadedFor(category);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [category]);

  const isLoading = loadedFor !== category;
  const effectiveProducts = isLoading ? null : products;

  const filtered = useMemo(() => {
    if (!effectiveProducts) return null;
    let list = effectiveProducts;
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.brand.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q)
      );
    }
    list = [...list];
    switch (sort) {
      case "price-asc":
        list.sort((a, b) => a.price - b.price);
        break;
      case "price-desc":
        list.sort((a, b) => b.price - a.price);
        break;
      case "name":
        list.sort((a, b) => a.name.localeCompare(b.name));
        break;
      default:
        list.sort((a, b) => Number(b.featured) - Number(a.featured));
    }
    return list;
  }, [effectiveProducts, query, sort]);

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Shop all products</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Browse our full catalogue of digital products — instant delivery worldwide.
        </p>
      </div>

      {/* Search + sort bar */}
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search products…"
            className="pl-9 bg-card"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as typeof sort)}
            className="h-10 rounded-md border border-border bg-card px-3 text-sm text-foreground outline-none focus:border-primary"
          >
            <option value="featured">Featured first</option>
            <option value="price-asc">Price: low to high</option>
            <option value="price-desc">Price: high to low</option>
            <option value="name">Name: A–Z</option>
          </select>
        </div>
      </div>

      {/* Category filter chips */}
      <div className="no-scrollbar -mx-4 mb-6 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
        <Button
          size="sm"
          variant={!category ? "default" : "outline"}
          onClick={() => setCategory(undefined)}
          className="shrink-0"
        >
          All
        </Button>
        {CATEGORIES.map((c) => (
          <Button
            key={c.id}
            size="sm"
            variant={category === c.id ? "default" : "outline"}
            onClick={() => setCategory(c.id)}
            className="shrink-0 gap-1.5"
          >
            <CategoryIcon name={c.icon} className="h-3.5 w-3.5" />
            {c.name}
          </Button>
        ))}
      </div>

      {/* Grid */}
      {filtered === null ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => <CardSkeleton key={i} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border py-20 text-center">
          <Search className="h-10 w-10 text-muted-foreground/50" />
          <p className="text-muted-foreground">No products found{query ? ` for “${query}”` : ""}.</p>
          <Button variant="outline" onClick={() => { setQuery(""); setCategory(undefined); }}>
            Clear filters
          </Button>
        </div>
      ) : (
        <>
          <p className="mb-4 text-sm text-muted-foreground">{filtered.length} product{filtered.length === 1 ? "" : "s"}</p>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {filtered.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        </>
      )}
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
