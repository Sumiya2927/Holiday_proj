import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowRight, Plane, BedDouble, Bus, Sparkles, CalendarDays, Users, Zap, Award, Tag } from 'lucide-react';
import usePackage from '../hooks/usePackage';
import { PageHeader, LoadingSkeleton, ErrorState, EmptyState, Photo } from '../components/UI';
import { date, money, travelers } from '../utils/format';
import CityRouteSummary from '../components/CityRouteSummary';
import { photos } from './HomePage';

export default function PackagesPage() {
  const [params] = useSearchParams();
  const id = params.get('id');
  return id ? (
    <Results id={id} />
  ) : (
    <div className="container page">
      <EmptyState title="Your next holiday starts here">
        Share your preferences to discover a complete holiday package.
      </EmptyState>
    </div>
  );
}

function Results({ id }) {
  const { data: p, loading, error, retry } = usePackage(id);
  const [activePackageIndex, setActivePackageIndex] = useState(0);

  if (loading) {
    return (
      <div className="container page">
        <PageHeader eyebrow="The pieces have come together" title="Your holiday is ready">
          A complete escape, built around your preferences.
        </PageHeader>
        <LoadingSkeleton />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container page">
        <ErrorState error={error} retry={retry} />
      </div>
    );
  }

  const packageList = p?.packages && p.packages.length > 0 ? p.packages : [p];
  const activePkg = packageList[activePackageIndex] || p;

  return (
    <div className="container page">
      <PageHeader eyebrow="The pieces have come together" title="Your holiday is ready">
        A complete escape, built around your preferences.
      </PageHeader>

      {/* Good-to-Have G4: Three Package Options Selector */}
      {packageList.length > 1 && (
        <div style={{ marginBottom: '24px' }}>
          <p style={{ fontSize: '12px', fontWeight: '600', color: 'var(--muted)', marginBottom: '10px' }}>
            Choose from curated package variations:
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
            {packageList.map((item, idx) => {
              const isSelected = idx === activePackageIndex;
              const Icon = idx === 1 ? Zap : idx === 2 ? Award : Tag;
              return (
                <button
                  key={item.id || idx}
                  type="button"
                  onClick={() => setActivePackageIndex(idx)}
                  className={`card ${isSelected ? 'selected-package-tab' : ''}`}
                  style={{
                    padding: '16px',
                    textAlign: 'left',
                    cursor: 'pointer',
                    borderColor: isSelected ? 'var(--teal)' : 'var(--border)',
                    boxShadow: isSelected ? '0 0 0 2px var(--teal)' : 'none',
                    background: isSelected ? '#f2f9f9' : 'white',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: '700',
                        color: isSelected ? 'var(--teal)' : 'var(--navy)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      <Icon size={14} /> {item.badge || `Option ${idx + 1}`}
                    </span>
                    <strong style={{ fontSize: '15px' }}>{money(item.pricing?.total)}</strong>
                  </div>
                  <span style={{ fontSize: '11px', color: 'var(--muted)' }}>
                    {item.description || `${item.request?.nights} nights in ${item.country_name}`}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <article className="card result-card">
        <Photo
          src={activePkg.country === 'JP' ? photos.japan : photos.uae}
          alt={activePkg.country_name}
          className="result-photo"
        />
        <div className="result-content">
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            <span className="pill">
              {activePkg.badge ? `${activePkg.badge} Package` : 'Your personalized holiday'}
            </span>
            {activePkg.pricing?.budget >= activePkg.pricing?.total && (
              <span className="pill" style={{ background: '#e8f7ee', color: '#16a34a' }}>
                ✓ Within Budget
              </span>
            )}
          </div>
          <h2>{activePkg.country_name}</h2>
          <CityRouteSummary cities={activePkg.city_plan} />
          <p className="inline muted">
            <CalendarDays size={16} />
            {date(activePkg.request.start_date)} · {activePkg.request.nights} nights
          </p>
          <p className="inline muted">
            <Users size={16} />
            {travelers(activePkg.request)}
          </p>
          <div className="included-row">
            {[
              [Plane, 'Flights'],
              [BedDouble, 'Stays'],
              [Bus, 'Transfers'],
              [Sparkles, 'Experiences'],
            ].map(([Icon, label]) => (
              <span key={label}>
                <Icon size={15} />
                {label}
              </span>
            ))}
          </div>
          <div className="result-price">
            <div>
              <small>Your complete holiday</small>
              <strong>{money(activePkg.pricing.total)}</strong>
              <small>
                Budget {money(activePkg.pricing.budget)} ·{' '}
                {money(Math.abs(activePkg.pricing.budget - activePkg.pricing.total))}{' '}
                {activePkg.pricing.budget >= activePkg.pricing.total ? 'remaining' : 'over budget'}
              </small>
            </div>
            <Link className="btn" to={`/packages/${encodeURIComponent(activePkg.id)}`}>
              View Package Details <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </article>

      <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'space-between' }}>
        <Link to="/plan" className="text-link">
          ← Edit requirements and plan again
        </Link>
      </div>
    </div>
  );
}
