"use client";

import Image, { type ImageProps } from "next/image";
import { useState } from "react";

type SafeImageProps = ImageProps & {
  fallbackLabel: string;
};

export function SafeImage({ fallbackLabel, alt, className, ...props }: SafeImageProps) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div className="grid h-full w-full place-items-center bg-smoke">
        <span className="rounded-full border border-line px-4 py-2 text-sm font-semibold text-muted">
          {fallbackLabel}
        </span>
      </div>
    );
  }

  return (
    <Image
      {...props}
      alt={alt}
      className={className}
      onError={() => setFailed(true)}
    />
  );
}
