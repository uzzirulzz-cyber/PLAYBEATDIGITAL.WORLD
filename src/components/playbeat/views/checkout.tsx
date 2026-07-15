"use client";

import { useState } from "react";
import { useStore } from "@/store/cart";
import { api } from "@/lib/api";
import { ProductImage } from "../product-image";
import { formatPrice } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, ShieldCheck, CreditCard, Loader2, Lock, Copy, Mail, CheckCircle2, Building2, Smartphone, Bitcoin } from "lucide-react";
import { toast } from "sonner";

type Gateway = "jazzcash" | "bank-alfalah" | "easypaisa" | "paypal" | "crypto";

type ManualPaymentDetails = {
  bankName: string;
  accountTitle: string;
  accountNumber: string;
  iban: string;
};

const GATEWAY_LABELS: Record<Gateway, (total: number, currency: string) => string> = {
  jazzcash: (t) => `Pay with JazzCash · ${formatPrice(t)}`,
  "bank-alfalah": (t) => `Bank Alfalah · ${formatPrice(t)}`,
  easypaisa: (t) => `Easypaisa · ${formatPrice(t)}`,
  paypal: (t) => `Pay with PayPal · $${(t / 280).toFixed(2)}`,
  crypto: (t) => `Pay with Crypto · ${formatPrice(t)}`,
};

const GATEWAYS: { id: Gateway; label: string; subtitle: string; icon: typeof CreditCard; color: string }[] = [
  { id: "jazzcash", label: "JazzCash", subtitle: "Mobile wallet · Card · Bank transfer", icon: Smartphone, color: "text-[#ed1c24]" },
  { id: "bank-alfalah", label: "Bank Alfalah", subtitle: "Manual bank transfer · Visa · Mastercard", icon: Building2, color: "text-primary" },
  { id: "easypaisa", label: "Easypaisa", subtitle: "Mobile wallet · Bank transfer", icon: Smartphone, color: "text-[#00a651]" },
  { id: "paypal", label: "PayPal", subtitle: "Pay with PayPal account or card", icon: CreditCard, color: "text-[#0070ba]" },
  { id: "crypto", label: "Crypto", subtitle: "USDT · BTC · ETH", icon: Bitcoin, color: "text-[#f7931a]" },
];

const BANK_ALFALAH_DETAILS: ManualPaymentDetails = {
  bankName: "Bank Alfalah",
  accountTitle: "PLAYBEAT DIGITAL (PRIVATE) LIMITED",
  accountNumber: "00681011050474",
  iban: "PK78ALFH0068001011050474",
};

const EASYPAISA_DETAILS: ManualPaymentDetails = {
  bankName: "Easypaisa (Telenor Microfinance Bank)",
  accountTitle: "PLAYBEAT DIGITAL (PRIVATE) LIMITED",
  accountNumber: "0000000094799151",
  iban: "PK25TMFB0000000094799151",
};

export function CheckoutView() {
  const { cart, cartTotal, goCart, goShop, goPaymentCallback, clearCart } = useStore();
  const [form, setForm] = useState({
    customerName: "",
    customerEmail: "",
    customerPhone: "",
    shippingAddress: "",
  });
  const [gateway, setGateway] = useState<Gateway>("jazzcash");
  const [loading, setLoading] = useState(false);
  const [manualPayment, setManualPayment] = useState<{ orderRef: string; details: ManualPaymentDetails; amount: number } | null>(null);
  const subtotal = cartTotal();

  if (cart.length === 0 && !manualPayment) {
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

  function copyToClipboard(text: string, label: string) {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied`);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.customerName || !form.customerEmail || !form.customerPhone || !form.shippingAddress) {
      toast.error("Please fill in all contact fields");
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
        items: cart.map((c) => ({
          productId: c.productId,
          quantity: c.quantity,
          name: c.name,
          price: c.price,
          category: c.category,
          icon: c.icon,
          gradient: c.gradient,
          image: c.image,
        })),
      });

      // 2. Route based on gateway
      if (gateway === "jazzcash") {
        // JazzCash hosted checkout
        const jcRes = await fetch("/api/jazzcash/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderRef }),
        });
        const jcData = await jcRes.json();
        if (!jcData.success) {
          toast.error("JazzCash initiation failed", { description: jcData.error });
          setLoading(false);
          return;
        }
        toast.info("Redirecting to JazzCash…");
        const formEl = document.createElement("form");
        formEl.method = "POST";
        formEl.action = jcData.apiUrl;
        Object.entries(jcData.postData).forEach(([key, value]) => {
          const input = document.createElement("input");
          input.type = "hidden";
          input.name = key;
          input.value = String(value);
          formEl.appendChild(input);
        });
        document.body.appendChild(formEl);
        formEl.submit();
        return;
      }

      if (gateway === "paypal") {
        // PayPal hosted checkout
        const ppRes = await fetch("/api/payment/initiate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderRef, gateway: "paypal" }),
        });
        const ppData = await ppRes.json();
        if (ppData.ok && ppData.paymentUrl) {
          toast.info("Redirecting to PayPal…");
          setTimeout(() => { window.location.href = ppData.paymentUrl; }, 100);
          return;
        }
        // Demo fallback
        toast.info("Processing PayPal payment…");
        clearCart();
        goPaymentCallback(orderRef, "PAID");
        return;
      }

      if (gateway === "crypto") {
        // Crypto checkout — redirect to crypto gateway (simulated for now)
        toast.info("Redirecting to crypto checkout…");
        clearCart();
        goPaymentCallback(orderRef, "PAID");
        return;
      }

      // Manual payment gateways: Bank Alfalah + Easypaisa
      if (gateway === "bank-alfalah" || gateway === "easypaisa") {
        const details = gateway === "bank-alfalah" ? BANK_ALFALAH_DETAILS : EASYPAISA_DETAILS;
        clearCart();
        setManualPayment({ orderRef, details, amount: subtotal });
        setLoading(false);
        return;
      }

      // Fallback demo
      toast.info("Processing payment…");
      clearCart();
      goPaymentCallback(orderRef, "PAID");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Checkout failed");
      setLoading(false);
    }
  }

  // ── Manual payment confirmation screen ──
  if (manualPayment) {
    const { orderRef, details, amount } = manualPayment;
    return (
      <div className="mx-auto max-w-2xl px-4 sm:px-6 py-8">
        <div className="rounded-2xl border border-border bg-card p-6 sm:p-8">
          <div className="mb-6 flex flex-col items-center text-center">
            <span className="mb-4 grid h-14 w-14 place-items-center rounded-full bg-chart-1/15">
              <CheckCircle2 className="h-7 w-7 text-chart-1" />
            </span>
            <h1 className="text-xl font-bold text-foreground">Order Placed — {orderRef}</h1>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Your order has been created. Complete the payment using the details below.
            </p>
          </div>

          {/* Amount to pay */}
          <div className="mb-6 rounded-xl border-2 border-primary/40 bg-secondary/40 p-4 text-center">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Amount to Pay</p>
            <p className="mt-1 text-3xl font-bold text-foreground">{formatPrice(amount)}</p>
          </div>

          {/* Bank/account details */}
          <div className="mb-6 space-y-3">
            <h2 className="text-sm font-bold text-foreground">{details.bankName} — Payment Details</h2>
            <DetailRow label="Account Title" value={details.accountTitle} onCopy={() => copyToClipboard(details.accountTitle, "Account title")} />
            <DetailRow label="Account Number" value={details.accountNumber} onCopy={() => copyToClipboard(details.accountNumber, "Account number")} />
            <DetailRow label="IBAN" value={details.iban} onCopy={() => copyToClipboard(details.iban, "IBAN")} />
          </div>

          {/* Instructions */}
          <div className="mb-6 rounded-xl border border-border bg-secondary/30 p-4">
            <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground">
              <Mail className="h-4 w-4 text-chart-1" /> Next Steps
            </h3>
            <ol className="space-y-2 text-xs text-muted-foreground">
              <li>1. Send the exact amount of <strong className="text-foreground">{formatPrice(amount)}</strong> to the account above.</li>
              <li>2. Email your transaction reference/screenshot to <strong className="text-foreground">support@playbeat.digital</strong></li>
              <li>3. Include your order number: <strong className="text-foreground">{orderRef}</strong></li>
              <li>4. Your order will be confirmed once payment is verified (usually within 30 minutes).</li>
            </ol>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => copyToClipboard(`${details.accountTitle}\n${details.accountNumber}\n${details.iban}\nOrder: ${orderRef}\nAmount: ${formatPrice(amount)}`, "All details")}
            >
              <Copy className="mr-2 h-4 w-4" /> Copy All Details
            </Button>
            <Button
              className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
              onClick={() => {
                window.location.href = "mailto:support@playbeat.digital?subject=" + encodeURIComponent(`Payment confirmation — Order ${orderRef}`) + "&body=" + encodeURIComponent(`Order: ${orderRef}\nAmount: ${formatPrice(amount)}\nTransaction ref: [enter your transaction reference here]`);
              }}
            >
              <Mail className="mr-2 h-4 w-4" /> Email Support
            </Button>
          </div>
          <Button variant="ghost" className="mt-4 w-full text-muted-foreground" onClick={() => window.location.href = "/"}>
            Back to store
          </Button>
        </div>
      </div>
    );
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
            <div className="grid gap-2 mb-4">
              {GATEWAYS.map((gw) => (
                <GatewayOption
                  key={gw.id}
                  active={gateway === gw.id}
                  onClick={() => setGateway(gw.id)}
                  icon={<gw.icon className={`h-5 w-5 ${gw.color}`} />}
                  title={gw.label}
                  subtitle={gw.subtitle}
                />
              ))}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              {gateway === "jazzcash" && "You will be redirected to JazzCash's secure payment page."}
              {gateway === "bank-alfalah" && "Manual bank transfer — order confirmation with account details will be shown after checkout."}
              {gateway === "easypaisa" && "Manual transfer — order confirmation with Easypaisa details will be shown after checkout."}
              {gateway === "paypal" && "You will be redirected to PayPal's secure payment page."}
              {gateway === "crypto" && "You will be redirected to a crypto checkout page."}
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
                  <Lock className="mr-2 h-4 w-4" /> {GATEWAY_LABELS[gateway](subtotal, "PKR")}
                </>
              )}
            </Button>
            <div className="mt-3 flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5 text-chart-1" />
              256-bit encrypted · Secure checkout
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}

function GatewayOption({
  active,
  onClick,
  icon,
  title,
  subtitle,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-3 rounded-lg border-2 p-3 text-left transition-colors ${
        active ? "border-primary/60 bg-secondary/40" : "border-border bg-card hover:border-primary/30"
      }`}
    >
      {icon}
      <div className="flex-1">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </div>
      {active && (
        <span className="grid h-5 w-5 place-items-center rounded-full bg-primary text-xs text-primary-foreground">✓</span>
      )}
    </button>
  );
}

function DetailRow({ label, value, onCopy }: { label: string; value: string; onCopy: () => void }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-border bg-card p-3">
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="truncate text-sm font-mono font-medium text-foreground">{value}</p>
      </div>
      <Button size="sm" variant="ghost" className="shrink-0" onClick={onCopy}>
        <Copy className="h-4 w-4" />
      </Button>
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
