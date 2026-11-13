import { Component } from 'react';
import { Route, Routes, useLocation } from 'react-router-dom';
import Layout from './components/Layout';
import HomePage from './pages/HomePage';
import PlanTripPage from './pages/PlanTripPage';
import PackagesPage from './pages/PackagesPage';
import PackagePage from './pages/PackagePage';
import ConfirmationPage from './pages/ConfirmationPage';
import BookingPage from './pages/BookingPage';
import ReservationLookupPage from './pages/ReservationLookupPage';
import { EmptyState, ErrorState } from './components/UI';
class ErrorBoundary extends Component { state={failed:false}; static getDerivedStateFromError(){return {failed:true};} render(){return this.state.failed ? <div className="container page"><ErrorState error={{message:'These holiday details could not be displayed. The service may be returning an unsupported package format.'}} retry={() => window.location.reload()}/></div> : this.props.children;} }
export default function App() {const location=useLocation();return <ErrorBoundary key={location.pathname}><Routes><Route element={<Layout/>}><Route index element={<HomePage/>}/><Route path="plan" element={<PlanTripPage/>}/><Route path="packages" element={<PackagesPage/>}/><Route path="packages/:id" element={<PackagePage/>}/><Route path="review/:id" element={<ConfirmationPage/>}/><Route path="booking/:reference" element={<BookingPage/>}/><Route path="find-booking" element={<ReservationLookupPage/>}/><Route path="*" element={<div className="container page"><EmptyState title="A little off the beaten path">This page doesn't exist. Let's get your journey started.</EmptyState></div>}/></Route></Routes></ErrorBoundary>;}
