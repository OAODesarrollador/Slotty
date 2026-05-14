"use client";

import { ReactNode, useEffect, useState } from "react";

type TenantPageRevealProps = {
  imageUrl: string;
  children: ReactNode;
};

export function TenantPageReveal({ imageUrl, children }: TenantPageRevealProps) {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const image = new Image();

    image.onload = async () => {
      try {
        await image.decode();
      } catch {
        // Some browsers reject decode() for already loaded images. onload is enough.
      }

      if (!cancelled) {
        setIsReady(true);
      }
    };

    image.onerror = () => {
      if (!cancelled) {
        setIsReady(true);
      }
    };

    image.src = imageUrl;

    if (image.complete) {
      image.onload?.(new Event("load"));
    }

    return () => {
      cancelled = true;
    };
  }, [imageUrl]);

  return (
    <div className={`tenant-page-reveal${isReady ? " is-ready" : ""}`}>
      {children}
    </div>
  );
}
