import { money, date, time } from '../utils/format';
import { Photo } from './UI';

export default function AlternativeSelector({ option, type, selected, onSelect }) {
  return (
    <label
      className={`alternative ${selected ? 'selected' : ''} ${option.available === false ? 'unavailable' : ''}`}
      onClick={onSelect}
    >
      <input
        type="radio"
        name="alternative"
        checked={!!selected}
        disabled={option.available === false}
        onChange={onSelect}
        onClick={onSelect}
      />
      {(type === 'hotel' || type === 'attraction') && (
        <Photo src={option.image} alt={option.name} className="alternative-image" />
      )}
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
            {option.price_per_seat?.amount && (
              <small style={{ color: 'var(--teal)', fontWeight: '500' }}>
                {money(option.price_per_seat.amount)} / person
              </small>
            )}
          </>
        ) : type === 'hotel' ? (
          <>
            <span>
              {option.city} · {option.area} · {option.room_name}
            </span>
            <small>
              {option.rooms} rooms · {option.nights} nights · Capacity {option.capacity} travellers
            </small>
            {option.price_per_night?.amount && (
              <small style={{ color: 'var(--teal)', fontWeight: '500' }}>
                {money(option.price_per_night.amount)} / night
              </small>
            )}
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
            {option.price_per_person?.amount && (
              <small style={{ color: 'var(--teal)', fontWeight: '500' }}>
                {money(option.price_per_person.amount)} / person
              </small>
            )}
          </>
        )}
        {option.total != null && (
          <span className="spread" style={{ marginTop: '4px' }}>
            <b>{money(option.total)}</b>
            {option.price_difference != null && (
              <span className={`diff ${option.price_difference > 0 ? 'more' : option.price_difference < 0 ? 'less' : ''}`}>
                {option.price_difference === 0
                  ? 'Same price'
                  : `${option.price_difference > 0 ? '+' : ''}${money(option.price_difference)}`}
              </span>
            )}
          </span>
        )}
      </span>
    </label>
  );
}
