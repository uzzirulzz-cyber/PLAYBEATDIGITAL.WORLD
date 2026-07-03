"use client";

import { useEffect } from "react";
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

export default function Home() {
  const view = useStore((s) => s.view);

  // Ensure the catalogue is seeded on first load (idempotent)
  useEffect(() => {
    // Manually rehydrate the persisted store (cart) AFTER React hydration
    // to avoid SSR/CSR hydration mismatches.
    useStore.persist.rehydrate();
    api.seedProducts().catch(() => {});
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />
      <Ticker />
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
      {/* Floating WhatsApp contact button — visible on all pages */}
      <WhatsAppButton />
    </div>
  );
}
