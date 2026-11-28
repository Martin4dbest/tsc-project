const fs = require('fs');

const file = 'apps/mobile/src/app/journeys.tsx';
let s = fs.readFileSync(file, 'utf8');

const start = s.indexOf('  const changeStatus = async (journey: Journey, status: JourneyStatus) => {');
const end = s.indexOf('  const openDetails =', start);
const stateMark = '  const [form, setForm] = useState(emptyForm);';
const screenEnd = s.lastIndexOf('    </SafeAreaView>');

if (start < 0 || end < 0 || screenEnd < 0 || !s.includes(stateMark)) {
  console.error('ABORTED: source markers missing; file unchanged.');
  process.exit(1);
}
if (s.includes('scheduleConfirmation')) {
  console.error('ABORTED: schedule popup state already exists.');
  process.exit(1);
}

const backup = file + '.popup-backup';
fs.copyFileSync(file, backup);

const state = `
  const [scheduleConfirmation, setScheduleConfirmation] = useState<{
    journey: Journey; quoteId: string; fee: number;
    distance: number | null; origin: string; destination: string;
  } | null>(null);
`;

const fn = `  const changeStatus = async (journey: Journey, status: JourneyStatus) => {
    const messages: Record<string, string> = {
      scheduled: 'Schedule this journey?',
      active: 'Start this journey now?',
      completed: 'Mark this journey as completed?',
      cancelled: 'Cancel this journey?',
    };
    const API = 'https://www.tscglobalmobility.com';

    if (status === 'scheduled') {
      setSaving(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) { router.replace('/login'); return; }

        const origin = journey.origin_address?.trim() || journey.origin_name.trim();
        const destination = journey.destination_address?.trim() || journey.destination_name.trim();

        const response = await fetch(API + '/api/journeys/route-quote', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + session.access_token },
          body: JSON.stringify({ origin, destination }),
        });
        const quote = await response.json();
        if (!response.ok || !quote.verified || !quote.quoteId)
          throw new Error(quote.error || 'Unable to verify route.');

        const fee = quote.fee_ngn ?? quote.feeNgn ?? quote.amount_ngn ?? quote.amount ?? 0;
        const distance = quote.distance_km ?? quote.distanceKm ?? quote.distance ?? null;
        setScheduleConfirmation({ journey, quoteId: quote.quoteId, fee: Number(fee), distance: distance == null ? null : Number(distance), origin, destination });
      } catch (e) {
        Alert.alert('Unable to schedule', e.message || 'Route verification failed.');
      } finally { setSaving(false); }
      return;
    }

    Alert.alert('Confirm action', messages[status] || 'Update this journey?', [
      { text: 'Go back', style: 'cancel' },
      { text: 'Confirm', style: status === 'cancelled' ? 'destructive' : 'default',
        onPress: async () => {
          setSaving(true);
          try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) { router.replace('/login'); return; }
            const { error } = await supabase.from('journeys').update({ status })
              .eq('id', journey.id).eq('traveller_id', session.user.id);
            if (error) throw error;
            setModal(null); setSelected(null); await loadJourneys(true);
            Alert.alert('Journey updated', 'Journey is now ' + STATUS_META[status].label.toLowerCase() + '.');
          } catch (e) {
            Alert.alert('Action unsuccessful', e.message || 'Status update failed.');
          } finally { setSaving(false); }
        }
      }
    ]);
  };

  const confirmScheduleJourney = async () => {
    if (!scheduleConfirmation) return;
    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setScheduleConfirmation(null); router.replace('/login'); return; }
      const response = await fetch('https://www.tscglobalmobility.com/api/journeys/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + session.access_token },
        body: JSON.stringify({ journeyId: scheduleConfirmation.journey.id, quoteId: scheduleConfirmation.quoteId }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || 'Scheduling failed.');
      const { origin, destination, fee } = scheduleConfirmation;
      setScheduleConfirmation(null); setModal(null); setSelected(null);
      await loadJourneys(true);
      Alert.alert('Journey scheduled!', origin + ' → ' + destination + '\\nFee: ₦' + Number(fee).toLocaleString());
    } catch (e) {
      Alert.alert('Action unsuccessful', e.message || 'Scheduling failed.');
    } finally { setSaving(false); }
  };
`;

const popup = \`
      <JourneyActionPopup
        visible={!!scheduleConfirmation}
        title="Confirm journey schedule"
        message="Review your route and scheduling fee before confirming."
        origin={scheduleConfirmation?.origin}
        destination={scheduleConfirmation?.destination}
        fee={scheduleConfirmation?.fee}
        distance={scheduleConfirmation?.distance}
        actionLabel="Schedule Journey"
        actionType="schedule"
        loading={saving}
        onCancel={() => setScheduleConfirmation(null)}
        onConfirm={confirmScheduleJourney}
      />
\`;

s = s.replace(stateMark, stateMark + state);
s = s.slice(0, start) + fn + s.slice(end);
const closing = s.lastIndexOf('    </SafeAreaView>');
s = s.slice(0, closing) + popup + s.slice(closing);

fs.writeFileSync(file, s);
console.log('Popup integration written. Backup saved:', backup);
