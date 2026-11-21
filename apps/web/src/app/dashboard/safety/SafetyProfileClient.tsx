"use client";

import {
  useCallback,
  useEffect,
  useState,
  type FormEvent,
} from "react";
import Link from "next/link";
import {
  addSafetyContact,
  deleteSafetyContact,
  getMySafetyData,
  saveMySafetyProfile,
  updateSafetyContact,
} from "./safety-actions";
import styles from "./SafetyProtection.module.css";

type SafetyProfile = {
  id?: string;
  blood_group: string;
  medical_conditions: string;
  allergies: string;
  medications: string;
  accessibility_needs: string;
  additional_information: string;
  preferred_language: string;
  preferred_notification_channel: "in_app" | "email" | "sms" | "push";
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
  created_at: string;
};

type ContactForm = {
  contact_name: string;
  relationship: string;
  country_code: string;
  phone_number: string;
  email: string;
  is_primary: boolean;
  can_receive_emergency_notifications: boolean;
};

const blankProfile: SafetyProfile = {
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

const blankContact: ContactForm = {
  contact_name: "",
  relationship: "",
  country_code: "",
  phone_number: "",
  email: "",
  is_primary: false,
  can_receive_emergency_notifications: true,
};

export default function SafetyProfileClient({
  travellerName,
}: {
  travellerName: string;
}) {
  const [profile, setProfile] = useState<SafetyProfile>(blankProfile);
  const [contacts, setContacts] = useState<SafetyContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingContact, setSavingContact] = useState(false);
  const [editingContactId, setEditingContactId] = useState<string | null>(null);
  const [contactForm, setContactForm] = useState<ContactForm>(blankContact);
  const [showContactForm, setShowContactForm] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");

    const result = await getMySafetyData();

    if (!result.success) {
      setError(result.message ?? "Unable to load your safety information. Please try again.");
      setLoading(false);
      return;
    }

    if (result.profile) {
      setProfile({
        blood_group: result.profile.blood_group ?? "",
        medical_conditions: result.profile.medical_conditions ?? "",
        allergies: result.profile.allergies ?? "",
        medications: result.profile.medications ?? "",
        accessibility_needs: result.profile.accessibility_needs ?? "",
        additional_information: result.profile.additional_information ?? "",
        preferred_language: result.profile.preferred_language ?? "en",
        preferred_notification_channel:
          result.profile.preferred_notification_channel ?? "in_app",
        share_safety_information_with_responders:
          result.profile.share_safety_information_with_responders ?? true,
      });
    } else {
      setProfile(blankProfile);
    }

    setContacts((result.contacts ?? []) as SafetyContact[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  function updateProfile<K extends keyof SafetyProfile>(
    key: K,
    value: SafetyProfile[K]
  ) {
    setProfile((current) => ({ ...current, [key]: value }));
  }

  function updateContact<K extends keyof ContactForm>(
    key: K,
    value: ContactForm[K]
  ) {
    setContactForm((current) => ({ ...current, [key]: value }));
  }

  async function handleProfileSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSavingProfile(true);
    setError("");
    setNotice("");

    const result = await saveMySafetyProfile(profile);

    if (result.success) {
      setNotice(result.message);
    } else {
      setError(result.message);
    }

    setSavingProfile(false);
  }

  function startAddContact() {
    setEditingContactId(null);
    setContactForm(blankContact);
    setError("");
    setNotice("");
    setShowContactForm(true);
  }

  function startEditContact(contact: SafetyContact) {
    setEditingContactId(contact.id);
    setContactForm({
      contact_name: contact.contact_name,
      relationship: contact.relationship ?? "",
      country_code: contact.country_code ?? "",
      phone_number: contact.phone_number,
      email: contact.email ?? "",
      is_primary: contact.is_primary,
      can_receive_emergency_notifications:
        contact.can_receive_emergency_notifications,
    });
    setError("");
    setNotice("");
    setShowContactForm(true);
  }

  async function handleContactSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSavingContact(true);
    setError("");
    setNotice("");

    const result = editingContactId
      ? await updateSafetyContact(editingContactId, contactForm)
      : await addSafetyContact(contactForm);

    if (result.success) {
      setNotice(result.message);
      setShowContactForm(false);
      setEditingContactId(null);
      setContactForm(blankContact);
      await loadData();
    } else {
      setError(result.message);
    }

    setSavingContact(false);
  }

  async function handleDeleteContact(contact: SafetyContact) {
    const confirmed = window.confirm(
      `Remove ${contact.contact_name} from your emergency contacts?`
    );

    if (!confirmed) return;

    setDeletingId(contact.id);
    setError("");
    setNotice("");

    const result = await deleteSafetyContact(contact.id);

    if (result.success) {
      setNotice(result.message);
      await loadData();
    } else {
      setError(result.message);
    }

    setDeletingId(null);
  }

  if (loading) {
    return (
      <main className={styles.page}>
        <div className={styles.loading}>
          <span className={styles.spinner} />
          <p>Loading your safety information...</p>
        </div>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <nav className={styles.breadcrumb}>
          <Link href="/dashboard">Dashboard</Link>
          <span>/</span>
          <span>Safety Protection</span>
        </nav>

        <header className={styles.hero}>
          <div className={styles.heroCopy}>
            <span className={styles.eyebrow}>TRAVELLER SECURITY</span>
            <h1>Your Safety Profile</h1>
            <p>
              Hello {travellerName}. Keep essential safety information and
              emergency contacts up to date before and during your journeys.
            </p>
          </div>
          <div className={styles.heroIcon} aria-hidden="true">
            <span>+</span>
            <div className={styles.shield}>✓</div>
          </div>
        </header>

        <div className={styles.noticeBar}>
          <span className={styles.noticeIcon}>i</span>
          <p>
            Your safety information is private. It is shared with authorised
            responders according to your sharing preference and applicable
            emergency procedures.
          </p>
        </div>

        {error && (
          <div className={styles.errorMessage} role="alert">
            {error}
          </div>
        )}

        {notice && (
          <div className={styles.successMessage} role="status">
            {notice}
          </div>
        )}

        <section className={styles.section}>
          <div className={styles.sectionHeading}>
            <div>
              <span className={styles.sectionEyebrow}>PERSONAL INFORMATION</span>
              <h2>Medical &amp; Safety Details</h2>
              <p>
                This information can help authorised responders understand
                your needs during an emergency.
              </p>
            </div>
            <span className={styles.sectionNumber}>01</span>
          </div>

          <form onSubmit={handleProfileSubmit} className={styles.form}>
            <div className={styles.fieldGrid}>
              <label className={styles.field}>
                <span>Blood group</span>
                <select
                  value={profile.blood_group ?? ""}
                  onChange={(event) =>
                    updateProfile("blood_group", event.target.value)
                  }
                >
                  <option value="">Select if known</option>
                  {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map(
                    (group) => (
                      <option key={group} value={group}>
                        {group}
                      </option>
                    )
                  )}
                  <option value="Unknown">Unknown</option>
                </select>
              </label>

              <label className={styles.field}>
                <span>Preferred language</span>
                <input
                  value={profile.preferred_language}
                  onChange={(event) =>
                    updateProfile("preferred_language", event.target.value)
                  }
                  maxLength={20}
                  placeholder="e.g. en, fr, es"
                />
              </label>

              <label className={`${styles.field} ${styles.fullWidth}`}>
                <span>Medical conditions</span>
                <textarea
                  value={profile.medical_conditions ?? ""}
                  onChange={(event) =>
                    updateProfile("medical_conditions", event.target.value)
                  }
                  maxLength={5000}
                  rows={3}
                  placeholder="List any relevant medical conditions..."
                />
              </label>

              <label className={styles.field}>
                <span>Allergies</span>
                <textarea
                  value={profile.allergies ?? ""}
                  onChange={(event) =>
                    updateProfile("allergies", event.target.value)
                  }
                  maxLength={5000}
                  rows={3}
                  placeholder="Food, medication or other allergies..."
                />
              </label>

              <label className={styles.field}>
                <span>Current medications</span>
                <textarea
                  value={profile.medications ?? ""}
                  onChange={(event) =>
                    updateProfile("medications", event.target.value)
                  }
                  maxLength={5000}
                  rows={3}
                  placeholder="List relevant medications..."
                />
              </label>

              <label className={styles.field}>
                <span>Accessibility needs</span>
                <textarea
                  value={profile.accessibility_needs ?? ""}
                  onChange={(event) =>
                    updateProfile("accessibility_needs", event.target.value)
                  }
                  maxLength={3000}
                  rows={3}
                  placeholder="Mobility, hearing, vision or other needs..."
                />
              </label>

              <label className={styles.field}>
                <span>Additional safety information</span>
                <textarea
                  value={profile.additional_information ?? ""}
                  onChange={(event) =>
                    updateProfile("additional_information", event.target.value)
                  }
                  maxLength={5000}
                  rows={3}
                  placeholder="Anything else responders should know..."
                />
              </label>
            </div>

            <div className={styles.preferencePanel}>
              <div>
                <h3>Notification preference</h3>
                <p>Choose your preferred channel for safety notifications.</p>
              </div>
              <label className={styles.preferenceSelect}>
                <span>Preferred channel</span>
                <select
                  value={profile.preferred_notification_channel}
                  onChange={(event) =>
                    updateProfile(
                      "preferred_notification_channel",
                      event.target.value as SafetyProfile["preferred_notification_channel"]
                    )
                  }
                >
                  <option value="in_app">In-app notifications</option>
                  <option value="email">Email</option>
                  <option value="sms">SMS</option>
                  <option value="push">Push notifications</option>
                </select>
              </label>
            </div>

            <label className={styles.checkRow}>
              <input
                type="checkbox"
                checked={profile.share_safety_information_with_responders}
                onChange={(event) =>
                  updateProfile(
                    "share_safety_information_with_responders",
                    event.target.checked
                  )
                }
              />
              <span>
                <strong>Allow authorised responders to view my safety information</strong>
                <small>
                  This preference supports emergency response. It does not
                  replace any legal or operational emergency requirements.
                </small>
              </span>
            </label>

            <div className={styles.formFooter}>
              <span className={styles.privateLabel}>
                <span>●</span> Private traveller information
              </span>
              <button
                className={styles.primaryButton}
                type="submit"
                disabled={savingProfile}
              >
                {savingProfile ? "Saving..." : "Save safety profile"}
              </button>
            </div>
          </form>
        </section>

        <section className={styles.section}>
          <div className={styles.sectionHeading}>
            <div>
              <span className={styles.sectionEyebrow}>EMERGENCY SUPPORT</span>
              <h2>Emergency Contacts</h2>
              <p>
                Add people who may be contacted if an emergency occurs during
                your journey.
              </p>
            </div>
            <span className={styles.sectionNumber}>02</span>
          </div>

          <div className={styles.contactToolbar}>
            <div className={styles.contactCount}>
              <strong>{contacts.length}</strong>
              <span>
                {contacts.length === 1 ? "Contact saved" : "Contacts saved"}
              </span>
            </div>
            <button
              type="button"
              className={styles.secondaryButton}
              onClick={startAddContact}
            >
              <span>+</span> Add emergency contact
            </button>
          </div>

          {contacts.length === 0 ? (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>+</div>
              <h3>No emergency contacts yet</h3>
              <p>
                Add at least one trusted contact so the appropriate person can
                be reached if you need assistance.
              </p>
              <button
                type="button"
                className={styles.primaryButton}
                onClick={startAddContact}
              >
                Add your first contact
              </button>
            </div>
          ) : (
            <div className={styles.contactList}>
              {contacts.map((contact) => (
                <article className={styles.contactCard} key={contact.id}>
                  <div className={styles.contactAvatar}>
                    {contact.contact_name.charAt(0).toUpperCase()}
                  </div>

                  <div className={styles.contactInfo}>
                    <div className={styles.contactNameRow}>
                      <h3>{contact.contact_name}</h3>
                      {contact.is_primary && (
                        <span className={styles.primaryTag}>Primary contact</span>
                      )}
                    </div>
                    <p>{contact.relationship || "Relationship not specified"}</p>
                    <div className={styles.contactDetails}>
                      <span>{contact.phone_number}</span>
                      {contact.email && <span>{contact.email}</span>}
                    </div>
                    <span className={styles.notificationStatus}>
                      {contact.can_receive_emergency_notifications
                        ? "Emergency notifications enabled"
                        : "Emergency notifications disabled"}
                    </span>
                  </div>

                  <div className={styles.contactActions}>
                    <button
                      type="button"
                      onClick={() => startEditContact(contact)}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className={styles.deleteButton}
                      disabled={deletingId === contact.id}
                      onClick={() => void handleDeleteContact(contact)}
                    >
                      {deletingId === contact.id ? "Removing..." : "Remove"}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}

          {showContactForm && (
            <div className={styles.modalBackdrop}>
              <section
                className={styles.contactModal}
                role="dialog"
                aria-modal="true"
                aria-labelledby="contact-form-title"
              >
                <div className={styles.modalHeading}>
                  <div>
                    <span className={styles.sectionEyebrow}>CONTACT DETAILS</span>
                    <h2 id="contact-form-title">
                      {editingContactId
                        ? "Edit emergency contact"
                        : "Add emergency contact"}
                    </h2>
                  </div>
                  <button
                    type="button"
                    className={styles.closeButton}
                    aria-label="Close"
                    onClick={() => setShowContactForm(false)}
                  >
                    ×
                  </button>
                </div>

                <form onSubmit={handleContactSubmit}>
                  <div className={styles.modalFields}>
                    <label className={styles.field}>
                      <span>Contact full name *</span>
                      <input
                        required
                        minLength={2}
                        maxLength={150}
                        value={contactForm.contact_name}
                        onChange={(event) =>
                          updateContact("contact_name", event.target.value)
                        }
                        placeholder="Full name"
                      />
                    </label>

                    <label className={styles.field}>
                      <span>Relationship</span>
                      <input
                        maxLength={100}
                        value={contactForm.relationship}
                        onChange={(event) =>
                          updateContact("relationship", event.target.value)
                        }
                        placeholder="e.g. Spouse, parent, friend"
                      />
                    </label>

                    <div className={styles.phoneGrid}>
                      <label className={styles.field}>
                        <span>Country code</span>
                        <input
                          maxLength={8}
                          value={contactForm.country_code}
                          onChange={(event) =>
                            updateContact("country_code", event.target.value)
                          }
                          placeholder="e.g. +234"
                        />
                      </label>
                      <label className={styles.field}>
                        <span>Phone number *</span>
                        <input
                          required
                          minLength={3}
                          maxLength={30}
                          value={contactForm.phone_number}
                          onChange={(event) =>
                            updateContact("phone_number", event.target.value)
                          }
                          placeholder="Contact phone number"
                        />
                      </label>
                    </div>

                    <label className={styles.field}>
                      <span>Email address</span>
                      <input
                        type="email"
                        maxLength={254}
                        value={contactForm.email}
                        onChange={(event) =>
                          updateContact("email", event.target.value)
                        }
                        placeholder="name@example.com"
                      />
                    </label>
                  </div>

                  <div className={styles.modalOptions}>
                    <label className={styles.checkRow}>
                      <input
                        type="checkbox"
                        checked={contactForm.is_primary}
                        onChange={(event) =>
                          updateContact("is_primary", event.target.checked)
                        }
                      />
                      <span>
                        <strong>Set as primary emergency contact</strong>
                        <small>
                          Identify this person as your main emergency contact.
                        </small>
                      </span>
                    </label>

                    <label className={styles.checkRow}>
                      <input
                        type="checkbox"
                        checked={
                          contactForm.can_receive_emergency_notifications
                        }
                        onChange={(event) =>
                          updateContact(
                            "can_receive_emergency_notifications",
                            event.target.checked
                          )
                        }
                      />
                      <span>
                        <strong>Allow emergency notifications</strong>
                        <small>
                          Mark this contact as eligible to receive emergency
                          notifications.
                        </small>
                      </span>
                    </label>
                  </div>

                  <div className={styles.modalFooter}>
                    <button
                      type="button"
                      className={styles.cancelButton}
                      onClick={() => setShowContactForm(false)}
                      disabled={savingContact}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className={styles.primaryButton}
                      disabled={savingContact}
                    >
                      {savingContact
                        ? "Saving..."
                        : editingContactId
                          ? "Save changes"
                          : "Add contact"}
                    </button>
                  </div>
                </form>
              </section>
            </div>
          )}
        </section>

        <section className={styles.nextSteps}>
          <div>
            <span className={styles.sectionEyebrow}>YOUR JOURNEY SAFETY</span>
            <h2>Plan with safety in mind</h2>
            <p>
              Manage your journeys and keep your travel details current.
              Journey risk monitoring and scheduled safety check-ins will be
              integrated into this protection experience.
            </p>
          </div>
          <Link href="/dashboard/journeys" className={styles.secondaryButton}>
            View my journeys
          </Link>
        </section>

        <footer className={styles.footer}>
          <Link href="/dashboard">← Back to dashboard</Link>
          <span>Travellers Safety Covered</span>
        </footer>
      </div>
    </main>
  );
}
