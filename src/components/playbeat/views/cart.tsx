"use client";

import { useStore } from "@/store/cart";
import { CategoryIcon } from "../icon";
import { ProductImage } from "../product-image";
import { formatPrice } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Minus, Plus, Trash2, ShoppingCart, ArrowLeft, ShieldCheck } from "lucide-react";

export function CartView() {
  const { cart, updateQuantity, removeFromCart, cartTotal, goCheckout, goShop, goHome } = useStore();
  const subtotal = cartTotal();
  const fee = 0; // digital delivery, no shipping
  const total = subtotal + fee;

  if (cart.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-4 sm:px-6 py-20 text-center">
        <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-full bg-secondary">
          <ShoppingCart className="h-8 w-8 text-muted-foreground" />
        </div>
        <h1 className="text-2xl font-bold text-foreground">Your cart is empty</h1>
        <p className="mt-2 text-muted-foreground">Browse the store and add some digital products.</p>
        <Button className="mt-6 bg-primary text-primary-foreground hover:bg-primary/90" onClick={() => goShop()}>
          Browse products
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-8">
      <div className="mb-6 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={goHome} aria-label="Back">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-2xl font-bold text-foreground">Your cart</h1>
        <span className="text-sm text-muted-foreground">({cart.length} item{cart.length === 1 ? "" : "s"})</span>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        {/* Items */}
        <div className="space-y-3">
          {cart.map((item) => (
            <div key={item.productId} className="flex gap-4 rounded-xl border border-border bg-card p-4">
              <ProductImage
                src={item.image}
                icon={item.icon}
                gradient={item.gradient}
                alt={item.name}
                className="h-20 w-20 shrink-0 rounded-lg"
                iconClassName="h-9 w-9"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-foreground">{item.name}</p>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">{item.category.replace("-", " ")}</p>
                  </div>
                  <p className="shrink-0 font-bold text-foreground">{formatPrice(item.price * item.quantity)}</p>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <div className="flex items-center rounded-lg border border-border">
                    <Button size="icon" variant="ghost" className="h-8 w-8 rounded-r-none" onClick={() => updateQuantity(item.productId, item.quantity - 1)}>
                      <Minus className="h-3.5 w-3.5" />
                    </Button>
                    <span className="w-10 text-center text-sm font-medium">{item.quantity}</span>
                    <Button size="icon" variant="ghost" className="h-8 w-8 rounded-l-none" onClick={() => updateQuantity(item.productId, item.quantity + 1)}>
                      <Plus className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <Button size="sm" variant="ghost" className="text-muted-foreground hover:text-destructive" onClick={() => removeFromCart(item.productId)}>
                    <Trash2 className="mr-1.5 h-4 w-4" /> Remove
                  </Button>
                </div>
              </div>
            </div>
          ))}
          <Button variant="ghost" className="text-muted-foreground" onClick={() => goShop()}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Continue shopping
          </Button>
        </div>

        {/* Summary */}
        <div className="lg:sticky lg:top-20 lg:self-start">
          <div className="rounded-xl border border-border bg-card p-5">
            <h2 className="text-lg font-bold text-foreground">Order summary</h2>
            <div className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="text-foreground">{formatPrice(subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Delivery</span>
                <span className="text-chart-1">Free (digital)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Processing fee</span>
                <span className="text-foreground">{formatPrice(fee)}</span>
              </div>
              <Separator className="bg-border" />
              <div className="flex justify-between text-base font-bold">
                <span className="text-foreground">Total</span>
                <span className="text-foreground">{formatPrice(total)}</span>
              </div>
            </div>
            <Button className="mt-5 w-full bg-primary text-primary-foreground hover:bg-primary/90" onClick={goCheckout}>
              Proceed to checkout
            </Button>
            <div className="mt-4 flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5 text-chart-1" />
              Secured by PayFast Payment Gateway
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
