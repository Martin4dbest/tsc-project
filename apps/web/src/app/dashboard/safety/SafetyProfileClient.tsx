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
  "w-full min-w-0 rounded-lg border border-slate-200 bg-white px-3 py-3 text-sm text-slate-800 outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-100";

const fieldClass = "grid gap-2 text-sm font-semibold text-slate-700";

const secondaryButton =
  "inline-flex min-h-10 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 transition hover:border-orange-300 hover:bg-orange-50 disabled:cursor-not-allowed disabled:opacity-50";

function SectionHeading({
  number,
  title,
  description,
}: {
  number: string;
  title: string;
  description: string;
}) {
  return (
    <div className="tsc-panel-heading !mb-5 !items-start">
      <div className="flex min-w-0 items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-orange-50 text-sm font-extrabold text-orange-600">
          {number}
        </span>
        <div className="min-w-0">
          <span className="tsc-eyebrow">TRAVELLER SAFETY</span>
          <h2 className="!text-lg sm:!text-xl">{title}</h2>
          <p className="mt-1 text-sm leading-6 text-slate-500">
            {description}
          </p>
        </div>
      </div>
    </div>
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
    setContactForm(emptyContact);
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
      const result = editingId
        ? await updateSafetyContact(editingId, contactForm)
        : await addSafetyContact(contactForm);

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
    const confirmed = window.confirm(
      "Are you sure you want to remove this emergency contact?"
    );

    if (!confirmed) return;

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

  const completedItems = [
    form.blood_group,
    form.medical_conditions,
    form.allergies,
    form.medications,
    form.accessibility_needs,
    form.preferred_language,
  ].filter((value) => String(value).trim().length > 0).length;

  const completion = Math.round((completedItems / 6) * 100);

  if (loading) {
    return (
      <main className="tsc-workspace">
        <div className="tsc-panel mx-auto flex min-h-72 max-w-2xl flex-col items-center justify-center text-center">
          <div className="mb-4 h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-orange-500" />
          <h2 className="text-lg font-bold text-[#071D49]">
            Preparing your safety profile
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            Securely retrieving your traveller information...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="tsc-workspace">
      <nav className="mb-4 flex flex-wrap items-center gap-2 text-sm text-slate-500">
        <Link href="/dashboard" className="font-semibold text-[#164a83] hover:text-orange-600">
          Dashboard
        </Link>
        <span>/</span>
        <span className="font-semibold text-slate-700">Safety Protection</span>
      </nav>

      <section className="tsc-workspace-header !relative !overflow-hidden">
        <div className="relative z-10 max-w-3xl">
          <span className="tsc-eyebrow">TRAVELLER SECURITY CENTRE</span>
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-bold text-white">
            <span className="h-2 w-2 rounded-full bg-orange-400" />
            YOUR PERSONAL SAFETY SPACE
          </div>
          <h1>Your Safety Profile</h1>
          <p>
            Hello {travellerName}. Keep your essential safety information and
            emergency contacts up to date before and during your journeys.
          </p>
          <div className="tsc-header-actions">
            <a href="#medical-information" className="tsc-button tsc-button-primary">
              Update safety details →
            </a>
            <a href="#emergency-contacts" className="tsc-button tsc-button-light">
              Emergency contacts
            </a>
          </div>
        </div>
        <div className="pointer-events-none absolute -right-12 -top-20 hidden h-72 w-72 items-center justify-center rounded-full border border-white/10 bg-white/[0.03] md:flex">
          <div className="flex h-48 w-48 items-center justify-center rounded-full border border-white/15 bg-white/[0.04]">
            <div className="flex h-28 w-28 items-center justify-center rounded-3xl border border-orange-300/40 bg-orange-400/10 text-6xl text-orange-300">
              ♧
            </div>
          </div>
        </div>
      </section>

      <div className="mb-5 flex items-start gap-3 rounded-xl border border-blue-100 bg-blue-50 p-4">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-blue-100 font-bold text-blue-800">
          i
        </span>
        <div>
          <strong className="text-sm text-[#071D49]">
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
        <div role="alert" className="mb-4 flex items-start justify-between gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <span>{error}</span>
          <button type="button" onClick={() => setError("")} aria-label="Dismiss" className="font-bold">
            ×
          </button>
        </div>
      )}

      {message && (
        <div role="status" className="mb-4 flex items-start justify-between gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
          <span>{message}</span>
          <button type="button" onClick={() => setMessage("")} aria-label="Dismiss" className="font-bold">
            ×
          </button>
        </div>
      )}

      <section className="tsc-stat-grid !mb-5 !grid-cols-1 sm:!grid-cols-2 lg:!grid-cols-4">
        <div className="tsc-stat-card">
          <span>PROFILE COMPLETION</span>
          <strong>{completion}%</strong>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-orange-500 transition-all"
              style={{ width: `${completion}%` }}
            />
          </div>
        </div>
        <div className="tsc-stat-card">
          <span>EMERGENCY CONTACTS</span>
          <strong>{contacts.length}</strong>
          <small className="text-slate-500">
            {contacts.length === 1 ? "Contact registered" : "Contacts registered"}
          </small>
        </div>
        <div className="tsc-stat-card">
          <span>RESPONDER SHARING</span>
          <strong className="!text-xl">
            {form.share_safety_information_with_responders ? "Enabled" : "Disabled"}
          </strong>
          <small className="text-slate-500">Your current privacy preference</small>
        </div>
        <div className="tsc-stat-card">
          <span>PREFERRED CHANNEL</span>
          <strong className="!text-xl">
            {form.preferred_notification_channel === "in_app"
              ? "In-app"
              : form.preferred_notification_channel.toUpperCase()}
          </strong>
          <small className="text-slate-500">Safety communications</small>
        </div>
      </section>

      <form onSubmit={handleSaveProfile} className="space-y-4">
        <section id="medical-information" className="tsc-panel scroll-mt-6">
          <SectionHeading
            number="01"
            title="Medical & Safety Details"
            description="This information can help authorised responders understand your needs during an emergency."
          />

          <div className="tsc-form-grid">
            <label className={fieldClass}>
              Blood group
              <select
                className={inputClass}
                value={form.blood_group}
                onChange={(event) => updateField("blood_group", event.target.value)}
              >
                <option value="">Select if known</option>
                {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((group) => (
                  <option key={group} value={group}>{group}</option>
                ))}
              </select>
              <span className="text-xs font-normal text-slate-500">Select your blood group if known.</span>
            </label>

            <label className={fieldClass}>
              Preferred language
              <select
                className={inputClass}
                value={form.preferred_language}
                onChange={(event) => updateField("preferred_language", event.target.value)}
              >
                <option value="en">English</option>
                <option value="ha">Hausa</option>
                <option value="yo">Yoruba</option>
                <option value="ig">Igbo</option>
                <option value="fr">French</option>
              </select>
              <span className="text-xs font-normal text-slate-500">Language preferred when communicating with you.</span>
            </label>

            <label className={fieldClass}>
              Medical conditions
              <textarea
                className={inputClass}
                rows={4}
                value={form.medical_conditions}
                onChange={(event) => updateField("medical_conditions", event.target.value)}
                placeholder="List any medical conditions responders should know about..."
              />
            </label>

            <label className={fieldClass}>
              Allergies
              <textarea
                className={inputClass}
                rows={4}
                value={form.allergies}
                onChange={(event) => updateField("allergies", event.target.value)}
                placeholder="Mention medication, food or other allergies..."
              />
            </label>

            <label className={fieldClass}>
              Current medications
              <textarea
                className={inputClass}
                rows={4}
                value={form.medications}
                onChange={(event) => updateField("medications", event.target.value)}
                placeholder="List current medications and relevant details..."
              />
            </label>

            <label className={fieldClass}>
              Accessibility needs
              <textarea
                className={inputClass}
                rows={4}
                value={form.accessibility_needs}
                onChange={(event) => updateField("accessibility_needs", event.target.value)}
                placeholder="Mobility, hearing, vision or other assistance needs..."
              />
            </label>

            <label className={`${fieldClass} md:col-span-2`}>
              Additional safety information
              <textarea
                className={inputClass}
                rows={4}
                value={form.additional_information}
                onChange={(event) => updateField("additional_information", event.target.value)}
                placeholder="Anything else authorised responders should know..."
              />
            </label>
          </div>
        </section>

        <section className="tsc-panel">
          <SectionHeading
            number="02"
            title="Notifications & Privacy"
            description="Choose how you prefer to receive safety communications and manage responder access."
          />

          <div className="grid gap-5 lg:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
              <h3 className="font-bold text-[#071D49]">Preferred notification channel</h3>
              <p className="mt-1 text-sm text-slate-500">
                Select your preferred channel for safety updates.
              </p>
              <div className="mt-4 grid grid-cols-2 gap-2">
                {([
                  ["in_app", "In-app", "◉"],
                  ["email", "Email", "✉"],
                  ["sms", "SMS", "▤"],
                  ["push", "Push", "♧"],
                ] as [NotificationChannel, string, string][]).map(([value, label, symbol]) => {
                  const selected = form.preferred_notification_channel === value;
                  return (
                    <button
                      type="button"
                      key={value}
                      onClick={() => updateField("preferred_notification_channel", value)}
                      aria-pressed={selected}
                      className={`flex min-h-14 items-center gap-2 rounded-lg border px-3 py-3 text-sm font-bold transition ${
                        selected
                          ? "border-orange-400 bg-orange-50 text-[#071D49] ring-1 ring-orange-200"
                          : "border-slate-200 bg-white text-slate-600 hover:border-orange-300"
                      }`}
                    >
                      <span className="text-lg text-orange-600">{symbol}</span>
                      {label}
                      {selected && <span className="ml-auto text-orange-600">✓</span>}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 p-4 sm:p-5">
              <div className="flex items-start gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-orange-50 text-xl text-orange-600">
                  ♧
                </span>
                <div>
                  <h3 className="font-bold text-[#071D49]">
                    Share safety information with responders
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    Allow authorised responders to access your saved safety
                    information when required for emergency assistance.
                  </p>
                </div>
              </div>

              <label className="mt-5 flex cursor-pointer items-center justify-between gap-3 rounded-lg bg-slate-50 p-3">
                <span className="text-sm font-semibold text-slate-700">
                  {form.share_safety_information_with_responders
                    ? "Responder sharing enabled"
                    : "Responder sharing disabled"}
                </span>
                <input
                  type="checkbox"
                  className="h-5 w-5 accent-orange-500"
                  checked={form.share_safety_information_with_responders}
                  onChange={(event) =>
                    updateField("share_safety_information_with_responders", event.target.checked)
                  }
                />
              </label>
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-4 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs leading-5 text-slate-500">
              🔒 Your information is saved securely to your traveller profile.
              {lastSaved && <span> Last saved at {lastSaved}.</span>}
            </p>
            <button
              className="tsc-button tsc-button-primary w-full sm:w-auto"
              type="submit"
              disabled={saving}
            >
              {saving ? "Saving information..." : "Save safety profile →"}
            </button>
          </div>
        </section>
      </form>

      <section id="emergency-contacts" className="tsc-panel mt-4 scroll-mt-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <SectionHeading
            number="03"
            title="Emergency Contacts"
            description="Add trusted people who may be contacted if an emergency occurs during your journey."
          />
          <button
            type="button"
            className="tsc-button tsc-button-primary shrink-0"
            onClick={openNewContact}
          >
            + Add contact
          </button>
        </div>

        {contacts.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-5 py-12 text-center">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-orange-50 text-2xl text-orange-600">
              ☎
            </div>
            <h3 className="mt-4 font-bold text-[#071D49]">
              No emergency contacts added yet
            </h3>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
              Add someone you trust so they can be contacted when assistance is needed.
            </p>
            <button
              type="button"
              className="tsc-button tsc-button-primary mt-5"
              onClick={openNewContact}
            >
              Add your first contact
            </button>
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {contacts.map((contact) => (
              <article
                className="rounded-xl border border-slate-200 bg-white p-4 transition hover:border-orange-200 hover:shadow-md sm:p-5"
                key={contact.id}
              >
                <div className="flex items-start gap-3">
                  <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-[#071D49] text-lg font-extrabold text-white">
                    {contact.contact_name.trim().charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-bold text-[#071D49]">
                        {contact.contact_name}
                      </h3>
                      {contact.is_primary && (
                        <span className="rounded-full bg-orange-50 px-2 py-1 text-[10px] font-extrabold text-orange-700">
                          PRIMARY
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-slate-500">
                      {contact.relationship || "Emergency contact"}
                    </p>
                  </div>
                </div>

                <div className="mt-5 grid gap-3 border-y border-slate-100 py-4 sm:grid-cols-2">
                  <div className="min-w-0">
                    <span className="text-[10px] font-extrabold tracking-wider text-slate-400">
                      PHONE NUMBER
                    </span>
                    <p className="mt-1 break-all text-sm font-semibold text-slate-700">
                      {contact.phone_number}
                    </p>
                  </div>
                  {contact.email && (
                    <div className="min-w-0">
                      <span className="text-[10px] font-extrabold tracking-wider text-slate-400">
                        EMAIL ADDRESS
                      </span>
                      <p className="mt-1 break-all text-sm font-semibold text-slate-700">
                        {contact.email}
                      </p>
                    </div>
                  )}
                </div>

                <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <span className={`text-xs font-semibold ${
                    contact.can_receive_emergency_notifications
                      ? "text-emerald-700"
                      : "text-slate-500"
                  }`}>
                    ● {contact.can_receive_emergency_notifications
                      ? "Emergency notifications enabled"
                      : "Notifications disabled"}
                  </span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className={secondaryButton}
                      onClick={() => openEditContact(contact)}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="inline-flex min-h-10 items-center justify-center rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-bold text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                      disabled={deletingId === contact.id}
                      onClick={() => void handleDeleteContact(contact.id)}
                    >
                      {deletingId === contact.id ? "Removing..." : "Remove"}
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {showContactForm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/65 p-3 backdrop-blur-sm sm:p-6"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setShowContactForm(false);
            }
          }}
        >
          <section
            className="my-auto max-h-[94vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="contact-modal-title"
          >
            <div className="flex items-start justify-between gap-4 rounded-t-2xl bg-[#071D49] p-5 text-white sm:p-6">
              <div>
                <span className="text-[10px] font-extrabold tracking-[1.5px] text-orange-300">
                  EMERGENCY NETWORK
                </span>
                <h2 id="contact-modal-title" className="mt-2 text-xl font-bold">
                  {editingId ? "Edit emergency contact" : "Add emergency contact"}
                </h2>
                <p className="mt-1 text-sm text-slate-300">
                  Enter the details of someone you trust.
                </p>
              </div>
              <button
                type="button"
                className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-white/20 text-xl text-white hover:bg-white/10"
                onClick={() => setShowContactForm(false)}
                aria-label="Close contact form"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleContactSubmit} className="p-5 sm:p-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className={fieldClass}>
                  Full name *
                  <input
                    className={inputClass}
                    required
                    minLength={2}
                    maxLength={150}
                    value={contactForm.contact_name}
                    onChange={(event) => updateContactField("contact_name", event.target.value)}
                    placeholder="Enter full name"
                  />
                </label>

                <label className={fieldClass}>
                  Relationship
                  <input
                    className={inputClass}
                    value={contactForm.relationship}
                    onChange={(event) => updateContactField("relationship", event.target.value)}
                    placeholder="e.g. Spouse, Parent, Friend"
                  />
                </label>

                <label className={fieldClass}>
                  Country code
                  <input
                    className={inputClass}
                    value={contactForm.country_code}
                    onChange={(event) => updateContactField("country_code", event.target.value)}
                    placeholder="+234"
                  />
                </label>

                <label className={fieldClass}>
                  Phone number *
                  <input
                    className={inputClass}
                    required
                    value={contactForm.phone_number}
                    onChange={(event) => updateContactField("phone_number", event.target.value)}
                    placeholder="Enter phone number"
                  />
                </label>

                <label className={`${fieldClass} sm:col-span-2`}>
                  Email address
                  <input
                    className={inputClass}
                    type="email"
                    value={contactForm.email}
                    onChange={(event) => updateContactField("email", event.target.value)}
                    placeholder="name@example.com"
                  />
                </label>
              </div>

              <div className="mt-5 grid gap-3 rounded-xl bg-slate-50 p-4">
                <label className="flex cursor-pointer items-start gap-3">
                  <input
                    type="checkbox"
                    className="mt-1 h-4 w-4 accent-orange-500"
                    checked={contactForm.is_primary}
                    onChange={(event) => updateContactField("is_primary", event.target.checked)}
                  />
                  <span>
                    <strong className="block text-sm text-slate-800">
                      Set as primary contact
                    </strong>
                    <small className="mt-1 block text-xs leading-5 text-slate-500">
                      Identify this person as your main emergency contact.
                    </small>
                  </span>
                </label>

                <label className="flex cursor-pointer items-start gap-3">
                  <input
                    type="checkbox"
                    className="mt-1 h-4 w-4 accent-orange-500"
                    checked={contactForm.can_receive_emergency_notifications}
                    onChange={(event) =>
                      updateContactField("can_receive_emergency_notifications", event.target.checked)
                    }
                  />
                  <span>
                    <strong className="block text-sm text-slate-800">
                      Allow emergency notifications
                    </strong>
                    <small className="mt-1 block text-xs leading-5 text-slate-500">
                      This person may receive emergency notifications.
                    </small>
                  </span>
                </label>
              </div>

              {error && (
                <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700" role="alert">
                  {error}
                </div>
              )}

              <div className="mt-6 flex flex-col-reverse gap-2 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  className={secondaryButton}
                  onClick={() => setShowContactForm(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="tsc-button tsc-button-primary"
                  disabled={contactSaving}
                >
                  {contactSaving
                    ? "Saving..."
                    : editingId
                      ? "Save changes"
                      : "Add emergency contact"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      <footer className="mt-6 flex flex-col gap-3 border-t border-slate-200 py-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-emerald-50 font-bold text-emerald-700">
            ✓
          </span>
          <div>
            <strong className="text-sm text-[#071D49]">
              Your safety is important to us.
            </strong>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              Keep your information accurate and your emergency contacts up to date.
            </p>
          </div>
        </div>
        <Link href="/dashboard" className="text-sm font-bold text-[#164a83] hover:text-orange-600">
          ← Back to dashboard
        </Link>
      </footer>
    </main>
  );
}
