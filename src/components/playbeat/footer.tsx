"use client";

import { useState } from "react";
import { STORE } from "@/lib/store-config";
import { useStore } from "@/store/cart";
import {
  Store,
  Mail,
  Clock,
  MapPin,
  MessageCircle,
  Shield,
  Home,
  Gamepad2,
  Gift,
  Code2,
  Sparkles,
  Crown,
  Star,
  TrendingUp,
  Smartphone,
  Download,
  Github,
  Twitter,
  Send,
  Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export function Footer() {
  const { goShop, goHome, goAdmin } = useStore();
  const [email, setEmail] = useState("");

  function subscribe(e: React.FormEvent) {
    e.preventDefault();
    if (email.trim()) {
      toast.success("Subscribed!", { description: `We'll send updates to ${email}` });
      setEmail("");
    }
  }

  return (
    <footer className="mt-auto border-t border-border bg-secondary/20">
      {/* Main footer content */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-12">
        <div className="grid gap-10 md:grid-cols-4">
          {/* ── Brand + Subscribe + Contact ── */}
          <div className="md:col-span-1">
            <button onClick={goHome} className="flex items-center gap-2">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-primary to-muted-foreground/70 text-background">
                <Store className="h-4.5 w-4.5" />
              </span>
              <span className="text-base font-bold text-foreground">
                playbeat<span className="text-chart-3">.digital</span>
              </span>
            </button>
            <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
              Pakistan&apos;s premier digital marketplace for game keys, software licenses, AI tools, and gift cards. Instant delivery. Trusted by thousands.
            </p>

            {/* Email subscription */}
            <form onSubmit={subscribe} className="mt-4 flex gap-2">
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Your email"
                className="h-9 bg-secondary/60 border-border text-xs"
                required
              />
              <Button type="submit" size="sm" className="shrink-0 bg-chart-1 text-background hover:bg-chart-1/90">
                <Mail className="mr-1 h-3.5 w-3.5" /> Subscribe
              </Button>
            </form>

            {/* Contact info */}
            <div className="mt-4 space-y-1.5 text-xs text-muted-foreground">
              <p className="flex items-center gap-2">
                <MessageCircle className="h-3.5 w-3.5 text-chart-1" /> WhatsApp: 0332 102 9333
              </p>
              <p className="flex items-center gap-2">
                <Mail className="h-3.5 w-3.5 text-chart-1" /> info@playbeat.digital
              </p>
              <p className="flex items-center gap-2">
                <MapPin className="h-3.5 w-3.5 text-chart-1" /> Pakistan
              </p>
              <p className="flex items-center gap-2">
                <Clock className="h-3.5 w-3.5 text-chart-1" /> 24/7 Instant Delivery
              </p>
            </div>
          </div>

          {/* ── Quick Links ── */}
          <div>
            <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-foreground">Quick Links</h4>
            <ul className="space-y-2">
              <FooterLink icon={Home} onClick={goHome}>Home</FooterLink>
              <FooterLink icon={Gamepad2} onClick={() => goShop("pubg-mobile")}>Games</FooterLink>
              <FooterLink icon={Gift} onClick={() => goShop("steam-wallet")}>Gift Cards</FooterLink>
              <FooterLink icon={Code2} onClick={() => goShop()}>Software</FooterLink>
              <FooterLink icon={Sparkles} onClick={() => goShop()}>AI Tools</FooterLink>
              <FooterLink icon={Crown} onClick={() => goShop()}>Subscriptions</FooterLink>
              <FooterLink icon={Star} onClick={() => goShop()}>Best Value</FooterLink>
              <FooterLink icon={TrendingUp} onClick={() => goShop()}>Trending</FooterLink>
            </ul>
          </div>

          {/* ── Categories ── */}
          <div>
            <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-foreground">Categories</h4>
            <ul className="space-y-2">
              <FooterLink icon={Gamepad2} onClick={() => goShop("pubg-mobile")}>Games</FooterLink>
              <FooterLink icon={Gift} onClick={() => goShop("steam-wallet")}>Gift Cards</FooterLink>
              <FooterLink icon={Code2} onClick={() => goShop()}>Software</FooterLink>
              <FooterLink icon={Sparkles} onClick={() => goShop()}>AI Tools</FooterLink>
              <FooterLink icon={Crown} onClick={() => goShop()}>Subscriptions</FooterLink>
              <FooterLink icon={TrendingUp} onClick={() => goShop()}>Top-Up</FooterLink>
            </ul>
          </div>

          {/* ── Download App + Secure ── */}
          <div>
            <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-foreground">Download Our App</h4>
            <p className="text-xs text-muted-foreground mb-3">
              Install on your phone for instant access &amp; live updates.
            </p>
            <Button className="w-full mb-4 bg-foreground text-background hover:bg-foreground/90" size="sm">
              <Download className="mr-2 h-4 w-4" /> Download Now
            </Button>
            <div className="rounded-lg border border-border bg-secondary/40 p-3">
              <p className="flex items-center gap-2 text-xs font-semibold text-foreground">
                <Shield className="h-4 w-4 text-chart-1" /> Secure Checkout
              </p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                All payments processed by Bank Alfalah, JazzCash &amp; Payrails. PCI-DSS compliant.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Payment methods ── */}
      <div className="border-t border-border">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-4">
          <p className="mb-3 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">We Accept</p>
          <div className="flex flex-wrap items-center justify-center gap-2">
            {["Visa", "Mastercard", "JazzCash", "Bank Alfalah", "Payrails", "EasyPaisa", "USDT"].map((pm) => (
              <span key={pm} className="rounded border border-border bg-secondary/40 px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
                {pm}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ── Bottom bar: links + copyright + social ── */}
      <div className="border-t border-border">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-4 sm:px-6 py-4 sm:flex-row">
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <button className="hover:text-foreground">Privacy</button>
            <button className="hover:text-foreground">Terms</button>
            <button className="hover:text-foreground">Refund Policy</button>
          </div>
          <p className="text-xs text-muted-foreground">
            © 2026 PlayBeat.Digital. All rights reserved.
            {/* discreet admin entry — invisible dot, owner-only */}
            <button
              onClick={goAdmin}
              aria-label="."
              title=""
              className="ml-1 inline-block h-1.5 w-1.5 rounded-full bg-border/40 align-middle hover:bg-border"
            />
          </p>
          <div className="flex items-center gap-3">
            <a href="https://github.com/uzzirulzz-cyber/freshcopy" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground" aria-label="GitHub">
              <Github className="h-4 w-4" />
            </a>
            <a href="#" className="text-muted-foreground hover:text-foreground" aria-label="Twitter">
              <Twitter className="h-4 w-4" />
            </a>
            <a href="#" className="text-muted-foreground hover:text-foreground" aria-label="Telegram">
              <Send className="h-4 w-4" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterLink({
  icon: Icon,
  children,
  onClick,
}: {
  icon: typeof Home;
  children: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <li>
      <button
        onClick={onClick}
        className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <Icon className="h-3.5 w-3.5 text-chart-1/70" /> {children}
      </button>
    </li>
  );
}
