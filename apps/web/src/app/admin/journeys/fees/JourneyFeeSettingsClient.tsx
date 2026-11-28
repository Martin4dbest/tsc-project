"use client";

import { useEffect, useMemo, useState } from "react";
import {
  getJourneyFeeSettings,
  saveJourneyFeeSettings,
  type JourneyFeeSettings,
} from "../journey-actions";

const initialSettings: JourneyFeeSettings = {
  enabled: true,
  interstate_enabled: true,
  fee_ngn: 1000,
  intrastate_threshold_km: 100,
};

const FEE_PRESETS = [500, 1000, 1500, 2500];
const DISTANCE_PRESETS = [50, 100, 150, 200];

export default function JourneyFeeSettingsClient() {
  const [settings, setSettings] = useState<JourneyFeeSettings>(initialSettings);
  const [savedSnapshot, setSavedSnapshot] =
    useState<JourneyFeeSettings>(initialSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [noticeError, setNoticeError] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function load() {
      const result = await getJourneyFeeSettings();

      if (!mounted) return;

      if (result.success) {
        setSettings(result.settings);
        setSavedSnapshot(result.settings);
      } else {
        setNotice(result.error);
        setNoticeError(true);
      }

      setLoading(false);
    }

    load();

    return () => {
      mounted = false;
    };
  }, []);

  const isDirty = useMemo(
    () =>
      settings.enabled !== savedSnapshot.enabled ||
      settings.interstate_enabled !== savedSnapshot.interstate_enabled ||
      settings.fee_ngn !== savedSnapshot.fee_ngn ||
      settings.intrastate_threshold_km !==
        savedSnapshot.intrastate_threshold_km,
    [settings, savedSnapshot]
  );

  function update<K extends keyof JourneyFeeSettings>(
    key: K,
    value: JourneyFeeSettings[K]
  ) {
    if (notice) setNotice("");
    setSettings((current) => ({ ...current, [key]: value }));
  }

  function handleReset() {
    setSettings(savedSnapshot);
    setNotice("");
    setNoticeError(false);
  }

  async function handleSave() {
    setSaving(true);
    setNotice("");
    setNoticeError(false);

    const result = await saveJourneyFeeSettings(settings);

    if (result.success) {
      setSavedSnapshot(settings);
      setNotice("Journey fee policy updated and published.");
    } else {
      setNotice(result.error);
      setNoticeError(true);
    }

    setSaving(false);
  }

  const formattedFee = new Intl.NumberFormat("en-NG", {
    maximumFractionDigits: 0,
  }).format(Number.isFinite(settings.fee_ngn) ? settings.fee_ngn : 0);

  return (
    <div className="jfs-root">
      <style>{`
        .jfs-root {
          --jfs-surface: #ffffff;
          --jfs-surface-subtle: #f8faff;
          --jfs-ink: #0f172a;
          --jfs-ink-muted: #475569;
          --jfs-ink-soft: #64748b;
          --jfs-border: #dce3ee;
          --jfs-border-strong: #c5d0e0;
          --jfs-navy: #0f172a;
          --jfs-navy-hover: #1e293b;
          --jfs-indigo: #3730a3;
          --jfs-indigo-bg: #eef2ff;
          --jfs-indigo-border: #c7d2fe;
          --jfs-gold: #9a6718;
          --jfs-gold-bright: #d4a24c;
          --jfs-gold-bg: #fef9ec;
          --jfs-gold-border: #f3d79c;
          --jfs-emerald: #047857;
          --jfs-emerald-bright: #10b981;
          --jfs-emerald-bg: #ecfdf5;
          --jfs-emerald-border: #a7f3d0;
          --jfs-danger: #991b1b;
          --jfs-danger-bg: #fef2f2;
          --jfs-danger-border: #fecaca;
          --jfs-radius-lg: 16px;
          --jfs-radius-md: 10px;
          --jfs-shadow: 0 2px 6px rgba(15, 23, 42, 0.04), 0 12px 28px -14px rgba(15, 23, 42, 0.12);
          color: var(--jfs-ink);
          max-width: 1140px;
        }

        .jfs-context-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          flex-wrap: wrap;
          margin-bottom: 20px;
          padding: 14px 18px;
          border-radius: 14px;
          background: linear-gradient(90deg, #ffffff 0%, #eef2ff 100%);
          border: 1px solid var(--jfs-indigo-border);
        }

        .jfs-context-copy {
          font-size: 13.5px;
          line-height: 1.55;
          color: var(--jfs-ink-muted);
          margin: 0;
          max-width: 66ch;
        }

        .jfs-status-pill {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 6px 13px;
          border-radius: 999px;
          font-size: 12.5px;
          font-weight: 700;
          white-space: nowrap;
        }

        .jfs-status-pill.is-active {
          background: var(--jfs-emerald-bg);
          color: var(--jfs-emerald);
          border: 1px solid var(--jfs-emerald-border);
        }

        .jfs-status-pill.is-paused {
          background: #f1f5f9;
          color: #475569;
          border: 1px solid #cbd5e1;
        }

        .jfs-status-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
        }

        .jfs-grid {
          display: grid;
          grid-template-columns: minmax(0, 1.45fr) minmax(0, 1fr);
          gap: 24px;
          align-items: start;
        }

        @media (max-width: 900px) {
          .jfs-grid {
            grid-template-columns: 1fr;
          }
        }

        .jfs-card {
          background: var(--jfs-surface);
          border: 1px solid var(--jfs-border);
          border-radius: var(--jfs-radius-lg);
          box-shadow: var(--jfs-shadow);
          overflow: hidden;
        }

        .jfs-card-header {
          padding: 20px 24px 16px;
          background: linear-gradient(180deg, #f8faff 0%, #ffffff 100%);
          border-bottom: 1px solid var(--jfs-border);
        }

        .jfs-card-title {
          font-size: 16.5px;
          font-weight: 700;
          letter-spacing: -0.01em;
          margin: 0 0 4px 0;
          color: var(--jfs-ink);
        }

        .jfs-card-desc {
          font-size: 13.5px;
          color: var(--jfs-ink-soft);
          margin: 0;
          line-height: 1.5;
        }

        .jfs-card-body {
          padding: 22px 24px;
        }

        .jfs-toggle-group {
          display: grid;
          gap: 12px;
        }

        .jfs-toggle-row {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 16px;
          padding: 15px 18px;
          border: 1px solid var(--jfs-border);
          border-radius: 12px;
          background: #ffffff;
          cursor: pointer;
          transition: border-color 0.18s ease, background-color 0.18s ease, box-shadow 0.18s ease;
        }

        .jfs-toggle-row:hover {
          border-color: var(--jfs-indigo-border);
          background: #fafbff;
        }

        .jfs-toggle-row.is-active {
          border-color: #a5b4fc;
          background: linear-gradient(90deg, #f8faff 0%, #eef2ff 100%);
          box-shadow: inset 3px 0 0 var(--jfs-indigo);
        }

        .jfs-toggle-row.is-disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }

        .jfs-toggle-title {
          display: block;
          font-size: 14.5px;
          font-weight: 700;
          color: var(--jfs-ink);
          margin-bottom: 3px;
        }

        .jfs-toggle-hint {
          display: block;
          font-size: 13px;
          color: var(--jfs-ink-soft);
          line-height: 1.45;
        }

        .jfs-switch {
          position: relative;
          flex-shrink: 0;
          width: 46px;
          height: 26px;
          border-radius: 999px;
          border: none;
          background: #cbd5e1;
          padding: 3px;
          cursor: pointer;
          transition: background-color 0.2s ease;
          margin-top: 2px;
        }

        .jfs-switch[aria-checked="true"] {
          background: var(--jfs-emerald-bright);
        }

        .jfs-switch:disabled {
          cursor: not-allowed;
        }

        .jfs-switch:focus-visible {
          outline: 2px solid var(--jfs-indigo);
          outline-offset: 2px;
        }

        .jfs-switch-thumb {
          display: block;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #ffffff;
          box-shadow: 0 1px 3px rgba(15, 23, 42, 0.25);
          transform: translateX(0);
          transition: transform 0.2s cubic-bezier(0.22, 1, 0.36, 1);
        }

        .jfs-switch[aria-checked="true"] .jfs-switch-thumb {
          transform: translateX(20px);
        }

        .jfs-divider {
          height: 1px;
          background: linear-gradient(90deg, transparent, var(--jfs-border), transparent);
          margin: 22px 0;
        }

        .jfs-fields {
          display: grid;
          gap: 20px;
          transition: opacity 0.2s ease;
        }

        .jfs-fields.is-dimmed {
          opacity: 0.55;
        }

        .jfs-field-header {
          display: flex;
          align-items: baseline;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 8px;
        }

        .jfs-label {
          font-size: 14px;
          font-weight: 700;
          color: var(--jfs-ink);
        }

        .jfs-default-badge {
          font-size: 12px;
          font-weight: 600;
          color: var(--jfs-indigo);
          background: var(--jfs-indigo-bg);
          padding: 2px 8px;
          border-radius: 6px;
          font-variant-numeric: tabular-nums;
        }

        .jfs-input-wrap {
          position: relative;
          display: flex;
          align-items: center;
          border: 1px solid var(--jfs-border-strong);
          border-radius: var(--jfs-radius-md);
          background: #ffffff;
          transition: border-color 0.15s ease, box-shadow 0.15s ease;
        }

        .jfs-input-wrap:focus-within {
          border-color: var(--jfs-indigo);
          box-shadow: 0 0 0 3px rgba(55, 48, 163, 0.12);
        }

        .jfs-adornment {
          padding: 0 14px;
          font-size: 13.5px;
          font-weight: 700;
          color: var(--jfs-gold);
          user-select: none;
          background: var(--jfs-gold-bg);
          align-self: stretch;
          display: inline-flex;
          align-items: center;
        }

        .jfs-adornment-left {
          border-right: 1px solid var(--jfs-gold-border);
          border-top-left-radius: var(--jfs-radius-md);
          border-bottom-left-radius: var(--jfs-radius-md);
        }

        .jfs-adornment-right {
          color: var(--jfs-indigo);
          background: var(--jfs-indigo-bg);
          border-left: 1px solid var(--jfs-indigo-border);
          border-top-right-radius: var(--jfs-radius-md);
          border-bottom-right-radius: var(--jfs-radius-md);
        }

        .jfs-input {
          width: 100%;
          border: none;
          background: transparent;
          padding: 11px 14px;
          font-size: 16px;
          font-weight: 650;
          color: var(--jfs-ink);
          font-variant-numeric: tabular-nums;
          outline: none;
        }

        .jfs-presets {
          display: flex;
          align-items: center;
          gap: 6px;
          flex-wrap: wrap;
          margin-top: 8px;
        }

        .jfs-preset-chip {
          font-size: 12px;
          font-weight: 650;
          font-variant-numeric: tabular-nums;
          padding: 4px 11px;
          border-radius: 6px;
          border: 1px solid var(--jfs-border);
          background: #f8fafc;
          color: var(--jfs-ink-muted);
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .jfs-preset-chip:hover {
          border-color: var(--jfs-indigo-border);
          color: var(--jfs-indigo);
          background: var(--jfs-indigo-bg);
        }

        .jfs-preset-chip.is-selected {
          background: var(--jfs-indigo);
          border-color: var(--jfs-indigo);
          color: #ffffff;
        }

        .jfs-help {
          font-size: 13px;
          color: var(--jfs-ink-soft);
          margin: 8px 0 0 0;
          line-height: 1.5;
        }

        .jfs-notice {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-top: 20px;
          padding: 12px 15px;
          border-radius: var(--jfs-radius-md);
          font-size: 13.5px;
          font-weight: 600;
          line-height: 1.45;
        }

        .jfs-notice-success {
          background: var(--jfs-emerald-bg);
          color: var(--jfs-emerald);
          border: 1px solid var(--jfs-emerald-border);
        }

        .jfs-notice-error {
          background: var(--jfs-danger-bg);
          color: var(--jfs-danger);
          border: 1px solid var(--jfs-danger-border);
        }

        .jfs-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          flex-wrap: wrap;
          padding: 16px 24px;
          background: #f4f7fc;
          border-top: 1px solid var(--jfs-border);
        }

        .jfs-footer-meta {
          font-size: 13px;
          font-weight: 500;
          color: var(--jfs-ink-soft);
        }

        .jfs-actions {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
        }

        .jfs-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 10px 18px;
          border-radius: var(--jfs-radius-md);
          font-size: 13.5px;
          font-weight: 650;
          cursor: pointer;
          text-decoration: none;
          transition: all 0.16s ease;
          border: 1px solid transparent;
        }

        .jfs-btn-primary {
          background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
          color: #fde68a;
          border-color: rgba(212, 162, 76, 0.35);
          box-shadow: 0 2px 6px rgba(15, 23, 42, 0.16);
        }

        .jfs-btn-primary:hover:not(:disabled) {
          background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
          transform: translateY(-1px);
        }

        .jfs-btn-primary:disabled {
          opacity: 0.48;
          cursor: not-allowed;
        }

        .jfs-btn-ghost {
          background: #ffffff;
          color: var(--jfs-ink-muted);
          border-color: var(--jfs-border-strong);
        }

        .jfs-btn-ghost:hover:not(:disabled) {
          background: var(--jfs-indigo-bg);
          border-color: var(--jfs-indigo-border);
          color: var(--jfs-indigo);
        }

        .jfs-btn-ghost:disabled {
          opacity: 0.45;
          cursor: not-allowed;
        }

        .jfs-sticky {
          position: sticky;
          top: 24px;
          display: grid;
          gap: 20px;
        }

        .jfs-summary-hero {
          padding: 22px 24px;
          background: linear-gradient(135deg, #0f172a 0%, #1b2a4a 100%);
          color: #ffffff;
          border-bottom: 2px solid var(--jfs-gold-bright);
        }

        .jfs-summary-kicker {
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          color: var(--jfs-gold-bright);
          margin-bottom: 6px;
        }

        .jfs-summary-figure {
          font-family: Georgia, "Times New Roman", Times, serif;
          font-size: 32px;
          font-weight: 700;
          color: #ffffff;
          font-variant-numeric: tabular-nums;
          line-height: 1.15;
        }

        .jfs-summary-caption {
          font-size: 13px;
          color: #cbd5e1;
          margin-top: 6px;
        }

        .jfs-matrix {
          padding: 18px 24px;
          display: grid;
          gap: 12px;
          background: #ffffff;
        }

        .jfs-matrix-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          font-size: 13.5px;
          padding-bottom: 12px;
          border-bottom: 1px dashed var(--jfs-border);
        }

        .jfs-matrix-row:last-child {
          border-bottom: none;
          padding-bottom: 0;
        }

        .jfs-matrix-label {
          color: var(--jfs-ink-muted);
          font-weight: 500;
        }

        .jfs-tag {
          font-size: 12px;
          font-weight: 700;
          padding: 3px 10px;
          border-radius: 6px;
          font-variant-numeric: tabular-nums;
        }

        .jfs-tag-free {
          background: var(--jfs-emerald-bg);
          color: var(--jfs-emerald);
          border: 1px solid var(--jfs-emerald-border);
        }

        .jfs-tag-charged {
          background: var(--jfs-gold-bg);
          color: var(--jfs-gold);
          border: 1px solid var(--jfs-gold-border);
        }

        .jfs-policy-list {
          list-style: none;
          margin: 0;
          padding: 18px 24px;
          display: grid;
          gap: 12px;
          background: linear-gradient(180deg, #f8faff 0%, #fef9ec 100%);
          border-top: 1px solid var(--jfs-border);
        }

        .jfs-policy-item {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          font-size: 13px;
          line-height: 1.5;
          color: var(--jfs-ink-muted);
        }

        .jfs-check-icon {
          flex-shrink: 0;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: var(--jfs-indigo-bg);
          border: 1px solid var(--jfs-indigo-border);
          color: var(--jfs-indigo);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          margin-top: 2px;
        }

        .jfs-skeleton {
          background: linear-gradient(90deg, #eef2ff 25%, #e2e8f0 50%, #eef2ff 75%);
          background-size: 200% 100%;
          animation: jfs-shimmer 1.4s infinite;
          border-radius: 8px;
        }

        @keyframes jfs-shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>

      <div className="jfs-context-bar">
        <p className="jfs-context-copy">
          Configure automated wallet charges applied when travellers schedule
          eligible journeys. Safety Protection charges remain independent and
          unaffected.
        </p>

        {!loading && (
          <div
            className={`jfs-status-pill ${
              settings.enabled ? "is-active" : "is-paused"
            }`}
          >
            <span
              className="jfs-status-dot"
              style={{
                backgroundColor: settings.enabled ? "#10b981" : "#94a3b8",
              }}
            />
            <span>
              {settings.enabled
                ? "Fee Collection Active"
                : "Fee Collection Paused"}
            </span>
          </div>
        )}
      </div>

      {loading ? (
        <div className="jfs-grid">
          <div className="jfs-card" style={{ padding: 24 }}>
            <div
              className="jfs-skeleton"
              style={{ height: 20, width: "40%", marginBottom: 10 }}
            />
            <div
              className="jfs-skeleton"
              style={{ height: 14, width: "68%", marginBottom: 24 }}
            />
            <div
              className="jfs-skeleton"
              style={{ height: 72, width: "100%", marginBottom: 12 }}
            />
            <div
              className="jfs-skeleton"
              style={{ height: 72, width: "100%", marginBottom: 22 }}
            />
            <div
              className="jfs-skeleton"
              style={{ height: 46, width: "100%", marginBottom: 18 }}
            />
            <div
              className="jfs-skeleton"
              style={{ height: 46, width: "100%" }}
            />
          </div>
          <div className="jfs-card" style={{ padding: 24 }}>
            <div
              className="jfs-skeleton"
              style={{ height: 15, width: "45%", marginBottom: 10 }}
            />
            <div
              className="jfs-skeleton"
              style={{ height: 34, width: "55%", marginBottom: 22 }}
            />
            <div
              className="jfs-skeleton"
              style={{ height: 132, width: "100%" }}
            />
          </div>
        </div>
      ) : (
        <div className="jfs-grid">
          <section className="jfs-card" aria-label="Journey Fee Configuration">
            <div className="jfs-card-header">
              <h2 className="jfs-card-title">Scheduling Charge Rules</h2>
              <p className="jfs-card-desc">
                Enable tariff collection and define distance thresholds for
                qualifying trips.
              </p>
            </div>

            <div className="jfs-card-body">
              <div className="jfs-toggle-group">
                <div
                  className={`jfs-toggle-row ${
                    settings.enabled ? "is-active" : ""
                  }`}
                  onClick={() => update("enabled", !settings.enabled)}
                >
                  <div>
                    <span className="jfs-toggle-title">Enable journey fees</span>
                    <span className="jfs-toggle-hint">
                      Master switch to turn journey scheduling wallet charges on
                      or off platform-wide.
                    </span>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={settings.enabled}
                    aria-label="Enable journey fees"
                    className="jfs-switch"
                    onClick={(e) => {
                      e.stopPropagation();
                      update("enabled", !settings.enabled);
                    }}
                  >
                    <span className="jfs-switch-thumb" />
                  </button>
                </div>

                <div
                  className={`jfs-toggle-row ${
                    settings.interstate_enabled && settings.enabled
                      ? "is-active"
                      : ""
                  } ${!settings.enabled ? "is-disabled" : ""}`}
                  onClick={() => {
                    if (!settings.enabled) return;
                    update("interstate_enabled", !settings.interstate_enabled);
                  }}
                >
                  <div>
                    <span className="jfs-toggle-title">
                      Enable interstate fees
                    </span>
                    <span className="jfs-toggle-hint">
                      Apply standard journey fees to eligible trips crossing
                      state boundaries.
                    </span>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    disabled={!settings.enabled}
                    aria-checked={settings.interstate_enabled}
                    aria-label="Enable interstate fees"
                    className="jfs-switch"
                    onClick={(e) => {
                      e.stopPropagation();
                      update(
                        "interstate_enabled",
                        !settings.interstate_enabled
                      );
                    }}
                  >
                    <span className="jfs-switch-thumb" />
                  </button>
                </div>
              </div>

              <div className="jfs-divider" />

              <div
                className={`jfs-fields ${
                  !settings.enabled ? "is-dimmed" : ""
                }`}
              >
                <div>
                  <div className="jfs-field-header">
                    <label htmlFor="journey-fee-amount" className="jfs-label">
                      Journey fee amount
                    </label>
                    <span className="jfs-default-badge">Default: ₦1,000</span>
                  </div>

                  <div className="jfs-input-wrap">
                    <span className="jfs-adornment jfs-adornment-left">
                      ₦ NGN
                    </span>
                    <input
                      id="journey-fee-amount"
                      type="number"
                      min="0"
                      max="100000000"
                      step="1"
                      value={settings.fee_ngn}
                      onChange={(e) =>
                        update("fee_ngn", Math.max(0, Number(e.target.value)))
                      }
                      className="jfs-input"
                    />
                  </div>

                  <div className="jfs-presets" aria-label="Quick fee presets">
                    {FEE_PRESETS.map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        className={`jfs-preset-chip ${
                          settings.fee_ngn === preset ? "is-selected" : ""
                        }`}
                        onClick={() => update("fee_ngn", preset)}
                      >
                        ₦{preset.toLocaleString("en-NG")}
                      </button>
                    ))}
                  </div>

                  <p className="jfs-help">
                    Flat amount debited atomically from the traveller&apos;s
                    wallet per qualifying journey.
                  </p>
                </div>

                <div>
                  <div className="jfs-field-header">
                    <label
                      htmlFor="journey-distance-threshold"
                      className="jfs-label"
                    >
                      Intrastate distance threshold
                    </label>
                    <span className="jfs-default-badge">Default: 100 km</span>
                  </div>

                  <div className="jfs-input-wrap">
                    <input
                      id="journey-distance-threshold"
                      type="number"
                      min="0"
                      max="100000"
                      step="1"
                      value={settings.intrastate_threshold_km}
                      onChange={(e) =>
                        update(
                          "intrastate_threshold_km",
                          Math.max(0, Number(e.target.value))
                        )
                      }
                      className="jfs-input"
                    />
                    <span className="jfs-adornment jfs-adornment-right">
                      km
                    </span>
                  </div>

                  <div
                    className="jfs-presets"
                    aria-label="Quick distance presets"
                  >
                    {DISTANCE_PRESETS.map((km) => (
                      <button
                        key={km}
                        type="button"
                        className={`jfs-preset-chip ${
                          settings.intrastate_threshold_km === km
                            ? "is-selected"
                            : ""
                        }`}
                        onClick={() => update("intrastate_threshold_km", km)}
                      >
                        {km} km
                      </button>
                    ))}
                  </div>

                  <p className="jfs-help">
                    Intrastate trips at or below this verified driving distance
                    remain free. Trips exceeding{" "}
                    <strong>{settings.intrastate_threshold_km} km</strong> may
                    be charged.
                  </p>
                </div>
              </div>

              {notice && (
                <div
                  role="status"
                  className={`jfs-notice ${
                    noticeError ? "jfs-notice-error" : "jfs-notice-success"
                  }`}
                >
                  <span>{noticeError ? "!" : "✓"}</span>
                  <span>{notice}</span>
                </div>
              )}
            </div>

            <div className="jfs-footer">
              <span className="jfs-footer-meta">
                {isDirty ? "You have unsaved changes" : "All changes saved"}
              </span>

              <div className="jfs-actions">
                <button
                  type="button"
                  className="jfs-btn jfs-btn-ghost"
                  onClick={handleReset}
                  disabled={!isDirty || saving}
                >
                  Reset
                </button>
                <button
                  type="button"
                  className="jfs-btn jfs-btn-primary tsc-button tsc-button-primary"
                  onClick={handleSave}
                  disabled={saving || !isDirty}
                >
                  {saving ? "Saving Policy…" : "Save Journey Fee Settings"}
                </button>
              </div>
            </div>
          </section>

          <aside className="jfs-sticky" aria-label="Effective Policy Summary">
            <div className="jfs-card">
              <div className="jfs-summary-hero">
                <div className="jfs-summary-kicker">Effective Tariff</div>
                <div className="jfs-summary-figure">
                  {settings.enabled ? `₦${formattedFee}` : "₦0 (Paused)"}
                </div>
                <div className="jfs-summary-caption">
                  {settings.enabled
                    ? "Charged once per qualifying scheduled journey"
                    : "All journey scheduling fees are currently waived"}
                </div>
              </div>

              <div className="jfs-matrix">
                <div className="jfs-matrix-row">
                  <span className="jfs-matrix-label">
                    Intrastate (≤ {settings.intrastate_threshold_km} km)
                  </span>
                  <span className="jfs-tag jfs-tag-free">Free</span>
                </div>

                <div className="jfs-matrix-row">
                  <span className="jfs-matrix-label">
                    Intrastate (&gt; {settings.intrastate_threshold_km} km)
                  </span>
                  <span
                    className={`jfs-tag ${
                      settings.enabled ? "jfs-tag-charged" : "jfs-tag-free"
                    }`}
                  >
                    {settings.enabled ? `₦${formattedFee}` : "Free"}
                  </span>
                </div>

                <div className="jfs-matrix-row">
                  <span className="jfs-matrix-label">Interstate Journeys</span>
                  <span
                    className={`jfs-tag ${
                      settings.enabled && settings.interstate_enabled
                        ? "jfs-tag-charged"
                        : "jfs-tag-free"
                    }`}
                  >
                    {settings.enabled && settings.interstate_enabled
                      ? `₦${formattedFee}`
                      : "Free"}
                  </span>
                </div>
              </div>

              <ul className="jfs-policy-list">
                {[
                  "Charged once when an eligible journey is scheduled.",
                  "Fee payment is processed atomically with scheduling.",
                  "Safety Protection fees remain independent and unchanged.",
                ].map((rule) => (
                  <li key={rule} className="jfs-policy-item">
                    <span className="jfs-check-icon" aria-hidden="true">
                      <svg
                        width="11"
                        height="11"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </span>
                    <span>{rule}</span>
                  </li>
                ))}
              </ul>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}