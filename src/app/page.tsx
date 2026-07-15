"use client";

import { useEffect, useState } from "react";
import { useStore } from "@/store/cart";
import { api } from "@/lib/api";
import { Navbar } from "@/components/playbeat/navbar";
import { Ticker } from "@/components/playbeat/ticker";
import { Footer } from "@/components/playbeat/footer";
import { HomeView } from "@/components/playbeat/views/home";
import { ShopView } from "@/components/playbeat/views/shop";
import { ProductDetailView } from "@/components/playbeat/views/product-detail";
import { CartView } from "@/components/playbeat/views/cart";
import { CheckoutView } from "@/components/playbeat/views/checkout";
import { PaymentCallbackView } from "@/components/playbeat/views/payment-callback";
import { OrdersView } from "@/components/playbeat/views/orders";
import { AdminView } from "@/components/playbeat/views/admin";
import { AiToolsView } from "@/components/playbeat/views/ai-tools";
import { WhatsAppButton } from "@/components/playbeat/whatsapp-button";
import { CheckCircle2, X, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function Home() {
  const view = useStore((s) => s.view);
  const goCart = useStore((s) => s.goCart);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  // Ensure the catalogue is seeded on first load (idempotent)
  useEffect(() => {
    useStore.persist.rehydrate();
    api.seedProducts().catch(() => {});

    // Check for payment success URL params (from JazzCash/PayPal redirects)
    const params = new URLSearchParams(window.location.search);
    const paymentStatus = params.get("payment");
    const orderRef = params.get("order");
    if (paymentStatus === "success" && orderRef) {
      // Use setTimeout to avoid cascading renders in effect
      setTimeout(() => {
        setSuccessBanner(orderRef);
        toast.success(`Payment successful! Order ${orderRef}`);
      }, 0);
      // Clean URL
      window.history.replaceState({}, "", "/");
    }
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />
      <Ticker />

      {/* Payment success banner */}
      {successBanner && (
        <div className="fixed top-20 left-1/2 z-50 w-[90%] max-w-md -translate-x-1/2 rounded-xl border border-chart-1/30 bg-chart-1/10 p-4 shadow-lg backdrop-blur">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0 text-chart-1" />
            <div className="flex-1">
              <p className="text-sm font-bold text-foreground">Payment Successful!</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Order <span className="font-mono font-semibold text-foreground">{successBanner}</span> has been confirmed.
              </p>
              <div className="mt-3 flex gap-2">
                <Button size="sm" variant="outline" onClick={() => { goCart(); setSuccessBanner(null); }}>
                  <Package className="mr-1.5 h-3.5 w-3.5" /> View Order
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setSuccessBanner(null)}>
                  Dismiss
                </Button>
              </div>
            </div>
            <button onClick={() => setSuccessBanner(null)} className="text-muted-foreground hover:text-foreground" aria-label="Close">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      <main className="flex-1">
        {view.name === "home" && <HomeView />}
        {view.name === "shop" && <ShopView initialCategory={view.category} />}
        {view.name === "product" && <ProductDetailView key={view.slug} slug={view.slug} />}
        {view.name === "cart" && <CartView />}
        {view.name === "checkout" && <CheckoutView />}
        {view.name === "payment-callback" && (
          <PaymentCallbackView orderRef={view.orderRef} status={view.status} />
        )}
        {view.name === "orders" && <OrdersView />}
        {view.name === "admin" && <AdminView />}
        {view.name === "ai-tools" && <AiToolsView />}
      </main>
      <Footer />
      <WhatsAppButton />
    </div>
  );
}
