"use client";

import { useEffect, useState, type CSSProperties } from "react";
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

export default function JourneyFeeSettingsClient() {
  const [settings, setSettings] = useState(initialSettings);
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

  function update<K extends keyof JourneyFeeSettings>(
    key: K,
    value: JourneyFeeSettings[K]
  ) {
    setSettings((current) => ({ ...current, [key]: value }));
  }

  async function handleSave() {
    setSaving(true);
    setNotice("");
    setNoticeError(false);

    const result = await saveJourneyFeeSettings(settings);

    if (result.success) {
      setNotice("Journey fee settings saved successfully.");
    } else {
      setNotice(result.error);
      setNoticeError(true);
    }

    setSaving(false);
  }

  const panelStyle: CSSProperties = {
    background: "var(--tsc-card-bg, #fff)",
    border: "1px solid var(--tsc-border, #e5e7eb)",
    borderRadius: 16,
    padding: 24,
    marginBottom: 20,
  };

  const fieldStyle: CSSProperties = {
    display: "block",
    width: "100%",
    padding: "12px 14px",
    border: "1px solid #d1d5db",
    borderRadius: 10,
    fontSize: 16,
    marginTop: 8,
    boxSizing: "border-box",
  };

  if (loading) {
    return <div style={panelStyle}>Loading journey fee settings…</div>;
  }

  return (
    <div style={{ display: "grid", gap: 18 }}>
      <section style={panelStyle}>
        <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 8 }}>
          Journey Fee Controls
        </h2>
        <p style={{ color: "#64748b", fontSize: 15, lineHeight: 1.6 }}>
          Configure wallet charges applied when travellers schedule eligible journeys.
          These settings do not affect Safety Protection charges.
        </p>

        <div style={{ display: "grid", gap: 18, marginTop: 24 }}>
          <label style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 16 }}>
            <input
              type="checkbox"
              checked={settings.enabled}
              onChange={(e) => update("enabled", e.target.checked)}
              style={{ width: 20, height: 20 }}
            />
            <span>
              <strong>Enable journey fees</strong>
              <span style={{ display: "block", color: "#64748b", marginTop: 4 }}>
                Turn journey scheduling charges on or off.
              </span>
            </span>
          </label>

          <label style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 16 }}>
            <input
              type="checkbox"
              checked={settings.interstate_enabled}
              onChange={(e) => update("interstate_enabled", e.target.checked)}
              style={{ width: 20, height: 20 }}
            />
            <span>
              <strong>Enable interstate fees</strong>
              <span style={{ display: "block", color: "#64748b", marginTop: 4 }}>
                Apply fees to eligible journeys crossing state boundaries.
              </span>
            </span>
          </label>

          <div>
            <label htmlFor="journey-fee-amount" style={{ fontWeight: 700 }}>
              Journey fee amount (₦)
            </label>
            <input
              id="journey-fee-amount"
              type="number"
              min="0"
              max="100000000"
              step="1"
              value={settings.fee_ngn}
              onChange={(e) => update("fee_ngn", Number(e.target.value))}
              style={fieldStyle}
            />
            <p style={{ color: "#64748b", fontSize: 14, marginTop: 6 }}>
              Default: ₦1,000 per qualifying journey.
            </p>
          </div>

          <div>
            <label htmlFor="journey-distance-threshold" style={{ fontWeight: 700 }}>
              Intrastate distance threshold (km)
            </label>
            <input
              id="journey-distance-threshold"
              type="number"
              min="0"
              max="100000"
              step="1"
              value={settings.intrastate_threshold_km}
              onChange={(e) =>
                update("intrastate_threshold_km", Number(e.target.value))
              }
              style={fieldStyle}
            />
            <p style={{ color: "#64748b", fontSize: 14, marginTop: 6 }}>
              Intrastate trips at or below this verified driving distance are free.
              Trips above the threshold may be charged.
            </p>
          </div>
        </div>

        {notice && (
          <div
            role="status"
            style={{
              marginTop: 20,
              padding: 14,
              borderRadius: 10,
              background: noticeError ? "#fef2f2" : "#ecfdf5",
              color: noticeError ? "#b42318" : "#067647",
              border: `1px solid ${noticeError ? "#fecaca" : "#a7f3d0"}`,
              fontWeight: 600,
            }}
          >
            {notice}
          </div>
        )}

        <div style={{ marginTop: 24, display: "flex", gap: 12, flexWrap: "wrap" }}>
          <button
            type="button"
            className="tsc-button tsc-button-primary"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? "Saving…" : "Save Journey Fee Settings"}
          </button>

          <a
            href="/admin/journeys"
            className="tsc-button tsc-button-light"
            style={{ display: "inline-flex", alignItems: "center", textDecoration: "none" }}
          >
            Back to Journey Monitoring
          </a>
        </div>
      </section>

      <section style={{ ...panelStyle, background: "#f8fafc" }}>
        <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 12 }}>
          Current fee policy
        </h3>
        <ul style={{ lineHeight: 1.9, paddingLeft: 22, color: "#334155" }}>
          <li>Fee is charged once when an eligible journey is scheduled.</li>
          <li>Intrastate journeys at or below the distance threshold are free.</li>
          <li>Eligible intrastate journeys above the threshold may be charged.</li>
          <li>Interstate fees are controlled by the interstate toggle.</li>
          <li>Fee payment is handled atomically with journey scheduling.</li>
          <li>Safety Protection fees are independent and unchanged.</li>
        </ul>
      </section>
    </div>
  );
}
