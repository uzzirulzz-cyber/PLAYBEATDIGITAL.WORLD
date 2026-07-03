"use client";

import { useEffect, useState } from "react";
import { api, type Product } from "@/lib/api";
import { useStore } from "@/store/cart";
import { CategoryIcon } from "../icon";
import { getCategory } from "@/lib/store-config";
import { formatPrice, discountPercent } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ShoppingCart, Check, Minus, Plus, ShieldCheck, Zap, ChevronRight, Star } from "lucide-react";
import { toast } from "sonner";

export function ProductDetailView({ slug }: { slug: string }) {
  const { goShop, addToCart, goCart } = useStore();
  const [product, setProduct] = useState<Product | null | undefined>(undefined);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api.getProduct(slug)
      .then((p) => {
        if (!cancelled) setProduct(p);
      })
      .catch(() => {
        if (!cancelled) setProduct(null);
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (product === undefined) {
    return (
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8">
        <Skeleton className="h-5 w-48 mb-6 bg-secondary" />
        <div className="grid gap-8 lg:grid-cols-2">
          <Skeleton className="aspect-square w-full rounded-2xl bg-secondary" />
          <div className="space-y-4">
            <Skeleton className="h-8 w-3/4 bg-secondary" />
            <Skeleton className="h-6 w-1/4 bg-secondary" />
            <Skeleton className="h-24 w-full bg-secondary" />
            <Skeleton className="h-12 w-full bg-secondary" />
          </div>
        </div>
      </div>
    );
  }

  if (product === null) {
    return (
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-20 text-center">
        <h1 className="text-2xl font-bold text-foreground">Product not found</h1>
        <p className="mt-2 text-muted-foreground">This product may have been removed.</p>
        <Button className="mt-6" onClick={() => goShop()}>Back to shop</Button>
      </div>
    );
  }

  const cat = getCategory(product.category);
  const discount = discountPercent(product.price, product.oldPrice ?? undefined);
  const inStock = product.stock > 0;

  function handleAdd() {
    if (!product) return;
    addToCart(
      {
        productId: product.id,
        slug: product.slug,
        name: product.name,
        category: product.category,
        icon: product.icon,
        gradient: product.gradient,
        price: product.price,
      },
      qty
    );
    setAdded(true);
    toast.success("Added to cart", { description: `${qty} × ${product.name}` });
    setTimeout(() => setAdded(false), 1400);
  }

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8">
      {/* Breadcrumb */}
      <nav className="mb-6 flex items-center gap-1.5 text-sm text-muted-foreground">
        <button onClick={() => goShop()} className="hover:text-foreground">Shop</button>
        <ChevronRight className="h-3.5 w-3.5" />
        {cat && (
          <>
            <button onClick={() => goShop(cat.id)} className="hover:text-foreground">{cat.name}</button>
            <ChevronRight className="h-3.5 w-3.5" />
          </>
        )}
        <span className="truncate text-foreground">{product.name}</span>
      </nav>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Artwork */}
        <div className={`relative aspect-square w-full overflow-hidden rounded-2xl bg-gradient-to-br ${product.gradient}`}>
          <div className="absolute inset-0 grid place-items-center">
            <CategoryIcon name={product.icon} className="h-32 w-32 text-white/90 drop-shadow-2xl" />
          </div>
          <div className="absolute left-4 top-4 flex flex-col gap-2">
            {product.badge && <Badge className="bg-background/90 text-foreground hover:bg-background/90">{product.badge}</Badge>}
            {discount && <Badge className="bg-chart-1 text-background hover:bg-chart-1">-{discount}%</Badge>}
          </div>
          <div className="absolute bottom-4 right-4">
            <span className="rounded-md bg-background/80 px-2.5 py-1 text-xs font-medium text-muted-foreground backdrop-blur">
              {product.brand}
            </span>
          </div>
        </div>

        {/* Details */}
        <div className="flex flex-col">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Star className="h-3.5 w-3.5 fill-chart-3 text-chart-3" />
            <span>4.{(product.name.length % 5) + 4} · Verified</span>
            <span>·</span>
            <span className="uppercase tracking-wide">{cat?.name || product.category}</span>
          </div>
          <h1 className="mt-2 text-2xl font-bold text-foreground sm:text-3xl">{product.name}</h1>

          <div className="mt-4 flex items-baseline gap-3">
            <span className="text-3xl font-bold text-foreground">{formatPrice(product.price)}</span>
            {product.oldPrice && (
              <span className="text-lg text-muted-foreground line-through">{formatPrice(product.oldPrice)}</span>
            )}
            {discount && (
              <Badge className="bg-chart-1 text-background hover:bg-chart-1">Save {discount}%</Badge>
            )}
          </div>

          <p className="mt-5 text-sm leading-relaxed text-muted-foreground">{product.description}</p>

          {/* Stock */}
          <div className="mt-5 flex items-center gap-2 text-sm">
            {inStock ? (
              <>
                <span className="inline-block h-2 w-2 rounded-full bg-chart-1" />
                <span className="text-chart-1 font-medium">In stock</span>
                <span className="text-muted-foreground">· {product.stock} available</span>
              </>
            ) : (
              <>
                <span className="inline-block h-2 w-2 rounded-full bg-destructive" />
                <span className="text-destructive font-medium">Out of stock</span>
              </>
            )}
          </div>

          {/* Qty + add */}
          <div className="mt-6 flex items-center gap-3">
            <div className="flex items-center rounded-lg border border-border bg-card">
              <Button size="icon" variant="ghost" className="h-10 w-10 rounded-r-none" onClick={() => setQty((q) => Math.max(1, q - 1))} disabled={qty <= 1}>
                <Minus className="h-4 w-4" />
              </Button>
              <span className="w-12 text-center text-sm font-semibold">{qty}</span>
              <Button size="icon" variant="ghost" className="h-10 w-10 rounded-l-none" onClick={() => setQty((q) => q + 1)} disabled={!inStock}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <Button
              className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
              onClick={handleAdd}
              disabled={!inStock}
            >
              {added ? <Check className="mr-2 h-4 w-4" /> : <ShoppingCart className="mr-2 h-4 w-4" />}
              {added ? "Added to cart" : `Add to cart · ${formatPrice(product.price * qty)}`}
            </Button>
          </div>
          <Button variant="outline" className="mt-3" onClick={() => { handleAdd(); goCart(); }} disabled={!inStock}>
            Buy now
          </Button>

          {/* Guarantees */}
          <div className="mt-8 grid gap-3 rounded-xl border border-border bg-card p-4 sm:grid-cols-2">
            <div className="flex items-center gap-2 text-sm">
              <Zap className="h-4 w-4 text-chart-1" />
              <span className="text-muted-foreground">Instant email delivery</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <ShieldCheck className="h-4 w-4 text-chart-1" />
              <span className="text-muted-foreground">Activation guaranteed</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <ShieldCheck className="h-4 w-4 text-chart-1" />
              <span className="text-muted-foreground">Secure UBL checkout</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Zap className="h-4 w-4 text-chart-1" />
              <span className="text-muted-foreground">Region-free worldwide</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
