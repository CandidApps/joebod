'use client';

import { useEffect, useState } from 'react';
import { applyTheme, readTheme, type ThemeMode } from '@/components/ThemeToggle';
import {
  ACCENT_PRESETS,
  PRIMARY_PRESETS,
  getAccentColor,
  getPrimaryColor,
  loadAppearanceColors,
  saveAccentColor,
  savePrimaryColor,
} from '@/lib/appearance';
import { BrandMark, BRAND_VARIANTS, readBrandVariant, writeBrandVariant } from '@/components/BrandMark';

export function AppearanceSettings() {
  const [primary, setPrimary] = useState<string>(PRIMARY_PRESETS[0]);
  const [accent, setAccent] = useState<string>(ACCENT_PRESETS[0]);
  const [mode, setMode] = useState<ThemeMode>('dark');
  const [variant, setVariant] = useState(readBrandVariant());

  useEffect(() => {
    loadAppearanceColors();
    setPrimary(getPrimaryColor());
    setAccent(getAccentColor());
    setMode(readTheme());
  }, []);

  const setColorMode = (next: ThemeMode) => {
    applyTheme(next);
    setMode(next);
  };

  return (
    <>
      <div className="settings-block glass">
        <div className="settings-block-title">Mode</div>
        <div className="seg">
          <button type="button" className={mode === 'dark' ? 'on' : ''} onClick={() => setColorMode('dark')}>
            Dark
          </button>
          <button type="button" className={mode === 'light' ? 'on' : ''} onClick={() => setColorMode('light')}>
            Light
          </button>
        </div>
      </div>

      <div className="settings-block glass">
        <div className="settings-block-title">Primary Color</div>
        <div className="color-swatches">
          {PRIMARY_PRESETS.map((hex) => (
            <button
              key={hex}
              type="button"
              className={`color-swatch${primary.toLowerCase() === hex.toLowerCase() ? ' selected' : ''}`}
              style={{ background: hex }}
              aria-label={`Primary ${hex}`}
              onClick={() => {
                savePrimaryColor(hex);
                setPrimary(hex);
              }}
            />
          ))}
        </div>
        <div className="color-pick-row">
          <input
            type="color"
            value={primary}
            onChange={(e) => {
              savePrimaryColor(e.target.value);
              setPrimary(e.target.value);
            }}
          />
          <span className="color-pick-label">Custom color</span>
        </div>
        <div className="edit-note">
          Sets the background gradient. Text and card contrast adjust automatically to stay readable in
          both modes.
        </div>
      </div>

      <div className="settings-block glass">
        <div className="settings-block-title">Accent Color</div>
        <div className="color-swatches">
          {ACCENT_PRESETS.map((hex) => (
            <button
              key={hex}
              type="button"
              className={`color-swatch${accent.toLowerCase() === hex.toLowerCase() ? ' selected' : ''}`}
              style={{ background: hex }}
              aria-label={`Accent ${hex}`}
              onClick={() => {
                saveAccentColor(hex);
                setAccent(hex);
              }}
            />
          ))}
        </div>
        <div className="color-pick-row">
          <input
            type="color"
            value={accent}
            onChange={(e) => {
              saveAccentColor(e.target.value);
              setAccent(e.target.value);
            }}
          />
          <span className="color-pick-label">Custom color</span>
        </div>
        <div className="edit-note">Highlights the quick-start button and other key moments.</div>
      </div>

      <div className="settings-block glass">
        <div className="settings-block-title">Logo variants</div>
        <div className="edit-note" style={{ marginBottom: 12 }}>
          Pick a JOEbod look for the brand mark elsewhere in the app.
        </div>
        <div className="logo-grid">
          {BRAND_VARIANTS.map((v) => (
            <button
              key={v.id}
              type="button"
              className={`logo-pick${variant === v.id ? ' active' : ''}`}
              onClick={() => {
                writeBrandVariant(v.id);
                setVariant(v.id);
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={v.logo} alt={v.label} />
              <div className="logo-pick-meta">
                <strong>{v.label}</strong>
                <span>{v.note}</span>
              </div>
              <div className="logo-pick-live">
                <BrandMark variant={v.id} underline />
              </div>
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
