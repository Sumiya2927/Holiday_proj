import { Bus } from 'lucide-react';
import { date, time, money, duration } from '../utils/format';
export default function TransferCard({ transfer }) { return <article className="card compact-card"><span className="card-icon"><Bus size={20}/></span><div><h3>{transfer.name}</h3><p>{transfer.from} → {transfer.to}</p><small>{date(transfer.departure_local)} · {time(transfer.departure_local)} · {duration(transfer.duration_minutes)} · {transfer.timezone}</small><small>{transfer.type?.replaceAll('_',' ')}</small></div><strong>{money(transfer.total)}</strong></article>; }
