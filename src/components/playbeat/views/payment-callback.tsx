"use client";

import { useEffect, useState } from "react";
import { type Order } from "@/lib/api";
import { useStore } from "@/store/cart";
import { CategoryIcon } from "../icon";
import { ProductImage } from "../product-image";
import { formatPrice } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Loader2, Receipt, ArrowRight, Copy } from "lucide-react";
import { toast } from "sonner";

export function PaymentCallbackView({ orderRef, status }: { orderRef?: string; status?: string }) {
  const { goShop, goOrders } = useStore();
  // undefined = loading, null = not found/no ref, Order = loaded
  const [order, setOrder] = useState<Order | null | undefined>(orderRef ? undefined : null);

  useEffect(() => {
    if (!orderRef) return;
    let cancelled = false;
    fetch(`/api/orders/${encodeURIComponent(orderRef)}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject(r)))
      .then((o: Order) => {
        if (!cancelled) setOrder(o);
      })
      .catch(() => {
        if (!cancelled) setOrder(null);
      });
    return () => {
      cancelled = true;
    };
  }, [orderRef]);

  const paid = status === "PAID" || order?.status === "PAID";

  return (
    <div className="mx-auto max-w-2xl px-4 sm:px-6 py-12">
      <div className="rounded-2xl border border-border bg-card p-6 sm:p-10 text-center">
        {!orderRef ? (
          <ErrorState title="No order reference" text="We couldn't find an order to display." onShop={goShop} />
        ) : order === undefined ? (
          <div className="flex flex-col items-center gap-3 py-8">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="text-muted-foreground">Confirming your payment…</p>
          </div>
        ) : paid ? (
          <SuccessState order={order} onOrders={goOrders} onShop={goShop} />
        ) : (
          <ErrorState
            title="Payment not completed"
            text="Your payment could not be confirmed. No charge was made. Please try again."
            onShop={goShop}
          />
        )}
      </div>
    </div>
  );
}

function SuccessState({ order, onOrders, onShop }: { order: Order; onOrders: () => void; onShop: () => void }) {
  return (
    <>
      <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-full bg-chart-1/15">
        <CheckCircle2 className="h-9 w-9 text-chart-1" />
      </div>
      <h1 className="text-2xl font-bold text-foreground">Payment successful!</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Thank you, {order.customerName.split(" ")[0]}. Your order is confirmed and activation details have been emailed to{" "}
        <span className="text-foreground">{order.customerEmail}</span>.
      </p>

      <div className="mt-6 rounded-xl border border-border bg-secondary/40 p-4 text-left">
        <div className="flex items-center justify-between">
          <span className="text-xs uppercase tracking-wide text-muted-foreground">Order reference</span>
          <button
            onClick={() => { navigator.clipboard.writeText(order.orderRef); toast.success("Order reference copied"); }}
            className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
          >
            <Copy className="h-3 w-3" /> Copy
          </button>
        </div>
        <p className="font-mono text-sm font-semibold text-foreground">{order.orderRef}</p>

        <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
          <Info label="Amount paid" value={formatPrice(order.amount)} />
          <Info label="Status" value={order.status} />
          {order.approvalCode && <Info label="Approval code" value={order.approvalCode} mono />}
          {order.cardBrand && (
            <Info label="Card" value={`${order.cardBrand} ${order.cardNumber || ""}`.trim()} />
          )}
        </div>
      </div>

      {/* Items */}
      <div className="mt-4 rounded-xl border border-border bg-secondary/40 p-4 text-left">
        <p className="mb-3 text-xs uppercase tracking-wide text-muted-foreground">Items</p>
        <div className="space-y-2">
          {order.items.map((it) => (
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
              <span className="text-sm font-semibold text-foreground">{formatPrice(it.price * it.quantity)}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-2 sm:flex-row">
        <Button className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90" onClick={onOrders}>
          <Receipt className="mr-2 h-4 w-4" /> View my orders
        </Button>
        <Button variant="outline" className="flex-1" onClick={onShop}>
          Continue shopping <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </>
  );
}

function ErrorState({ title, text, onShop }: { title: string; text: string; onShop: () => void }) {
  return (
    <>
      <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-full bg-destructive/15">
        <XCircle className="h-9 w-9 text-destructive" />
      </div>
      <h1 className="text-2xl font-bold text-foreground">{title}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{text}</p>
      <Button className="mt-6 bg-primary text-primary-foreground hover:bg-primary/90" onClick={onShop}>
        Back to shop
      </Button>
    </>
  );
}

function Info({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-sm font-medium text-foreground ${mono ? "font-mono" : ""}`}>{value}</p>
    </div>
  );
}
