import { MapPin, Star } from 'lucide-react';
import { Photo, Button } from './UI';
import { money, date } from '../utils/format';

export default function HotelCard({ hotel, onChange }) {
  const perNightCost = hotel.nights ? Math.round(hotel.total / hotel.nights) : null;

  return (
    <article className="card hotel-card">
      <Photo src={hotel.image} alt={hotel.name} className="hotel-photo" />
      <div className="hotel-content">
        <div className="hotel-stars" aria-label={`${hotel.stars} stars`}>
          {Array.from({ length: Math.min(5, hotel.stars || 0) }, (_, i) => (
            <Star key={i} size={12} fill="currentColor" />
          ))}
        </div>
        <div className="spread">
          <h3>{hotel.name}</h3>
          <div style={{ textAlign: 'right' }}>
            <strong style={{ fontSize: '17px', color: 'var(--navy)' }}>{money(hotel.total)}</strong>
            {perNightCost && hotel.nights > 1 && (
              <small style={{ display: 'block', color: 'var(--muted)', fontSize: '11px', fontWeight: '500', marginTop: '2px' }}>
                {money(perNightCost)} / night
              </small>
            )}
          </div>
        </div>
        <p className="muted inline">
          <MapPin size={14} />
          {hotel.city} · {hotel.area}
        </p>
        <p>{hotel.room_name} · {hotel.rooms} room(s) · {hotel.nights} nights</p>
        <small>{date(hotel.check_in)} – {date(hotel.check_out)}</small>
        {onChange && (
          <div className="hotel-action">
            <Button secondary onClick={onChange}>Change Hotel</Button>
          </div>
        )}
      </div>
    </article>
  );
}
