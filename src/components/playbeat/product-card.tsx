"use client";

import type { Product } from "@/lib/api";
import { useStore } from "@/store/cart";
import { CategoryIcon } from "./icon";
import { formatPrice, discountPercent } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShoppingCart, Check, Star } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export function ProductCard({ product }: { product: Product }) {
  const { goProduct, addToCart } = useStore();
  const [added, setAdded] = useState(false);
  const discount = discountPercent(product.price, product.oldPrice ?? undefined);

  function handleAdd(e: React.MouseEvent) {
    e.stopPropagation();
    addToCart({
      productId: product.id,
      slug: product.slug,
      name: product.name,
      category: product.category,
      icon: product.icon,
      gradient: product.gradient,
      price: product.price,
    });
    setAdded(true);
    toast.success("Added to cart", { description: product.name });
    setTimeout(() => setAdded(false), 1400);
  }

  return (
    <div
      onClick={() => goProduct(product.slug)}
      className="playbeat-card group relative flex cursor-pointer flex-col overflow-hidden rounded-xl border border-border bg-card"
    >
      {/* Artwork */}
      <div className={`relative aspect-[4/3] w-full bg-gradient-to-br ${product.gradient}`}>
        <div className="absolute inset-0 grid place-items-center">
          <CategoryIcon name={product.icon} className="h-14 w-14 text-white/90 drop-shadow-lg transition-transform duration-300 group-hover:scale-110" />
        </div>
        {/* badges */}
        <div className="absolute left-3 top-3 flex flex-col gap-1.5">
          {product.badge && (
            <Badge className="bg-background/90 text-foreground hover:bg-background/90 backdrop-blur">
              {product.badge}
            </Badge>
          )}
          {discount && (
            <Badge className="bg-chart-1 text-background hover:bg-chart-1">-{discount}%</Badge>
          )}
        </div>
        {product.stock <= 0 && (
          <div className="absolute inset-0 grid place-items-center bg-background/60 backdrop-blur-sm">
            <span className="rounded-md bg-background px-3 py-1 text-xs font-semibold text-muted-foreground">Out of stock</span>
          </div>
        )}
        {/* brand chip */}
        <div className="absolute bottom-3 right-3">
          <span className="rounded-md bg-background/80 px-2 py-0.5 text-[10px] font-medium text-muted-foreground backdrop-blur">
            {product.brand}
          </span>
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col p-4">
        <div className="mb-1 flex items-center gap-1 text-[11px] text-muted-foreground">
          <Star className="h-3 w-3 fill-chart-3 text-chart-3" />
          <span>4.{(product.name.length % 5) + 4}</span>
          <span className="mx-1">·</span>
          <span className="uppercase tracking-wide">{product.category.replace("-", " ")}</span>
        </div>
        <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-foreground min-h-[2.5rem]">
          {product.name}
        </h3>
        <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{product.description}</p>

        <div className="mt-auto flex items-end justify-between pt-3">
          <div>
            {product.oldPrice && (
              <p className="text-xs text-muted-foreground line-through">{formatPrice(product.oldPrice)}</p>
            )}
            <p className="text-base font-bold text-foreground">{formatPrice(product.price)}</p>
          </div>
          <Button
            size="sm"
            onClick={handleAdd}
            disabled={product.stock <= 0}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {added ? <Check className="h-4 w-4" /> : <ShoppingCart className="h-4 w-4" />}
            <span className="ml-1 hidden sm:inline">{added ? "Added" : "Add"}</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
