import { money, date, time } from '../utils/format';
import { Photo } from './UI';

export default function AlternativeSelector({ option, type, selected, onSelect }) {
  return (
    <label className={`alternative ${selected ? 'selected' : ''} ${option.available === false ? 'unavailable' : ''}`}>
      <input
        type="radio"
        name="alternative"
        checked={selected}
        disabled={option.available === false}
        onChange={onSelect}
      />
      {type === 'hotel' && <Photo src={option.image} alt={option.name} className="alternative-image" />}
      <span className="alternative-content">
        <strong>{option.label || option.name || `${option.airline} · ${option.flight_number}`}</strong>
        {type === 'flight' ? (
          <>
            <span>
              {option.from} → {option.to} · {date(option.departure_local)}
            </span>
            <small>
              {time(option.departure_local)} – {time(option.arrival_local)} · {option.duration_minutes} min
            </small>
          </>
        ) : type === 'hotel' ? (
          <>
            <span>
              {option.city} · {option.area} · {option.room_name}
            </span>
            <small>
              {option.rooms} rooms · {option.nights} nights · Capacity {option.capacity} travellers
            </small>
          </>
        ) : type === 'city_plan' ? (
          <small>Valid city itinerary with at least 2 consecutive nights per city</small>
        ) : (
          <>
            <span>
              {option.city} · {option.visit_minutes} min
            </span>
            <small>
              Open {option.open_from}–{option.open_until}
            </small>
          </>
        )}
        {option.total != null && (
          <span className="spread">
            <b>{money(option.total)}</b>
            {option.price_difference != null && (
              <small>
                {option.price_difference >= 0 ? '+' : '−'}
                {money(Math.abs(option.price_difference))}
              </small>
            )}
          </span>
        )}
        {option.reason && <small>{option.reason}</small>}
        {option.current && <small className="teal">Currently selected</small>}
      </span>
    </label>
  );
}
