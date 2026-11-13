import { ArrowRight, MapPin } from 'lucide-react';
export default function CityRouteSummary({ cities = [] }) { return <div className="city-route" aria-label="Cities in travel order">{cities.map((city,i) => <div key={city.city}>{i > 0 && <ArrowRight size={15}/>}<span><MapPin size={14}/>{city.city}<small>{city.nights} nights</small></span></div>)}</div>; }
