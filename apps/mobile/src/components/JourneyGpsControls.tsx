import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { supabase } from '../../lib/supabase';

type JourneyGpsProps = {
  journey: {
    id: string;
    traveller_id: string;
    status: string;
    location_sharing_enabled: boolean;
  };
  onUpdated: (enabled: boolean) => void;
};

const NAVY = '#071D49';
const ORANGE = '#F28C28';
const MUTED = '#687789';

export default function JourneyGpsControls({
  journey,
  onUpdated,
}: JourneyGpsProps) {
  const [sharingEnabled, setSharingEnabled] = useState(
    journey.location_sharing_enabled
  );
  const [busy, setBusy] = useState(false);
  const [trackingMessage, setTrackingMessage] = useState('');

  useEffect(() => {
    setSharingEnabled(journey.location_sharing_enabled);
  }, [journey.id, journey.location_sharing_enabled]);

  useEffect(() => {
    if (journey.status !== 'active' || !sharingEnabled) {
      setTrackingMessage('');
      return;
    }

    let mounted = true;
    let subscription: Location.LocationSubscription | null = null;

    const beginTracking = async () => {
      try {
        const permission = await Location.getForegroundPermissionsAsync();

        if (permission.status !== 'granted') {
          if (mounted) {
            setTrackingMessage(
              'Location permission is unavailable. Enable it in your device settings to resume GPS sharing.'
            );
          }
          return;
        }

        const servicesEnabled = await Location.hasServicesEnabledAsync();

        if (!servicesEnabled) {
          if (mounted) {
            setTrackingMessage(
              'Your device location service is turned off. Enable it to resume GPS sharing.'
            );
          }
          return;
        }

        const nextSubscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.Balanced,
            timeInterval: 15000,
            distanceInterval: 25,
          },
          async (position) => {
            if (!mounted) return;

            const { data: { session }, error: sessionError } =
              await supabase.auth.getSession();

            if (sessionError || !session) return;

            const { error } = await supabase
              .from('journey_location_updates')
              .insert({
                journey_id: journey.id,
                traveller_id: session.user.id,
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
                accuracy_meters: position.coords.accuracy,
                altitude_meters: position.coords.altitude,
                speed_meters_per_second: position.coords.speed,
                heading_degrees: position.coords.heading,
                recorded_at: new Date(position.timestamp).toISOString(),
              });

            if (error) {
              console.warn('GPS update was not saved:', error.message);
            }
          }
        );

        if (!mounted) {
          nextSubscription.remove();
          return;
        }

        subscription = nextSubscription;
        setTrackingMessage(
          'GPS sharing is active while TSC is open and this journey remains active.'
        );
      } catch (error) {
        console.error('GPS tracking could not start:', error);

        if (mounted) {
          setTrackingMessage(
            'GPS tracking could not start. Check your location settings and try again.'
          );
        }
      }
    };

    void beginTracking();

    return () => {
      mounted = false;
      subscription?.remove();
    };
  }, [journey.id, journey.status, sharingEnabled]);

  const updateSharing = async (enabled: boolean) => {
    setBusy(true);

    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session) {
        throw new Error('Your session has expired. Please sign in again.');
      }

      const updatePayload = enabled
        ? {
            location_sharing_enabled: true,
            location_sharing_consent_at: new Date().toISOString(),
          }
        : {
            location_sharing_enabled: false,
          };

      const { error } = await supabase
        .from('journeys')
        .update(updatePayload)
        .eq('id', journey.id)
        .eq('traveller_id', session.user.id);

      if (error) throw error;

      setSharingEnabled(enabled);
      onUpdated(enabled);

      Alert.alert(
        enabled ? 'GPS sharing enabled' : 'GPS sharing disabled',
        enabled
          ? 'Your location can now be shared during this active journey while TSC is open.'
          : 'TSC will stop collecting new GPS updates for this journey.'
      );
    } catch (error: any) {
      console.error('GPS consent update failed:', error);
      Alert.alert(
        'Unable to update GPS sharing',
        error?.message || 'Please check your connection and try again.'
      );
    } finally {
      setBusy(false);
    }
  };

  const enableSharing = async () => {
    if (journey.status !== 'active') return;

    Alert.alert(
      'Enable GPS location sharing?',
      'If you agree, TSC will collect your device location during this active journey while the app is open. Your location will be stored securely and made available to authorised journey monitoring personnel. You can turn sharing off at any time.',
      [
        { text: 'Not now', style: 'cancel' },
        {
          text: 'Agree and continue',
          onPress: () => {
            void (async () => {
              setBusy(true);

              try {
                const permission =
                  await Location.requestForegroundPermissionsAsync();

                if (permission.status !== 'granted') {
                  Alert.alert(
                    'Location permission required',
                    'You must allow location access while using TSC before enabling GPS sharing.'
                  );
                  return;
                }

                const servicesEnabled =
                  await Location.hasServicesEnabledAsync();

                if (!servicesEnabled) {
                  Alert.alert(
                    'Location services are off',
                    'Please enable location services on your device and try again.'
                  );
                  return;
                }

                await updateSharing(true);
              } catch (error: any) {
                Alert.alert(
                  'Location setup unsuccessful',
                  error?.message || 'Please try again.'
                );
              } finally {
                setBusy(false);
              }
            })();
          },
        },
      ]
    );
  };

  const disableSharing = () => {
    Alert.alert(
      'Turn off GPS sharing?',
      'TSC will stop collecting new location updates for this journey.',
      [
        { text: 'Keep sharing', style: 'cancel' },
        {
          text: 'Turn off',
          style: 'destructive',
          onPress: () => void updateSharing(false),
        },
      ]
    );
  };

  return (
    <View style={styles.card}>
      <View style={styles.headingRow}>
        <View style={styles.iconBox}>
          <Ionicons name="location" size={21} color={ORANGE} />
        </View>

        <View style={styles.headingText}>
          <Text style={styles.title}>GPS location sharing</Text>
          <Text style={styles.subtitle}>
            Share your location during this journey.
          </Text>
        </View>

        <View
          style={[
            styles.statusBadge,
            sharingEnabled ? styles.enabledBadge : styles.disabledBadge,
          ]}
        >
          <Text
            style={[
              styles.statusText,
              sharingEnabled ? styles.enabledText : styles.disabledText,
            ]}
          >
            {sharingEnabled ? 'ON' : 'OFF'}
          </Text>
        </View>
      </View>

      {journey.status !== 'active' ? (
        <Text style={styles.notice}>
          GPS sharing can be enabled after you start this journey.
        </Text>
      ) : (
        <>
          <Text style={styles.notice}>
            Location is collected only while this active journey is open in TSC.
            Background tracking is not enabled.
          </Text>

          {sharingEnabled ? (
            <Pressable
              style={styles.disableButton}
              onPress={disableSharing}
              disabled={busy}
            >
              {busy ? (
                <ActivityIndicator color="#B52D2D" />
              ) : (
                <>
                  <Ionicons name="location-outline" size={17} color="#B52D2D" />
                  <Text style={styles.disableButtonText}>
                    Turn off GPS sharing
                  </Text>
                </>
              )}
            </Pressable>
          ) : (
            <Pressable
              style={styles.enableButton}
              onPress={enableSharing}
              disabled={busy}
            >
              {busy ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="navigate-outline" size={17} color="#FFFFFF" />
                  <Text style={styles.enableButtonText}>
                    Enable GPS sharing
                  </Text>
                </>
              )}
            </Pressable>
          )}

          {!!trackingMessage && (
            <View style={styles.trackingNotice}>
              <Ionicons
                name={
                  trackingMessage.startsWith('GPS sharing is active')
                    ? 'checkmark-circle'
                    : 'information-circle'
                }
                size={17}
                color={
                  trackingMessage.startsWith('GPS sharing is active')
                    ? '#287A52'
                    : MUTED
                }
              />
              <Text style={styles.trackingText}>{trackingMessage}</Text>
            </View>
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#E2E7EE',
    padding: 15,
    marginTop: 13,
  },
  headingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconBox: {
    width: 39,
    height: 39,
    borderRadius: 12,
    backgroundColor: '#FFF2E5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headingText: {
    flex: 1,
  },
  title: {
    color: NAVY,
    fontSize: 12,
    fontWeight: '800',
  },
  subtitle: {
    color: MUTED,
    fontSize: 10,
    marginTop: 3,
  },
  statusBadge: {
    borderRadius: 7,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  enabledBadge: {
    backgroundColor: '#E8F5EE',
  },
  disabledBadge: {
    backgroundColor: '#EDF1F5',
  },
  statusText: {
    fontSize: 9,
    fontWeight: '800',
  },
  enabledText: {
    color: '#287A52',
  },
  disabledText: {
    color: MUTED,
  },
  notice: {
    color: MUTED,
    fontSize: 10,
    lineHeight: 16,
    marginTop: 12,
  },
  enableButton: {
    minHeight: 43,
    borderRadius: 11,
    backgroundColor: NAVY,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 13,
  },
  enableButtonText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  disableButton: {
    minHeight: 43,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: '#F0D5D5',
    backgroundColor: '#FFF7F7',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 13,
  },
  disableButtonText: {
    color: '#B52D2D',
    fontSize: 11,
    fontWeight: '800',
  },
  trackingNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 7,
    marginTop: 12,
  },
  trackingText: {
    flex: 1,
    color: MUTED,
    fontSize: 10,
    lineHeight: 15,
  },
});
