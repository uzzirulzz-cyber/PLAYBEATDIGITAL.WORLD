"use client";

import { useEffect, useState } from "react";
import { api, type Order } from "@/lib/api";
import { useStore } from "@/store/cart";
import { CategoryIcon } from "../icon";
import { ProductImage } from "../product-image";
import { formatPrice } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Package, Search, ArrowLeft, Mail } from "lucide-react";

const STATUS_STYLE: Record<string, string> = {
  PENDING: "bg-chart-3/15 text-chart-3 border-chart-3/30",
  PAID: "bg-chart-1/15 text-chart-1 border-chart-1/30",
  FAILED: "bg-destructive/15 text-destructive border-destructive/30",
  REFUNDED: "bg-chart-2/15 text-chart-2 border-chart-2/30",
};

export function OrdersView() {
  const { goShop, goHome } = useStore();
  const [email, setEmail] = useState("");
  const [searched, setSearched] = useState("");
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [loading, setLoading] = useState(false);

  async function load(target: string) {
    if (!target.trim()) return;
    setLoading(true);
    setSearched(target.trim());
    try {
      const list = await api.getMyOrders(target.trim());
      setOrders(list);
    } catch {
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    load(email);
  }

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 py-8">
      <div className="mb-6 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={goHome} aria-label="Back">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-2xl font-bold text-foreground">My orders</h1>
      </div>

      <form onSubmit={onSubmit} className="mb-6">
        <Label htmlFor="email" className="text-sm text-foreground">Enter your email to view your orders</Label>
        <div className="mt-2 flex gap-2">
          <div className="relative flex-1">
            <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@email.com"
              className="pl-9 bg-card"
              required
            />
          </div>
          <Button type="submit" className="bg-primary text-primary-foreground hover:bg-primary/90">
            <Search className="mr-1.5 h-4 w-4" /> Find
          </Button>
        </div>
      </form>

      {loading && (
        <div className="space-y-3">
          {Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-28 w-full bg-secondary" />)}
        </div>
      )}

      {!loading && orders !== null && orders.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border py-16 text-center">
          <Package className="h-10 w-10 text-muted-foreground/50" />
          <p className="text-muted-foreground">No orders found for <span className="text-foreground">{searched}</span>.</p>
          <Button variant="outline" onClick={() => goShop()}>Start shopping</Button>
        </div>
      )}

      {!loading && orders && orders.length > 0 && (
        <div className="space-y-4">
          {orders.map((o) => (
            <div key={o.id} className="rounded-xl border border-border bg-card p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-mono text-sm font-semibold text-foreground">{o.orderRef}</p>
                    <Badge variant="outline" className={STATUS_STYLE[o.status] || ""}>{o.status}</Badge>
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {new Date(o.createdAt).toLocaleString("en-PK", { dateStyle: "medium", timeStyle: "short" })}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">{o.items.length} item{o.items.length === 1 ? "" : "s"}</p>
                  <p className="text-lg font-bold text-foreground">{formatPrice(o.amount)}</p>
                </div>
              </div>

              {o.approvalCode && (
                <div className="mt-3 flex items-center gap-2 rounded-lg bg-secondary/40 px-3 py-2 text-xs">
                  <span className="text-muted-foreground">Approval code:</span>
                  <span className="font-mono font-medium text-foreground">{o.approvalCode}</span>
                  {o.cardBrand && <span className="ml-auto text-muted-foreground">{o.cardBrand} {o.cardNumber}</span>}
                </div>
              )}

              <div className="mt-3 space-y-2">
                {o.items.map((it) => (
                  <div key={it.id} className="flex items-center gap-3">
                    <ProductImage
                      src={it.image}
                      icon={it.icon}
                      gradient={it.gradient}
                      alt={it.name}
                      className="h-9 w-9 shrink-0 rounded-md"
                      iconClassName="h-4 w-4"
                    />
                    <p className="min-w-0 flex-1 truncate text-sm text-foreground">{it.name}</p>
                    <span className="text-xs text-muted-foreground">×{it.quantity}</span>
                    <span className="text-sm font-medium text-foreground">{formatPrice(it.price * it.quantity)}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
