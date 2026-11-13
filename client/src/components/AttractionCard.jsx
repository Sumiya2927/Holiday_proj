import { Photo } from './UI';
import { date, time, money } from '../utils/format';

export default function AttractionCard({ attraction }) {
  const startIso = attraction.start_local || (attraction.date && attraction.start_time ? `${attraction.date}T${attraction.start_time}:00` : null);
  const endIso = attraction.end_local || (attraction.date && attraction.end_time ? `${attraction.date}T${attraction.end_time}:00` : null);

  const displayDate = startIso ? date(startIso) : (attraction.date ? date(attraction.date) : 'Flexible Day');
  const displayTime = startIso && endIso ? `${time(startIso)} – ${time(endIso)}` : (attraction.start_time && attraction.end_time ? `${attraction.start_time} – ${attraction.end_time}` : '10:00 – 11:30');

  return (
    <article className="card attraction-card">
      <Photo src={attraction.image} alt={attraction.name} className="attraction-photo" />
      <div>
        <small className="eyebrow">{attraction.city}</small>
        <h3>{attraction.name}</h3>
        <p>{displayDate} · {displayTime}</p>
        <div className="spread">
          <small>{attraction.visit_minutes || 90} minute visit</small>
          <strong>{money(attraction.total)}</strong>
        </div>
      </div>
    </article>
  );
}
