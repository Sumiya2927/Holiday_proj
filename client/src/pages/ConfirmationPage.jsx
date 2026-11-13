import { useState, useRef } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Check, ShieldCheck } from 'lucide-react';
import usePackage from '../hooks/usePackage';
import { api } from '../api/http';
import { LoadingSkeleton, ErrorState, PageHeader, Button } from '../components/UI';
import { TripOverview, PackageSections } from './PackagePage';
import PriceBreakdown from '../components/PriceBreakdown';
export default function ConfirmationPage() {
 const {id} = useParams(), resource = usePackage(id), navigate = useNavigate(); const [busy,setBusy] = useState(false), [error,setError] = useState(''), [uncertain,setUncertain] = useState(false); const lock = useRef(false); const p = resource.data;
 async function confirm() { if(lock.current) return; lock.current=true; setBusy(true); setError(''); try { const booked = await api.confirm(id); if (!/^\d{10}$/.test(booked.booking?.reference)) throw new Error('We could not verify the booking reference. Check the latest booking status before retrying.'); navigate(`/booking/${booked.booking.reference}`); } catch(e) { setError(e.message); setUncertain(true); } finally { setBusy(false); lock.current=false; } }
 async function checkStatus() { setBusy(true); setError(''); try { const latest = await api.package(id); resource.setData(latest); if(latest.status === 'BOOKED') navigate(`/booking/${latest.booking.reference}`); else setUncertain(false); } catch(e) {setError(e.message);} finally {setBusy(false);} }
 return <div className="container page"><Link className="text-link" to={`/packages/${encodeURIComponent(id)}`}>← Back to your itinerary</Link><PageHeader eyebrow="One last look" title="Your holiday, ready when you are">Review the details, then make it official.</PageHeader>{resource.loading ? <LoadingSkeleton/> : resource.error ? <ErrorState error={resource.error} retry={resource.retry}/> : <><TripOverview pkg={p}/><div className="package-layout"><PackageSections pkg={p} timeline={false}/><div className="sidebar"><PriceBreakdown pricing={p.pricing}>{p.status === 'BOOKED' ? <Link className="btn full" to={`/booking/${p.booking.reference}`}>View confirmed reservation</Link> : <><Button className="full" busy={busy} onClick={uncertain ? checkStatus : confirm}>{uncertain ? 'Check booking status' : 'Confirm Holiday'}<Check size={17}/></Button><p className="summary-note"><ShieldCheck size={17}/> This saves an in-app reservation. No payment required.</p></>}{error && <p className="notice error" role="alert">{error}</p>}</PriceBreakdown></div></div></>}</div>;
}
