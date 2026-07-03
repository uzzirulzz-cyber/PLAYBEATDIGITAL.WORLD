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
import {
  Search,
  ShoppingCart,
  Menu,
  Package,
  Home,
  Store,
  Gamepad2,
  Gift,
  Code2,
  Sparkles,
  Crown,
  Star,
  TrendingUp,
  LayoutDashboard,
  Share2,
  BarChart3,
  Smartphone,
  Clock,
  Mail,
  MapPin,
  MessageCircle,
  Shield,
} from "lucide-react";
import { formatPrice } from "@/lib/format";
import { ProductImage } from "./product-image";

// Category bar links (matching the screenshot)
const CAT_BAR = [
  { label: "Home", icon: Home, view: "home" as const },
  { label: "Games", icon: Gamepad2, category: "pubg-mobile" },
  { label: "Gift Cards", icon: Gift, category: "steam-wallet" },
  { label: "Software", icon: Code2, category: undefined },
  { label: "AI Tools", icon: Sparkles, category: undefined },
  { label: "Subscriptions", icon: Crown, category: undefined },
  { label: "Best Value", icon: Star, view: "shop" as const },
  { label: "Trending", icon: TrendingUp, view: "shop" as const },
];

export function Navbar() {
  const { goHome, goShop, goCart, goOrders, goAdmin, cartCount, cartOpen, setCartOpen } = useStore();
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
    if (query.trim()) {
      window.dispatchEvent(new CustomEvent("playbeat:search", { detail: query.trim() }));
    }
    setMobileOpen(false);
  }

  return (
    <header
      className={`sticky top-0 z-40 w-full transition-colors ${
        scrolled ? "bg-background/95 backdrop-blur border-b border-border" : "bg-background/80 backdrop-blur-sm"
      }`}
    >
      {/* ── Top bar: logo + nav buttons + cart ── */}
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-3 px-4 sm:px-6">
        {/* Logo */}
        <button
          onClick={goHome}
          className="flex shrink-0 items-center gap-2"
          aria-label="Playbeat home"
        >
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-primary to-muted-foreground/70 text-background">
            <Store className="h-4.5 w-4.5" />
          </span>
          <span className="text-base font-bold tracking-tight text-foreground">
            playbeat<span className="text-chart-3">.digital</span>
          </span>
        </button>

        {/* Top nav buttons (desktop) */}
        <nav className="ml-4 hidden md:flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={() => goShop()} className="text-muted-foreground hover:text-foreground">
            <Store className="mr-1.5 h-4 w-4 text-chart-1" /> Marketplace
          </Button>
          <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
            <Share2 className="mr-1.5 h-4 w-4" /> Affiliate Hub
          </Button>
          <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
            <BarChart3 className="mr-1.5 h-4 w-4" /> Analytics
          </Button>
          <Button variant="ghost" size="sm" onClick={goAdmin} className="text-muted-foreground hover:text-foreground">
            <LayoutDashboard className="mr-1.5 h-4 w-4" /> Admin
          </Button>
        </nav>

        {/* Right side: currency + cart + orders */}
        <div className="ml-auto flex items-center gap-1">
          <span className="hidden sm:inline-block rounded-md border border-border px-2 py-1 text-xs text-muted-foreground">
            Rs PKR
          </span>
          <Button variant="ghost" size="icon" onClick={goOrders} aria-label="My orders" title="My Orders">
            <Package className="h-5 w-5" />
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
            <SheetContent className="w-full sm:max-w-md bg-card border-border flex flex-col p-0" aria-describedby={undefined}>
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
            <SheetContent side="left" className="w-72 bg-card border-border p-0" aria-describedby={undefined}>
              <SheetHeader className="px-5 py-4 border-b border-border">
                <SheetTitle className="text-foreground">playbeat<span className="text-chart-3">.digital</span></SheetTitle>
              </SheetHeader>
              <div className="p-4 space-y-3">
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
                  {CAT_BAR.map((item) => (
                    <Button
                      key={item.label}
                      variant="ghost"
                      className="justify-start"
                      onClick={() => {
                        if (item.view === "home") goHome();
                        else if (item.category) goShop(item.category);
                        else goShop();
                        setMobileOpen(false);
                      }}
                    >
                      <item.icon className="mr-2 h-4 w-4" /> {item.label}
                    </Button>
                  ))}
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* ── Category bar (second row) ── */}
      <div className="border-t border-border/50 bg-background/60">
        <div className="mx-auto flex h-11 max-w-7xl items-center gap-1 px-4 sm:px-6 overflow-x-auto no-scrollbar">
          {CAT_BAR.map((item) => (
            <button
              key={item.label}
              onClick={() => {
                if (item.view === "home") goHome();
                else if (item.category) goShop(item.category);
                else goShop();
              }}
              className="group flex shrink-0 items-center gap-1.5 border-b-2 border-transparent px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:border-chart-1 hover:text-foreground"
            >
              <item.icon className="h-4 w-4" />
              <span className="hidden sm:inline">{item.label}</span>
            </button>
          ))}

          {/* Search bar (right side of category bar) */}
          <form onSubmit={submitSearch} className="relative ml-auto hidden md:block w-full max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search game keys, AI tools, gift cards, software…"
              className="h-8 pl-9 pr-3 text-xs bg-secondary/60 border-border"
            />
          </form>
        </div>
      </div>
    </header>
  );
}

function CartSheetBody() {
  const { cart, updateQuantity, removeFromCart, cartTotal, goCheckout, goCart, goShop, setCartOpen } = useStore();

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
            <ProductImage
              src={item.image}
              icon={item.icon}
              gradient={item.gradient}
              alt={item.name}
              className="h-14 w-14 shrink-0 rounded-md"
              iconClassName="h-6 w-6"
            />
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
