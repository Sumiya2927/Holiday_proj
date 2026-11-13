import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Check, Copy, ArrowRight } from 'lucide-react';
import { api } from '../api/http';
import { useResource } from '../hooks/usePackage';
import { LoadingSkeleton, ErrorState, Button, ExportButton } from '../components/UI';
import { TripOverview, PackageSections } from './PackagePage';
import PriceBreakdown from '../components/PriceBreakdown';
import { date, money, travelers } from '../utils/format';

export default function BookingPage() {
  const { reference } = useParams();
  return /^\d{10}$/.test(reference) ? (
    <Reservation reference={reference} />
  ) : (
    <div className="container page">
      <ErrorState error={{ message: 'Enter a reservation reference containing exactly 10 digits.' }} />
      <Link className="btn" to="/find-booking">Find your booking</Link>
    </div>
  );
}

function Reservation({ reference }) {
  const resource = useResource(signal => api.reservation(reference, signal), [reference]);
  const [show, setShow] = useState(false);
  const [copied, setCopied] = useState('');
  const raw = resource.data;
  const p = raw?.package || raw;

  const returnedRef = p?.booking?.reference || p?.reference || raw?.reference || raw?.booking?.reference;
  const isBooked = p?.status === 'BOOKED' || raw?.status === 'BOOKED';
  const validReference = returnedRef && String(returnedRef).trim() === String(reference).trim();

  return (
    <div className="container page">
      {resource.loading ? (
        <LoadingSkeleton />
      ) : resource.error ? (
        <>
          <ErrorState
            title="Reservation not found"
            error={
              resource.error.status === 404
                ? { ...resource.error, message: 'Reservation not found. Check your reference and try again.' }
                : resource.error
            }
            retry={resource.retry}
          />
          <Link className="text-link" to="/find-booking">Try another reference →</Link>
        </>
      ) : !isBooked || !validReference ? (
        <ErrorState error={{ message: 'The service did not return a confirmed reservation for this reference.' }} />
      ) : (
        <>
          <section className="card booking-success">
            <span className="success-icon"><Check size={36} /></span>
            <p className="eyebrow">Let the countdown begin</p>
            <h1>Holiday confirmed!</h1>
            <p className="muted">Your next adventure is all in one place. Keep this reference handy.</p>
            <div className="reference-box">
              <span>YOUR RESERVATION REFERENCE</span>
              <strong>{reference}</strong>
              <button
                className="text-button"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(reference);
                    setCopied('Reference copied.');
                  } catch {
                    setCopied('Copy unavailable. Select the reference above to copy it.');
                  }
                }}
              >
                <Copy size={15} /> Copy reference
              </button>
              <small role="status">{copied}</small>
            </div>
            <span className="pill booked">● BOOKED</span>
            <h2>{p.country_name}</h2>
            <p>
              {date(p.request?.start_date)} – {date(p.return_date)} · {p.request ? travelers(p.request) : ''}
            </p>
            <p className="booking-total">
              {money(p.pricing?.total)} <small>total holiday price</small>
            </p>
            <div className="booking-actions">
              <Button onClick={() => setShow(!show)}>
                {show ? 'Hide full reservation' : 'View Full Reservation'}
                <ArrowRight size={16} />
              </Button>
              <ExportButton id={p.id} />
            </div>
            <small className="muted">An in-app reservation. No external travel purchase has been made.</small>
          </section>

          {show && (
            <section className="reservation-details">
              <TripOverview pkg={p} />
              <div className="package-layout">
                <PackageSections pkg={p} />
                <div className="sidebar">
                  <PriceBreakdown pricing={p.pricing} />
                </div>
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
