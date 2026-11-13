import { useState } from 'react';
import { api } from '../api/http';
import { useResource } from '../hooks/usePackage';
import { Modal, Button, ErrorState, LoadingSkeleton } from '../components/UI';
import AlternativeSelector from '../components/AlternativeSelector';

export default function CustomizePage({ pkg, selection, onClose, onUpdated }) {
  const { type, city, leg } = selection;
  const alternatives = useResource(
    signal =>
      api.alternatives(
        pkg.id,
        { type, ...(city ? { city } : {}), ...(leg ? { leg } : {}) },
        signal
      ),
    [pkg.id, type, city, leg]
  );
  const [chosen, setChosen] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function apply(option, action) {
    setBusy(true);
    setError('');
    try {
      const payload = {
        type,
        ...(city ? { city } : {}),
        ...(leg ? { leg } : {}),
        ...(type === 'city_plan' && option.plan ? { plan: option.plan } : {}),
        selection:
          option.selection ||
          (option.plan ? { plan: option.plan } : { attraction_id: option.attraction_id }),
        ...(action ? { action } : {}),
      };
      const updated = await api.modify(pkg.id, payload);
      onUpdated(updated);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  const modalTitle =
    type === 'flight'
      ? 'Choose another flight'
      : type === 'hotel'
      ? 'Choose another stay'
      : type === 'city_plan'
      ? 'Choose another city route'
      : 'Customize your experiences';

  return (
    <Modal title={modalTitle} onClose={() => !busy && onClose()}>
      <p className="muted">
        {type === 'attraction'
          ? 'Add a new discovery or make more room in your day.'
          : type === 'city_plan'
          ? 'Select an alternative city plan for your trip. Your whole package will be recalculated.'
          : 'Select an available alternative for your journey.'}{' '}
        Your whole package is checked before a change is saved.
      </p>

      {alternatives.loading ? (
        <LoadingSkeleton />
      ) : alternatives.error ? (
        <ErrorState error={alternatives.error} retry={alternatives.retry} />
      ) : (
        <div className="stack">
          {type === 'attraction' &&
            pkg.attractions.map(a => (
              <div className="card included-attraction" key={a.attraction_id}>
                <div>
                  <strong>{a.name}</strong>
                  <small>{a.city} · Included</small>
                </div>
                <Button secondary busy={busy} onClick={() => apply(a, 'remove')}>
                  Remove
                </Button>
              </div>
            ))}

          {alternatives.data.options.length === 0 && (
            <p className="notice">There are no eligible alternatives available for this selection.</p>
          )}

          {alternatives.data.options
            .filter(o => type !== 'attraction' || !pkg.attractions.some(a => a.attraction_id === o.attraction_id))
            .map(o => (
              <AlternativeSelector
                key={o.id}
                option={o}
                type={type}
                selected={chosen?.id === o.id}
                onSelect={() => setChosen(o)}
              />
            ))}
        </div>
      )}

      {error && (
        <p className="notice error" role="alert">
          {error}
        </p>
      )}

      <div className="drawer-actions">
        <Button secondary disabled={busy} onClick={onClose}>
          Cancel
        </Button>
        <Button
          disabled={!chosen || chosen.current}
          busy={busy}
          onClick={() => apply(chosen, type === 'attraction' ? 'add' : undefined)}
        >
          {type === 'attraction' ? 'Add experience' : 'Apply change'}
        </Button>
      </div>
    </Modal>
  );
}
