"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import {
  addSafetyContact,
  deleteSafetyContact,
  getMySafetyData,
  saveMySafetyProfile,
  updateSafetyContact,
} from "./safety-actions";

type NotificationChannel = "in_app" | "email" | "sms" | "push";

type SafetyForm = {
  blood_group: string;
  medical_conditions: string;
  allergies: string;
  medications: string;
  accessibility_needs: string;
  additional_information: string;
  preferred_language: string;
  preferred_notification_channel: NotificationChannel;
  share_safety_information_with_responders: boolean;
};

type SafetyContact = {
  id: string;
  contact_name: string;
  relationship: string | null;
  phone_number: string;
  email: string | null;
  country_code: string | null;
  is_primary: boolean;
  can_receive_emergency_notifications: boolean;
  created_at?: string;
};

type ContactForm = {
  contact_name: string;
  relationship: string;
  phone_number: string;
  email: string;
  country_code: string;
  is_primary: boolean;
  can_receive_emergency_notifications: boolean;
};

const emptyProfile: SafetyForm = {
  blood_group: "",
  medical_conditions: "",
  allergies: "",
  medications: "",
  accessibility_needs: "",
  additional_information: "",
  preferred_language: "en",
  preferred_notification_channel: "in_app",
  share_safety_information_with_responders: true,
};

const emptyContact: ContactForm = {
  contact_name: "",
  relationship: "",
  phone_number: "",
  email: "",
  country_code: "+234",
  is_primary: false,
  can_receive_emergency_notifications: true,
};

const inputClass =
  "w-full min-w-0 rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-orange-400 focus:bg-white focus:ring-4 focus:ring-orange-100";

const fieldClass = "grid gap-2 text-sm font-semibold text-slate-700";

const secondaryButton =
  "inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 transition hover:border-orange-300 hover:bg-orange-50 disabled:cursor-not-allowed disabled:opacity-50";

function SectionHeading({
  number,
  icon,
  title,
  description,
}: {
  number: string;
  icon: string;
  title: string;
  description: string;
}) {
  return (
    <div className="mb-6 flex items-start gap-3.5">
      <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[#FFF4E8] text-2xl">
        {icon}
      </div>
      <div className="min-w-0">
        <div className="text-[10px] font-extrabold tracking-[1.5px] text-orange-600">
          SAFETY PROTECTION · {number}
        </div>
        <h2 className="mt-1 text-lg font-extrabold text-[#071D49] sm:text-xl">
          {title}
        </h2>
        <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p>
      </div>
    </div>
  );
}

function Toggle({
  checked,
  onChange,
  disabled = false,
  label,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition disabled:opacity-50 ${
        checked ? "bg-orange-500" : "bg-slate-300"
      }`}
    >
      <span
        className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${
          checked ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </button>
  );
}

export default function SafetyProfileClient({
  travellerName,
}: {
  travellerName: string;
}) {
  const [form, setForm] = useState<SafetyForm>(emptyProfile);
  const [contacts, setContacts] = useState<SafetyContact[]>([]);
  const [contactForm, setContactForm] = useState<ContactForm>(emptyContact);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [showContactForm, setShowContactForm] = useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [contactSaving, setContactSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [updatingContactId, setUpdatingContactId] = useState<string | null>(
    null
  );

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [lastSaved, setLastSaved] = useState("");

  const loadSafetyData = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const result = await getMySafetyData();

      if (!result.success) {
        setError(result.message || "Unable to load your safety information.");
        return;
      }

      const profile = result.profile;

      setForm({
        blood_group: profile?.blood_group ?? "",
        medical_conditions: profile?.medical_conditions ?? "",
        allergies: profile?.allergies ?? "",
        medications: profile?.medications ?? "",
        accessibility_needs: profile?.accessibility_needs ?? "",
        additional_information: profile?.additional_information ?? "",
        preferred_language: profile?.preferred_language ?? "en",
        preferred_notification_channel:
          (profile?.preferred_notification_channel as NotificationChannel) ??
          "in_app",
        share_safety_information_with_responders:
          profile?.share_safety_information_with_responders !== false,
      });

      setContacts((result.contacts ?? []) as SafetyContact[]);
    } catch {
      setError("Something went wrong while loading your safety profile.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSafetyData();
  }, [loadSafetyData]);

  const updateField = (key: keyof SafetyForm, value: string | boolean) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const updateContactField = (
    key: keyof ContactForm,
    value: string | boolean
  ) => {
    setContactForm((current) => ({ ...current, [key]: value }));
  };

  const handleSaveProfile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    setError("");

    try {
      const result = await saveMySafetyProfile(form);

      if (!result.success) {
        setError(result.message || "Unable to save your safety profile.");
        return;
      }

      setMessage(result.message || "Your safety profile has been saved.");
      setLastSaved(
        new Date().toLocaleTimeString("en-NG", {
          hour: "2-digit",
          minute: "2-digit",
        })
      );
    } catch {
      setError("Unable to save your information. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const openNewContact = () => {
    setEditingId(null);
    setContactForm({
      ...emptyContact,
      is_primary: contacts.length === 0,
    });
    setShowContactForm(true);
    setMessage("");
    setError("");
  };

  const openEditContact = (contact: SafetyContact) => {
    setEditingId(contact.id);
    setContactForm({
      contact_name: contact.contact_name,
      relationship: contact.relationship ?? "",
      phone_number: contact.phone_number,
      email: contact.email ?? "",
      country_code: contact.country_code ?? "+234",
      is_primary: contact.is_primary,
      can_receive_emergency_notifications:
        contact.can_receive_emergency_notifications !== false,
    });
    setShowContactForm(true);
    setMessage("");
    setError("");
  };

  const handleContactSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setContactSaving(true);
    setMessage("");
    setError("");

    try {
      const payload = {
        ...contactForm,
        is_primary:
          contactForm.is_primary || (!editingId && contacts.length === 0),
      };

      const result = editingId
        ? await updateSafetyContact(editingId, payload)
        : await addSafetyContact(payload);

      if (!result.success) {
        setError(result.message || "Unable to save this emergency contact.");
        return;
      }

      setMessage(result.message || "Emergency contact saved.");
      setShowContactForm(false);
      setEditingId(null);
      setContactForm(emptyContact);
      await loadSafetyData();
    } catch {
      setError("Unable to save this contact. Please try again.");
    } finally {
      setContactSaving(false);
    }
  };

  const handleDeleteContact = async (contactId: string) => {
    const contact = contacts.find((item) => item.id === contactId);

    if (
      !window.confirm(
        `Remove ${contact?.contact_name ?? "this emergency contact"}?`
      )
    ) {
      return;
    }

    setDeletingId(contactId);
    setMessage("");
    setError("");

    try {
      const result = await deleteSafetyContact(contactId);

      if (!result.success) {
        setError(result.message || "Unable to remove this contact.");
        return;
      }

      setMessage(result.message || "Emergency contact removed.");
      await loadSafetyData();
    } catch {
      setError("Unable to remove this contact. Please try again.");
    } finally {
      setDeletingId(null);
    }
  };

  const handlePrimaryContact = async (contact: SafetyContact) => {
    if (contact.is_primary) return;

    if (
      !window.confirm(
        `Make ${contact.contact_name} your primary emergency contact?`
      )
    ) {
      return;
    }

    setUpdatingContactId(contact.id);
    setError("");
    setMessage("");

    try {
      const result = await updateSafetyContact(contact.id, {
        contact_name: contact.contact_name,
        relationship: contact.relationship ?? "",
        phone_number: contact.phone_number,
        email: contact.email ?? "",
        country_code: contact.country_code ?? "",
        is_primary: true,
        can_receive_emergency_notifications:
          contact.can_receive_emergency_notifications,
      });

      if (!result.success) {
        setError(result.message || "Unable to update your primary contact.");
        return;
      }

      setMessage("Your primary emergency contact has been updated.");
      await loadSafetyData();
    } catch {
      setError("Unable to update your primary contact. Please try again.");
    } finally {
      setUpdatingContactId(null);
    }
  };

  const handleContactNotifications = async (contact: SafetyContact) => {
    setUpdatingContactId(contact.id);
    setError("");
    setMessage("");

    try {
      const result = await updateSafetyContact(contact.id, {
        contact_name: contact.contact_name,
        relationship: contact.relationship ?? "",
        phone_number: contact.phone_number,
        email: contact.email ?? "",
        country_code: contact.country_code ?? "",
        is_primary: contact.is_primary,
        can_receive_emergency_notifications:
          !contact.can_receive_emergency_notifications,
      });

      if (!result.success) {
        setError(
          result.message || "Unable to update emergency notification settings."
        );
        return;
      }

      setMessage("Emergency notification preference updated.");
      await loadSafetyData();
    } catch {
      setError("Unable to update this contact's notification preference.");
    } finally {
      setUpdatingContactId(null);
    }
  };

  const completedItems = [
    form.blood_group,
    form.medical_conditions,
    form.allergies,
    form.medications,
    form.accessibility_needs,
    form.preferred_language,
  ].filter((value) => String(value).trim().length > 0).length;

  const completion = Math.round((completedItems / 6) * 100);
  const primaryContact = contacts.find((contact) => contact.is_primary);

  if (loading) {
    return (
      <main className="tsc-workspace">
        <div className="mx-auto flex min-h-80 max-w-2xl flex-col items-center justify-center rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <div className="grid h-16 w-16 place-items-center rounded-2xl bg-[#FFF4E8] text-3xl">
            🛡️
          </div>
          <div className="mt-5 h-9 w-9 animate-spin rounded-full border-4 border-slate-200 border-t-[#F28C28]" />
          <h2 className="mt-4 text-lg font-extrabold text-[#071D49]">
            Preparing your safety profile
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            Securely retrieving your traveller safety information...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="tsc-workspace">
      <nav className="mb-4 flex flex-wrap items-center gap-2 text-sm text-slate-500">
        <Link
          href="/dashboard"
          className="font-semibold text-[#164a83] hover:text-[#F28C28]"
        >
          🏠 Dashboard
        </Link>
        <span>/</span>
        <span className="font-semibold text-slate-700">
          🛡️ Safety Protection
        </span>
      </nav>

      {/* Safety Hero Header */}
      <section className="relative mb-6 overflow-hidden rounded-3xl bg-gradient-to-br from-[#071D49] via-[#103568] to-[#164a83] p-6 text-white shadow-xl sm:p-8">
        <div className="pointer-events-none absolute -right-16 -top-20 h-72 w-72 rounded-full border border-white/10 bg-white/[0.03]" />
        <div className="pointer-events-none absolute -bottom-28 right-20 h-64 w-64 rounded-full border border-white/10" />

        <div className="relative z-10 max-w-3xl">
          <div className="mb-5 flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-2xl border border-white/15 bg-white/10 text-2xl">
              🛡️
            </div>
            <div>
              <div className="text-[10px] font-extrabold tracking-[2px] text-orange-300">
                TRAVELLER SAFETY
              </div>
              <div className="mt-1 text-xs text-blue-100">
                Your personal safety & emergency hub
              </div>
            </div>
          </div>

          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-400/10 px-3 py-1.5 text-xs font-bold text-emerald-200">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            YOUR SAFETY SPACE
          </div>

          <h1 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-4xl">
            Safety Protection ✨
          </h1>

          <p className="mt-3 max-w-2xl text-sm leading-7 text-blue-100 sm:text-base">
            Welcome, {travellerName}. Be prepared and travel protected. Keep
            important medical details, preferences, and trusted emergency contacts
            up to date.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <a
              href="#medical-information"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#F28C28] px-5 py-3 text-sm font-extrabold text-white shadow-lg transition hover:bg-orange-600"
            >
              🩺 Update safety details
            </a>
            <a
              href="#emergency-contacts"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/25 bg-white/10 px-5 py-3 text-sm font-bold text-white transition hover:bg-white/15"
            >
              👥 Emergency contacts
            </a>
          </div>
        </div>

        <div className="pointer-events-none absolute right-10 top-1/2 hidden -translate-y-1/2 md:block">
          <div className="grid h-48 w-48 place-items-center rounded-full border border-white/10 bg-white/[0.04]">
            <div className="grid h-32 w-32 place-items-center rounded-[2rem] border border-orange-300/30 bg-orange-400/10 text-7xl shadow-2xl">
              🛡️
            </div>
          </div>
        </div>
      </section>

      {/* Privacy Notice */}
      <div className="mb-6 flex items-start gap-3.5 rounded-2xl border border-blue-100 bg-blue-50 p-4 sm:p-5">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white text-xl shadow-sm">
          🔒
        </span>
        <div>
          <strong className="text-sm font-extrabold text-[#071D49]">
            Your information is private and protected
          </strong>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            Your safety information is shared with authorised responders
            according to your sharing preference and applicable emergency
            procedures.
          </p>
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="mb-5 flex items-start justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
        >
          <span>⚠️ {error}</span>
          <button
            type="button"
            onClick={() => setError("")}
            aria-label="Dismiss"
            className="font-bold"
          >
            ×
          </button>
        </div>
      )}

      {message && (
        <div
          role="status"
          className="mb-5 flex items-start justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-800"
        >
          <span>✅ {message}</span>
          <button
            type="button"
            onClick={() => setMessage("")}
            aria-label="Dismiss"
            className="font-bold"
          >
            ×
          </button>
        </div>
      )}

      {/* Profile Overview Grid */}
      <section className="mb-7 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold tracking-wider text-slate-500">
              PROFILE COMPLETION
            </span>
            <span className="text-xl">📋</span>
          </div>
          <strong className="mt-3 block text-3xl font-extrabold text-[#071D49]">
            {completion}%
          </strong>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-gradient-to-r from-orange-400 to-[#F28C28] transition-all"
              style={{ width: `${completion}%` }}
            />
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold tracking-wider text-slate-500">
              EMERGENCY CONTACTS
            </span>
            <span className="text-xl">👥</span>
          </div>
          <strong className="mt-3 block text-3xl font-extrabold text-[#071D49]">
            {contacts.length}
          </strong>
          <p className="mt-1 text-xs text-slate-500">
            {contacts.length === 1 ? "Contact registered" : "Contacts registered"}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold tracking-wider text-slate-500">
              RESPONDER SHARING
            </span>
            <span className="text-xl">🚨</span>
          </div>
          <strong className="mt-3 block text-xl font-extrabold text-[#071D49]">
            {form.share_safety_information_with_responders
              ? "Enabled"
              : "Disabled"}
          </strong>
          <p className="mt-1 text-xs text-slate-500">
            Your current privacy preference
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold tracking-wider text-slate-500">
              PRIMARY CONTACT
            </span>
            <span className="text-xl">⭐</span>
          </div>
          <strong className="mt-3 block truncate text-lg font-extrabold text-[#071D49]">
            {primaryContact?.contact_name || "Not set"}
          </strong>
          <p className="mt-1 text-xs text-slate-500">
            Your main emergency contact
          </p>
        </div>
      </section>

      {/* Sections 01 & 02 */}
      <form onSubmit={handleSaveProfile} className="space-y-5">
        <section
          id="medical-information"
          className="scroll-mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7"
        >
          <SectionHeading
            number="01"
            icon="🩺"
            title="Personal Safety Profile"
            description="Information that may help authorised responders understand your needs and assist you during an emergency."
          />

          <div className="grid gap-5 md:grid-cols-2">
            <label className={fieldClass}>
              🩸 Blood group
              <input
                className={inputClass}
                value={form.blood_group}
                onChange={(event) =>
                  updateField("blood_group", event.target.value)
                }
                placeholder="e.g. O+"
              />
              <span className="text-xs font-normal text-slate-500">
                Enter your blood group if known.
              </span>
            </label>

            <label className={fieldClass}>
              🌐 Preferred language
              <input
                className={inputClass}
                value={form.preferred_language}
                onChange={(event) =>
                  updateField("preferred_language", event.target.value)
                }
                placeholder="e.g. en"
                autoCapitalize="none"
              />
              <span className="text-xs font-normal text-slate-500">
                Enter your preferred language code, e.g. en, yo, ha or ig.
              </span>
            </label>

            <label className={fieldClass}>
              🏥 Medical conditions
              <textarea
                className={inputClass}
                rows={4}
                value={form.medical_conditions}
                onChange={(event) =>
                  updateField("medical_conditions", event.target.value)
                }
                placeholder="List any relevant medical conditions..."
              />
            </label>

            <label className={fieldClass}>
              ⚠️ Allergies
              <textarea
                className={inputClass}
                rows={4}
                value={form.allergies}
                onChange={(event) =>
                  updateField("allergies", event.target.value)
                }
                placeholder="List medication, food or other allergies..."
              />
            </label>

            <label className={fieldClass}>
              💊 Medications
              <textarea
                className={inputClass}
                rows={4}
                value={form.medications}
                onChange={(event) =>
                  updateField("medications", event.target.value)
                }
                placeholder="List your current medications..."
              />
            </label>

            <label className={fieldClass}>
              ♿ Accessibility needs
              <textarea
                className={inputClass}
                rows={4}
                value={form.accessibility_needs}
                onChange={(event) =>
                  updateField("accessibility_needs", event.target.value)
                }
                placeholder="Mobility, hearing, vision or other assistance needs..."
              />
            </label>

            <label className={`${fieldClass} md:col-span-2`}>
              📌 Additional safety information
              <textarea
                className={inputClass}
                rows={4}
                value={form.additional_information}
                onChange={(event) =>
                  updateField("additional_information", event.target.value)
                }
                placeholder="Other important information authorised responders should know..."
              />
            </label>
          </div>
        </section>

        {/* Section 02: Safety Preferences */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          <SectionHeading
            number="02"
            icon="⚙️"
            title="Safety Preferences"
            description="Choose how your safety information and notifications are handled."
          />

          <div className="grid gap-5 lg:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-5">
              <div className="flex items-center gap-3">
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-white text-xl shadow-sm">
                  🔔
                </span>
                <div>
                  <h3 className="font-extrabold text-[#071D49]">
                    Notification channel
                  </h3>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Choose your preferred alert channel.
                  </p>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3">
                {(
                  [
                    ["in_app", "In-app", "📱"],
                    ["email", "Email", "✉️"],
                    ["sms", "SMS", "💬"],
                    ["push", "Push", "🔔"],
                  ] as [NotificationChannel, string, string][]
                ).map(([value, label, emoji]) => {
                  const selected =
                    form.preferred_notification_channel === value;

                  return (
                    <button
                      type="button"
                      key={value}
                      onClick={() =>
                        updateField("preferred_notification_channel", value)
                      }
                      aria-pressed={selected}
                      className={`flex min-h-14 items-center gap-2 rounded-xl border px-3 py-3 text-sm font-bold transition ${
                        selected
                          ? "border-[#F28C28] bg-[#FFF4E8] text-[#071D49] ring-2 ring-orange-100"
                          : "border-slate-200 bg-white text-slate-600 hover:border-orange-300"
                      }`}
                    >
                      <span className="text-lg">{emoji}</span>
                      <span>{label}</span>
                      {selected && (
                        <span className="ml-auto text-orange-600">✓</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 p-5">
              <div className="flex items-center gap-3">
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-[#FFF4E8] text-xl">
                  🛡️
                </span>
                <div>
                  <h3 className="font-extrabold text-[#071D49]">
                    Responder access
                  </h3>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Manage your safety information sharing preference.
                  </p>
                </div>
              </div>

              <p className="mt-4 text-sm leading-6 text-slate-600">
                Allow authorised emergency responders to access your saved
                safety information when required for assistance.
              </p>

              <div className="mt-5 flex items-center justify-between gap-3 rounded-xl bg-slate-50 p-4">
                <div>
                  <strong className="block text-sm text-[#071D49]">
                    Share with emergency responders
                  </strong>
                  <span className="mt-1 block text-xs text-slate-500">
                    {form.share_safety_information_with_responders
                      ? "Responder sharing enabled"
                      : "Responder sharing disabled"}
                  </span>
                </div>
                <Toggle
                  checked={form.share_safety_information_with_responders}
                  onChange={(value) =>
                    updateField(
                      "share_safety_information_with_responders",
                      value
                    )
                  }
                  label="Share safety information with responders"
                />
              </div>
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-4 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs leading-6 text-slate-500">
              🔒 Your information is saved securely to your traveller profile.
              {lastSaved && <span> Last saved at {lastSaved}.</span>}
            </p>

            <button
              className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#F28C28] px-6 py-3 text-sm font-extrabold text-white shadow-md transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
              type="submit"
              disabled={saving}
            >
              {saving ? "Saving information..." : "💾 Save safety profile"}
            </button>
          </div>
        </section>
      </form>

      {/* Section 03: Emergency Contacts */}
      <section
        id="emergency-contacts"
        className="mt-6 scroll-mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7"
      >
        <SectionHeading
          number="03"
          icon="👥"
          title="Emergency Contacts"
          description="Add trusted people who can be contacted if you need help during your journey."
        />

        {contacts.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-5 py-12 text-center">
            <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-[#FFF4E8] text-3xl">
              ☎️
            </div>
            <h3 className="mt-4 font-extrabold text-[#071D49]">
              No emergency contacts yet
            </h3>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
              Add at least one trusted contact. Your first contact will
              automatically become your primary emergency contact.
            </p>
            <button
              type="button"
              className="mt-5 inline-flex min-h-11 items-center justify-center rounded-xl bg-[#F28C28] px-5 py-3 text-sm font-extrabold text-white transition hover:bg-orange-600"
              onClick={openNewContact}
            >
              ➕ Add your first contact
            </button>
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {contacts.map((contact) => (
              <article
                className="rounded-2xl border border-slate-200 bg-white p-5 transition hover:border-orange-200 hover:shadow-md"
                key={contact.id}
              >
                <div className="flex items-start gap-3">
                  <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[#071D49] text-2xl text-white">
                    👤
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-extrabold text-[#071D49]">
                        {contact.contact_name}
                      </h3>

                      {contact.is_primary && (
                        <span className="rounded-full border border-orange-200 bg-[#FFF4E8] px-3 py-1 text-[10px] font-extrabold text-orange-700">
                          ⭐ PRIMARY
                        </span>
                      )}
                    </div>

                    <p className="mt-1 text-sm text-slate-500">
                      {contact.relationship || "Emergency contact"}
                    </p>
                  </div>
                </div>

                <div className="mt-5 space-y-3 border-y border-slate-100 py-4">
                  <div className="flex items-start gap-3">
                    <span className="text-lg">📞</span>
                    <div className="min-w-0">
                      <span className="text-[10px] font-extrabold tracking-wider text-slate-400">
                        PHONE NUMBER
                      </span>
                      <p className="mt-1 break-all text-sm font-semibold text-slate-700">
                        {contact.country_code
                          ? `${contact.country_code} `
                          : ""}
                        {contact.phone_number}
                      </p>
                    </div>
                  </div>

                  {contact.email && (
                    <div className="flex items-start gap-3">
                      <span className="text-lg">✉️</span>
                      <div className="min-w-0">
                        <span className="text-[10px] font-extrabold tracking-wider text-slate-400">
                          EMAIL ADDRESS
                        </span>
                        <p className="mt-1 break-all text-sm font-semibold text-slate-700">
                          {contact.email}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="mt-4 flex items-center justify-between gap-3 rounded-xl bg-slate-50 p-3">
                  <div className="min-w-0">
                    <strong className="block text-sm text-[#071D49]">
                      🔔 Emergency notifications
                    </strong>
                    <span className="mt-1 block text-xs text-slate-500">
                      {contact.can_receive_emergency_notifications
                        ? "Notifications enabled"
                        : "Notifications disabled"}
                    </span>
                  </div>

                  <Toggle
                    checked={contact.can_receive_emergency_notifications}
                    disabled={updatingContactId === contact.id}
                    onChange={() =>
                      void handleContactNotifications(contact)
                    }
                    label={`Emergency notifications for ${contact.contact_name}`}
                  />
                </div>

                <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
                  {!contact.is_primary ? (
                    <button
                      type="button"
                      disabled={updatingContactId === contact.id}
                      onClick={() => void handlePrimaryContact(contact)}
                      className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-orange-200 bg-[#FFF4E8] px-4 py-2 text-xs font-extrabold text-orange-700 transition hover:bg-orange-100 disabled:opacity-50"
                    >
                      ⭐ Make primary
                    </button>
                  ) : (
                    <span className="inline-flex min-h-10 items-center gap-2 text-xs font-bold text-emerald-700">
                      ✓ Primary contact
                    </span>
                  )}

                  <div className="flex gap-2">
                    <button
                      type="button"
                      className={secondaryButton}
                      onClick={() => openEditContact(contact)}
                    >
                      ✏️ Edit
                    </button>

                    <button
                      type="button"
                      disabled={deletingId === contact.id}
                      onClick={() => void handleDeleteContact(contact.id)}
                      className="inline-flex min-h-10 items-center justify-center rounded-xl border border-red-200 bg-white px-4 py-2 text-xs font-bold text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                    >
                      {deletingId === contact.id ? "Removing..." : "🗑️ Remove"}
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}

        <div className="mt-6 border-t border-slate-100 pt-6">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-lg font-extrabold text-[#071D49]">
                {editingId
                  ? "✏️ Edit emergency contact"
                  : "➕ Add an emergency contact"}
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                Provide accurate details so your trusted contact can be reached.
              </p>
            </div>

            <button
              type="button"
              className={secondaryButton}
              onClick={openNewContact}
            >
              ➕ New contact
            </button>
          </div>

          <form onSubmit={handleContactSubmit}>
            <div className="grid gap-5 md:grid-cols-2">
              <label className={fieldClass}>
                Full name *
                <input
                  className={inputClass}
                  required
                  minLength={2}
                  maxLength={150}
                  value={contactForm.contact_name}
                  onChange={(event) =>
                    updateContactField("contact_name", event.target.value)
                  }
                  placeholder="Contact's full name"
                />
              </label>

              <label className={fieldClass}>
                Relationship
                <input
                  className={inputClass}
                  value={contactForm.relationship}
                  onChange={(event) =>
                    updateContactField("relationship", event.target.value)
                  }
                  placeholder="e.g. Spouse, parent, friend"
                />
              </label>

              <label className={fieldClass}>
                Phone number *
                <input
                  className={inputClass}
                  required
                  minLength={3}
                  maxLength={30}
                  value={contactForm.phone_number}
                  onChange={(event) =>
                    updateContactField("phone_number", event.target.value)
                  }
                  placeholder="Contact phone number"
                  type="tel"
                />
              </label>

              <label className={fieldClass}>
                Country calling code
                <input
                  className={inputClass}
                  value={contactForm.country_code}
                  onChange={(event) =>
                    updateContactField("country_code", event.target.value)
                  }
                  placeholder="e.g. +234"
                />
              </label>

              <label className={`${fieldClass} md:col-span-2`}>
                Email address
                <input
                  className={inputClass}
                  type="email"
                  value={contactForm.email}
                  onChange={(event) =>
                    updateContactField("email", event.target.value)
                  }
                  placeholder="name@example.com"
                />
              </label>
            </div>

            <div className="mt-5 grid gap-4 rounded-2xl bg-slate-50 p-4 sm:p-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <strong className="block text-sm text-[#071D49]">
                    ⭐ Primary emergency contact
                  </strong>
                  <span className="mt-1 block text-xs leading-5 text-slate-500">
                    Set this person as your main emergency contact.
                  </span>
                </div>

                <Toggle
                  checked={contactForm.is_primary}
                  onChange={(value) =>
                    updateContactField("is_primary", value)
                  }
                  label="Set as primary emergency contact"
                />
              </div>

              <div className="border-t border-slate-200 pt-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <strong className="block text-sm text-[#071D49]">
                      🔔 Emergency notifications
                    </strong>
                    <span className="mt-1 block text-xs leading-5 text-slate-500">
                      Allow this person to receive emergency notifications.
                    </span>
                  </div>

                  <Toggle
                    checked={
                      contactForm.can_receive_emergency_notifications
                    }
                    onChange={(value) =>
                      updateContactField(
                        "can_receive_emergency_notifications",
                        value
                      )
                    }
                    label="Allow emergency notifications"
                  />
                </div>
              </div>
            </div>

            {error && (
              <div
                className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700"
                role="alert"
              >
                ⚠️ {error}
              </div>
            )}

            <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              {showContactForm && (
                <button
                  type="button"
                  className={secondaryButton}
                  onClick={() => {
                    setShowContactForm(false);
                    setEditingId(null);
                    setContactForm(emptyContact);
                    setError("");
                  }}
                >
                  Cancel editing
                </button>
              )}

              <button
                type="submit"
                disabled={contactSaving}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#F28C28] px-6 py-3 text-sm font-extrabold text-white shadow-md transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {contactSaving
                  ? "Saving contact..."
                  : editingId
                    ? "💾 Save changes"
                    : "👤 Add emergency contact"}
              </button>
            </div>
          </form>
        </div>
      </section>

      {/* Safety Reminder */}
      <section className="mt-6 rounded-2xl border border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white text-xl shadow-sm">
            ℹ️
          </span>
          <div>
            <h3 className="font-extrabold text-[#071D49]">
              Your safety matters.
            </h3>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              Keep your contact details current. Saving this information does
              not itself dispatch emergency services or guarantee that
              notifications will be delivered.
            </p>
          </div>
        </div>
      </section>

      <footer className="mt-6 flex flex-col gap-3 border-t border-slate-200 py-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-emerald-50 text-lg text-emerald-700">
            ✓
          </span>
          <div>
            <strong className="text-sm text-[#071D49]">
              Travel prepared. Travel protected.
            </strong>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              Keep your safety profile and emergency contacts up to date.
            </p>
          </div>
        </div>

        <Link
          href="/dashboard"
          className="text-sm font-bold text-[#164a83] hover:text-[#F28C28]"
        >
          ← Back to dashboard
        </Link>
      </footer>
    </main>
  );
}