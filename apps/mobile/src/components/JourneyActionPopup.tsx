import React from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

type Props = {
  visible: boolean;
  title: string;
  message: string;
  origin?: string;
  destination?: string;
  actionLabel?: string;
  actionType?: 'schedule' | 'start' | 'complete' | 'cancel';
  loading?: boolean;
  fee?: number;
  distance?: number | null;
  onCancel: () => void;
  onConfirm: () => void;
};

const ACTION_COLORS = {
  schedule: '#3B82F6',
  start: '#10B981',
  complete: '#8B5CF6',
  cancel: '#EF4444',
};

export default function JourneyActionPopup({
  visible,
  title,
  message,
  origin,
  destination,
  actionLabel = 'Confirm',
  actionType = 'schedule',
  loading = false,
  fee,
  distance,
  onCancel,
  onConfirm,
}: Props) {
  const accent = ACTION_COLORS[actionType];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onCancel}
    >
      <View style={styles.overlay}>
        <View style={styles.popup}>
          <View style={[styles.topAccent, { backgroundColor: accent }]} />

          <View style={styles.header}>
            <View style={[styles.iconCircle, { backgroundColor: `${accent}18` }]}>
              <Text style={styles.icon}>
                {actionType === 'schedule'
                  ? '📅'
                  : actionType === 'start'
                  ? '🚀'
                  : actionType === 'complete'
                  ? '🏁'
                   : '⚠️'}
              </Text>
            </View>

            <Text style={styles.title}>{title}</Text>
            <Text style={styles.message}>{message}</Text>
          </View>

          {(origin || destination) && (
            <View style={styles.routeCard}>
              <View style={styles.routePoint}>
                <View style={styles.originDot} />
                <View style={styles.routeText}>
                  <Text style={styles.routeLabel}>ORIGIN</Text>
                  <Text style={styles.routeValue} numberOfLines={3}>
                    {origin || 'Origin'}
                  </Text>
                </View>
              </View>

              <View style={styles.routeConnector}>
                <View style={styles.connectorLine} />
                <Text style={styles.connectorIcon}>↓</Text>
              </View>

              <View style={styles.routePoint}>
                <View style={styles.destinationDot} />
                <View style={styles.routeText}>
                  <Text style={styles.routeLabel}>DESTINATION</Text>
                  <Text style={styles.routeValue} numberOfLines={3}>
                    {destination || 'Destination'}
                  </Text>
                </View>
              </View>
            </View>
          )}

          {(fee !== undefined || distance !== undefined) && (
            <View style={styles.infoRow}>
              {distance !== undefined && distance !== null && (
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>DISTANCE</Text>
                  <Text style={styles.infoValue}>{distance} km</Text>
                </View>
              )}
              {fee !== undefined && (
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>SCHEDULING FEE</Text>
                  <Text style={styles.feeValue}>
                    ₦{Number(fee).toLocaleString()}
                  </Text>
                </View>
              )}
            </View>
          )}

          <View style={styles.actions}>
            <Pressable
              onPress={onCancel}
              disabled={loading}
              style={({ pressed }) => [
                styles.cancelButton,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.cancelText}>Go Back</Text>
            </Pressable>

            <Pressable
              onPress={onConfirm}
              disabled={loading}
              style={({ pressed }) => [
                styles.confirmButton,
                { backgroundColor: accent },
                pressed && styles.pressed,
                loading && styles.disabled,
              ]}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.confirmText}>{actionLabel}</Text>
              )}
            </Pressable>
          </View>

          <Text style={styles.footer}>TSC · TRAVELLERS SAFETY COVERED</Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(3, 12, 32, 0.72)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 22,
  },
  popup: {
    width: '100%',
    maxWidth: 440,
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    overflow: 'hidden',
    elevation: 24,
    shadowColor: '#000',
    shadowOpacity: 0.24,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
  },
  topAccent: {
    height: 5,
    width: '100%',
  },
  header: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 26,
    paddingBottom: 22,
  },
  iconCircle: {
    width: 66,
    height: 66,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  icon: {
    fontSize: 30,
  },
  title: {
    fontSize: 23,
    fontWeight: '900',
    color: '#071D49',
    textAlign: 'center',
  },
  message: {
    color: '#64748B',
    fontSize: 15,
    lineHeight: 23,
    textAlign: 'center',
    marginTop: 9,
  },
  routeCard: {
    backgroundColor: '#F5F8FC',
    marginHorizontal: 20,
    padding: 18,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5ECF5',
  },
  routePoint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
  },
  originDot: {
    width: 13,
    height: 13,
    borderRadius: 7,
    backgroundColor: '#10B981',
    borderWidth: 3,
    borderColor: '#D1FAE5',
  },
  destinationDot: {
    width: 13,
    height: 13,
    borderRadius: 7,
    backgroundColor: '#F28C28',
    borderWidth: 3,
    borderColor: '#FFEDD5',
  },
  routeText: {
    flex: 1,
  },
  routeLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 1.3,
  },
  routeValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#102E6B',
    marginTop: 4,
    lineHeight: 23,
  },
  routeConnector: {
    height: 31,
    marginLeft: 5,
    justifyContent: 'center',
  },
  connectorLine: {
    position: 'absolute',
    height: 24,
    width: 2,
    backgroundColor: '#CBD5E1',
    left: 0,
    top: 0,
  },
  connectorIcon: {
    fontSize: 13,
    color: '#94A3B8',
    position: 'absolute',
    left: -5,
    bottom: 0,
  },
  infoRow: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginTop: 16,
    gap: 10,
  },
  infoItem: {
    flex: 1,
    backgroundColor: '#FFF7ED',
    borderRadius: 16,
    padding: 14,
  },
  infoLabel: {
    color: '#9A6700',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  infoValue: {
    color: '#172536',
    fontSize: 19,
    fontWeight: '900',
    marginTop: 6,
  },
  feeValue: {
    color: '#C2410C',
    fontSize: 19,
    fontWeight: '900',
    marginTop: 6,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  cancelButton: {
    flex: 1,
    height: 54,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: {
    color: '#475569',
    fontSize: 15,
    fontWeight: '800',
  },
  confirmButton: {
    flex: 1.4,
    height: 54,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
  },
  pressed: {
    opacity: 0.82,
    transform: [{ scale: 0.98 }],
  },
  disabled: {
    opacity: 0.65,
  },
  footer: {
    textAlign: 'center',
    color: '#94A3B8',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.2,
    paddingVertical: 19,
  },
});
