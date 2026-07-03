"use client";

import {
  Gamepad2,
  Gift,
  Sparkles,
  Crown,
  Play,
  Code2,
  Music,
  BookOpen,
  Shield,
  Zap,
  Download,
  Layout,
  Palette,
  GraduationCap,
  Users,
  Share2,
  CreditCard,
  type LucideIcon,
} from "lucide-react";

const ICONS: Record<string, LucideIcon> = {
  Gamepad2,
  Gift,
  Sparkles,
  Crown,
  Play,
  Code2,
  Music,
  BookOpen,
  Shield,
  Zap,
  Download,
  Layout,
  Palette,
  GraduationCap,
  Users,
  Share2,
  CreditCard,
};

export function CategoryIcon({
  name,
  className,
}: {
  name: string;
  className?: string;
}) {
  const Icon = ICONS[name] ?? Zap;
  return <Icon className={className} />;
}

export function getIcon(name: string): LucideIcon {
  return ICONS[name] ?? Zap;
}
