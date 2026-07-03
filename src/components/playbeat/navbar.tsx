"use client";

import { useEffect, useState } from "react";
import { useStore } from "@/store/cart";
import { CATEGORIES, STORE } from "@/lib/store-config";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Search, ShoppingCart, Menu, LayoutDashboard, Package, Home, Store } from "lucide-react";
import { formatPrice } from "@/lib/format";

export function Navbar() {
  const { goHome, goShop, goCart, goAdmin, goOrders, cartCount, cartOpen, setCartOpen } = useStore();
  const [query, setQuery] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const count = cartCount();

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    goShop();
    // pass query via a custom event the shop view reads
    if (query.trim()) {
      window.dispatchEvent(new CustomEvent("playbeat:search", { detail: query.trim() }));
    }
    setMobileOpen(false);
  }

  return (
    <header
      className={`sticky top-0 z-40 w-full transition-colors ${
        scrolled ? "bg-background/90 backdrop-blur border-b border-border" : "bg-background/60 backdrop-blur-sm"
      }`}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6">
        {/* Logo */}
        <button
          onClick={goHome}
          className="flex shrink-0 items-center gap-2.5"
          aria-label="Playbeat Digital Store home"
        >
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br from-primary to-muted-foreground/70 text-background">
            <Store className="h-5 w-5" />
          </span>
          <span className="hidden flex-col leading-none sm:flex">
            <span className="text-sm font-bold tracking-[0.18em] text-primary">PLAYBEAT</span>
            <span className="text-[10px] font-medium tracking-[0.3em] text-muted-foreground">
              DIGITAL STORE
            </span>
          </span>
        </button>

        {/* Desktop category nav */}
        <nav className="hidden lg:flex items-center gap-1 ml-2">
          <Button variant="ghost" size="sm" onClick={goHome} className="text-muted-foreground hover:text-foreground">
            <Home className="mr-1.5 h-4 w-4" /> Home
          </Button>
          {CATEGORIES.slice(0, 6).map((c) => (
            <Button
              key={c.id}
              variant="ghost"
              size="sm"
              onClick={() => goShop(c.id)}
              className="text-muted-foreground hover:text-foreground"
            >
              {c.name}
            </Button>
          ))}
        </nav>

        {/* Search (desktop) */}
        <form onSubmit={submitSearch} className="relative ml-auto hidden md:block w-full max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search games, cards, AI tools…"
            className="pl-9 bg-secondary/60 border-border"
          />
        </form>

        {/* Actions */}
        <div className="ml-auto flex items-center gap-1 md:ml-2">
          <Button variant="ghost" size="icon" onClick={goOrders} aria-label="My orders" title="My Orders">
            <Package className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" onClick={goAdmin} aria-label="Admin dashboard" title="Admin">
            <LayoutDashboard className="h-5 w-5" />
          </Button>

          {/* Cart sheet trigger */}
          <Sheet open={cartOpen} onOpenChange={setCartOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="relative" aria-label="Cart">
                <ShoppingCart className="h-5 w-5" />
                {count > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-chart-1 px-1 text-[10px] font-bold text-background">
                    {count}
                  </span>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent className="w-full sm:max-w-md bg-card border-border flex flex-col p-0">
              <SheetHeader className="px-5 py-4 border-b border-border">
                <SheetTitle className="flex items-center gap-2 text-foreground">
                  <ShoppingCart className="h-5 w-5" /> Your Cart
                </SheetTitle>
              </SheetHeader>
              <CartSheetBody />
            </SheetContent>
          </Sheet>

          {/* Mobile menu */}
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Menu">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 bg-card border-border p-0">
              <SheetHeader className="px-5 py-4 border-b border-border">
                <SheetTitle className="text-foreground">{STORE.name}</SheetTitle>
              </SheetHeader>
              <div className="p-4 space-y-4">
                <form onSubmit={submitSearch} className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search…"
                    className="pl-9 bg-secondary/60"
                  />
                </form>
                <div className="flex flex-col gap-1">
                  <Button variant="ghost" className="justify-start" onClick={() => { goHome(); setMobileOpen(false); }}>
                    <Home className="mr-2 h-4 w-4" /> Home
                  </Button>
                  {CATEGORIES.map((c) => (
                    <Button
                      key={c.id}
                      variant="ghost"
                      className="justify-start"
                      onClick={() => { goShop(c.id); setMobileOpen(false); }}
                    >
                      {c.name}
                    </Button>
                  ))}
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}

function CartSheetBody() {
  const { cart, updateQuantity, removeFromCart, cartTotal, goCheckout, goCart, setCartOpen } = useStore();

  if (cart.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
        <ShoppingCart className="h-12 w-12 text-muted-foreground/50" />
        <p className="text-muted-foreground">Your cart is empty.</p>
        <Button
          variant="outline"
          onClick={() => {
            setCartOpen(false);
            goShop();
          }}
        >
          Browse products
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
        {cart.map((item) => (
          <div key={item.productId} className="flex gap-3 rounded-lg border border-border bg-secondary/40 p-3">
            <div className={`grid h-14 w-14 shrink-0 place-items-center rounded-md bg-gradient-to-br ${item.gradient}`}>
              <span className="text-lg font-bold text-white">{item.name.charAt(0)}</span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground">{item.name}</p>
              <p className="text-xs text-muted-foreground">{formatPrice(item.price)}</p>
              <div className="mt-2 flex items-center gap-2">
                <Button size="sm" variant="outline" className="h-7 w-7 p-0" onClick={() => updateQuantity(item.productId, item.quantity - 1)}>
                  –
                </Button>
                <span className="w-6 text-center text-sm">{item.quantity}</span>
                <Button size="sm" variant="outline" className="h-7 w-7 p-0" onClick={() => updateQuantity(item.productId, item.quantity + 1)}>
                  +
                </Button>
                <Button size="sm" variant="ghost" className="ml-auto h-7 text-muted-foreground hover:text-destructive" onClick={() => removeFromCart(item.productId)}>
                  Remove
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="border-t border-border px-5 py-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Subtotal</span>
          <span className="text-lg font-bold text-foreground">{formatPrice(cartTotal())}</span>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={() => { setCartOpen(false); goCart(); }}>
            View cart
          </Button>
          <Button className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90" onClick={() => { setCartOpen(false); goCheckout(); }}>
            Checkout
          </Button>
        </div>
      </div>
    </>
  );
}
