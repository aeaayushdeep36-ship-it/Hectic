"use client";

export function HecticLogo({ size = 28 }: { readonly size?: number }) {
  return (
    <img
      src="/hectic-logo.jpg"
      alt="Hectic"
      width={size}
      height={size}
      className="object-cover rounded-[2px] border border-[#D4AF6A]/35 shrink-0"
      style={{ width: size, height: size }}
    />
  );
}
