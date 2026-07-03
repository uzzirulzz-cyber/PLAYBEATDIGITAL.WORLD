"use client";

import { useState } from "react";
import { CategoryIcon } from "./icon";

type Props = {
  src: string | null | undefined;
  icon: string;
  gradient: string;
  alt: string;
  className?: string; // wrapper sizing/rounding
  imgClassName?: string; // image object-fit tuning
  iconClassName?: string; // fallback icon size
};

/**
 * ProductImage — shows a real product image with a graceful gradient+icon
 * fallback if the image URL is missing or fails to load.
 *
 * The img is keyed by `src` so React remounts it (resetting loaded/errored
 * state) whenever the URL changes — no useEffect needed.
 */
export function ProductImage({
  src,
  icon,
  gradient,
  alt,
  className = "",
  imgClassName = "object-cover",
  iconClassName = "h-14 w-14",
}: Props) {
  const [errored, setErrored] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const showFallback = !src || errored;

  return (
    <div className={`relative overflow-hidden bg-gradient-to-br ${gradient} ${className}`}>
      {showFallback ? (
        <div className="absolute inset-0 grid place-items-center">
          <CategoryIcon name={icon} className={`${iconClassName} text-white/90 drop-shadow-lg`} />
        </div>
      ) : (
        <>
          {/* gradient underlay while image loads */}
          <div className={`absolute inset-0 bg-gradient-to-br ${gradient}`} />
          <img
            key={src}
            src={src}
            alt={alt}
            loading="lazy"
            onLoad={() => setLoaded(true)}
            onError={() => setErrored(true)}
            className={`relative h-full w-full ${imgClassName} transition-opacity duration-300 ${
              loaded ? "opacity-100" : "opacity-0"
            }`}
          />
        </>
      )}
    </div>
  );
}
