// Playbeat Digital Store — central configuration

export type CategoryConfig = {
  id: string;
  name: string;
  icon: string; // lucide icon name
  gradient: string; // tailwind gradient classes for artwork
  blurb: string;
};

export const CATEGORIES: CategoryConfig[] = [
  {
    id: "games",
    name: "Games",
    icon: "Gamepad2",
    gradient: "from-violet-600/80 to-fuchsia-600/80",
    blurb: "Game keys & top-ups",
  },
  {
    id: "gift-cards",
    name: "Gift Cards",
    icon: "Gift",
    gradient: "from-rose-500/80 to-orange-500/80",
    blurb: "Steam, Amazon, Google Play",
  },
  {
    id: "ai-tools",
    name: "AI Tools",
    icon: "Sparkles",
    gradient: "from-cyan-500/80 to-blue-600/80",
    blurb: "ChatGPT, Midjourney & more",
  },
  {
    id: "subscriptions",
    name: "Subscriptions",
    icon: "Crown",
    gradient: "from-amber-500/80 to-yellow-500/80",
    blurb: "Discord Nitro, VPNs, pro plans",
  },
  {
    id: "streaming",
    name: "Streaming",
    icon: "Play",
    gradient: "from-red-600/80 to-rose-700/80",
    blurb: "Netflix, YouTube, Spotify",
  },
  {
    id: "software",
    name: "Software",
    icon: "Code2",
    gradient: "from-emerald-500/80 to-teal-600/80",
    blurb: "Adobe, Office, dev tools",
  },
  {
    id: "music",
    name: "Music",
    icon: "Music",
    gradient: "from-pink-500/80 to-purple-600/80",
    blurb: "Sample packs & beats",
  },
  {
    id: "e-books",
    name: "E-Books",
    icon: "BookOpen",
    gradient: "from-sky-500/80 to-indigo-600/80",
    blurb: "Digital guides & courses",
  },
];

export function getCategory(id: string): CategoryConfig | undefined {
  return CATEGORIES.find((c) => c.id === id);
}

// Admin whitelisted emails (admin panel access)
export const ADMIN_EMAILS = [
  "admin@playbeat.live",
  "owner@playbeat.live",
];

export const STORE = {
  name: "Playbeat Digital Store",
  tagline: "Digital products, delivered instantly — worldwide.",
  currency: "PKR",
  supportEmail: "support@playbeat.live",
  tickerItems: [
    "Instant digital delivery",
    "Secure UBL checkout · Visa · Mastercard · 3D Secure",
    "Worldwide activation",
    "24/7 customer support",
    "Best price on AI tools & subscriptions",
    "Steam · Netflix · ChatGPT · Spotify",
  ],
};

export type SeedProduct = {
  name: string;
  slug: string;
  description: string;
  category: string;
  brand: string;
  price: number;
  oldPrice?: number;
  badge?: string;
  icon: string;
  gradient: string;
  stock: number;
  featured?: boolean;
};

export const SEED_PRODUCTS: SeedProduct[] = [
  // Games
  {
    name: "EA FC 25 — PC Game Key",
    slug: "ea-fc-25-pc",
    description:
      "EA Sports FC 25 digital activation key for PC (EA App). Instant delivery to your email after payment. Region-free, worldwide activation.",
    category: "games",
    brand: "EA Sports",
    price: 7499,
    oldPrice: 9999,
    badge: "-25%",
    icon: "Gamepad2",
    gradient: "from-violet-600/80 to-fuchsia-600/80",
    stock: 80,
    featured: true,
  },
  {
    name: "Cyberpunk 2077 — Steam Key",
    slug: "cyberpunk-2077-steam",
    description:
      "Cyberpunk 2077 Steam CD key. Includes Phantom Liberty. Activate worldwide on Steam. Delivered instantly.",
    category: "games",
    brand: "CD Projekt",
    price: 3299,
    oldPrice: 4499,
    badge: "HOT",
    icon: "Gamepad2",
    gradient: "from-violet-600/80 to-fuchsia-600/80",
    stock: 120,
    featured: true,
  },
  {
    name: "Red Dead Redemption 2 — Rockstar Key",
    slug: "rdr2-rockstar",
    description:
      "Red Dead Redemption 2 Rockstar Games activation key. Epic open-world adventure. Instant email delivery.",
    category: "games",
    brand: "Rockstar",
    price: 5999,
    icon: "Gamepad2",
    gradient: "from-violet-600/80 to-fuchsia-600/80",
    stock: 60,
  },
  // Gift Cards
  {
    name: "Steam Gift Card $50",
    slug: "steam-gift-card-50",
    description:
      "Steam wallet gift card worth $50 USD. Redeem on any Steam account worldwide. Code delivered instantly to your email.",
    category: "gift-cards",
    brand: "Steam",
    price: 14999,
    oldPrice: 16500,
    badge: "BEST SELLER",
    icon: "Gift",
    gradient: "from-rose-500/80 to-orange-500/80",
    stock: 200,
    featured: true,
  },
  {
    name: "Amazon Gift Card $100",
    slug: "amazon-gift-card-100",
    description:
      "Amazon.com gift card worth $100 USD. Use for shopping, Prime, Kindle and more. Worldwide redemption.",
    category: "gift-cards",
    brand: "Amazon",
    price: 29500,
    icon: "Gift",
    gradient: "from-rose-500/80 to-orange-500/80",
    stock: 90,
  },
  {
    name: "Google Play Gift Card $25",
    slug: "google-play-gift-card-25",
    description:
      "Google Play gift card $25 USD for apps, games, movies and in-app purchases. Delivered instantly.",
    category: "gift-cards",
    brand: "Google Play",
    price: 7499,
    badge: "POPULAR",
    icon: "Gift",
    gradient: "from-rose-500/80 to-orange-500/80",
    stock: 150,
  },
  // AI Tools
  {
    name: "ChatGPT Plus — 1 Month",
    slug: "chatgpt-plus-1-month",
    description:
      "ChatGPT Plus subscription for 1 month. Access GPT-4, faster response times and priority access to new features. Account upgrade delivered within 1 hour.",
    category: "ai-tools",
    brand: "OpenAI",
    price: 4499,
    oldPrice: 4999,
    badge: "-10%",
    icon: "Sparkles",
    gradient: "from-cyan-500/80 to-blue-600/80",
    stock: 999,
    featured: true,
  },
  {
    name: "Midjourney Standard — 1 Month",
    slug: "midjourney-standard-1-month",
    description:
      "Midjourney Standard plan for 1 month. 15h fast GPU time, unlimited relaxed generations. Perfect for creators and designers.",
    category: "ai-tools",
    brand: "Midjourney",
    price: 8999,
    icon: "Sparkles",
    gradient: "from-cyan-500/80 to-blue-600/80",
    stock: 500,
    featured: true,
  },
  {
    name: "Claude Pro — 1 Month",
    slug: "claude-pro-1-month",
    description:
      "Claude Pro subscription for 1 month. Higher message limits, priority access and Claude 3.5 Sonnet. Delivered to your account.",
    category: "ai-tools",
    brand: "Anthropic",
    price: 4499,
    badge: "NEW",
    icon: "Sparkles",
    gradient: "from-cyan-500/80 to-blue-600/80",
    stock: 300,
  },
  // Subscriptions
  {
    name: "Discord Nitro — 1 Month",
    slug: "discord-nitro-1-month",
    description:
      "Discord Nitro 1 month boost. HD streaming, 500MB uploads, 2 server boosts and custom tags. Instant activation.",
    category: "subscriptions",
    brand: "Discord",
    price: 2499,
    oldPrice: 2999,
    icon: "Crown",
    gradient: "from-amber-500/80 to-yellow-500/80",
    stock: 400,
  },
  {
    name: "NordVPN — 1 Year",
    slug: "nordvpn-1-year",
    description:
      "NordVPN 1-year subscription. Secure browsing, 5000+ servers worldwide, no logs. Best value privacy plan.",
    category: "subscriptions",
    brand: "NordVPN",
    price: 9999,
    oldPrice: 14999,
    badge: "-33%",
    icon: "Shield",
    gradient: "from-amber-500/80 to-yellow-500/80",
    stock: 250,
    featured: true,
  },
  // Streaming
  {
    name: "Netflix Premium — 1 Month",
    slug: "netflix-premium-1-month",
    description:
      "Netflix Premium 1 month. 4K Ultra HD streaming on 4 devices. Worldwide access. Account details delivered within 1 hour.",
    category: "streaming",
    brand: "Netflix",
    price: 2999,
    badge: "HOT",
    icon: "Play",
    gradient: "from-red-600/80 to-rose-700/80",
    stock: 600,
    featured: true,
  },
  {
    name: "YouTube Premium — 1 Month",
    slug: "youtube-premium-1-month",
    description:
      "YouTube Premium 1 month. Ad-free, background play and YouTube Music. Delivered to your Google account.",
    category: "streaming",
    brand: "Google",
    price: 1999,
    icon: "Play",
    gradient: "from-red-600/80 to-rose-700/80",
    stock: 450,
  },
  // Software
  {
    name: "Adobe Creative Cloud — 1 Month",
    slug: "adobe-cc-1-month",
    description:
      "Adobe Creative Cloud All Apps 1 month. Photoshop, Illustrator, Premiere Pro and 20+ apps. For professionals and creators.",
    category: "software",
    brand: "Adobe",
    price: 8499,
    oldPrice: 9999,
    icon: "Code2",
    gradient: "from-emerald-500/80 to-teal-600/80",
    stock: 180,
    featured: true,
  },
  {
    name: "Microsoft Office 365 — 1 Year",
    slug: "office-365-1-year",
    description:
      "Microsoft 365 Family 1 year. Word, Excel, PowerPoint, 1TB OneDrive for up to 6 people. Genuine license.",
    category: "software",
    brand: "Microsoft",
    price: 18999,
    oldPrice: 22999,
    badge: "SAVE 17%",
    icon: "Code2",
    gradient: "from-emerald-500/80 to-teal-600/80",
    stock: 120,
  },
  // Music
  {
    name: "Trap Kings Sample Pack",
    slug: "trap-kings-sample-pack",
    description:
      "Premium trap sample pack — 250+ loops, one-shots, 808s and MIDI files. Royalty-free. Instant download link after purchase.",
    category: "music",
    brand: "Playbeat Audio",
    price: 2499,
    oldPrice: 3499,
    badge: "-28%",
    icon: "Music",
    gradient: "from-pink-500/80 to-purple-600/80",
    stock: 999,
  },
  // E-books
  {
    name: "AI Prompt Engineering Masterclass",
    slug: "ai-prompt-engineering-ebook",
    description:
      "Complete guide to prompt engineering — 180-page PDF + prompt library. Master ChatGPT, Claude and Midjourney. Instant download.",
    category: "e-books",
    brand: "Playbeat Academy",
    price: 1499,
    oldPrice: 2499,
    badge: "NEW",
    icon: "BookOpen",
    gradient: "from-sky-500/80 to-indigo-600/80",
    stock: 999,
    featured: true,
  },
];
