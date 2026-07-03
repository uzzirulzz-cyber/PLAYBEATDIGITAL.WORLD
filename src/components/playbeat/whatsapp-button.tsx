"use client";

import { useEffect, useState } from "react";
import { MessageCircle, X } from "lucide-react";

/**
 * Floating WhatsApp contact button.
 * Opens a WhatsApp chat with the store's support number.
 * Appears on all pages, bottom-right corner.
 */
export function WhatsAppButton() {
  const [showTooltip, setShowTooltip] = useState(false);
  const [visible, setVisible] = useState(false);

  // Fade in after a short delay so it doesn't jolt on page load
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 1500);
    return () => clearTimeout(t);
  }, []);

  // Auto-show tooltip once after 4 seconds, then hide after 6 seconds
  useEffect(() => {
    const showT = setTimeout(() => setShowTooltip(true), 4000);
    const hideT = setTimeout(() => setShowTooltip(false), 10000);
    return () => {
      clearTimeout(showT);
      clearTimeout(hideT);
    };
  }, []);

  const phoneNumber = "923321029333"; // +92 332 1029333
  const message = encodeURIComponent(
    "Hi Playbeat! I have a question about a gaming top-up."
  );
  const whatsappUrl = `https://wa.me/${phoneNumber}?text=${message}`;

  return (
    <div
      className={`fixed bottom-5 right-5 z-50 flex items-end gap-2 transition-opacity duration-500 ${
        visible ? "opacity-100" : "opacity-0 pointer-events-none"
      }`}
    >
      {/* Tooltip / chat bubble */}
      {showTooltip && (
        <div className="relative mb-1 hidden sm:block">
          <div className="relative rounded-xl border border-border bg-card px-4 py-3 shadow-xl">
            <button
              onClick={() => setShowTooltip(false)}
              className="absolute -right-2 -top-2 grid h-5 w-5 place-items-center rounded-full bg-secondary text-muted-foreground hover:text-foreground"
              aria-label="Close"
            >
              <X className="h-3 w-3" />
            </button>
            <p className="text-sm font-semibold text-foreground">Need help?</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Chat with us on WhatsApp — instant replies 24/7
            </p>
            {/* speech bubble tail */}
            <span className="absolute bottom-3 -right-1.5 h-3 w-3 rotate-45 border-b border-r border-border bg-card" />
          </div>
        </div>
      )}

      {/* WhatsApp button */}
      <a
        href={whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Chat on WhatsApp"
        className="group flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] shadow-lg shadow-[#25D366]/30 transition-transform hover:scale-110 active:scale-95"
      >
        <MessageCircle className="h-7 w-7 text-white" fill="white" strokeWidth={1.5} />
        {/* pulse ring */}
        <span className="absolute h-14 w-14 animate-ping rounded-full bg-[#25D366]/40" />
      </a>
    </div>
  );
}
