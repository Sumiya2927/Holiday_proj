import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowRight, CalendarDays, Users, AlertTriangle, Route } from 'lucide-react';
import { api } from '../api/http';
import usePackage from '../hooks/usePackage';
import { LoadingSkeleton, ErrorState, Button, ExportButton } from '../components/UI';
import CityRouteSummary from '../components/CityRouteSummary';
import ItineraryTimeline from '../components/ItineraryTimeline';
import PriceBreakdown from '../components/PriceBreakdown';
import FlightCard from '../components/FlightCard';
import HotelCard from '../components/HotelCard';
import TransferCard from '../components/TransferCard';
import AttractionCard from '../components/AttractionCard';
import CustomizePage from './CustomizePage';
import { date, travelers } from '../utils/format';

export function PackageSections({ pkg: p, onEdit, timeline = true }) {
  return (
    <div className="stack sections">
      {timeline && (
        <section>
          <div className="section-title">
            <h2>Your journey, day by day</h2>
            <span className="muted">Destination local times</span>
          </div>
          <ItineraryTimeline days={p.itinerary} />
        </section>
      )}

      <section>
        <h2>Your flights</h2>
        <div className="stack">
          {p.flights.map(f => (
            <FlightCard
              key={f.flight_id}
              flight={f}
              onChange={onEdit ? () => onEdit({ type: 'flight', leg: f.leg }) : undefined}
            />
          ))}
        </div>
      </section>

      <section>
        <h2>Places to call home</h2>
        <div className="stack">
          {p.hotels.map(h => (
            <HotelCard
              key={h.city || h.hotel_id}
              hotel={h}
              onChange={onEdit ? () => onEdit({ type: 'hotel', city: h.city }) : undefined}
            />
          ))}
        </div>
      </section>

      <section>
        <h2>Getting from here to there</h2>
        <div className="stack">
          {p.transfers.map(t => (
            <TransferCard key={t.id} transfer={t} />
          ))}
        </div>
      </section>

      <section>
        <div className="section-title">
          <h2>A little more to discover</h2>
          {onEdit && (
            <Button secondary onClick={() => onEdit({ type: 'attraction' })}>
              Edit Attractions
            </Button>
          )}
        </div>
        <div className="attraction-grid">
          {p.attractions.map(a => (
            <AttractionCard key={a.attraction_id} attraction={a} />
          ))}
        </div>
        {!p.attractions.length && (
          <p className="muted">No experiences included. Leave some room to explore, or add an attraction.</p>
        )}
      </section>
    </div>
  );
}

export function TripOverview({ pkg: p, onEditRoute }) {
  return (
    <div className="trip-overview">
      <p className="eyebrow">Your next great adventure</p>
      <h1>{p.country_name}, your way.</h1>
      <div className="trip-meta">
        <span>
          <CalendarDays size={16} />
          {date(p.request.start_date)} – {date(p.return_date)}
        </span>
        <span>{p.request.nights} nights</span>
        <span>
          <Users size={16} />
          {travelers(p.request)}
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap', marginTop: '16px' }}>
        <CityRouteSummary cities={p.city_plan} />
        {onEditRoute && (
          <button
            type="button"
            className="btn-secondary"
            style={{ minHeight: '32px', padding: '6px 12px', fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            onClick={onEditRoute}
          >
            <Route size={14} /> Change Cities
          </button>
        )}
      </div>
    </div>
  );
}

export default function PackagePage() {
  const { id } = useParams();
  const resource = usePackage(id);
  const [selection, setSelection] = useState(null);
  const [toast, setToast] = useState('');
  const [warnings, setWarnings] = useState([]);
  const [trimmingExperiences, setTrimmingExperiences] = useState(false);
  const p = resource.data;

  const handleTrimExperiences = async () => {
    if (!p?.id || trimmingExperiences) return;
    setTrimmingExperiences(true);
    try {
      const payload = {
        type: 'attraction',
        action: 'replace_all',
        attraction_ids: [],
      };
      const updated = await api.modify(p.id, payload);
      resource.setData(updated);
      setToast('Optional experiences removed! Your package total and budget have refreshed.');
    } catch (err) {
      alert(err.message || 'Failed to update experiences');
    } finally {
      setTrimmingExperiences(false);
    }
  };

  return (
    <div className="container page">
      {resource.loading ? (
        <LoadingSkeleton />
      ) : resource.error ? (
        <ErrorState error={resource.error} retry={resource.retry} />
      ) : (
        <>
          <Link to={`/packages?id=${encodeURIComponent(id)}`} className="text-link">
            ← Your holiday package
          </Link>

          <TripOverview
            pkg={p}
            onEditRoute={p.status === 'BOOKED' ? undefined : () => setSelection({ type: 'city_plan' })}
          />

          {/* Success / Warning Alerts */}
          {toast && (
            <div className="toast" role="status">
              <span>{toast}</span>
              <button className="text-button" onClick={() => setToast('')}>
                Dismiss
              </button>
            </div>
          )}

          {/* Good-to-Have G1: Cascading change warnings */}
          {warnings.length > 0 && (
            <div
              style={{
                background: '#fffbeb',
                border: '1px solid #fde68a',
                color: '#92400e',
                borderRadius: '10px',
                padding: '14px 18px',
                marginBottom: '20px',
                display: 'flex',
                gap: '12px',
                alignItems: 'flex-start',
              }}
            >
              <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <strong style={{ display: 'block', fontSize: '12px', marginBottom: '4px' }}>
                  Schedule Update Notice
                </strong>
                {warnings.map((w, idx) => (
                  <p key={idx} style={{ fontSize: '12px', margin: '2px 0' }}>
                    {w}
                  </p>
                ))}
              </div>
              <button
                className="text-button"
                style={{ marginLeft: 'auto', color: '#92400e' }}
                onClick={() => setWarnings([])}
              >
                Dismiss
              </button>
            </div>
          )}

          <div className="package-layout">
            <PackageSections pkg={p} onEdit={p.status === 'BOOKED' ? undefined : setSelection} />
            <div className="sidebar">
              <PriceBreakdown
                pricing={p.pricing}
                onTrimExperiences={p.status === 'BOOKED' ? undefined : handleTrimExperiences}
                trimming={trimmingExperiences}
              >
                {p.status === 'BOOKED' ? (
                  <Link className="btn full" to={`/booking/${p.booking.reference}`}>
                    View reservation
                  </Link>
                ) : (
                  <Link className="btn full" to={`/review/${encodeURIComponent(id)}`}>
                    Review Package <ArrowRight size={16} />
                  </Link>
                )}
                <ExportButton id={id} />
              </PriceBreakdown>
            </div>
          </div>

          {selection && (
            <CustomizePage
              pkg={p}
              selection={selection}
              onClose={() => setSelection(null)}
              onUpdated={updated => {
                resource.setData(updated);
                setSelection(null);
                setToast('Your holiday has been updated. All details and prices are refreshed.');
                if (updated.warnings?.length) {
                  setWarnings(updated.warnings);
                }
              }}
            />
          )}
        </>
      )}
    </div>
  );
}
