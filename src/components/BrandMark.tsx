'use client';

import { useEffect, useState } from 'react';

export type BrandVariant = 'neon-bod' | 'neon-joe' | 'gradient' | 'stacked';

export const BRAND_VARIANT_KEY = 'joebod-brand-variant-v1';

export const BRAND_VARIANTS: {
  id: BrandVariant;
  label: string;
  note: string;
  logo: string;
}[] = [
  {
    id: 'neon-bod',
    label: 'V1 · Green bod',
    note: 'White JOE + neon green bod + cyan line',
    logo: '/brand/joebod-v1.png',
  },
  {
    id: 'neon-joe',
    label: 'V2 · Neon JOE',
    note: 'Cyan JOE + white bod + green line',
    logo: '/brand/joebod-v2.png',
  },
  {
    id: 'gradient',
    label: 'V3 · Gradient bod',
    note: 'White JOE + green→blue bod',
    logo: '/brand/joebod-v3.png',
  },
  {
    id: 'stacked',
    label: 'V4 · Stacked',
    note: 'JOE over green bod',
    logo: '/brand/joebod-v4.png',
  },
];

export function readBrandVariant(): BrandVariant {
  if (typeof window === 'undefined') return 'gradient';
  const raw = localStorage.getItem(BRAND_VARIANT_KEY);
  if (raw === 'neon-bod' || raw === 'neon-joe' || raw === 'gradient' || raw === 'stacked') return raw;
  return 'gradient';
}

export function writeBrandVariant(variant: BrandVariant): void {
  localStorage.setItem(BRAND_VARIANT_KEY, variant);
  window.dispatchEvent(new Event('joebod-brand-updated'));
}

type Props = {
  className?: string;
  underline?: boolean;
  variant?: BrandVariant;
};

export function BrandMark({ className = '', underline = true, variant }: Props) {
  const [active, setActive] = useState<BrandVariant>(variant ?? 'gradient');

  useEffect(() => {
    if (variant) {
      setActive(variant);
      return;
    }
    const sync = () => setActive(readBrandVariant());
    sync();
    window.addEventListener('joebod-brand-updated', sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener('joebod-brand-updated', sync);
      window.removeEventListener('storage', sync);
    };
  }, [variant]);

  if (active === 'stacked') {
    return (
      <div className={`brand-wrap brand-stacked ${className}`.trim()}>
        <div className="brand brand-joe" aria-hidden>
          JOE
        </div>
        <div className="brand brand-bod-only" aria-hidden>
          bod
        </div>
        <span className="sr-only">JOEbod</span>
        {underline ? <div className="brand-underline brand-underline-green" aria-hidden /> : null}
      </div>
    );
  }

  const joeClass = active === 'neon-joe' ? 'brand-joe brand-joe-neon' : 'brand-joe';
  const bodClass =
    active === 'neon-bod'
      ? 'brand-bod brand-bod-neon'
      : active === 'gradient'
        ? 'brand-bod brand-bod-gradient'
        : 'brand-bod';
  const underClass =
    active === 'neon-joe'
      ? 'brand-underline brand-underline-green'
      : active === 'neon-bod'
        ? 'brand-underline brand-underline-blue'
        : 'brand-underline brand-underline-duo';

  return (
    <div className={`brand-wrap ${className}`.trim()}>
      <div className="brand" aria-label="JOEbod">
        <span className={joeClass}>JOE</span>
        <span className={bodClass}>bod</span>
      </div>
      {underline ? <div className={underClass} aria-hidden /> : null}
    </div>
  );
}
