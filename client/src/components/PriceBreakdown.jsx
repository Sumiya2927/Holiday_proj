import { ShieldCheck, Sparkles, Tag } from 'lucide-react';
import { money } from '../utils/format';

export default function PriceBreakdown({ pricing, onTrimExperiences, trimming = false, children }) {
  if (!pricing) return null;
  const difference = (pricing.budget || 0) - (pricing.total || 0);
  const attractionsCost = pricing.attractions ?? pricing.breakdown?.attractions ?? 0;

  const lines = [
    ['flights', 'Flights'],
    ['hotels', 'Stays'],
    ['transfers', 'Transfers'],
    ['attractions', 'Experiences'],
  ];

  return (
    <aside className="card price-summary">
      <p className="eyebrow">Every detail, together</p>
      <h2>Your holiday summary</h2>
      <div className="price-lines">
        {lines.map(([key, label]) => {
          const val = pricing[key] ?? pricing.breakdown?.[key];
          return (
            <div key={key}>
              <span>{label}</span>
              <span>{money(val)}</span>
            </div>
          );
        })}
      </div>
      <div className="price-total">
        <span>Total holiday price</span>
        <strong>{money(pricing.total)}</strong>
        <small>For all travellers · All components included</small>
        {pricing.per_traveler && (
          <small style={{ display: 'block', color: 'var(--teal)', fontWeight: '600', marginTop: '4px', fontSize: '13px' }}>
            {money(pricing.per_traveler)} per person
          </small>
        )}
      </div>
      <div className={`budget-status ${difference < 0 ? 'over' : ''}`}>
        <div>
          <span>Your budget</span>
          <span>{money(pricing.budget)}</span>
        </div>
        <div>
          <strong>{difference < 0 ? 'Over budget' : 'Budget remaining'}</strong>
          <strong>{money(Math.abs(difference))}</strong>
        </div>
      </div>

      {difference < 0 && (
        <div
          className="budget-recovery-card"
          style={{
            marginTop: '12px',
            padding: '12px 14px',
            borderRadius: '10px',
            background: '#fffbeb',
            border: '1px solid #fde68a',
            fontSize: '12px',
            color: '#78350f',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '700', color: '#92400e' }}>
            <Sparkles size={14} /> Smart Budget Tip
          </div>

          {attractionsCost > 0 ? (
            <>
              <p style={{ margin: 0, lineHeight: 1.45 }}>
                Optional experiences total <strong>{money(attractionsCost)}</strong>. Removing them reduces your package cost immediately.
              </p>
              {onTrimExperiences && (
                <button
                  type="button"
                  onClick={onTrimExperiences}
                  disabled={trimming}
                  style={{
                    background: '#d97706',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '8px 12px',
                    fontSize: '12px',
                    fontWeight: '600',
                    cursor: trimming ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    transition: 'opacity 0.2s',
                    opacity: trimming ? 0.7 : 1,
                  }}
                >
                  <Tag size={13} />
                  {trimming ? 'Updating package...' : `Remove Experiences (Save ${money(attractionsCost)})`}
                </button>
              )}
            </>
          ) : (
            <p style={{ margin: 0, lineHeight: 1.45 }}>
              All optional activities are already excluded. To fit your budget, try reducing 1 night or adjusting your travel dates in <strong>/plan</strong>.
            </p>
          )}

          <div style={{ borderTop: '1px solid #fef3c7', paddingTop: '6px', fontSize: '11px', color: '#b45309' }}>
            💡 <em>Tip: You can still click &ldquo;Review Package&rdquo; if you wish to confirm at this price.</em>
          </div>
        </div>
      )}

      {children}
      <p className="summary-note">
        <ShieldCheck size={16} /> One complete, thoughtfully planned trip.
      </p>
    </aside>
  );
}
