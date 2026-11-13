import { useState } from 'react';
import { ArrowRight, Info, Minus, Plus, Sparkles, RotateCcw, CheckCircle2 } from 'lucide-react';
import { Button } from './UI';
import ValidationMessage from './ValidationMessage';
import { money, validateRequest } from '../utils/format';

const initial = { departure_airport: '', country: '', start_date: '', nights: 6, adults: 2, children_ages: [], budget: '' };

export function restoreRequest(country) {
  try {
    return { ...initial, ...JSON.parse(sessionStorage.getItem('holiday-request') || '{}'), ...(country ? { country } : {}) };
  } catch {
    return { ...initial, country: country || '' };
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
  const [search, setSearch] = useState('');
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
    setErrors(old => ({ ...old, [key]: undefined }));
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

  function loadMenonDemo() {
    const demo = {
      departure_airport: 'BLR',
      country: 'JP',
      start_date: '2027-04-10',
      nights: 6,
      adults: 2,
      children_ages: [6],
      budget: '350000',
    };
    setForm(demo);
    setErrors({});
    try {
      sessionStorage.setItem('holiday-request', JSON.stringify(demo));
    } catch {}
  }

  function resetForm() {
    setForm(initial);
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

  const field = (key, label, content, hint) => (
    <div className="field">
      <label htmlFor={key}>{label}</label>
      {content}
      {hint && <small>{hint}</small>}
      <ValidationMessage id={`${key}-error`}>{errors[key]}</ValidationMessage>
    </div>
  );

  const attrs = key => ({
    id: key,
    'aria-invalid': !!errors[key],
    'aria-describedby': errors[key] ? `${key}-error` : undefined,
  });

  return (
    <form className="card trip-form" onSubmit={submit} noValidate>
      <div className="form-section-heading">
        <span className="number-badge">01</span>
        <div>
          <h2>Your holiday, your way</h2>
          <p>Start with the essentials. We'll connect the dots.</p>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
          <button
            type="button"
            className="btn-secondary"
            style={{ minHeight: '34px', fontSize: '11px', padding: '6px 11px' }}
            onClick={loadMenonDemo}
          >
            <Sparkles size={13} style={{ color: 'var(--teal)' }} /> Fill Menon Demo
          </button>
          <button
            type="button"
            className="btn-secondary"
            style={{ minHeight: '34px', fontSize: '11px', padding: '6px 11px' }}
            onClick={resetForm}
            title="Reset form to empty"
          >
            <RotateCcw size={13} /> Reset
          </button>
        </div>
      </div>

      {/* Stretch S1: Quick Request Assistant */}
      <div
        style={{
          background: '#f0f7f8',
          border: '1px solid #d4e8eb',
          borderRadius: '12px',
          padding: '14px 18px',
          marginBottom: '24px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
          <span style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--teal)' }}>
            ⚡ Quick Request Assistant (Rule-based)
          </span>
          {quickParsed && (
            <span style={{ fontSize: '11px', color: '#16a34a', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <CheckCircle2 size={13} /> Fields populated!
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <input
            type="text"
            placeholder="e.g. Menon family: 2 adults, 1 child aged 6 from Bengaluru to Japan for 6 nights on 10 April budget 3.5 lakhs"
            value={quickText}
            onChange={e => setQuickText(e.target.value)}
            style={{ minHeight: '40px', fontSize: '13px' }}
          />
          <button
            type="button"
            className="btn"
            style={{ minHeight: '40px', whiteSpace: 'nowrap', paddingInline: '16px' }}
            onClick={applyQuickRequest}
          >
            Auto-fill
          </button>
        </div>
      </div>

      <div className="form-grid">
        {field(
          'departure_airport',
          'Departure city',
          <>
            <input
              className="search-input"
              aria-label="Search departure cities"
              placeholder="Search cities…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <select
              disabled={unavailable}
              {...attrs('departure_airport')}
              value={form.departure_airport}
              onChange={e => update('departure_airport', e.target.value)}
            >
              <option value="">Where are you flying from?</option>
              {options.departure_cities
                ?.filter(
                  c =>
                    c.airport === form.departure_airport ||
                    `${c.city} ${c.airport}`.toLowerCase().includes(search.toLowerCase())
                )
                .map(c => (
                  <option value={c.airport} key={c.airport}>
                    {c.city} ({c.airport})
                  </option>
                ))}
            </select>
          </>
        )}

        {field(
          'country',
          'Destination country',
          <select
            disabled={unavailable}
            {...attrs('country')}
            value={form.country}
            onChange={e => update('country', e.target.value)}
          >
            <option value="">Where would you love to go?</option>
            {options.countries?.map(c => (
              <option value={c.code} key={c.code}>
                {c.name}
              </option>
            ))}
          </select>
        )}

        {field(
          'start_date',
          'Holiday start date',
          <input
            {...attrs('start_date')}
            type="date"
            min="2027-04-01"
            max="2027-04-17"
            value={form.start_date}
            onChange={e => update('start_date', e.target.value)}
          />,
          'Your arrival day in the destination, not your flight departure.'
        )}

        {field(
          'nights',
          'Number of nights',
          <Counter
            id="nights"
            value={form.nights}
            min={3}
            max={10}
            label="nights"
            onChange={v => update('nights', v)}
          />,
          '3–10 nights · Return by 20 April 2027'
        )}

        {field(
          'adults',
          'Adults',
          <Counter
            id="adults"
            value={form.adults}
            min={1}
            label="adults"
            onChange={v => update('adults', v)}
          />
        )}

        {field(
          'children_ages',
          "Children's ages",
          <>
            <Counter
              id="children_ages"
              value={form.children_ages.length}
              min={0}
              label="children"
              onChange={n =>
                update(
                  'children_ages',
                  n > form.children_ages.length
                    ? [...form.children_ages, '']
                    : form.children_ages.slice(0, n)
                )
              }
            />
            {form.children_ages.length > 0 && (
              <div className="child-ages">
                {form.children_ages.map((age, i) => (
                  <label key={i}>
                    Child {i + 1}
                    <select
                      aria-label={`Age of child ${i + 1}`}
                      value={age}
                      onChange={e =>
                        update(
                          'children_ages',
                          form.children_ages.map((a, j) => (j === i ? e.target.value : a))
                        )
                      }
                    >
                      <option value="">Age</option>
                      {Array.from({ length: 18 }, (_, n) => (
                        <option key={n} value={n}>
                          {n}
                        </option>
                      ))}
                    </select>
                  </label>
                ))}
              </div>
            )}
          </>,
          'Children are aged 0–17; every child has a flight seat.'
        )}
      </div>

      <div className="budget-field">
        {field(
          'budget',
          'Total holiday budget',
          <div className="currency-input">
            <span>₹</span>
            <input
              {...attrs('budget')}
              inputMode="numeric"
              placeholder="e.g. 3,50,000"
              value={form.budget === '' ? '' : Number(form.budget).toLocaleString('en-IN')}
              onChange={e => {
                const raw = e.target.value.replace(/,/g, '');
                if (/^\d*$/.test(raw)) update('budget', raw);
              }}
            />
            <span>INR</span>
          </div>,
          'For everyone, including flights, stays, transfers and attractions.'
        )}
      </div>

      <div className="form-note">
        <Info size={18} />
        <span>Travel is available in April 2027. Your cities and stays are selected to fit your trip.</span>
      </div>

      <div className="form-footer">
        <span>{form.budget ? `${money(form.budget)} for your whole holiday` : 'One request. Every detail considered.'}</span>
        <Button type="submit" busy={busy} disabled={unavailable}>
          Generate My Holiday <ArrowRight size={18} />
        </Button>
      </div>
    </form>
  );
}

function Counter({ id, value, min, max = Infinity, onChange, label }) {
  return (
    <div className="counter" role="group" aria-label={label}>
      <button
        type="button"
        aria-label={`Fewer ${label}`}
        disabled={value <= min}
        onClick={() => onChange(value - 1)}
      >
        <Minus size={16} />
      </button>
      <output id={id} aria-live="polite">
        {value} <small>{label}</small>
      </output>
      <button
        type="button"
        aria-label={`More ${label}`}
        disabled={value >= max}
        onClick={() => onChange(value + 1)}
      >
        <Plus size={16} />
      </button>
    </div>
  );
}
