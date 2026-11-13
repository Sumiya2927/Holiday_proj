export const money = value => Number.isFinite(Number(value)) && value != null ? new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value) : '—';
export function date(value) { if (!value) return '—'; const d = new Date(`${String(value).slice(0, 10)}T12:00:00Z`); return Number.isNaN(d.getTime()) ? '—' : new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(d); }
export const time = value => value?.includes('T') ? value.slice(11, 16) : value || '—';
export const duration = value => `${Math.floor(value / 60)}h ${value % 60}m`;
export const travelers = r => `${r.adults} adult${r.adults === 1 ? '' : 's'}${r.children_ages?.length ? ` · ${r.children_ages.length} child${r.children_ages.length > 1 ? 'ren' : ''}` : ''}`;
export function validateRequest(r, options) {
  const e = {};
  if (!options?.departure_cities?.some(c => c.airport === r.departure_airport)) e.departure_airport = 'Choose an available departure city.';
  if (!options?.countries?.some(c => c.code === r.country)) e.country = 'Choose a destination country.';
  if (!Number.isInteger(r.nights) || r.nights < 3 || r.nights > 10) e.nights = 'Choose between 3 and 10 nights.';
  const start = new Date(`${r.start_date}T00:00:00Z`); const end = new Date(start); end.setUTCDate(end.getUTCDate() + r.nights);
  if (!/^2027-04-\d{2}$/.test(r.start_date) || Number.isNaN(start.getTime()) || start < new Date('2027-04-01') || end > new Date('2027-04-20')) e.start_date = 'Arrive from 1 April and return by 20 April 2027.';
  if (!Number.isInteger(r.adults) || r.adults < 1) e.adults = 'Add at least one adult.';
  if (r.children_ages.some(a => a === '' || !Number.isInteger(Number(a)) || Number(a) < 0 || Number(a) > 17)) e.children_ages = 'Enter an age from 0 to 17 for every child.';
  if (!Number.isFinite(r.budget) || r.budget <= 0) e.budget = 'Enter a total budget greater than zero.';
  return e;
}
