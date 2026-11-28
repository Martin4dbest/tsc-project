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

const COLORS = {
  schedule: '#F5B942',
  start: '#34D399',
  complete: '#A78BFA',
  cancel: '#F87171',
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
  const accent = COLORS[actionType];

  return (
    <Modal transparent visible={visible} animationType="fade" statusBarTranslucent onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={[styles.topLine, { backgroundColor: accent }]} />

          <View style={styles.headerRow}>
            <View>
              <Text style={styles.brand}>TSC</Text>
              <Text style={styles.brandSub}>TRAVELLERS SAFETY COVERED</Text>
            </View>
            <View style={styles.liveBadge}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>SECURE</Text>
            </View>
          </View>

          <View style={[styles.iconBox, { borderColor: `${accent}55` }]}>
            <Text style={[styles.icon, { color: accent }]}>
              {actionType === 'schedule' ? '✦' : actionType === 'start' ? '▶' : actionType === 'complete' ? '✓' : '!'}
            </Text>
          </View>

          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>

          {(origin || destination) && (
            <View style={styles.routeCard}>
              <Text style={styles.sectionLabel}>JOURNEY ROUTE</Text>
              <View style={styles.routePoint}>
                <View style={styles.originDot} />
                <View style={styles.pointText}>
                  <Text style={styles.pointLabel}>FROM</Text>
                  <Text style={styles.pointValue}>{origin || 'Origin'}</Text>
                </View>
              </View>
              <View style={styles.connector}>
                <View style={styles.connectorLine} />
                <Text style={styles.connectorArrow}>↓</Text>
              </View>
              <View style={styles.routePoint}>
                <View style={styles.destinationDot} />
                <View style={styles.pointText}>
                  <Text style={styles.pointLabel}>TO</Text>
                  <Text style={styles.pointValue}>{destination || 'Destination'}</Text>
                </View>
              </View>
            </View>
          )}

          {(fee !== undefined || distance !== undefined) && (
            <View style={styles.metrics}>
              {distance != null && (
                <View style={styles.metric}>
                  <Text style={styles.metricLabel}>DISTANCE</Text>
                  <Text style={styles.metricValue}>{distance} km</Text>
                </View>
              )}
              {fee !== undefined && (
                <View style={[styles.metric, styles.feeMetric]}>
                  <Text style={styles.metricLabel}>SCHEDULING FEE</Text>
                  <Text style={styles.feeValue}>₦{Number(fee).toLocaleString()}</Text>
                </View>
              )}
            </View>
          )}

          <View style={styles.actions}>
            <Pressable style={styles.cancelButton} onPress={onCancel} disabled={loading}>
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
            <Pressable
              style={[styles.confirmButton, { backgroundColor: accent }, loading && styles.disabled]}
              onPress={onConfirm}
              disabled={loading}
            >
              {loading ? <ActivityIndicator color="#08172E" /> : <Text style={styles.confirmText}>{actionLabel}  →</Text>}
            </Pressable>
          </View>

          <Text style={styles.footer}>YOUR JOURNEY. OUR PRIORITY.</Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(2,8,23,0.82)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 440,
    backgroundColor: '#0B1730',
    borderRadius: 26,
    borderWidth: 1,
    borderColor: '#263956',
    overflow: 'hidden',
    paddingBottom: 20,
    elevation: 24,
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 25,
    shadowOffset: { width: 0, height: 12 },
  },
  topLine: { height: 4 },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: 22,
    marginTop: 20,
  },
  brand: { color: '#FFFFFF', fontSize: 16, fontWeight: '900', letterSpacing: 1.2 },
  brandSub: { color: '#8094B2', fontSize: 8, fontWeight: '800', letterSpacing: 1.1, marginTop: 3 },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#142740',
    borderColor: '#2C4562',
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#34D399' },
  liveText: { color: '#B8C8DB', fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  iconBox: {
    alignSelf: 'center',
    marginTop: 22,
    width: 64,
    height: 64,
    borderRadius: 21,
    borderWidth: 1,
    backgroundColor: '#14233B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: { fontSize: 28, fontWeight: '900' },
  title: { color: '#F8FAFC', fontSize: 23, fontWeight: '900', textAlign: 'center', marginTop: 17, marginHorizontal: 22 },
  message: { color: '#9EB0C8', fontSize: 14, lineHeight: 21, textAlign: 'center', marginTop: 8, marginHorizontal: 24, marginBottom: 20 },
  routeCard: { marginHorizontal: 20, padding: 16, borderRadius: 18, backgroundColor: '#101F38', borderWidth: 1, borderColor: '#283B57' },
  sectionLabel: { color: '#8095B2', fontSize: 9, fontWeight: '900', letterSpacing: 1.4, marginBottom: 16 },
  routePoint: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  originDot: { width: 14, height: 14, borderRadius: 7, backgroundColor: '#34D399', borderWidth: 3, borderColor: '#1C473C' },
  destinationDot: { width: 14, height: 14, borderRadius: 4, backgroundColor: '#F5B942', borderWidth: 3, borderColor: '#544321' },
  pointText: { flex: 1 },
  pointLabel: { color: '#8095B2', fontSize: 9, fontWeight: '900', letterSpacing: 1.2, marginBottom: 4 },
  pointValue: { color: '#F1F5F9', fontSize: 14, fontWeight: '800', lineHeight: 20 },
  connector: { height: 27, marginLeft: 6, justifyContent: 'center' },
  connectorLine: { height: 19, width: 1, backgroundColor: '#3B506E' },
  connectorArrow: { position: 'absolute', left: -6, bottom: -2, color: '#8EA4C0', fontSize: 12 },
  metrics: { flexDirection: 'row', gap: 10, marginHorizontal: 20, marginTop: 12 },
  metric: { flex: 1, backgroundColor: '#101F38', borderRadius: 15, borderWidth: 1, borderColor: '#283B57', padding: 13 },
  feeMetric: { borderColor: '#51432C', backgroundColor: '#191F31' },
  metricLabel: { color: '#8195B1', fontSize: 9, fontWeight: '900', letterSpacing: 0.7 },
  metricValue: { color: '#F1F5F9', fontSize: 20, fontWeight: '900', marginTop: 6 },
  feeValue: { color: '#F5B942', fontSize: 17, fontWeight: '900', marginTop: 6 },
  actions: { flexDirection: 'row', gap: 10, marginHorizontal: 20, marginTop: 20 },
  cancelButton: { flex: 0.8, minHeight: 50, borderRadius: 14, backgroundColor: '#14243D', borderWidth: 1, borderColor: '#354963', alignItems: 'center', justifyContent: 'center' },
  cancelText: { color: '#C1CDDD', fontSize: 14, fontWeight: '800' },
  confirmButton: { flex: 1.3, minHeight: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  confirmText: { color: '#07162D', fontSize: 14, fontWeight: '900' },
  disabled: { opacity: 0.6 },
  footer: { color: '#7085A1', fontSize: 8, fontWeight: '900', letterSpacing: 1.2, textAlign: 'center', marginTop: 19 },
});
