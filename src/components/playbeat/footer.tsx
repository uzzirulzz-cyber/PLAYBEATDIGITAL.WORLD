"use client";

import { STORE, CATEGORIES } from "@/lib/store-config";
import { useStore } from "@/store/cart";
import { Store, Mail, Shield, Truck, Headset } from "lucide-react";

export function Footer() {
  const { goShop, goOrders, goAdmin, goHome } = useStore();

  return (
    <footer className="mt-auto border-t border-border bg-secondary/30">
      {/* trust strip */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8">
        <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
          <TrustItem icon={Truck} title="Instant delivery" text="Codes & access sent to your email immediately." />
          <TrustItem icon={Shield} title="Secure UBL checkout" text="Visa · Mastercard · 3D Secure encrypted." />
          <TrustItem icon={Headset} title="24/7 support" text="Real humans, any time, every day." />
          <TrustItem icon={Store} title="Worldwide activation" text="Region-free digital products, global use." />
        </div>
      </div>

      <div className="border-t border-border">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-10">
          <div className="grid gap-8 md:grid-cols-4">
            <div className="md:col-span-1">
              <button onClick={goHome} className="flex items-center gap-2.5">
                <span className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br from-primary to-muted-foreground/70 text-background">
                  <Store className="h-5 w-5" />
                </span>
                <span className="flex flex-col leading-none">
                  <span className="text-sm font-bold tracking-[0.18em] text-primary">PLAYBEAT</span>
                  <span className="text-[10px] font-medium tracking-[0.3em] text-muted-foreground">
                    DIGITAL STORE
                  </span>
                </span>
              </button>
              <p className="mt-4 text-sm text-muted-foreground max-w-xs">{STORE.tagline}</p>
            </div>

            <FooterCol title="Shop">
              {CATEGORIES.slice(0, 5).map((c) => (
                <FooterLink key={c.id} onClick={() => goShop(c.id)}>{c.name}</FooterLink>
              ))}
            </FooterCol>

            <FooterCol title="Account">
              <FooterLink onClick={goOrders}>My Orders</FooterLink>
              <FooterLink onClick={goShop}>All products</FooterLink>
              <FooterLink onClick={goAdmin}>Admin panel</FooterLink>
            </FooterCol>

            <FooterCol title="Support">
              <FooterLink href={`mailto:${STORE.supportEmail}`}>
                <Mail className="mr-1.5 inline h-3.5 w-3.5" />
                {STORE.supportEmail}
              </FooterLink>
              <FooterLink>Help center</FooterLink>
              <FooterLink>Terms & refund policy</FooterLink>
            </FooterCol>
          </div>

          <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-border pt-6 sm:flex-row">
            <p className="text-xs text-muted-foreground">
              © {new Date().getFullYear()} {STORE.name}. All rights reserved.
            </p>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="rounded border border-border px-2 py-1">VISA</span>
              <span className="rounded border border-border px-2 py-1">Mastercard</span>
              <span className="rounded border border-border px-2 py-1">UBL EPG</span>
              <span className="rounded border border-border px-2 py-1">3D Secure</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

function TrustItem({ icon: Icon, title, text }: { icon: typeof Store; title: string; text: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-secondary text-primary">
        <Icon className="h-4.5 w-4.5" />
      </span>
      <div>
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground">{text}</p>
      </div>
    </div>
  );
}

function FooterCol({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</h4>
      <ul className="space-y-2">{children}</ul>
    </div>
  );
}

function FooterLink({
  children,
  onClick,
  href,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  href?: string;
}) {
  const cls = "text-sm text-muted-foreground hover:text-foreground transition-colors";
  if (href) {
    return (
      <li>
        <a href={href} className={cls}>{children}</a>
      </li>
    );
  }
  return (
    <li>
      <button onClick={onClick} className={cls}>{children}</button>
    </li>
  );
}
