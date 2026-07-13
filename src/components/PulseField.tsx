'use client';

import { useEffect, useRef } from 'react';

type Props = {
  bpm?: number;
  className?: string;
  compact?: boolean;
};

/** Ambient p5 heartbeat field — driven by bpm when available */
export function PulseField({ bpm = 72, className = '', compact = false }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const bpmRef = useRef(bpm);

  useEffect(() => {
    bpmRef.current = bpm;
  }, [bpm]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    let sketch: { remove: () => void } | null = null;
    let cancelled = false;

    void (async () => {
      const mod = await import('p5');
      const P5 = mod.default;
      if (cancelled || !host) return;

      sketch = new P5((p: any) => {
        const particles: { a: number; r: number; s: number; w: number }[] = [];
        const particleCount = compact ? 14 : 28;

        const sizeCanvas = () => {
          if (compact) {
            const side = Math.min(host.clientWidth || 96, 110);
            return { w: side, h: side };
          }
          const w = host.clientWidth || 320;
          const h = Math.max(120, Math.round(w * 0.42));
          return { w, h };
        };

        p.setup = () => {
          const { w, h } = sizeCanvas();
          const c = p.createCanvas(w, h);
          c.parent(host);
          p.pixelDensity(Math.min(2, window.devicePixelRatio || 1));
          p.noStroke();
          for (let i = 0; i < particleCount; i++) {
            particles.push({
              a: p.random(p.TWO_PI),
              r: p.random(0.15, 0.92),
              s: p.random(0.002, 0.01),
              w: p.random(1.2, compact ? 2.8 : 4),
            });
          }
        };

        p.windowResized = () => {
          const { w, h } = sizeCanvas();
          p.resizeCanvas(w, h);
        };

        p.draw = () => {
          const rate = Math.max(40, Math.min(180, bpmRef.current || 72));
          const beat = (p.sin((p.millis() / 1000) * (rate / 60) * p.TWO_PI) + 1) / 2;
          const pulse = 0.72 + beat * 0.38;

          const dark = document.documentElement.getAttribute('data-theme') !== 'light';
          p.clear();
          p.background(0, 0);

          const cx = p.width / 2;
          const cy = p.height / 2;
          const base = Math.min(p.width, p.height) * (compact ? 0.32 : 0.28) * pulse;

          for (let i = compact ? 3 : 4; i >= 1; i--) {
            const alpha = dark ? 18 + i * 8 : 28 + i * 10;
            p.fill(57, 255, 20, alpha * (0.35 + beat * 0.65));
            p.circle(cx, cy, base * (1.1 + i * (compact ? 0.28 : 0.35)));
          }

          p.fill(0, 212, 255, dark ? 140 : 170);
          p.circle(cx, cy, base);
          p.fill(57, 255, 20, dark ? 90 : 120);
          p.circle(cx, cy, base * 0.55);

          for (const part of particles) {
            part.a += part.s * (0.7 + beat);
            const rr = base * (0.9 + part.r * 1.25);
            const x = cx + Math.cos(part.a) * rr;
            const y = cy + Math.sin(part.a) * rr * 0.78;
            p.fill(0, 240, 255, 90 + beat * 100);
            p.circle(x, y, part.w + beat * 1.5);
          }

          if (!compact) {
            p.noFill();
            p.stroke(57, 255, 20, dark ? 160 : 200);
            p.strokeWeight(1.5);
            p.beginShape();
            const midY = p.height * 0.82;
            for (let x = 0; x <= p.width; x += 4) {
              const t = x / p.width;
              const wave =
                Math.sin(t * p.TWO_PI * 3 + p.millis() * 0.004) *
                (6 + beat * 10) *
                Math.exp(-Math.pow((t - 0.5) * 3.2, 2));
              p.vertex(x, midY + wave);
            }
            p.endShape();
            p.noStroke();
          }
        };
      }, host);
    })();

    return () => {
      cancelled = true;
      sketch?.remove();
      sketch = null;
    };
  }, [compact]);

  return (
    <div
      ref={hostRef}
      className={`pulse-field${compact ? ' pulse-field-compact' : ''} ${className}`.trim()}
      aria-hidden
    />
  );
}
