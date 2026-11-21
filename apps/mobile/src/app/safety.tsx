import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
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

const NAVY = '#071D49';
const ORANGE = '#F28C28';
const PAGE = '#F4F6F9';
const INK = '#172536';
const MUTED = '#687789';
const BORDER = '#E2E7EE';
const WHITE = '#FFFFFF';

type SafetyProfile = {
  blood_group: string;
  medical_conditions: string;
  allergies: string;
  medications: string;
  accessibility_needs: string;
  additional_information: string;
  preferred_language: string;
  preferred_notification_channel: 'in_app' | 'email' | 'sms' | 'push';
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
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<SafetyProfile>(emptyProfile);
  const [contacts, setContacts] = useState<SafetyContact[]>([]);
  const [contactName, setContactName] = useState('');
  const [relationship, setRelationship] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactCountryCode, setContactCountryCode] = useState('');
  const [contactCanReceive, setContactCanReceive] = useState(true);
  const [addingContact, setAddingContact] = useState(false);

  const updateProfile = (field: keyof SafetyProfile, value: string | boolean) => {
    setProfile((current) => ({ ...current, [field]: value }));
  };

  const loadSafetyData = useCallback(async () => {
    setLoading(true);

    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();

      if (authError || !authData.user) {
        router.replace('/login');
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
            profileResult.data.preferred_notification_channel ?? 'in_app',
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
    }
  }, [router]);

  useFocusEffect(
    useCallback(() => {
      loadSafetyData();
    }, [loadSafetyData])
  );

  const saveProfile = async () => {
    setSaving(true);

    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();

      if (authError || !authData.user) {
        router.replace('/login');
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

      Alert.alert('Saved', 'Your safety profile has been updated.');
    } catch (error) {
      console.error('Safety profile save failed:', error);
      Alert.alert('Save failed', 'Your safety profile could not be saved. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const addContact = async () => {
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
        router.replace('/login');
        return;
      }

      const shouldBePrimary = contacts.length === 0;

      const { error } = await supabase.from('tsc_safety_contacts').insert({
        traveller_id: authData.user.id,
        contact_name: name,
        relationship: relationship.trim() || null,
        phone_number: phone,
        email: contactEmail.trim() || null,
        country_code: contactCountryCode.trim() || null,
        is_primary: shouldBePrimary,
        can_receive_emergency_notifications: contactCanReceive,
      });

      if (error) throw error;

      setContactName('');
      setRelationship('');
      setPhoneNumber('');
      setContactEmail('');
      setContactCountryCode('');
      setContactCanReceive(true);

      await loadSafetyData();
      Alert.alert('Contact added', 'Your emergency contact has been saved.');
    } catch (error) {
      console.error('Emergency contact creation failed:', error);
      Alert.alert('Unable to add contact', 'Please check the details and try again.');
    } finally {
      setAddingContact(false);
    }
  };

  const makePrimary = async (contact: SafetyContact) => {
    if (contact.is_primary) return;

    Alert.alert(
      'Set primary contact?',
      `Make ${contact.contact_name} your primary emergency contact?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            try {
              const { data: authData, error: authError } = await supabase.auth.getUser();

              if (authError || !authData.user) {
                router.replace('/login');
                return;
              }

              const travellerId = authData.user.id;

              // Clear the existing primary contact before assigning the new one.
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

              await loadSafetyData();
            } catch (error) {
              console.error('Primary contact update failed:', error);
              Alert.alert(
                'Update failed',
                'The primary contact could not be changed. Please refresh and check your contacts.'
              );
              await loadSafetyData();
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
        router.replace('/login');
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

      await loadSafetyData();
    } catch (error) {
      console.error('Contact notification preference update failed:', error);
      Alert.alert('Update failed', 'The contact preference could not be updated.');
    }
  };

  const deleteContact = (contact: SafetyContact) => {
    Alert.alert(
      'Remove emergency contact?',
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
                router.replace('/login');
                return;
              }

              const { error } = await supabase
                .from('tsc_safety_contacts')
                .delete()
                .eq('id', contact.id)
                .eq('traveller_id', authData.user.id);

              if (error) throw error;

              await loadSafetyData();
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
        placeholderTextColor="#9AA5B3"
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
        <ActivityIndicator size="large" color={ORANGE} />
        <Text style={styles.loadingText}>Loading your safety information…</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" />

      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={styles.backButton}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={21} color={WHITE} />
        </Pressable>

        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>Safety Protection</Text>
          <Text style={styles.headerSubtitle}>Your personal safety information</Text>
        </View>

        <View style={styles.headerIcon}>
          <Ionicons name="shield-checkmark" size={23} color={ORANGE} />
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.introCard}>
          <View style={styles.introIcon}>
            <Ionicons name="shield-checkmark" size={25} color={ORANGE} />
          </View>
          <View style={styles.introCopy}>
            <Text style={styles.introTitle}>Be prepared. Travel protected.</Text>
            <Text style={styles.introText}>
              Keep important health information and trusted emergency contacts up to date.
            </Text>
          </View>
        </View>

        <View style={styles.sectionHeading}>
          <Text style={styles.sectionTitle}>Personal safety profile</Text>
          <Text style={styles.sectionDescription}>
            Information that may help responders assist you.
          </Text>
        </View>

        <View style={styles.card}>
          {renderField('Blood group', 'blood_group', 'e.g. O+')}
          {renderField('Medical conditions', 'medical_conditions', 'List any relevant conditions', true)}
          {renderField('Allergies', 'allergies', 'List known allergies', true)}
          {renderField('Medications', 'medications', 'Current medications', true)}
          {renderField('Accessibility needs', 'accessibility_needs', 'Any assistance you may need', true)}
          {renderField('Additional information', 'additional_information', 'Other important safety details', true)}
        </View>

        <View style={styles.sectionHeading}>
          <Text style={styles.sectionTitle}>Safety preferences</Text>
          <Text style={styles.sectionDescription}>
            Choose how your safety information and notifications are handled.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Preferred language</Text>
          <TextInput
            value={profile.preferred_language}
            onChangeText={(value) => updateProfile('preferred_language', value)}
            placeholder="e.g. en"
            placeholderTextColor="#9AA5B3"
            style={styles.input}
            autoCapitalize="none"
          />

          <Text style={[styles.label, styles.spacedLabel]}>Notification channel</Text>
          <View style={styles.optionRow}>
            {([
              ['in_app', 'In-app'],
              ['email', 'Email'],
              ['sms', 'SMS'],
              ['push', 'Push'],
            ] as const).map(([value, label]) => (
              <Pressable
                key={value}
                onPress={() => updateProfile('preferred_notification_channel', value)}
                style={[
                  styles.option,
                  profile.preferred_notification_channel === value && styles.optionSelected,
                ]}
              >
                <Text
                  style={[
                    styles.optionText,
                    profile.preferred_notification_channel === value && styles.optionTextSelected,
                  ]}
                >
                  {label}
                </Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.preferenceRow}>
            <View style={styles.preferenceCopy}>
              <Text style={styles.preferenceTitle}>Share with emergency responders</Text>
              <Text style={styles.preferenceDescription}>
                Allow your safety profile information to be shared with authorised responders.
              </Text>
            </View>
            <Switch
              value={profile.share_safety_information_with_responders}
              onValueChange={(value) =>
                updateProfile('share_safety_information_with_responders', value)
              }
              trackColor={{ false: '#CBD2DC', true: '#F6C28B' }}
              thumbColor={
                profile.share_safety_information_with_responders ? ORANGE : '#FFFFFF'
              }
            />
          </View>
        </View>

        <Pressable
          style={[styles.primaryButton, saving && styles.disabledButton]}
          onPress={saveProfile}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color={WHITE} />
          ) : (
            <>
              <Ionicons name="save-outline" size={19} color={WHITE} />
              <Text style={styles.primaryButtonText}>Save safety profile</Text>
            </>
          )}
        </Pressable>

        <View style={styles.sectionHeading}>
          <Text style={styles.sectionTitle}>Emergency contacts</Text>
          <Text style={styles.sectionDescription}>
            Add trusted people who can be contacted if you need help.
          </Text>
        </View>

        {contacts.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="people-outline" size={30} color={MUTED} />
            <Text style={styles.emptyTitle}>No emergency contacts yet</Text>
            <Text style={styles.emptyText}>
              Add at least one trusted contact. Your first contact will automatically become primary.
            </Text>
          </View>
        ) : (
          contacts.map((contact) => (
            <View style={styles.contactCard} key={contact.id}>
              <View style={styles.contactTop}>
                <View style={styles.contactAvatar}>
                  <Ionicons name="person" size={20} color={NAVY} />
                </View>
                <View style={styles.contactIdentity}>
                  <Text style={styles.contactName}>{contact.contact_name}</Text>
                  <Text style={styles.contactRelationship}>
                    {contact.relationship || 'Emergency contact'}
                  </Text>
                </View>
                {contact.is_primary && (
                  <View style={styles.primaryTag}>
                    <Text style={styles.primaryTagText}>PRIMARY</Text>
                  </View>
                )}
              </View>

              <View style={styles.contactDetail}>
                <Ionicons name="call-outline" size={16} color={MUTED} />
                <Text style={styles.contactDetailText}>
                  {contact.country_code ? `${contact.country_code} ` : ''}
                  {contact.phone_number}
                </Text>
              </View>

              {!!contact.email && (
                <View style={styles.contactDetail}>
                  <Ionicons name="mail-outline" size={16} color={MUTED} />
                  <Text style={styles.contactDetailText}>{contact.email}</Text>
                </View>
              )}

              <View style={styles.contactPreference}>
                <Text style={styles.contactPreferenceText}>Emergency notifications</Text>
                <Switch
                  value={contact.can_receive_emergency_notifications}
                  onValueChange={() => toggleContactNotifications(contact)}
                  trackColor={{ false: '#CBD2DC', true: '#F6C28B' }}
                  thumbColor={
                    contact.can_receive_emergency_notifications ? ORANGE : '#FFFFFF'
                  }
                />
              </View>

              <View style={styles.contactActions}>
                {!contact.is_primary && (
                  <Pressable
                    onPress={() => makePrimary(contact)}
                    style={styles.secondaryAction}
                  >
                    <Text style={styles.secondaryActionText}>Make primary</Text>
                  </Pressable>
                )}
                <Pressable
                  onPress={() => deleteContact(contact)}
                  style={styles.deleteAction}
                >
                  <Ionicons name="trash-outline" size={16} color="#B42318" />
                  <Text style={styles.deleteActionText}>Remove</Text>
                </Pressable>
              </View>
            </View>
          ))
        )}

        <View style={styles.sectionHeading}>
          <Text style={styles.sectionTitle}>Add an emergency contact</Text>
          <Text style={styles.sectionDescription}>
            Provide accurate details so your trusted contact can be reached.
          </Text>
        </View>

        <View style={styles.card}>
          <View style={styles.field}>
            <Text style={styles.label}>Full name *</Text>
            <TextInput
              value={contactName}
              onChangeText={setContactName}
              placeholder="Contact's full name"
              placeholderTextColor="#9AA5B3"
              style={styles.input}
            />
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>Relationship</Text>
            <TextInput
              value={relationship}
              onChangeText={setRelationship}
              placeholder="e.g. Spouse, parent, friend"
              placeholderTextColor="#9AA5B3"
              style={styles.input}
            />
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>Phone number *</Text>
            <TextInput
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              placeholder="Contact phone number"
              placeholderTextColor="#9AA5B3"
              keyboardType="phone-pad"
              style={styles.input}
            />
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>Country calling code</Text>
            <TextInput
              value={contactCountryCode}
              onChangeText={setContactCountryCode}
              placeholder="e.g. +234"
              placeholderTextColor="#9AA5B3"
              keyboardType="phone-pad"
              style={styles.input}
            />
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>Email address</Text>
            <TextInput
              value={contactEmail}
              onChangeText={setContactEmail}
              placeholder="name@example.com"
              placeholderTextColor="#9AA5B3"
              keyboardType="email-address"
              autoCapitalize="none"
              style={styles.input}
            />
          </View>

          <View style={styles.preferenceRow}>
            <View style={styles.preferenceCopy}>
              <Text style={styles.preferenceTitle}>May receive emergency notifications</Text>
              <Text style={styles.preferenceDescription}>
                Include this person in emergency contact notifications.
              </Text>
            </View>
            <Switch
              value={contactCanReceive}
              onValueChange={setContactCanReceive}
              trackColor={{ false: '#CBD2DC', true: '#F6C28B' }}
              thumbColor={contactCanReceive ? ORANGE : '#FFFFFF'}
            />
          </View>

          <Pressable
            style={[styles.primaryButton, addingContact && styles.disabledButton]}
            onPress={addContact}
            disabled={addingContact}
          >
            {addingContact ? (
              <ActivityIndicator color={WHITE} />
            ) : (
              <>
                <Ionicons name="person-add-outline" size={19} color={WHITE} />
                <Text style={styles.primaryButtonText}>Add emergency contact</Text>
              </>
            )}
          </Pressable>
        </View>

        <View style={styles.notice}>
          <Ionicons name="information-circle-outline" size={19} color="#8A5A18" />
          <Text style={styles.noticeText}>
            Keep your contact details current. Saving this information does not itself dispatch emergency services or guarantee that notifications will be delivered.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: PAGE },
  loadingScreen: {
    flex: 1,
    backgroundColor: NAVY,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: { color: WHITE, marginTop: 14, fontSize: 14 },
  header: {
    backgroundColor: NAVY,
    paddingHorizontal: 18,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: { flex: 1, marginLeft: 12 },
  headerTitle: { color: WHITE, fontSize: 18, fontWeight: '700' },
  headerSubtitle: { color: '#D5DEED', fontSize: 12, marginTop: 3 },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },
  introCard: {
    backgroundColor: NAVY,
    borderRadius: 16,
    padding: 17,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  introIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 13,
  },
  introCopy: { flex: 1 },
  introTitle: { color: WHITE, fontSize: 15, fontWeight: '700' },
  introText: { color: '#D5DEED', fontSize: 12, lineHeight: 18, marginTop: 5 },
  sectionHeading: { marginBottom: 11, marginTop: 3 },
  sectionTitle: { color: INK, fontSize: 17, fontWeight: '700' },
  sectionDescription: { color: MUTED, fontSize: 12, lineHeight: 18, marginTop: 4 },
  card: {
    backgroundColor: WHITE,
    borderRadius: 15,
    padding: 16,
    borderWidth: 1,
    borderColor: BORDER,
    marginBottom: 19,
  },
  field: { marginBottom: 14 },
  label: { color: INK, fontSize: 13, fontWeight: '600', marginBottom: 7 },
  input: {
    minHeight: 46,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: INK,
    fontSize: 14,
    backgroundColor: WHITE,
  },
  multilineInput: { minHeight: 82, paddingTop: 12 },
  spacedLabel: { marginTop: 5 },
  optionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 17 },
  option: {
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 9,
    paddingHorizontal: 13,
    paddingVertical: 9,
  },
  optionSelected: { backgroundColor: NAVY, borderColor: NAVY },
  optionText: { color: MUTED, fontSize: 12, fontWeight: '600' },
  optionTextSelected: { color: WHITE },
  preferenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 13,
    borderTopWidth: 1,
    borderTopColor: BORDER,
    gap: 12,
  },
  preferenceCopy: { flex: 1 },
  preferenceTitle: { color: INK, fontSize: 13, fontWeight: '600' },
  preferenceDescription: { color: MUTED, fontSize: 11, lineHeight: 16, marginTop: 4 },
  primaryButton: {
    minHeight: 49,
    borderRadius: 11,
    backgroundColor: ORANGE,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 9,
    marginBottom: 24,
  },
  primaryButtonText: { color: WHITE, fontSize: 14, fontWeight: '700' },
  disabledButton: { opacity: 0.65 },
  emptyCard: {
    backgroundColor: WHITE,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 23,
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyTitle: { color: INK, fontSize: 14, fontWeight: '700', marginTop: 10 },
  emptyText: {
    color: MUTED,
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
    marginTop: 6,
  },
  contactCard: {
    backgroundColor: WHITE,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 15,
    marginBottom: 11,
  },
  contactTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  contactAvatar: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#EAF0FA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactIdentity: { flex: 1, marginLeft: 10 },
  contactName: { color: INK, fontSize: 14, fontWeight: '700' },
  contactRelationship: { color: MUTED, fontSize: 11, marginTop: 3 },
  primaryTag: {
    backgroundColor: '#FFF1E3',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
  },
  primaryTagText: { color: '#A65A0A', fontSize: 9, fontWeight: '800' },
  contactDetail: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 7 },
  contactDetailText: { color: INK, fontSize: 12 },
  contactPreference: {
    borderTopWidth: 1,
    borderTopColor: BORDER,
    marginTop: 13,
    paddingTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  contactPreferenceText: { color: MUTED, fontSize: 11, flex: 1 },
  contactActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 16,
    marginTop: 11,
  },
  secondaryAction: { paddingVertical: 7 },
  secondaryActionText: { color: NAVY, fontSize: 12, fontWeight: '700' },
  deleteAction: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 7 },
  deleteActionText: { color: '#B42318', fontSize: 12, fontWeight: '600' },
  notice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 9,
    backgroundColor: '#FFF6E8',
    borderRadius: 11,
    padding: 13,
    marginTop: 2,
  },
  noticeText: { color: '#76501F', fontSize: 11, lineHeight: 17, flex: 1 },
});
