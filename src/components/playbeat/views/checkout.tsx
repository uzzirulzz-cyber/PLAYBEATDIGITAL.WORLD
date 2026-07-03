"use client";

import { useState } from "react";
import { useStore } from "@/store/cart";
import { api } from "@/lib/api";
import { CategoryIcon } from "../icon";
import { ProductImage } from "../product-image";
import { formatPrice } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, ShieldCheck, CreditCard, Loader2, Lock } from "lucide-react";
import { toast } from "sonner";

export function CheckoutView() {
  const { cart, cartTotal, goCart, goShop, goPaymentCallback, clearCart } = useStore();
  const [form, setForm] = useState({
    customerName: "",
    customerEmail: "",
    customerPhone: "",
    shippingAddress: "",
  });
  const [loading, setLoading] = useState(false);
  const subtotal = cartTotal();

  if (cart.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-4 sm:px-6 py-20 text-center">
        <h1 className="text-2xl font-bold text-foreground">Nothing to check out</h1>
        <p className="mt-2 text-muted-foreground">Your cart is empty.</p>
        <Button className="mt-6 bg-primary text-primary-foreground hover:bg-primary/90" onClick={() => goShop()}>
          Browse products
        </Button>
      </div>
    );
  }

  function update<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.customerName || !form.customerEmail || !form.customerPhone || !form.shippingAddress) {
      toast.error("Please fill in all fields");
      return;
    }
    setLoading(true);
    try {
      // 1. Create order
      const { orderRef } = await api.createOrder({
        customerName: form.customerName,
        customerEmail: form.customerEmail,
        customerPhone: form.customerPhone,
        shippingAddress: form.shippingAddress,
        items: cart.map((c) => ({ productId: c.productId, quantity: c.quantity })),
      });

      // 2. Initiate PayFast payment
      const init = await api.initiatePayment(orderRef);
      if (!init.ok) {
        toast.error("Payment initiation failed", { description: init.error });
        setLoading(false);
        return;
      }

      // 3a. Real PayFast — redirect to hosted payment page
      if (!init.demo && init.paymentUrl) {
        window.location.href = init.paymentUrl;
        return;
      }

      // 3b. Demo mode — simulate the redirect by calling callback directly
      toast.info("Processing payment securely…");
      const result = await api.paymentCallback(orderRef, true);

      // 4. Route to result view
      clearCart();
      goPaymentCallback(orderRef, result.status);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Checkout failed");
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-8">
      <div className="mb-6 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={goCart} aria-label="Back to cart">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-2xl font-bold text-foreground">Checkout</h1>
      </div>

      <form onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-[1fr_380px]">
        {/* Customer details */}
        <div className="space-y-6">
          <section className="rounded-xl border border-border bg-card p-5">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-foreground">
              <span className="grid h-6 w-6 place-items-center rounded-full bg-primary text-xs font-bold text-primary-foreground">1</span>
              Contact & delivery details
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Full name" id="customerName" value={form.customerName} onChange={(v) => update("customerName", v)} placeholder="Ali Khan" />
              <Field label="Email address" id="customerEmail" type="email" value={form.customerEmail} onChange={(v) => update("customerEmail", v)} placeholder="you@email.com" />
              <Field label="Phone number" id="customerPhone" value={form.customerPhone} onChange={(v) => update("customerPhone", v)} placeholder="+92 300 1234567" />
              <Field label="Country / city" id="shippingAddress" value={form.shippingAddress} onChange={(v) => update("shippingAddress", v)} placeholder="Karachi, Pakistan" />
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Your activation codes and receipts are sent to the email above.
            </p>
          </section>

          {/* Payment method */}
          <section className="rounded-xl border border-border bg-card p-5">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-foreground">
              <span className="grid h-6 w-6 place-items-center rounded-full bg-primary text-xs font-bold text-primary-foreground">2</span>
              Payment method
            </h2>
            <div className="rounded-lg border-2 border-primary/60 bg-secondary/40 p-4">
              <div className="flex items-center gap-3">
                <CreditCard className="h-6 w-6 text-primary" />
                <div>
                  <p className="text-sm font-semibold text-foreground">PayFast Payment Gateway</p>
                  <p className="text-xs text-muted-foreground">Visa · Mastercard · RAAST · 3D Secure</p>
                </div>
                <Lock className="ml-auto h-4 w-4 text-chart-1" />
              </div>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              You will be redirected to PayFast&apos;s secure hosted payment page to complete your purchase.
            </p>
          </section>
        </div>

        {/* Summary */}
        <div className="lg:sticky lg:top-20 lg:self-start">
          <div className="rounded-xl border border-border bg-card p-5">
            <h2 className="text-lg font-bold text-foreground">Order summary</h2>
            <div className="mt-4 max-h-72 space-y-3 overflow-y-auto pr-1">
              {cart.map((item) => (
                <div key={item.productId} className="flex gap-3">
                  <ProductImage
                    src={item.image}
                    icon={item.icon}
                    gradient={item.gradient}
                    alt={item.name}
                    className="h-11 w-11 shrink-0 rounded-md"
                    iconClassName="h-5 w-5"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium text-foreground">{item.name}</p>
                    <p className="text-xs text-muted-foreground">Qty {item.quantity} · {formatPrice(item.price)}</p>
                  </div>
                  <p className="shrink-0 text-xs font-semibold text-foreground">{formatPrice(item.price * item.quantity)}</p>
                </div>
              ))}
            </div>
            <Separator className="my-4 bg-border" />
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="text-foreground">{formatPrice(subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Delivery</span>
                <span className="text-chart-1">Free (digital)</span>
              </div>
              <Separator className="bg-border" />
              <div className="flex justify-between text-base font-bold">
                <span className="text-foreground">Total</span>
                <span className="text-foreground">{formatPrice(subtotal)}</span>
              </div>
            </div>
            <Button type="submit" className="mt-5 w-full bg-primary text-primary-foreground hover:bg-primary/90" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing…
                </>
              ) : (
                <>
                  <Lock className="mr-2 h-4 w-4" /> Pay {formatPrice(subtotal)}
                </>
              )}
            </Button>
            <div className="mt-3 flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5 text-chart-1" />
              256-bit encrypted · 3D Secure
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}

function Field({
  label,
  id,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  id: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-sm text-foreground">{label}</Label>
      <Input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required
        className="bg-secondary/40"
      />
    </div>
  );
}
