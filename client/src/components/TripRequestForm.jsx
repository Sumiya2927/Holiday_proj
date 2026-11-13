import { useState } from 'react';
import {
  ArrowRight,
  Info,
  Minus,
  Plus,
  RotateCcw,
  CheckCircle2,
  Check,
  Plane,
  Calendar,
  Users,
  Coins,
  Smile,
  Compass,
  ChevronDown,
} from 'lucide-react';
import { Button } from './UI';
import ValidationMessage from './ValidationMessage';
import { money, validateRequest } from '../utils/format';

const initial = {
  departure_airport: 'BLR',
  country: 'JP',
  start_date: '2027-04-10',
  nights: 6,
  adults: 2,
  children_ages: [6],
  budget: '350000',
};

// Official departure cities from hackathon catalog
const CATALOG_DEPARTURES = [
  { airport: 'BLR', city: 'Bengaluru', label: 'Kempegowda Intl', code: 'BLR' },
  { airport: 'DEL', city: 'Delhi', label: 'Indira Gandhi Intl', code: 'DEL' },
  { airport: 'BOM', city: 'Mumbai', label: 'Chhatrapati Shivaji Intl', code: 'BOM' },
  { airport: 'MAA', city: 'Chennai', label: 'Chennai Intl', code: 'MAA' },
];

// Official destination countries from hackathon catalog
const CATALOG_COUNTRIES = [
  {
    code: 'JP',
    name: 'Japan',
    flag: '🇯🇵',
    cities: 'Tokyo · Kyoto · Osaka',
    highlights: 'Culture, scenic rail & historic heritage',
  },
  {
    code: 'AE',
    name: 'United Arab Emirates',
    flag: '🇦🇪',
    cities: 'Dubai · Abu Dhabi',
    highlights: 'Modern skylines, desert adventures & coastlines',
  },
];

const QUICK_BUDGET_PRESETS = [
  { amount: 250000, label: '₹2.5L', tag: 'Economy' },
  { amount: 350000, label: '₹3.5L', tag: 'Standard' },
  { amount: 450000, label: '₹4.5L', tag: 'Comfort' },
  { amount: 600000, label: '₹6.0L', tag: 'Luxury' },
];

const QUICK_DATE_PRESETS = [
  { date: '2027-04-10', label: '10 Apr' },
  { date: '2027-04-01', label: '1 Apr (Earliest)' },
  { date: '2027-04-05', label: '5 Apr' },
  { date: '2027-04-12', label: '12 Apr' },
  { date: '2027-04-14', label: '14 Apr' },
];

export function restoreRequest(country) {
  try {
    const saved = JSON.parse(sessionStorage.getItem('holiday-request') || '{}');
    return { ...initial, ...saved, ...(country ? { country } : {}) };
  } catch {
    return { ...initial, country: country || 'JP' };
  }
}

export function parseQuickRequest(text) {
  const result = {};
  const lower = text.toLowerCase();

  // Country
  if (lower.includes('japan') || lower.includes('tokyo') || lower.includes('kyoto') || lower.includes('osaka')) {
    result.country = 'JP';
  } else if (lower.includes('uae') || lower.includes('emirates') || lower.includes('dubai') || lower.includes('abu dhabi')) {
    result.country = 'AE';
  }

  // Departure
  if (lower.includes('bengaluru') || lower.includes('bangalore') || lower.includes('blr')) {
    result.departure_airport = 'BLR';
  } else if (lower.includes('delhi') || lower.includes('del')) {
    result.departure_airport = 'DEL';
  } else if (lower.includes('mumbai') || lower.includes('bom')) {
    result.departure_airport = 'BOM';
  } else if (lower.includes('chennai') || lower.includes('maa')) {
    result.departure_airport = 'MAA';
  }

  // Nights
  const nightsMatch = lower.match(/(\d+)\s*(?:night|nights|n)\b/i);
  if (nightsMatch) {
    const n = parseInt(nightsMatch[1], 10);
    if (n >= 3 && n <= 10) result.nights = n;
  }

  // Start Date
  const dateMatch = lower.match(/(?:(\d{1,2})\s+april|april\s+(\d{1,2})|2027-04-(\d{2}))/i);
  if (dateMatch) {
    const d = parseInt(dateMatch[1] || dateMatch[2] || dateMatch[3], 10);
    if (d >= 1 && d <= 20) {
      result.start_date = `2027-04-${String(d).padStart(2, '0')}`;
    }
  }

  // Adults
  const adultsMatch = lower.match(/(\d+)\s*(?:adult|adults)/i);
  if (adultsMatch) {
    result.adults = parseInt(adultsMatch[1], 10);
  } else if (lower.includes('two adults') || lower.includes('couple')) {
    result.adults = 2;
  } else if (lower.includes('one adult') || lower.includes('solo')) {
    result.adults = 1;
  }

  // Children & Ages
  const childrenMatch = lower.match(/(\d+)\s*(?:child|children|kid|kids)/i);
  const ageMatch = lower.match(/(?:age|aged|ages)\s*([0-9,\s]+)/i);
  if (childrenMatch) {
    const count = parseInt(childrenMatch[1], 10);
    if (ageMatch) {
      const parsedAges = ageMatch[1].split(/[\s,]+/).map(x => parseInt(x, 10)).filter(x => !isNaN(x) && x >= 0 && x <= 17);
      result.children_ages = parsedAges.slice(0, count);
      while (result.children_ages.length < count) result.children_ages.push(6);
    } else {
      result.children_ages = Array(count).fill(6);
    }
  } else if (lower.includes('child aged') || lower.includes('child age') || lower.includes('one child')) {
    const singleAge = lower.match(/child\s+(?:aged|age)\s+(\d{1,2})/i);
    result.children_ages = [singleAge ? parseInt(singleAge[1], 10) : 6];
  }

  // Budget
  const lakhMatch = lower.match(/(\d+(?:\.\d+)?)\s*(?:lakh|lakhs|l)\b/i);
  if (lakhMatch) {
    result.budget = String(Math.round(parseFloat(lakhMatch[1]) * 100000));
  } else {
    const numBudgetMatch = lower.match(/(?:₹|rs\.?|inr)?\s*(\d{1,2}(?:,\d{2})*(?:,\d{3})|\d{5,8})/i);
    if (numBudgetMatch) {
      result.budget = numBudgetMatch[1].replace(/,/g, '');
    }
  }

  return result;
}

export default function TripRequestForm({ options, country, onSubmit, busy, unavailable = false }) {
  const [form, setForm] = useState(() => restoreRequest(country));
  const [errors, setErrors] = useState({});
  const [quickText, setQuickText] = useState('');
  const [quickParsed, setQuickParsed] = useState(false);

  function update(key, value) {
    setForm(old => {
      const next = { ...old, [key]: value };
      try {
        sessionStorage.setItem('holiday-request', JSON.stringify(next));
      } catch {}
      return next;
    });
    setErrors(old => {
      const next = { ...old };
      delete next[key];
      return next;
    });
  }

  function applyQuickRequest() {
    if (!quickText.trim()) return;
    const parsed = parseQuickRequest(quickText);
    setForm(old => {
      const next = { ...old, ...parsed };
      try {
        sessionStorage.setItem('holiday-request', JSON.stringify(next));
      } catch {}
      return next;
    });
    setErrors({});
    setQuickParsed(true);
    setTimeout(() => setQuickParsed(false), 4000);
  }

  function resetForm() {
    const empty = {
      departure_airport: '',
      country: '',
      start_date: '',
      nights: 6,
      adults: 2,
      children_ages: [],
      budget: '',
    };
    setForm(empty);
    setErrors({});
    try {
      sessionStorage.removeItem('holiday-request');
    } catch {}
  }

  const submit = e => {
    e.preventDefault();
    if (unavailable || busy) return;
    const payload = {
      ...form,
      nights: Number(form.nights),
      adults: Number(form.adults),
      budget: Number(form.budget),
    };
    const problems = validateRequest(payload, options);
    setErrors(problems);
    if (!Object.keys(problems).length) {
      onSubmit({ ...payload, children_ages: payload.children_ages.map(Number) });
    }
  };

  // Progress calculation
  const filledCount = [
    Boolean(form.departure_airport),
    Boolean(form.country),
    Boolean(form.start_date),
    Boolean(form.nights),
    Boolean(form.adults),
    Boolean(form.budget),
  ].filter(Boolean).length;
  const progressPercent = Math.round((filledCount / 6) * 100);

  const availableDepartures = options?.departure_cities?.length
    ? options.departure_cities.map(c => {
        const match = CATALOG_DEPARTURES.find(d => d.airport === c.airport);
        return match || { airport: c.airport, city: c.city, label: 'Airport', code: c.airport };
      })
    : CATALOG_DEPARTURES;

  const availableCountries = options?.countries?.length
    ? options.countries.map(c => {
        const match = CATALOG_COUNTRIES.find(k => k.code === c.code);
        return match || { code: c.code, name: c.name, flag: '🌍', cities: '', highlights: '' };
      })
    : CATALOG_COUNTRIES;

  return (
    <form className="card trip-form" onSubmit={submit} noValidate style={{ overflow: 'hidden' }}>
      {/* Minimalist Progress Header */}
      <div
        style={{
          background: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: '12px',
          padding: '14px 18px',
          marginBottom: '24px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
          <span style={{ fontWeight: '600', fontSize: '13px', color: 'var(--navy)' }}>
            Holiday Configuration
          </span>
          <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--teal)' }}>
            {progressPercent}% completed
          </span>
        </div>
        <div style={{ height: '4px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
          <div
            style={{
              height: '100%',
              width: `${progressPercent}%`,
              background: 'var(--teal)',
              borderRadius: '4px',
              transition: 'width 0.3s ease',
            }}
          />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '10px' }}>
          <small style={{ color: 'var(--muted)', fontSize: '11px' }}>
            {progressPercent === 100
              ? 'All requirements configured. Ready to build your package.'
              : 'Select your preferred departure, destination and travel dates.'}
          </small>
          <button
            type="button"
            className="btn-secondary"
            style={{ minHeight: '28px', fontSize: '11px', padding: '3px 10px', borderRadius: '6px' }}
            onClick={resetForm}
            title="Reset to empty form"
          >
            <RotateCcw size={12} /> Reset
          </button>
        </div>
      </div>

      {/* Quick Request Assistant (Natural Language Rule-based) */}
      <div
        style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '10px',
          padding: '12px 16px',
          marginBottom: '24px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
          <span style={{ fontSize: '11px', fontWeight: '600', color: 'var(--teal)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Quick Request Assistant
          </span>
          {quickParsed && (
            <span style={{ fontSize: '11px', color: '#16a34a', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <CheckCircle2 size={12} /> Applied
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <input
            type="text"
            placeholder="e.g. 2 adults, 1 child aged 6 from Bengaluru to Japan for 6 nights starting 10 April with ₹3,50,000 budget"
            value={quickText}
            onChange={e => setQuickText(e.target.value)}
            style={{ minHeight: '38px', fontSize: '12px' }}
          />
          <button
            type="button"
            className="btn-secondary"
            style={{ minHeight: '38px', whiteSpace: 'nowrap', paddingInline: '14px', fontSize: '12px' }}
            onClick={applyQuickRequest}
          >
            Auto-fill
          </button>
        </div>
      </div>

      {/* SECTION 1: Destination Country Dropdown */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
          <label
            htmlFor="country"
            style={{ fontSize: '13px', fontWeight: '600', color: 'var(--navy)', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Compass size={15} style={{ color: 'var(--teal)' }} /> Destination Country
          </label>
          <span style={{ fontSize: '11px', color: 'var(--muted)' }}>Select destination</span>
        </div>

        <div className="dropdown-control-wrap">
          <select
            id="country"
            value={form.country}
            onChange={e => update('country', e.target.value)}
            className="dropdown-select-box"
            aria-invalid={!!errors.country}
            aria-describedby={errors.country ? 'country-error' : undefined}
          >
            <option value="">Select destination country...</option>
            {availableCountries.map(c => (
              <option key={c.code} value={c.code}>
                {c.flag ? `${c.flag} ` : ''}{c.name} — {c.cities}
              </option>
            ))}
          </select>
          <ChevronDown size={18} className="dropdown-chevron-icon" />
        </div>

        {/* Quick select pills */}
        <div className="dropdown-quick-row">
          {availableCountries.map(c => {
            const isSelected = form.country === c.code;
            return (
              <button
                key={c.code}
                type="button"
                className={`dropdown-quick-pill ${isSelected ? 'selected' : ''}`}
                onClick={() => update('country', c.code)}
              >
                <span>{c.flag}</span>
                <span>{c.name}</span>
                {isSelected && <Check size={12} strokeWidth={2.5} />}
              </button>
            );
          })}
        </div>

        <ValidationMessage id="country-error">{errors.country}</ValidationMessage>
      </div>

      {/* SECTION 2: Departure City Dropdown */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
          <label
            htmlFor="departure_airport"
            style={{ fontSize: '13px', fontWeight: '600', color: 'var(--navy)', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Plane size={15} style={{ color: 'var(--teal)' }} /> Departure City
          </label>
          <span style={{ fontSize: '11px', color: 'var(--muted)' }}>Select Indian departure airport</span>
        </div>

        <div className="dropdown-control-wrap">
          <select
            id="departure_airport"
            value={form.departure_airport}
            onChange={e => update('departure_airport', e.target.value)}
            className="dropdown-select-box"
            aria-invalid={!!errors.departure_airport}
            aria-describedby={errors.departure_airport ? 'departure_airport-error' : undefined}
          >
            <option value="">Select departure airport...</option>
            {availableDepartures.map(d => (
              <option key={d.airport} value={d.airport}>
                {d.city} ({d.code || d.airport}) — {d.label}
              </option>
            ))}
          </select>
          <ChevronDown size={18} className="dropdown-chevron-icon" />
        </div>

        {/* Quick select pills */}
        <div className="dropdown-quick-row">
          {availableDepartures.map(d => {
            const isSelected = form.departure_airport === d.airport;
            return (
              <button
                key={d.airport}
                type="button"
                className={`dropdown-quick-pill ${isSelected ? 'selected' : ''}`}
                onClick={() => update('departure_airport', d.airport)}
              >
                <span>{d.city}</span>
                <span style={{ opacity: 0.8, fontSize: '10px' }}>({d.code || d.airport})</span>
                {isSelected && <Check size={12} strokeWidth={2.5} />}
              </button>
            );
          })}
        </div>

        <ValidationMessage id="departure_airport-error">{errors.departure_airport}</ValidationMessage>
      </div>

      <div className="form-grid" style={{ marginBottom: '24px' }}>
        {/* SECTION 3: Holiday Start Date with Quick Presets */}
        <div className="field">
          <label htmlFor="start_date" style={{ fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Calendar size={15} style={{ color: 'var(--teal)' }} /> Holiday start date
          </label>
          <input
            id="start_date"
            type="date"
            min="2027-04-01"
            max="2027-04-17"
            value={form.start_date}
            onChange={e => update('start_date', e.target.value)}
            aria-invalid={!!errors.start_date}
            aria-describedby={errors.start_date ? 'start_date-error' : undefined}
            style={{ fontWeight: '500' }}
          />
          <small style={{ color: 'var(--muted)' }}>
            Arrival date in destination (1 to 17 April 2027)
          </small>

          {/* Quick Date Pills */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px' }}>
            {QUICK_DATE_PRESETS.map(p => (
              <button
                key={p.date}
                type="button"
                className={`duo-pill ${form.start_date === p.date ? 'selected' : ''}`}
                style={{ fontSize: '11px', padding: '4px 8px' }}
                onClick={() => update('start_date', p.date)}
              >
                {p.label}
              </button>
            ))}
          </div>
          <ValidationMessage id="start_date-error">{errors.start_date}</ValidationMessage>
        </div>

        {/* SECTION 4: Number of Nights with Minimalist Segmented Buttons */}
        <div className="field">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <label htmlFor="nights" style={{ fontWeight: '600' }}>
              Number of nights
            </label>
            <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--teal)' }}>
              {form.nights} Nights
            </span>
          </div>

          {/* Interactive Minimalist Number Grid */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBlock: '4px' }}>
            {[3, 4, 5, 6, 7, 8, 9, 10].map(n => (
              <button
                key={n}
                type="button"
                className={`duo-number-tile ${form.nights === n ? 'selected' : ''}`}
                onClick={() => update('nights', n)}
                title={`${n} nights`}
              >
                {n}
              </button>
            ))}
          </div>
          <small style={{ color: 'var(--muted)' }}>
            3–10 nights · Return flight on or before 20 April 2027
          </small>
          <ValidationMessage id="nights-error">{errors.nights}</ValidationMessage>
        </div>
      </div>

      <div className="form-grid" style={{ marginBottom: '24px' }}>
        {/* SECTION 5: Adults Interactive Chips */}
        <div className="field">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <label htmlFor="adults" style={{ fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Users size={15} style={{ color: 'var(--teal)' }} /> Adults
            </label>
            <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--teal)' }}>
              {form.adults} Adult{form.adults > 1 ? 's' : ''}
            </span>
          </div>
          <div style={{ display: 'flex', gap: '6px', marginBlock: '4px' }}>
            {[
              { count: 1, label: '1 Solo' },
              { count: 2, label: '2 Couple' },
              { count: 3, label: '3 Trio' },
              { count: 4, label: '4 Group' },
            ].map(a => (
              <button
                key={a.count}
                type="button"
                className={`duo-pill ${form.adults === a.count ? 'selected' : ''}`}
                style={{ flex: 1, textAlign: 'center', justifyContent: 'center', padding: '6px 4px', fontSize: '12px' }}
                onClick={() => update('adults', a.count)}
              >
                {a.label}
              </button>
            ))}
          </div>
          <Counter
            id="adults"
            value={form.adults}
            min={1}
            max={8}
            label="adults"
            onChange={v => update('adults', v)}
          />
          <ValidationMessage id="adults-error">{errors.adults}</ValidationMessage>
        </div>

        {/* SECTION 6: Children & Dynamic Interactive Age Bubbles */}
        <div className="field">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <label htmlFor="children_ages" style={{ fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Smile size={15} style={{ color: 'var(--teal)' }} /> Children's ages
            </label>
            <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--teal)' }}>
              {form.children_ages.length} Child{form.children_ages.length !== 1 ? 'ren' : ''}
            </span>
          </div>

          <Counter
            id="children_ages"
            value={form.children_ages.length}
            min={0}
            max={4}
            label="children"
            onChange={n =>
              update(
                'children_ages',
                n > form.children_ages.length
                  ? [...form.children_ages, 6]
                  : form.children_ages.slice(0, n)
              )
            }
          />

          {/* Interactive Child Age Selectors */}
          {form.children_ages.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '8px' }}>
              {form.children_ages.map((age, i) => (
                <div
                  key={i}
                  style={{
                    padding: '8px 12px',
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--navy)' }}>
                    Child {i + 1}: <strong style={{ color: 'var(--teal)' }}>{age} yrs</strong>
                  </span>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    {[2, 4, 6, 8, 12, 16].map(quickAge => (
                      <button
                        key={quickAge}
                        type="button"
                        className={`duo-number-tile ${Number(age) === quickAge ? 'selected' : ''}`}
                        style={{ width: '30px', height: '30px', fontSize: '11px' }}
                        onClick={() =>
                          update(
                            'children_ages',
                            form.children_ages.map((a, j) => (j === i ? quickAge : a))
                          )
                        }
                      >
                        {quickAge}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
          <small style={{ color: 'var(--muted)', marginTop: '4px' }}>
            Children are aged 0–17; each child requires a flight seat.
          </small>
          <ValidationMessage id="children_ages-error">{errors.children_ages}</ValidationMessage>
        </div>
      </div>

      {/* SECTION 7: Total Budget with Minimalist Presets */}
      <div className="budget-field" style={{ marginTop: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
          <label htmlFor="budget" style={{ fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Coins size={15} style={{ color: 'var(--teal)' }} /> Total holiday budget (INR)
          </label>
          {form.budget && (
            <span style={{ fontWeight: '700', color: 'var(--teal)', fontSize: '14px' }}>
              {money(form.budget)}
            </span>
          )}
        </div>

        {/* Quick Budget Preset Pills */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '10px' }}>
          {QUICK_BUDGET_PRESETS.map(b => (
            <button
              key={b.amount}
              type="button"
              className={`duo-pill ${Number(form.budget) === b.amount ? 'selected' : ''}`}
              style={{ fontSize: '12px', padding: '5px 10px' }}
              onClick={() => update('budget', String(b.amount))}
            >
              <strong>{b.label}</strong>
              <small style={{ opacity: 0.8, fontSize: '10px' }}>({b.tag})</small>
            </button>
          ))}
        </div>

        <div className="currency-input">
          <span>₹</span>
          <input
            id="budget"
            inputMode="numeric"
            placeholder="e.g. 3,50,000"
            value={form.budget === '' ? '' : Number(form.budget).toLocaleString('en-IN')}
            onChange={e => {
              const raw = e.target.value.replace(/,/g, '');
              if (/^\d*$/.test(raw)) update('budget', raw);
            }}
            aria-invalid={!!errors.budget}
            aria-describedby={errors.budget ? 'budget-error' : undefined}
            style={{ fontWeight: '600', fontSize: '15px' }}
          />
          <span>INR</span>
        </div>
        <small style={{ color: 'var(--muted)' }}>
          All-inclusive budget for flights, stays, airport & intercity transfers, and attractions.
        </small>
        {Number(form.budget) > 0 && Number(form.nights) >= 6 && Number(form.budget) < 260000 && form.country === 'JP' && (
          <div style={{ marginTop: '6px', fontSize: '11px', color: '#b45309', background: '#fffbeb', padding: '6px 10px', borderRadius: '6px', border: '1px solid #fde68a' }}>
            💡 <em>Tip: 6+ nights in Japan for multiple travellers typically starts from ~₹2.6L–₹2.8L. Consider 4–5 nights if you wish to stay strictly within a lower budget.</em>
          </div>
        )}
        <ValidationMessage id="budget-error">{errors.budget}</ValidationMessage>
      </div>


      {/* Clean Minimalist Submit Section */}
      <div className="form-footer" style={{ borderTop: '1px solid #e2e8f0', paddingTop: '18px' }}>
        <div>
          <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--navy)', display: 'block' }}>
            {form.budget ? `${money(form.budget)} total budget` : 'Configure your trip'}
          </span>
          <small style={{ color: 'var(--muted)' }}>One package. Every rule checked.</small>
        </div>
        <button
          type="submit"
          disabled={unavailable || busy}
          className="btn"
          style={{
            minHeight: '48px',
            paddingInline: '24px',
            fontSize: '14px',
            fontWeight: '600',
          }}
        >
          {busy ? 'Building Package…' : 'Generate My Holiday'} <ArrowRight size={16} />
        </button>
      </div>
    </form>
  );
}

function Counter({ id, value, min, max = Infinity, onChange, label }) {
  return (
    <div className="counter" role="group" aria-label={label} style={{ height: '40px', border: '1px solid #e2e8f0' }}>
      <button
        type="button"
        aria-label={`Fewer ${label}`}
        disabled={value <= min}
        onClick={() => onChange(value - 1)}
        style={{ width: '30px', height: '30px' }}
      >
        <Minus size={14} />
      </button>
      <output id={id} aria-live="polite" style={{ fontWeight: '600' }}>
        {value} <small style={{ fontWeight: '400' }}>{label}</small>
      </output>
      <button
        type="button"
        aria-label={`More ${label}`}
        disabled={value >= max}
        onClick={() => onChange(value + 1)}
        style={{ width: '30px', height: '30px' }}
      >
        <Plus size={14} />
      </button>
    </div>
  );
}
