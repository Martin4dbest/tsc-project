import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';

const COLORS = {
  navy: '#071D49',
  navyMid: '#13386B',
  orange: '#F28C28',
  orangeSoft: '#FFF4E8',
  page: '#F4F6F9',
  white: '#FFFFFF',
  ink: '#172536',
  muted: '#64748B',
  border: '#E2E8F0',
  emerald: '#059669',
  emeraldSoft: '#ECFDF5',
  blueSoft: '#EFF6FF',
  amberSoft: '#FFFBEB',
};

type NotificationChannel = 'in_app' | 'email' | 'sms' | 'push';

type SafetyProfile = {
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
};

const CHANNELS: { value: NotificationChannel; label: string; emoji: string }[] = [
  { value: 'in_app', label: 'In-app', emoji: '📱' },
  { value: 'email', label: 'Email', emoji: '✉️' },
  { value: 'sms', label: 'SMS', emoji: '💬' },
  { value: 'push', label: 'Push', emoji: '🔔' },
];

const emptyProfile: SafetyProfile = {
  blood_group: '',
  medical_conditions: '',
  allergies: '',
  medications: '',
  accessibility_needs: '',
  additional_information: '',
  preferred_language: 'en',
  preferred_notification_channel: 'in_app',
  share_safety_information_with_responders: true,
};

export default function SafetyScreen() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<SafetyProfile>(emptyProfile);
  const [contacts, setContacts] = useState<SafetyContact[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [contactName, setContactName] = useState('');
  const [relationship, setRelationship] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactCountryCode, setContactCountryCode] = useState('+234');
  const [contactIsPrimary, setContactIsPrimary] = useState(false);
  const [contactCanReceive, setContactCanReceive] = useState(true);
  const [addingContact, setAddingContact] = useState(false);

  const goToLogin = useCallback(() => {
    router.replace('/login' as never);
  }, [router]);

  const updateProfile = (field: keyof SafetyProfile, value: string | boolean) => {
    setProfile((current) => ({ ...current, [field]: value }));
  };

  const resetContactForm = useCallback((nextIsPrimary = false) => {
    setEditingId(null);
    setContactName('');
    setRelationship('');
    setPhoneNumber('');
    setContactEmail('');
    setContactCountryCode('+234');
    setContactIsPrimary(nextIsPrimary);
    setContactCanReceive(true);
  }, []);

  const loadSafetyData = useCallback(
    async (quiet = false) => {
      if (quiet) setRefreshing(true);
      else setLoading(true);

      try {
        const { data: authData, error: authError } = await supabase.auth.getUser();

        if (authError || !authData.user) {
          goToLogin();
          return;
        }

        const travellerId = authData.user.id;

        const [profileResult, contactsResult] = await Promise.all([
          supabase
            .from('tsc_safety_profiles')
            .select('*')
            .eq('traveller_id', travellerId)
            .maybeSingle(),
          supabase
            .from('tsc_safety_contacts')
            .select('*')
            .eq('traveller_id', travellerId)
            .order('is_primary', { ascending: false })
            .order('created_at', { ascending: true }),
        ]);

        if (profileResult.error) throw profileResult.error;
        if (contactsResult.error) throw contactsResult.error;

        if (profileResult.data) {
          setProfile({
            blood_group: profileResult.data.blood_group ?? '',
            medical_conditions: profileResult.data.medical_conditions ?? '',
            allergies: profileResult.data.allergies ?? '',
            medications: profileResult.data.medications ?? '',
            accessibility_needs: profileResult.data.accessibility_needs ?? '',
            additional_information: profileResult.data.additional_information ?? '',
            preferred_language: profileResult.data.preferred_language ?? 'en',
            preferred_notification_channel:
              (profileResult.data.preferred_notification_channel as NotificationChannel) ??
              'in_app',
            share_safety_information_with_responders:
              profileResult.data.share_safety_information_with_responders ?? true,
          });
        } else {
          setProfile(emptyProfile);
        }

        setContacts((contactsResult.data ?? []) as SafetyContact[]);
      } catch (error) {
        console.error('Safety data loading failed:', error);
        Alert.alert(
          'Unable to load safety information',
          'Please check your connection and try again.'
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [goToLogin]
  );

  useFocusEffect(
    useCallback(() => {
      void loadSafetyData();
    }, [loadSafetyData])
  );

  const completion = useMemo(() => {
    const items = [
      profile.blood_group,
      profile.medical_conditions,
      profile.allergies,
      profile.medications,
      profile.accessibility_needs,
      profile.preferred_language,
    ].filter((v) => v.trim().length > 0).length;

    return Math.round((items / 6) * 100);
  }, [profile]);

  const primaryContact = useMemo(
    () => contacts.find((c) => c.is_primary),
    [contacts]
  );

  const saveProfile = async () => {
    setSaving(true);

    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();

      if (authError || !authData.user) {
        goToLogin();
        return;
      }

      const { error } = await supabase.from('tsc_safety_profiles').upsert(
        {
          traveller_id: authData.user.id,
          ...profile,
          profile_completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'traveller_id' }
      );

      if (error) throw error;

      Alert.alert('✅ Saved', 'Your safety profile has been updated.');
    } catch (error) {
      console.error('Safety profile save failed:', error);
      Alert.alert(
        'Save failed',
        'Your safety profile could not be saved. Please try again.'
      );
    } finally {
      setSaving(false);
    }
  };

  const startEditContact = (contact: SafetyContact) => {
    setEditingId(contact.id);
    setContactName(contact.contact_name);
    setRelationship(contact.relationship ?? '');
    setPhoneNumber(contact.phone_number);
    setContactEmail(contact.email ?? '');
    setContactCountryCode(contact.country_code ?? '+234');
    setContactIsPrimary(contact.is_primary);
    setContactCanReceive(contact.can_receive_emergency_notifications);
  };

  const saveContact = async () => {
    const name = contactName.trim();
    const phone = phoneNumber.trim();

    if (name.length < 2) {
      Alert.alert('Contact name required', 'Enter the contact’s full name.');
      return;
    }

    if (phone.length < 3 || phone.length > 30) {
      Alert.alert('Valid phone number required', 'Enter a valid contact phone number.');
      return;
    }

    setAddingContact(true);

    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();

      if (authError || !authData.user) {
        goToLogin();
        return;
      }

      const travellerId = authData.user.id;
      const shouldBePrimary =
        contactIsPrimary || (!editingId && contacts.length === 0);

      if (shouldBePrimary) {
        const { error: clearError } = await supabase
          .from('tsc_safety_contacts')
          .update({ is_primary: false })
          .eq('traveller_id', travellerId)
          .eq('is_primary', true);

        if (clearError) throw clearError;
      }

      const payload = {
        contact_name: name,
        relationship: relationship.trim() || null,
        phone_number: phone,
        email: contactEmail.trim() || null,
        country_code: contactCountryCode.trim() || null,
        is_primary: shouldBePrimary,
        can_receive_emergency_notifications: contactCanReceive,
        updated_at: new Date().toISOString(),
      };

      const result = editingId
        ? await supabase
            .from('tsc_safety_contacts')
            .update(payload)
            .eq('id', editingId)
            .eq('traveller_id', travellerId)
        : await supabase.from('tsc_safety_contacts').insert({
            ...payload,
            traveller_id: travellerId,
          });

      if (result.error) throw result.error;

      resetContactForm(false);
      await loadSafetyData(true);
      Alert.alert(
        '✅ Saved',
        editingId
          ? 'Emergency contact details updated.'
          : 'Your emergency contact has been saved.'
      );
    } catch (error) {
      console.error('Emergency contact save failed:', error);
      Alert.alert('Unable to save contact', 'Please check the details and try again.');
    } finally {
      setAddingContact(false);
    }
  };

  const makePrimary = async (contact: SafetyContact) => {
    if (contact.is_primary) return;

    Alert.alert(
      '⭐ Set primary contact?',
      `Make ${contact.contact_name} your primary emergency contact?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            try {
              const { data: authData, error: authError } = await supabase.auth.getUser();
              if (authError || !authData.user) {
                goToLogin();
                return;
              }

              const travellerId = authData.user.id;

              const { error: clearError } = await supabase
                .from('tsc_safety_contacts')
                .update({ is_primary: false })
                .eq('traveller_id', travellerId)
                .eq('is_primary', true);

              if (clearError) throw clearError;

              const { error: updateError } = await supabase
                .from('tsc_safety_contacts')
                .update({ is_primary: true, updated_at: new Date().toISOString() })
                .eq('id', contact.id)
                .eq('traveller_id', travellerId);

              if (updateError) throw updateError;

              await loadSafetyData(true);
            } catch (error) {
              console.error('Primary contact update failed:', error);
              Alert.alert(
                'Update failed',
                'The primary contact could not be changed. Please try again.'
              );
            }
          },
        },
      ]
    );
  };

  const toggleContactNotifications = async (contact: SafetyContact) => {
    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData.user) {
        goToLogin();
        return;
      }

      const { error } = await supabase
        .from('tsc_safety_contacts')
        .update({
          can_receive_emergency_notifications:
            !contact.can_receive_emergency_notifications,
          updated_at: new Date().toISOString(),
        })
        .eq('id', contact.id)
        .eq('traveller_id', authData.user.id);

      if (error) throw error;

      await loadSafetyData(true);
    } catch (error) {
      console.error('Contact notification preference update failed:', error);
      Alert.alert('Update failed', 'The contact preference could not be updated.');
    }
  };

  const deleteContact = (contact: SafetyContact) => {
    Alert.alert(
      '🗑️ Remove emergency contact?',
      `Remove ${contact.contact_name} from your emergency contacts?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              const { data: authData, error: authError } = await supabase.auth.getUser();
              if (authError || !authData.user) {
                goToLogin();
                return;
              }

              const { error } = await supabase
                .from('tsc_safety_contacts')
                .delete()
                .eq('id', contact.id)
                .eq('traveller_id', authData.user.id);

              if (error) throw error;

              if (editingId === contact.id) {
                resetContactForm(false);
              }
              await loadSafetyData(true);
            } catch (error) {
              console.error('Emergency contact deletion failed:', error);
              Alert.alert('Unable to remove contact', 'Please try again.');
            }
          },
        },
      ]
    );
  };

  const renderField = (
    label: string,
    field: keyof SafetyProfile,
    placeholder: string,
    multiline = false
  ) => (
    <View style={styles.field} key={field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        value={profile[field] as string}
        onChangeText={(value) => updateProfile(field, value)}
        placeholder={placeholder}
        placeholderTextColor="#94A3B8"
        multiline={multiline}
        textAlignVertical={multiline ? 'top' : 'center'}
        style={[styles.input, multiline && styles.multilineInput]}
      />
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingScreen}>
        <StatusBar barStyle="light-content" />
        <Text style={styles.loadingEmoji}>🛡️</Text>
        <ActivityIndicator size="large" color={COLORS.orange} />
        <Text style={styles.loadingText}>Loading your safety information…</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" />

      {/* Top Navigation Bar */}
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={styles.backButton}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={20} color={COLORS.white} />
        </Pressable>

        <View style={styles.headerText}>
          <Text style={styles.headerEyebrow}>🛡️ TRAVELLER SAFETY</Text>
          <Text style={styles.headerTitle}>Safety Protection</Text>
        </View>

        <View style={styles.headerBadge}>
          <Text style={styles.headerBadgeText}>{completion}%</Text>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void loadSafetyData(true)}
            tintColor={COLORS.orange}
          />
        }
      >
        {/* Hero Card */}
        <View style={styles.heroCard}>
          <View style={styles.heroTopRow}>
            <View style={styles.heroEmojiBox}>
              <Text style={styles.heroEmoji}>🛡️</Text>
            </View>
            <View style={styles.statusPill}>
              <View style={styles.statusDot} />
              <Text style={styles.statusPillText}>YOUR SAFETY SPACE</Text>
            </View>
          </View>
          <Text style={styles.heroTitle}>Be prepared. Travel protected. ✨</Text>
          <Text style={styles.heroText}>
            Keep important health information and trusted emergency contacts up to date for faster assistance.
          </Text>
        </View>

        {/* Privacy Assurance Card */}
        <View style={styles.privacyBanner}>
          <Text style={styles.bannerEmoji}>🔒</Text>
          <View style={styles.flexOne}>
            <Text style={styles.privacyTitle}>Your information is private and protected</Text>
            <Text style={styles.privacyBody}>
              Shared with authorised responders according to your privacy preference and emergency procedures.
            </Text>
          </View>
        </View>

        {/* Overview KPI Grid */}
        <View style={styles.kpiGrid}>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiEmoji}>📋</Text>
            <Text style={styles.kpiValue}>{completion}%</Text>
            <Text style={styles.kpiLabel}>Profile ready</Text>
          </View>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiEmoji}>👥</Text>
            <Text style={styles.kpiValue}>{contacts.length}</Text>
            <Text style={styles.kpiLabel}>Contacts</Text>
          </View>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiEmoji}>🚨</Text>
            <Text style={styles.kpiValueSmall}>
              {profile.share_safety_information_with_responders ? 'On' : 'Off'}
            </Text>
            <Text style={styles.kpiLabel}>Responder share</Text>
          </View>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiEmoji}>⭐</Text>
            <Text style={styles.kpiValueSmall} numberOfLines={1}>
              {primaryContact?.contact_name || 'None'}
            </Text>
            <Text style={styles.kpiLabel}>Primary</Text>
          </View>
        </View>

        {/* Section 01: Personal Safety Profile */}
        <View style={styles.sectionHeading}>
          <Text style={styles.sectionTag}>SAFETY PROTECTION · 01</Text>
          <Text style={styles.sectionTitle}>🩺 Personal Safety Profile</Text>
          <Text style={styles.sectionDescription}>
            Health and accessibility details that help responders assist you safely.
          </Text>
        </View>

        <View style={styles.card}>
          {renderField('🩸 Blood group', 'blood_group', 'e.g. O+')}
          {renderField(
            '🏥 Medical conditions',
            'medical_conditions',
            'List any relevant medical conditions...',
            true
          )}
          {renderField('⚠️ Allergies', 'allergies', 'Medication, food, or environmental allergies...', true)}
          {renderField('💊 Medications', 'medications', 'Current medications or dosages...', true)}
          {renderField(
            '♿ Accessibility needs',
            'accessibility_needs',
            'Mobility, hearing, vision, or other support needs...',
            true
          )}
          {renderField(
            '📌 Additional safety information',
            'additional_information',
            'Any other helpful context for responders...',
            true
          )}
        </View>

        {/* Section 02: Safety Preferences */}
        <View style={styles.sectionHeading}>
          <Text style={styles.sectionTag}>SAFETY PROTECTION · 02</Text>
          <Text style={styles.sectionTitle}>⚙️ Safety Preferences</Text>
          <Text style={styles.sectionDescription}>
            Choose your preferred notification channel, language, and responder sharing.
          </Text>
        </View>

        <View style={styles.card}>
          <View style={styles.field}>
            <Text style={styles.label}>🌐 Preferred language</Text>
            <TextInput
              value={profile.preferred_language}
              onChangeText={(value) => updateProfile('preferred_language', value)}
              placeholder="e.g. en, yo, ha, ig"
              placeholderTextColor="#94A3B8"
              style={styles.input}
              autoCapitalize="none"
            />
          </View>

          <Text style={styles.label}>🔔 Notification channel</Text>
          <View style={styles.optionRow}>
            {CHANNELS.map(({ value, label, emoji }) => {
              const active = profile.preferred_notification_channel === value;
              return (
                <Pressable
                  key={value}
                  onPress={() => updateProfile('preferred_notification_channel', value)}
                  style={[styles.option, active && styles.optionSelected]}
                >
                  <Text style={styles.optionEmoji}>{emoji}</Text>
                  <Text style={[styles.optionText, active && styles.optionTextSelected]}>
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.preferenceRow}>
            <View style={styles.preferenceCopy}>
              <Text style={styles.preferenceTitle}>🛡️ Share with emergency responders</Text>
              <Text style={styles.preferenceDescription}>
                Allow authorised responders to view your safety profile when needed.
              </Text>
            </View>
            <Switch
              value={profile.share_safety_information_with_responders}
              onValueChange={(value) =>
                updateProfile('share_safety_information_with_responders', value)
              }
              trackColor={{ false: '#CBD5E1', true: '#FBD38D' }}
              thumbColor={
                profile.share_safety_information_with_responders ? COLORS.orange : COLORS.white
              }
            />
          </View>

          <Pressable
            style={[styles.primaryButton, saving && styles.disabledButton]}
            onPress={() => void saveProfile()}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <Text style={styles.primaryButtonText}>💾 Save Safety Profile</Text>
            )}
          </Pressable>
        </View>

        {/* Section 03: Emergency Contacts */}
        <View style={styles.sectionHeading}>
          <Text style={styles.sectionTag}>SAFETY PROTECTION · 03</Text>
          <Text style={styles.sectionTitle}>👥 Emergency Contacts</Text>
          <Text style={styles.sectionDescription}>
            Trusted people who can be reached if you need assistance during travel.
          </Text>
        </View>

        {contacts.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyEmoji}>☎️ </Text>
            <Text style={styles.emptyTitle}>No emergency contacts yet</Text>
            <Text style={styles.emptyText}>
              Add at least one trusted contact. Your first contact automatically becomes your primary contact.
            </Text>
          </View>
        ) : (
          contacts.map((contact) => (
            <View style={styles.contactCard} key={contact.id}>
              <View style={styles.contactTop}>
                <View style={styles.contactAvatar}>
                  <Text style={styles.contactAvatarEmoji}>👤</Text>
                </View>
                <View style={styles.contactIdentity}>
                  <Text style={styles.contactName}>{contact.contact_name}</Text>
                  <Text style={styles.contactRelationship}>
                    {contact.relationship || 'Emergency contact'}
                  </Text>
                </View>
                {contact.is_primary && (
                  <View style={styles.primaryTag}>
                    <Text style={styles.primaryTagText}>⭐ PRIMARY</Text>
                  </View>
                )}
              </View>

              <Text style={styles.contactDetailText}>
                📞 {contact.country_code ? `${contact.country_code} ` : ''}
                {contact.phone_number}
              </Text>

              {!!contact.email && (
                <Text style={styles.contactDetailText}>✉️ {contact.email}</Text>
              )}

              <View style={styles.contactPreference}>
                <Text style={styles.contactPreferenceText}>🔔 Emergency notifications</Text>
                <Switch
                  value={contact.can_receive_emergency_notifications}
                  onValueChange={() => void toggleContactNotifications(contact)}
                  trackColor={{ false: '#CBD5E1', true: '#FBD38D' }}
                  thumbColor={
                    contact.can_receive_emergency_notifications
                      ? COLORS.orange
                      : COLORS.white
                  }
                />
              </View>

              <View style={styles.contactActions}>
                {!contact.is_primary && (
                  <Pressable
                    onPress={() => void makePrimary(contact)}
                    style={styles.secondaryAction}
                  >
                    <Text style={styles.secondaryActionText}>⭐ Make primary</Text>
                  </Pressable>
                )}
                <Pressable
                  onPress={() => startEditContact(contact)}
                  style={styles.secondaryAction}
                >
                  <Text style={styles.secondaryActionText}>✏️ Edit</Text>
                </Pressable>
                <Pressable
                  onPress={() => deleteContact(contact)}
                  style={styles.deleteAction}
                >
                  <Text style={styles.deleteActionText}>🗑️ Remove</Text>
                </Pressable>
              </View>
            </View>
          ))
        )}

        {/* Add / Edit Contact Form Card */}
        <View style={styles.card}>
          <View style={styles.formHeaderRow}>
            <Text style={styles.formCardTitle}>
              {editingId ? '✏️ Edit Emergency Contact' : '➕ Add Emergency Contact'}
            </Text>
            {editingId && (
              <Pressable onPress={() => resetContactForm(false)}>
                <Text style={styles.cancelEditText}>Cancel</Text>
              </Pressable>
            )}
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Full name *</Text>
            <TextInput
              value={contactName}
              onChangeText={setContactName}
              placeholder="Contact's full name"
              placeholderTextColor="#94A3B8"
              style={styles.input}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Relationship</Text>
            <TextInput
              value={relationship}
              onChangeText={setRelationship}
              placeholder="e.g. Spouse, parent, colleague"
              placeholderTextColor="#94A3B8"
              style={styles.input}
            />
          </View>

          <View style={styles.rowGap}>
            <View style={[styles.field, styles.codeField]}>
              <Text style={styles.label}>Code</Text>
              <TextInput
                value={contactCountryCode}
                onChangeText={setContactCountryCode}
                placeholder="+234"
                placeholderTextColor="#94A3B8"
                keyboardType="phone-pad"
                style={styles.input}
              />
            </View>
            <View style={[styles.field, styles.flexOne]}>
              <Text style={styles.label}>Phone number *</Text>
              <TextInput
                value={phoneNumber}
                onChangeText={setPhoneNumber}
                placeholder="801 234 5678"
                placeholderTextColor="#94A3B8"
                keyboardType="phone-pad"
                style={styles.input}
              />
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Email address</Text>
            <TextInput
              value={contactEmail}
              onChangeText={setContactEmail}
              placeholder="name@example.com"
              placeholderTextColor="#94A3B8"
              keyboardType="email-address"
              autoCapitalize="none"
              style={styles.input}
            />
          </View>

          <View style={styles.preferenceRow}>
            <View style={styles.preferenceCopy}>
              <Text style={styles.preferenceTitle}>⭐ Primary emergency contact</Text>
              <Text style={styles.preferenceDescription}>
                Set this person as your main emergency contact.
              </Text>
            </View>
            <Switch
              value={contactIsPrimary || (!editingId && contacts.length === 0)}
              onValueChange={setContactIsPrimary}
              trackColor={{ false: '#CBD5E1', true: '#FBD38D' }}
              thumbColor={
                contactIsPrimary || (!editingId && contacts.length === 0)
                  ? COLORS.orange
                  : COLORS.white
              }
            />
          </View>

          <View style={styles.preferenceRow}>
            <View style={styles.preferenceCopy}>
              <Text style={styles.preferenceTitle}>🔔 Emergency notifications</Text>
              <Text style={styles.preferenceDescription}>
                Allow this contact to receive emergency alerts.
              </Text>
            </View>
            <Switch
              value={contactCanReceive}
              onValueChange={setContactCanReceive}
              trackColor={{ false: '#CBD5E1', true: '#FBD38D' }}
              thumbColor={contactCanReceive ? COLORS.orange : COLORS.white}
            />
          </View>

          <Pressable
            style={[styles.primaryButton, addingContact && styles.disabledButton]}
            onPress={() => void saveContact()}
            disabled={addingContact}
          >
            {addingContact ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <Text style={styles.primaryButtonText}>
                {editingId ? '💾 Update Contact' : '👤 Add Emergency Contact'}
              </Text>
            )}
          </Pressable>
        </View>

        {/* Safety Reminder */}
        <View style={styles.notice}>
          <Text style={styles.bannerEmoji}>ℹ️</Text>
          <Text style={styles.noticeText}>
            Your safety matters. Keep contact details current—saving this information does not itself dispatch emergency services or guarantee alert delivery.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.page },
  loadingScreen: {
    flex: 1,
    backgroundColor: COLORS.navy,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  loadingEmoji: { fontSize: 36, marginBottom: 12 },
  loadingText: { color: COLORS.white, marginTop: 14, fontSize: 14, fontWeight: '600' },
  header: {
    backgroundColor: COLORS.navy,
    paddingHorizontal: 18,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: { flex: 1 },
  headerEyebrow: { color: '#FDBA74', fontSize: 10, fontWeight: '800', letterSpacing: 1.2 },
  headerTitle: { color: COLORS.white, fontSize: 18, fontWeight: '800', marginTop: 2 },
  headerBadge: {
    backgroundColor: 'rgba(255,255,255,0.14)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  headerBadgeText: { color: COLORS.white, fontSize: 12, fontWeight: '800' },
  scroll: { flex: 1 },
  content: { padding: 16, paddingBottom: 42 },
  flexOne: { flex: 1 },
  heroCard: {
    backgroundColor: COLORS.navy,
    borderRadius: 20,
    padding: 18,
    marginBottom: 14,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  heroEmojiBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroEmoji: { fontSize: 24 },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(52, 211, 153, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  statusDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#34D399' },
  statusPillText: { color: '#A7F3D0', fontSize: 10, fontWeight: '800', letterSpacing: 0.6 },
  heroTitle: { color: COLORS.white, fontSize: 18, fontWeight: '800' },
  heroText: { color: '#CBD5E1', fontSize: 12, lineHeight: 19, marginTop: 6 },
  privacyBanner: {
    backgroundColor: COLORS.blueSoft,
    borderWidth: 1,
    borderColor: '#DBEAFE',
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 11,
    marginBottom: 16,
  },
  bannerEmoji: { fontSize: 18 },
  privacyTitle: { color: COLORS.navy, fontSize: 13, fontWeight: '800' },
  privacyBody: { color: '#475569', fontSize: 11, lineHeight: 17, marginTop: 3 },
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  kpiCard: {
    width: '48%',
    flexGrow: 1,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 16,
    padding: 14,
  },
  kpiEmoji: { fontSize: 18 },
  kpiValue: { color: COLORS.navy, fontSize: 22, fontWeight: '800', marginTop: 6 },
  kpiValueSmall: { color: COLORS.navy, fontSize: 15, fontWeight: '800', marginTop: 8 },
  kpiLabel: { color: COLORS.muted, fontSize: 11, fontWeight: '600', marginTop: 2 },
  sectionHeading: { marginBottom: 10, marginTop: 4 },
  sectionTag: { color: COLORS.orange, fontSize: 10, fontWeight: '800', letterSpacing: 1.2 },
  sectionTitle: { color: COLORS.ink, fontSize: 17, fontWeight: '800', marginTop: 2 },
  sectionDescription: { color: COLORS.muted, fontSize: 12, lineHeight: 18, marginTop: 3 },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 20,
  },
  formHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  formCardTitle: { color: COLORS.navy, fontSize: 15, fontWeight: '800' },
  cancelEditText: { color: '#DC2626', fontSize: 12, fontWeight: '700' },
  field: { marginBottom: 14 },
  rowGap: { flexDirection: 'row', gap: 10 },
  codeField: { width: 92 },
  label: { color: COLORS.ink, fontSize: 12, fontWeight: '700', marginBottom: 7 },
  input: {
    minHeight: 46,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 13,
    paddingVertical: 10,
    color: COLORS.ink,
    fontSize: 13,
    backgroundColor: '#F8FAFC',
  },
  multilineInput: { minHeight: 84, paddingTop: 12 },
  optionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 11,
    paddingHorizontal: 12,
    paddingVertical: 9,
    backgroundColor: '#F8FAFC',
  },
  optionSelected: { backgroundColor: COLORS.navy, borderColor: COLORS.navy },
  optionEmoji: { fontSize: 14 },
  optionText: { color: COLORS.muted, fontSize: 12, fontWeight: '700' },
  optionTextSelected: { color: COLORS.white },
  preferenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 13,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    gap: 12,
  },
  preferenceCopy: { flex: 1 },
  preferenceTitle: { color: COLORS.ink, fontSize: 13, fontWeight: '700' },
  preferenceDescription: { color: COLORS.muted, fontSize: 11, lineHeight: 16, marginTop: 3 },
  primaryButton: {
    minHeight: 48,
    borderRadius: 14,
    backgroundColor: COLORS.orange,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  primaryButtonText: { color: COLORS.white, fontSize: 13, fontWeight: '800' },
  disabledButton: { opacity: 0.65 },
  emptyCard: {
    backgroundColor: COLORS.white,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 24,
    alignItems: 'center',
    marginBottom: 18,
  },
  emptyEmoji: { fontSize: 30 },
  emptyTitle: { color: COLORS.ink, fontSize: 15, fontWeight: '800', marginTop: 10 },
  emptyText: {
    color: COLORS.muted,
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
    marginTop: 6,
  },
  contactCard: {
    backgroundColor: COLORS.white,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    marginBottom: 12,
  },
  contactTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  contactAvatar: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: COLORS.orangeSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactAvatarEmoji: { fontSize: 20 },
  contactIdentity: { flex: 1, marginLeft: 11 },
  contactName: { color: COLORS.ink, fontSize: 14, fontWeight: '800' },
  contactRelationship: { color: COLORS.muted, fontSize: 11, marginTop: 2 },
  primaryTag: {
    backgroundColor: COLORS.orangeSoft,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
  },
  primaryTagText: { color: '#9A3412', fontSize: 10, fontWeight: '800' },
  contactDetailText: { color: COLORS.ink, fontSize: 12, fontWeight: '600', marginTop: 6 },
  contactPreference: {
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    marginTop: 12,
    paddingTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  contactPreferenceText: { color: COLORS.muted, fontSize: 12, fontWeight: '600' },
  contactActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 10,
    marginTop: 12,
  },
  secondaryAction: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 9,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  secondaryActionText: { color: COLORS.navy, fontSize: 11, fontWeight: '700' },
  deleteAction: { paddingHorizontal: 10, paddingVertical: 6 },
  deleteActionText: { color: '#DC2626', fontSize: 11, fontWeight: '700' },
  notice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: COLORS.amberSoft,
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 15,
    padding: 14,
  },
  noticeText: { color: '#78350F', fontSize: 11, lineHeight: 17, flex: 1 },
});