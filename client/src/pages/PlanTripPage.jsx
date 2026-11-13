import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../api/http';
import { useResource } from '../hooks/usePackage';
import { PageHeader, Button } from '../components/UI';
import TripRequestForm from '../components/TripRequestForm';
import { money } from '../utils/format';

const DEFAULT_OPTIONS = {
  departure_cities: [
    { airport: 'BLR', city: 'Bengaluru' },
    { airport: 'DEL', city: 'Delhi' },
    { airport: 'BOM', city: 'Mumbai' },
    { airport: 'MAA', city: 'Chennai' }
  ],
  countries: [
    { code: 'JP', name: 'Japan' },
    { code: 'AE', name: 'United Arab Emirates' }
  ]
};

export default function PlanTripPage() {
  const options = useResource(signal => api.options(signal), []);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const [params] = useSearchParams();

  async function submit(values) {
    setBusy(true);
    setError(null);
    try {
      const pkg = await api.generate(values);
      if (!pkg.id) throw new Error('The holiday service did not return a package ID.');
      navigate(`/packages?id=${encodeURIComponent(pkg.id)}`);
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }

  const effectiveOptions = options.data?.departure_cities?.length ? options.data : DEFAULT_OPTIONS;

  return (
    <div className="container page narrow">
      <div className="progress-trail">
        <span className="active">01 Your preferences</span>
        <i />
        <span>02 Your holiday</span>
        <i />
        <span>03 Make it yours</span>
      </div>

      <PageHeader eyebrow="A little inspiration starts here" title="Plan your perfect holiday">
        Share a few details. We'll bring your next adventure together.
      </PageHeader>

      {options.error && (
        <div className="notice" role="status">
          <h3>Connecting to holiday service</h3>
          <p>Using offline catalog options while the connection is established.</p>
          <Button secondary onClick={options.retry}>Retry Connection</Button>
        </div>
      )}

      <TripRequestForm
        options={effectiveOptions}
        country={params.get('country')}
        onSubmit={submit}
        busy={busy}
        unavailable={false}
      />

      {busy && (
        <div className="generation-status" role="status" style={{ marginTop: '20px' }}>
          Finding flights, stays and experiences that fit your request…
        </div>
      )}

      {error && (
        <div className="notice error" role="alert" style={{ marginTop: '20px' }}>
          <h3>
            {error.code === 'OVER_BUDGET'
              ? 'Your budget needs a little more room'
              : error.code === 'NO_VALID_PACKAGE'
                ? 'No valid package for these preferences'
                : error.code === 'SEARCH_INCOMPLETE'
                  ? 'The search could not be completed'
                  : 'We couldn’t build your holiday yet'}
          </h3>
          <p>{error.message}</p>
          {error.details?.lowest_valid_total != null && (
            <p>
              Lowest valid total: <strong>{money(error.details.lowest_valid_total)}</strong>
              {error.details.budget != null && (
                <> · Over budget by {money(error.details.lowest_valid_total - error.details.budget)}</>
              )}
            </p>
          )}
          {error.details?.suggestions?.map(s => (
            <p key={s}>{s}</p>
          ))}
          <p>You can edit your requirements above and try again.</p>
        </div>
      )}
    </div>
  );
}
