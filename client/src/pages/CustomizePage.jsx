import { useState, useMemo } from 'react';
import { api } from '../api/http';
import { useResource } from '../hooks/usePackage';
import { Modal, Button, ErrorState, LoadingSkeleton, Photo } from '../components/UI';
import AlternativeSelector from '../components/AlternativeSelector';
import { money } from '../utils/format';

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
  const [activeCityFilter, setActiveCityFilter] = useState('All');

  // Available cities for attractions
  const availableCities = useMemo(() => {
    const list = alternatives.data?.options || [];
    const set = new Set(list.map(a => a.city).filter(Boolean));
    return ['All', ...Array.from(set)];
  }, [alternatives.data]);

  // Filtered options based on city tab
  const displayedOptions = useMemo(() => {
    const list = alternatives.data?.options || [];
    if (type !== 'attraction' || activeCityFilter === 'All') return list;
    return list.filter(a => a.city === activeCityFilter);
  }, [alternatives.data, activeCityFilter, type]);

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
      setError(e.message || 'Failed to update selection');
    } finally {
      setBusy(false);
    }
  }

  const modalTitle =
    type === 'flight'
      ? 'Choose Another Flight'
      : type === 'hotel'
      ? `Choose Stays in ${city || pkg.city_plan?.[0]?.city || 'Destination'}`
      : type === 'city_plan'
      ? 'Choose Another City Route'
      : 'Customize Your Experiences';

  return (
    <Modal title={modalTitle} onClose={() => !busy && onClose()} maxWidth="880px">
      <p className="muted" style={{ marginBottom: '16px' }}>
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
          {/* Current included attractions */}
          {type === 'attraction' && (
            <div style={{ marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <strong style={{ fontSize: '13px', color: 'var(--navy)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Current Itinerary Experiences ({pkg.attractions.length})
                </strong>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {pkg.attractions.map(a => (
                  <div
                    className="card included-attraction"
                    key={a.attraction_id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '10px 14px',
                      background: '#f8fafc',
                      borderRadius: '10px',
                    }}
                  >
                    <Photo
                      src={a.image}
                      alt={a.name}
                      style={{ width: '48px', height: '48px', borderRadius: '8px', objectFit: 'cover' }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <strong style={{ display: 'block', fontSize: '14px', color: 'var(--navy)' }}>
                        {a.name}
                      </strong>
                      <small style={{ color: 'var(--muted)', fontSize: '11px' }}>
                        {a.city} · Included · {a.visit_minutes || 90} mins
                      </small>
                    </div>
                    {a.total != null && (
                      <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--navy)', marginRight: '8px' }}>
                        {money(a.total)}
                      </span>
                    )}
                    <Button secondary busy={busy} onClick={() => apply(a, 'remove')}>
                      Remove
                    </Button>
                  </div>
                ))}
                {!pkg.attractions.length && (
                  <p className="muted" style={{ fontSize: '13px', fontStyle: 'italic', padding: '6px 0' }}>
                    No experiences currently in your itinerary. Choose from below to add.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* City filter tabs for attractions */}
          {type === 'attraction' && availableCities.length > 2 && (
            <div className="filter-chip-row" style={{ margin: '8px 0 14px' }}>
              {availableCities.map(cityName => (
                <button
                  key={cityName}
                  type="button"
                  className={`filter-chip ${activeCityFilter === cityName ? 'active' : ''}`}
                  onClick={() => setActiveCityFilter(cityName)}
                >
                  {cityName}
                </button>
              ))}
            </div>
          )}

          {displayedOptions.length === 0 && (
            <p className="notice">There are no eligible alternatives available for this selection.</p>
          )}

          {/* List of alternatives with Radio, Photo, and Details */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {displayedOptions
              .filter(o => type !== 'attraction' || !pkg.attractions.some(a => a.attraction_id === o.attraction_id))
              .map(o => (
                <AlternativeSelector
                  key={o.id || o.room_id || o.attraction_id}
                  option={o}
                  type={type}
                  selected={chosen?.id === o.id || chosen?.room_id === o.room_id || chosen?.attraction_id === o.attraction_id}
                  onSelect={() => setChosen(o)}
                />
              ))}
          </div>
        </div>
      )}

      {error && (
        <p className="notice error" role="alert" style={{ marginTop: '16px' }}>
          {error}
        </p>
      )}

      <div className="modal-actions" style={{ marginTop: '20px' }}>
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
