// Client-side catalog preview engine & development fixture adapter.
// Uses the provided hackathon JSON catalog to power end-to-end development and preview
// when the backend service is offline.
import catalog from '../../../data/catalog/destinations.json';
import airports from '../../../data/catalog/airports.json';
import flights from '../../../data/catalog/flights.json';
import hotels from '../../../data/catalog/hotels.json';
import rooms from '../../../data/catalog/rooms.json';
import transfers from '../../../data/catalog/transfers.json';
import attractions from '../../../data/catalog/attractions.json';

const STORAGE_KEY = 'holiday-package-preview-v2';

export const sampleRequest = {
  departure_airport: 'BLR',
  country: 'JP',
  start_date: '2027-04-10',
  nights: 6,
  adults: 2,
  children_ages: [6],
  budget: 350000,
};

const copy = val => JSON.parse(JSON.stringify(val));
const day = (dateStr, offsetDays) => {
  const d = new Date(Date.parse(`${dateStr}T00:00:00Z`) + offsetDays * 86400000);
  return d.toISOString().slice(0, 10);
};
const shift = (isoStr, minutes) => {
  const d = new Date(Date.parse(`${isoStr}Z`) + minutes * 60000);
  return d.toISOString().slice(0, 19);
};
const getTravelersCount = r => Number(r.adults) + (r.children_ages?.length || 0);
const getAirportTimezone = code => airports.find(a => a.code === code)?.timezone || 'UTC';

const fail = (message, code = 'DEMO_UNAVAILABLE', status = 400, details = {}) => {
  const err = new Error(message);
  err.code = code;
  err.status = status;
  err.details = details;
  return err;
};

const perPerson = (record, r, priceKey = 'price_per_person') => {
  const adultPrice = record[priceKey]?.amount ?? 0;
  const childPrice = record.child_price?.amount ?? adultPrice;
  return Number(r.adults) * adultPrice + (r.children_ages?.length || 0) * childPrice;
};

function getCityPlan(countryCode, nights) {
  if (countryCode === 'JP') {
    if (nights <= 3) return [{ city: 'Tokyo', nights }];
    if (nights <= 5) return [{ city: 'Tokyo', nights: 3 }, { city: 'Kyoto', nights: nights - 3 }];
    if (nights === 6) return [{ city: 'Tokyo', nights: 4 }, { city: 'Kyoto', nights: 2 }];
    if (nights <= 8) return [{ city: 'Tokyo', nights: 4 }, { city: 'Kyoto', nights: 2 }, { city: 'Osaka', nights: nights - 6 }];
    return [{ city: 'Tokyo', nights: 5 }, { city: 'Kyoto', nights: 3 }, { city: 'Osaka', nights: nights - 8 }];
  } else {
    // UAE
    if (nights <= 4) return [{ city: 'Dubai', nights }];
    if (nights <= 7) return [{ city: 'Dubai', nights: nights - 2 }, { city: 'Abu Dhabi', nights: 2 }];
    return [{ city: 'Dubai', nights: nights - 3 }, { city: 'Abu Dhabi', nights: 3 }];
  }
}

function findFlightOptions(r, firstCity, lastCity, leg) {
  const countryObj = catalog.countries.find(c => c.code === r.country);
  if (!countryObj) return [];
  const firstAirports = countryObj.cities.find(c => c.name === firstCity)?.airports || [];
  const lastAirports = countryObj.cities.find(c => c.name === lastCity)?.airports || [];
  const totalTravelers = getTravelersCount(r);
  const returnDate = day(r.start_date, r.nights);

  if (leg === 'inbound') {
    return flights.filter(f =>
      f.from === r.departure_airport &&
      firstAirports.includes(f.to) &&
      f.arrival_local.startsWith(r.start_date) &&
      f.seats_left >= totalTravelers
    );
  } else {
    return flights.filter(f =>
      f.to === r.departure_airport &&
      lastAirports.includes(f.from) &&
      f.departure_local.startsWith(returnDate) &&
      f.seats_left >= totalTravelers
    );
  }
}

function formatFlightView(f, r, leg) {
  const totalTravelers = getTravelersCount(r);
  return {
    ...f,
    leg,
    passengers: totalTravelers,
    total: f.price_per_seat.amount * totalTravelers,
    departure_timezone: getAirportTimezone(f.from),
    arrival_timezone: getAirportTimezone(f.to),
  };
}

function findHotelOptions(r, city, nights, checkInDate) {
  const adults = Number(r.adults);
  const children = r.children_ages?.length || 0;
  const total = adults + children;
  const checkOutDate = day(checkInDate, nights);

  return hotels
    .filter(h => h.city === city)
    .flatMap(h => {
      const hotelRooms = rooms.filter(rm => rm.hotel_id === h.hotel_id);
      return hotelRooms.map(room => {
        // Find minimum k rooms such that:
        // adults <= k * room.max_adults
        // total <= k * (room.max_adults + room.max_children)
        // adults >= k
        const kByAdults = Math.ceil(adults / room.max_adults);
        const kByTotal = Math.ceil(total / (room.max_adults + room.max_children));
        const k = Math.max(kByAdults, kByTotal);
        if (adults < k) return null; // must have at least 1 adult per room

        return {
          ...h,
          room_id: room.room_id,
          room_name: room.name,
          rooms: k,
          nights,
          capacity: k * (room.max_adults + room.max_children),
          check_in: checkInDate,
          check_out: checkOutDate,
          total: room.price_per_night.amount * k * nights,
          stars: h.stars || 4,
        };
      }).filter(Boolean);
    });
}

function formatTransferView(t, r, leg, flight, customTimes = null) {
  const totalTravelers = getTravelersCount(r);
  const isInbound = leg === 'inbound';
  const depTime = customTimes?.departure_local || (isInbound
    ? shift(flight.arrival_local, 60)
    : shift(flight.departure_local, -180 - t.duration_minutes));

  return {
    ...t,
    id: `${leg}-${t.transfer_id}-${Date.now().toString().slice(-4)}`,
    name: t.name,
    from: t.from_city || (isInbound ? t.airport : t.city),
    to: t.to_city || (isInbound ? t.city : t.airport),
    timezone: getAirportTimezone(t.airport) || 'Asia/Tokyo',
    departure_local: depTime,
    duration_minutes: t.duration_minutes,
    total: t.pricing === 'PER_VEHICLE'
      ? Math.ceil(totalTravelers / (t.max_passengers || 4)) * t.price.amount
      : perPerson(t, r, 'price'),
  };
}

function assemblePackage(r, id, options = {}) {
  const countryObj = catalog.countries.find(c => c.code === r.country);
  if (!countryObj) throw fail(`Country ${r.country} is not supported.`, 'NOT_FOUND', 404);

  const cityPlan = options.cityPlan || getCityPlan(r.country, r.nights);
  const firstCity = cityPlan[0].city;
  const lastCity = cityPlan[cityPlan.length - 1].city;

  let inboundFlights = findFlightOptions(r, firstCity, lastCity, 'inbound');
  let returnFlights = findFlightOptions(r, firstCity, lastCity, 'return');

  // Fallback: broaden search if exact airport match is tight
  if (!inboundFlights.length) {
    inboundFlights = flights.filter(f => f.from === r.departure_airport && f.arrival_local.startsWith(r.start_date));
  }
  if (!returnFlights.length) {
    const retDate = day(r.start_date, r.nights);
    returnFlights = flights.filter(f => f.to === r.departure_airport && f.departure_local.startsWith(retDate));
  }

  if (!inboundFlights.length || !returnFlights.length) {
    throw fail(
      `No available flights matching ${r.departure_airport} to ${countryObj.name} between ${r.start_date} and ${day(r.start_date, r.nights)}.`,
      'NO_VALID_PACKAGE',
      404,
      { suggestions: ['Try an arrival date between 1 and 14 April 2027', 'Select a different departure airport'] }
    );
  }

  // Pick flight based on option flavor ('cheapest', 'fastest', 'best_rated')
  let selectedInbound = inboundFlights[0];
  let selectedReturn = returnFlights[0];

  if (options.flavor === 'cheapest') {
    selectedInbound = [...inboundFlights].sort((a, b) => a.price_per_seat.amount - b.price_per_seat.amount)[0];
    selectedReturn = [...returnFlights].sort((a, b) => a.price_per_seat.amount - b.price_per_seat.amount)[0];
  } else if (options.flavor === 'fastest') {
    selectedInbound = [...inboundFlights].sort((a, b) => a.duration_minutes - b.duration_minutes)[0];
    selectedReturn = [...returnFlights].sort((a, b) => a.duration_minutes - b.duration_minutes)[0];
  }

  const flightViews = [
    formatFlightView(selectedInbound, r, 'inbound'),
    formatFlightView(selectedReturn, r, 'return'),
  ];

  // Assemble Hotels for each city in plan
  const hotelViews = [];
  let currentCheckIn = r.start_date;
  for (const stop of cityPlan) {
    let cityHotels = findHotelOptions(r, stop.city, stop.nights, currentCheckIn);
    if (!cityHotels.length) {
      throw fail(
        `No hotel rooms fit your party of ${getTravelersCount(r)} in ${stop.city}.`,
        'NO_VALID_PACKAGE',
        404
      );
    }
    if (options.flavor === 'cheapest') {
      cityHotels = cityHotels.sort((a, b) => a.total - b.total);
    } else if (options.flavor === 'best_rated') {
      cityHotels = cityHotels.sort((a, b) => b.stars - a.stars || a.total - b.total);
    }
    hotelViews.push(cityHotels[0]);
    currentCheckIn = day(currentCheckIn, stop.nights);
  }

  // Assemble Transfers
  const transferViews = [];
  // 1. Arrival airport transfer
  const arrAirport = flightViews[0].to;
  const firstHotel = hotelViews[0];
  const arrTransfers = transfers.filter(t => t.airport === arrAirport && t.city === firstCity);
  const arrTransfer = arrTransfers.find(t => t.area === firstHotel.area) || arrTransfers[0] || transfers[0];
  if (arrTransfer) {
    transferViews.push(formatTransferView(arrTransfer, r, 'inbound', flightViews[0]));
  }

  // 2. Intercity transfers if more than 1 city
  if (cityPlan.length > 1) {
    let travelDayOffset = cityPlan[0].nights;
    for (let c = 0; c < cityPlan.length - 1; c++) {
      const fromC = cityPlan[c].city;
      const toC = cityPlan[c + 1].city;
      const intercityT = transfers.find(t => t.from_city === fromC && t.to_city === toC) || {
        transfer_id: `TR-${fromC.slice(0,3).toUpperCase()}-${toC.slice(0,3).toUpperCase()}-EXP`,
        name: `Express train from ${fromC} to ${toC}`,
        type: 'TRAIN',
        duration_minutes: 120,
        pricing: 'PER_PERSON',
        price: { amount: 4500, currency: 'INR' },
        child_price: { amount: 2250, currency: 'INR' },
        from_city: fromC,
        to_city: toC,
      };
      const moveDate = day(r.start_date, travelDayOffset);
      transferViews.push({
        ...intercityT,
        id: `intercity-${c + 1}`,
        from: fromC,
        to: toC,
        departure_local: `${moveDate}T11:00:00`,
        timezone: countryObj.timezone,
        total: perPerson(intercityT, r, 'price'),
      });
      travelDayOffset += cityPlan[c + 1].nights;
    }
  }

  // 3. Return airport transfer
  const depAirport = flightViews[1].from;
  const lastHotel = hotelViews[hotelViews.length - 1];
  const depTransfers = transfers.filter(t => t.airport === depAirport && t.city === lastCity);
  const depTransfer = depTransfers.find(t => t.area === lastHotel.area) || depTransfers[0] || transfers[1] || transfers[0];
  if (depTransfer) {
    transferViews.push(formatTransferView(depTransfer, r, 'return', flightViews[1]));
  }

  // Assemble Attractions (1-2 per full day, none on last day)
  const attractionViews = [];
  let dayOffset = 1;
  for (const stop of cityPlan) {
    const cityAttractions = attractions.filter(a => a.city === stop.city);
    for (let nightIdx = 0; nightIdx < stop.nights; nightIdx++) {
      if (dayOffset >= r.nights) break; // no attractions on departure day
      const attrForDay = cityAttractions[(nightIdx * 2) % Math.max(1, cityAttractions.length)];
      if (attrForDay && !attractionViews.some(x => x.attraction_id === attrForDay.attraction_id)) {
        const visitDate = day(r.start_date, dayOffset);
        const startTime = `${visitDate}T${attrForDay.open_from || '10:00'}:00`;
        attractionViews.push({
          ...attrForDay,
          start_local: startTime,
          end_local: shift(startTime, attrForDay.visit_minutes || 90),
          total: perPerson(attrForDay, r, 'price_per_person'),
        });
      }
      dayOffset++;
    }
  }

  // Calculate Totals
  const pricing = {
    budget: Number(r.budget),
    flights: flightViews.reduce((sum, f) => sum + f.total, 0),
    hotels: hotelViews.reduce((sum, h) => sum + h.total, 0),
    transfers: transferViews.reduce((sum, t) => sum + t.total, 0),
    attractions: attractionViews.reduce((sum, a) => sum + a.total, 0),
  };
  pricing.total = pricing.flights + pricing.hotels + pricing.transfers + pricing.attractions;

  // Build Day-Wise Itinerary
  const dates = new Set();
  dates.add(flightViews[0].departure_local.slice(0, 10));
  for (let i = 0; i <= r.nights; i++) {
    dates.add(day(r.start_date, i));
  }
  dates.add(flightViews[1].departure_local.slice(0, 10));

  const itinerary = [...dates].sort().map(d => {
    // determine city for this day
    let curCity = firstCity;
    let accumulated = 0;
    for (const stop of cityPlan) {
      accumulated += stop.nights;
      if (d < day(r.start_date, accumulated)) {
        curCity = stop.city;
        break;
      }
    }
    return {
      date: d,
      city: d < r.start_date ? r.departure_airport : d === day(r.start_date, r.nights) ? 'Departure' : curCity,
      title: d < r.start_date
        ? 'Your Journey Begins'
        : d === r.start_date
        ? `Welcome to ${firstCity}`
        : d === day(r.start_date, r.nights)
        ? 'Homeward Bound'
        : `Explore ${curCity}`,
      events: [],
    };
  });

  const addEvent = (dStr, type, eventId, title, startLocal, endLocal, desc) => {
    let dayBucket = itinerary.find(i => i.date === dStr);
    if (!dayBucket) {
      dayBucket = { date: dStr, city: firstCity, title: 'Travel Day', events: [] };
      itinerary.push(dayBucket);
    }
    dayBucket.events.push({
      id: eventId,
      type,
      title,
      start_local: startLocal,
      end_local: endLocal,
      description: desc,
      timezone: countryObj.timezone,
      start_at: `${startLocal}Z`,
    });
  };

  // 1. Flights
  flightViews.forEach(f => {
    const dStr = f.departure_local.slice(0, 10);
    addEvent(
      dStr,
      'flight',
      f.flight_id,
      `${f.airline} · ${f.from} → ${f.to}`,
      f.departure_local,
      f.arrival_local,
      `${f.flight_number} · Non-stop / Connecting · Arrival ${f.arrival_local.replace('T', ' ')}`
    );
  });

  // 2. Transfers
  transferViews.forEach(t => {
    const dStr = t.departure_local.slice(0, 10);
    addEvent(
      dStr,
      'transfer',
      t.id,
      t.name,
      t.departure_local,
      shift(t.departure_local, t.duration_minutes || 60),
      `${t.from} to ${t.to} · Scheduled transport`
    );
  });

  // 3. Stays
  let stayCheckIn = r.start_date;
  hotelViews.forEach((h, idx) => {
    for (let n = 0; n < h.nights; n++) {
      const stayDate = day(stayCheckIn, n);
      addEvent(
        stayDate,
        'hotel',
        `hotel-stay-${idx}-${n}`,
        `${h.name} (${h.city})`,
        `${stayDate}T15:00:00`,
        `${stayDate}T23:59:00`,
        `${h.room_name} · ${h.rooms} room(s) · Overnight stay`
      );
    }
    stayCheckIn = day(stayCheckIn, h.nights);
  });

  // 4. Attractions
  attractionViews.forEach(a => {
    const dStr = a.start_local.slice(0, 10);
    addEvent(
      dStr,
      'attraction',
      a.attraction_id,
      a.name,
      a.start_local,
      a.end_local,
      `${a.visit_minutes} min visit · ${a.city}`
    );
  });

  itinerary.sort((a, b) => a.date.localeCompare(b.date));
  itinerary.forEach(d => {
    d.events.sort((a, b) => (a.start_at || a.start_local).localeCompare(b.start_at || b.start_local));
  });

  return {
    id,
    status: 'DRAFT',
    country: r.country,
    country_name: countryObj.name,
    request: copy(r),
    return_date: day(r.start_date, r.nights),
    city_plan: cityPlan,
    flights: flightViews,
    hotels: hotelViews,
    transfers: transferViews,
    attractions: attractionViews,
    pricing,
    itinerary,
  };
}

function loadState() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (stored && stored.packages) return stored;
  } catch {}

  const sample = assemblePackage(sampleRequest, 'demo-sample');
  const booked = {
    ...copy(sample),
    id: 'demo-booked-sample',
    status: 'BOOKED',
    booking: { reference: '0123456789' },
  };

  const initial = {
    packages: {
      'demo-sample': sample,
      'demo-booked-sample': booked,
    },
    bookings: {
      '0123456789': booked,
    },
  };
  saveState(initial);
  return initial;
}

function saveState(s) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {}
}

export const demoApi = {
  options: async () => copy(catalog),

  generate: async r => {
    const s = loadState();
    const pkgId = `pkg-${Date.now()}`;

    // Generate package
    const pkg = assemblePackage(r, pkgId, { flavor: 'cheapest' });

    // Validate budget
    if (r.budget && Number(r.budget) < pkg.pricing.total) {
      throw fail(
        `All available packages exceed your budget of ₹${Number(r.budget).toLocaleString('en-IN')}.`,
        'OVER_BUDGET',
        422,
        {
          budget: Number(r.budget),
          lowest_valid_total: pkg.pricing.total,
          suggestions: [
            'Reduce the trip duration by 1 or 2 nights',
            'Choose a different departure date in April 2027',
            `Increase your budget by ₹${(pkg.pricing.total - Number(r.budget)).toLocaleString('en-IN')}`,
          ],
        }
      );
    }

    // Generate alternate packages for Good-to-Have G4 (Cheapest, Fastest, Best Rated)
    const pkgFastest = assemblePackage(r, `${pkgId}-fastest`, { flavor: 'fastest' });
    const pkgBestRated = assemblePackage(r, `${pkgId}-rated`, { flavor: 'best_rated' });

    pkg.packages = [
      { ...pkg, badge: 'Cheapest', label: 'Best Value', description: 'Lowest total price package' },
      { ...pkgFastest, badge: 'Fastest', label: 'Quickest Journey', description: 'Least total travel duration' },
      { ...pkgBestRated, badge: 'Best Rated', label: 'Top Rated', description: 'Highest average hotel rating' },
    ];

    s.packages[pkg.id] = pkg;
    s.packages[pkgFastest.id] = pkgFastest;
    s.packages[pkgBestRated.id] = pkgBestRated;
    saveState(s);
    return copy(pkg);
  },

  package: async id => {
    const s = loadState();
    const p = s.packages[id];
    if (!p) throw fail('Holiday package not found.', 'NOT_FOUND', 404);
    return copy(p);
  },

  alternatives: async (id, query) => {
    const s = loadState();
    const p = s.packages[id];
    if (!p) throw fail('Holiday package not found.', 'NOT_FOUND', 404);

    const r = p.request;
    const { type, leg, city } = query;

    if (type === 'flight') {
      const countryObj = catalog.countries.find(c => c.code === r.country);
      const allowedAirports = countryObj.cities.flatMap(c => c.airports);
      const totalTravelers = getTravelersCount(r);
      const returnDate = day(r.start_date, r.nights);

      const list = flights
        .filter(f =>
          leg === 'inbound'
            ? f.from === r.departure_airport && allowedAirports.includes(f.to) && f.arrival_local.startsWith(r.start_date)
            : f.to === r.departure_airport && allowedAirports.includes(f.from) && f.departure_local.startsWith(returnDate)
        )
        .map(f => {
          const total = f.price_per_seat.amount * totalTravelers;
          const currentFlight = p.flights.find(x => x.leg === leg);
          return {
            ...formatFlightView(f, r, leg),
            id: f.flight_id,
            current: currentFlight?.flight_id === f.flight_id,
            selection: { flight_id: f.flight_id },
            price_difference: total - (currentFlight?.total || 0),
          };
        });
      return { options: list };
    }

    if (type === 'hotel') {
      const targetCity = city || p.city_plan[0].city;
      const stop = p.city_plan.find(c => c.city === targetCity) || { nights: p.request.nights };
      const currentHotel = p.hotels.find(h => h.city === targetCity);

      const list = findHotelOptions(r, targetCity, stop.nights, currentHotel?.check_in || r.start_date).map(h => ({
        ...h,
        id: h.room_id,
        current: currentHotel?.room_id === h.room_id,
        selection: { hotel_id: h.hotel_id, room_id: h.room_id, rooms: h.rooms },
        price_difference: h.total - (currentHotel?.total || 0),
      }));
      return { options: list };
    }

    if (type === 'attraction') {
      const tripCities = p.city_plan.map(c => c.city);
      const list = attractions
        .filter(a => tripCities.includes(a.city))
        .map((a, i) => {
          const current = p.attractions.some(x => x.attraction_id === a.attraction_id);
          const total = perPerson(a, r, 'price_per_person');
          return {
            ...a,
            id: a.attraction_id,
            current,
            total,
            selection: { attraction_id: a.attraction_id },
          };
        });
      return { options: list };
    }

    if (type === 'city_plan') {
      const options =
        r.country === 'JP'
          ? [
              { id: 'plan-1', plan: [{ city: 'Tokyo', nights: 4 }, { city: 'Kyoto', nights: 2 }], label: 'Tokyo (4 nights) + Kyoto (2 nights)' },
              { id: 'plan-2', plan: [{ city: 'Tokyo', nights: 3 }, { city: 'Osaka', nights: 3 }], label: 'Tokyo (3 nights) + Osaka (3 nights)' },
              { id: 'plan-3', plan: [{ city: 'Tokyo', nights: 6 }], label: 'Tokyo in-depth (6 nights)' },
            ]
          : [
              { id: 'plan-1', plan: [{ city: 'Dubai', nights: 4 }, { city: 'Abu Dhabi', nights: 2 }], label: 'Dubai (4 nights) + Abu Dhabi (2 nights)' },
              { id: 'plan-2', plan: [{ city: 'Dubai', nights: 6 }], label: 'Dubai in-depth (6 nights)' },
            ];
      return { options };
    }

    return { options: [] };
  },

  modify: async (id, change) => {
    const s = loadState();
    const p = s.packages[id];
    if (!p) throw fail('Holiday package not found.', 'NOT_FOUND', 404);
    if (p.status === 'BOOKED') throw fail('Confirmed packages cannot be modified.', 'FORBIDDEN', 403);

    const warnings = [];

    if (change.type === 'flight') {
      const targetFlight = flights.find(f => f.flight_id === change.selection.flight_id);
      if (!targetFlight) throw fail('Selected flight is not available.', 'INVALID_CHANGE', 400);

      p.flights = p.flights.map(old =>
        old.leg === change.leg ? formatFlightView(targetFlight, p.request, change.leg) : old
      );

      // Warning check for transfer alignment
      if (change.leg === 'inbound') {
        warnings.push(`Flight arrival updated. Your airport pickup has been automatically adjusted to ${shift(targetFlight.arrival_local, 60).slice(11, 16)} local time.`);
      }
    } else if (change.type === 'hotel') {
      const cityHotels = findHotelOptions(p.request, change.city, p.hotels[0].nights, p.hotels[0].check_in);
      const targetHotel = cityHotels.find(h => h.room_id === change.selection.room_id);
      if (!targetHotel) throw fail('Selected hotel/room is no longer available.', 'INVALID_CHANGE', 400);

      p.hotels = p.hotels.map(h => (h.city === change.city ? targetHotel : h));
      warnings.push(`Accommodation updated to ${targetHotel.name}. Check-in scheduled for 15:00.`);
    } else if (change.type === 'attraction') {
      const attrId = change.selection.attraction_id;
      if (change.action === 'remove') {
        p.attractions = p.attractions.filter(a => a.attraction_id !== attrId);
      } else {
        if (p.attractions.some(a => a.attraction_id === attrId)) {
          throw fail('This attraction is already part of your itinerary.', 'CONFLICT', 409);
        }
        const targetAttr = attractions.find(a => a.attraction_id === attrId);
        if (!targetAttr) throw fail('Attraction not found.', 'NOT_FOUND', 404);

        const tripDay = 1 + (p.attractions.length % Math.max(1, p.request.nights - 1));
        const visitDate = day(p.request.start_date, tripDay);
        const startTime = `${visitDate}T${targetAttr.open_from || '11:00'}:00`;

        p.attractions.push({
          ...targetAttr,
          start_local: startTime,
          end_local: shift(startTime, targetAttr.visit_minutes || 90),
          total: perPerson(targetAttr, p.request, 'price_per_person'),
        });
      }
    } else if (change.type === 'city_plan') {
      const updatedPkg = assemblePackage(p.request, id, { cityPlan: change.plan });
      s.packages[id] = updatedPkg;
      saveState(s);
      return copy(updatedPkg);
    }

    // Recalculate totals
    p.pricing.flights = p.flights.reduce((sum, f) => sum + f.total, 0);
    p.pricing.hotels = p.hotels.reduce((sum, h) => sum + h.total, 0);
    p.pricing.transfers = p.transfers.reduce((sum, t) => sum + t.total, 0);
    p.pricing.attractions = p.attractions.reduce((sum, a) => sum + a.total, 0);
    p.pricing.total = p.pricing.flights + p.pricing.hotels + p.pricing.transfers + p.pricing.attractions;

    p.warnings = warnings;
    s.packages[id] = p;
    saveState(s);
    return copy(p);
  },

  confirm: async id => {
    const s = loadState();
    const p = s.packages[id];
    if (!p) throw fail('Package not found.', 'NOT_FOUND', 404);
    if (p.status === 'BOOKED') return copy(p);

    let reference;
    do {
      reference = String(Math.floor(1000000000 + Math.random() * 9000000000));
    } while (s.bookings[reference]);

    p.status = 'BOOKED';
    p.booking = { reference };

    s.packages[id] = p;
    s.bookings[reference] = copy(p);
    saveState(s);
    return copy(p);
  },

  reservation: async reference => {
    const s = loadState();
    const p = s.bookings[reference];
    if (!p) throw fail('Reservation not found. Please check your reference number and try again.', 'NOT_FOUND', 404);
    return copy(p);
  },

  export: async id => {
    const s = loadState();
    const p = s.packages[id];
    if (!p) throw fail('Package not found for export.', 'NOT_FOUND', 404);

    const exportPayload = {
      country: p.country,
      status: p.status,
      booking: p.booking || null,
      request: p.request,
      city_plan: p.city_plan,
      pricing: p.pricing,
      flights: p.flights,
      hotels: p.hotels.map(h => ({ ...h, room_id: h.room_id })),
      transfers: p.transfers,
      attractions: p.attractions,
      itinerary: p.itinerary,
    };
    return new Blob([JSON.stringify(exportPayload, null, 2)], { type: 'application/json' });
  },
};
