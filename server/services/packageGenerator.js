const mongoose = require('mongoose');

// Helper functions for date & time calculations
const day = (dateStr, offsetDays) => {
  const d = new Date(Date.parse(`${dateStr}T00:00:00Z`) + offsetDays * 86400000);
  return d.toISOString().slice(0, 10);
};

const shift = (isoStr, minutes) => {
  const d = new Date(Date.parse(`${isoStr}Z`) + minutes * 60000);
  return d.toISOString().slice(0, 19);
};

const getTravelersCount = r => Number(r.adults) + (r.children_ages?.length || 0);

const perPerson = (record, r, priceKey = 'price_per_person') => {
  const adultPrice = record[priceKey]?.amount ?? 0;
  const childPrice = record.child_price?.amount ?? adultPrice;
  return Number(r.adults) * adultPrice + (r.children_ages?.length || 0) * childPrice;
};

// City plan breakdown based on destination & duration
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

// Fetch all catalog collections from MongoDB
async function fetchCatalogFromDB() {
  const db = mongoose.connection.db;
  if (!db) {
    throw new Error('Database connection not established');
  }

  const [
    destinationsDoc,
    airports,
    flights,
    hotels,
    rooms,
    transfers,
    attractions,
    availability
  ] = await Promise.all([
    db.collection('destinations').findOne({}),
    db.collection('airports').find({}).toArray(),
    db.collection('flights').find({}).toArray(),
    db.collection('hotels').find({}).toArray(),
    db.collection('rooms').find({}).toArray(),
    db.collection('transfers').find({}).toArray(),
    db.collection('attractions').find({}).toArray(),
    db.collection('availability').find({}).toArray(),
  ]);

  return {
    catalog: destinationsDoc || { countries: [] },
    airports,
    flights,
    hotels,
    rooms,
    transfers,
    attractions,
    availability
  };
}

// Calculate rooms requirement for a party
function calculateRoomsForParty(adults, totalTravelers, room) {
  const maxAdults = room.max_adults || 2;
  const maxTotal = (room.max_adults || 2) + (room.max_children || 0);
  const kByAdults = Math.ceil(adults / maxAdults);
  const kByTotal = Math.ceil(totalTravelers / maxTotal);
  const k = Math.max(kByAdults, kByTotal);
  if (adults < k) return null; // must have at least 1 adult per room
  return k;
}

// Core package generator that reads catalog directly from MongoDB
async function buildPackageFromDB(req, options = {}) {
  const dbCatalog = await fetchCatalogFromDB();
  const { catalog, airports, flights, hotels, rooms, transfers, attractions, availability } = dbCatalog;

  const country = catalog.countries?.find(c => c.code === req.country) || catalog.countries?.[0];
  if (!country) {
    throw new Error('Selected destination country not found in catalog');
  }

  const travelers = getTravelersCount(req);
  const adults = Number(req.adults);
  const totalNights = Number(req.nights);
  const startDate = req.start_date;
  const returnDate = day(startDate, totalNights);
  const cityPlan = options.cityPlan || req.city_plan || getCityPlan(req.country, totalNights);

  // 1. Inbound Flight
  const firstCity = cityPlan[0].city;
  const entryAirports = country.cities.find(c => c.name === firstCity)?.airports || [];
  let eligibleInbound = flights.filter(f =>
    f.from === req.departure_airport &&
    entryAirports.includes(f.to) &&
    f.arrival_local?.startsWith(startDate) &&
    (f.seats_left === undefined || f.seats_left >= travelers)
  );
  if (!eligibleInbound.length) {
    eligibleInbound = flights.filter(f =>
      f.from === req.departure_airport &&
      entryAirports.includes(f.to)
    );
  }

  if (options.flavor === 'fastest') {
    eligibleInbound.sort((a, b) => (a.duration_minutes || 0) - (b.duration_minutes || 0));
  } else {
    eligibleInbound.sort((a, b) => (a.price_per_seat?.amount || 0) - (b.price_per_seat?.amount || 0));
  }
  const inboundFlight = eligibleInbound[0];

  if (!inboundFlight) {
    throw new Error(`No available flight from ${req.departure_airport} to ${firstCity} on ${startDate}`);
  }

  // 2. Return Flight
  const lastCity = cityPlan[cityPlan.length - 1].city;
  const exitAirports = country.cities.find(c => c.name === lastCity)?.airports || entryAirports;
  let eligibleReturn = flights.filter(f =>
    exitAirports.includes(f.from) &&
    f.to === req.departure_airport &&
    f.departure_local?.startsWith(returnDate) &&
    (f.seats_left === undefined || f.seats_left >= travelers)
  );
  if (!eligibleReturn.length) {
    eligibleReturn = flights.filter(f =>
      exitAirports.includes(f.from) &&
      f.to === req.departure_airport
    );
  }

  if (options.flavor === 'fastest') {
    eligibleReturn.sort((a, b) => (a.duration_minutes || 0) - (b.duration_minutes || 0));
  } else {
    eligibleReturn.sort((a, b) => (a.price_per_seat?.amount || 0) - (b.price_per_seat?.amount || 0));
  }
  const returnFlight = eligibleReturn[0];

  if (!returnFlight) {
    throw new Error(`No available return flight from ${lastCity} to ${req.departure_airport} on ${returnDate}`);
  }

  const flightItems = [
    {
      ...inboundFlight,
      leg: 'inbound',
      passengers: travelers,
      total: travelers * inboundFlight.price_per_seat.amount,
      departure_timezone: airports.find(a => a.code === inboundFlight.from)?.timezone || 'Asia/Kolkata',
      arrival_timezone: airports.find(a => a.code === inboundFlight.to)?.timezone || country.timezone || 'UTC'
    },
    {
      ...returnFlight,
      leg: 'return',
      passengers: travelers,
      total: travelers * returnFlight.price_per_seat.amount,
      departure_timezone: airports.find(a => a.code === returnFlight.from)?.timezone || country.timezone || 'UTC',
      arrival_timezone: airports.find(a => a.code === returnFlight.to)?.timezone || 'Asia/Kolkata'
    }
  ];

  // 3. Stays (Hotels & Rooms)
  let dayCursor = 0;
  const hotelStays = [];
  for (const segment of cityPlan) {
    const checkIn = day(startDate, dayCursor);
    const checkOut = day(checkIn, segment.nights);
    dayCursor += segment.nights;

    const cityHotels = hotels.filter(h => h.city === segment.city);
    if (options.flavor === 'best_rated') {
      cityHotels.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    }

    let chosenHotel = null;
    let chosenRoom = null;
    let chosenK = 1;

    for (const h of cityHotels) {
      const hotelRooms = rooms.filter(r => r.hotel_id === h.hotel_id);
      for (const rm of hotelRooms) {
        const k = calculateRoomsForParty(adults, travelers, rm);
        if (!k) continue;

        let isAvailable = true;
        for (let d = 0; d < segment.nights; d++) {
          const stayDate = day(checkIn, d);
          const av = availability.find(a => a.room_id === rm.room_id && a.date === stayDate);
          if (av && av.available_rooms < k) {
            isAvailable = false;
            break;
          }
        }
        if (isAvailable) {
          chosenHotel = h;
          chosenRoom = rm;
          chosenK = k;
          break;
        }
      }
      if (chosenHotel) break;
    }

    if (!chosenHotel && cityHotels.length > 0) {
      chosenHotel = cityHotels[0];
      chosenRoom = rooms.find(r => r.hotel_id === chosenHotel.hotel_id) || {
        room_id: `RM-${chosenHotel.hotel_id}-A`,
        name: 'Standard Room',
        max_adults: 2,
        max_children: 1,
        price_per_night: { amount: 8000, currency: 'INR' }
      };
      chosenK = calculateRoomsForParty(adults, travelers, chosenRoom) || 1;
    }

    if (chosenHotel) {
      const roomCost = (chosenRoom?.price_per_night?.amount || 7000) * chosenK * segment.nights;
      hotelStays.push({
        ...chosenHotel,
        room_id: chosenRoom.room_id,
        room_name: chosenRoom.name,
        rooms: chosenK,
        nights: segment.nights,
        capacity: chosenK * ((chosenRoom.max_adults || 2) + (chosenRoom.max_children || 0)),
        check_in: checkIn,
        check_out: checkOut,
        total: roomCost,
        refundable: true
      });
    }
  }

  // 4. Transfers (Airport Inbound, Intercity, Airport Outbound)
  const transferItems = [];
  const inAirport = inboundFlight.to;
  const firstHotelArea = hotelStays[0]?.area || '';

  const inAirportTransfer = transfers.find(t =>
    t.airport === inAirport &&
    t.area === firstHotelArea &&
    (t.max_passengers === undefined || t.max_passengers >= travelers)
  ) || transfers.find(t =>
    t.airport === inAirport &&
    (t.max_passengers === undefined || t.max_passengers >= travelers)
  ) || {
    transfer_id: `TR-${inAirport}-ARR`,
    name: `${firstCity} Airport Arrival Shuttle`,
    from: inAirport,
    to: firstHotelArea || firstCity,
    pricing: 'PER_VEHICLE',
    price: { amount: 3500, currency: 'INR' }
  };

  const inCost = inAirportTransfer.pricing === 'PER_PERSON'
    ? perPerson(inAirportTransfer, req, 'price')
    : inAirportTransfer.price.amount;

  transferItems.push({
    ...inAirportTransfer,
    id: `inbound-${inAirportTransfer.transfer_id}`,
    from: inAirport,
    to: firstHotelArea || firstCity,
    timezone: country.timezone || 'UTC',
    departure_local: shift(inboundFlight.arrival_local, 60),
    arrival_local: shift(inboundFlight.arrival_local, 60 + (inAirportTransfer.duration_minutes || 60)),
    total: inCost,
    areaMatch: inAirportTransfer.area === firstHotelArea
  });

  // Intercity transfers
  for (let i = 0; i < cityPlan.length - 1; i++) {
    const fromCity = cityPlan[i].city;
    const toCity = cityPlan[i + 1].city;
    const interTransfer = transfers.find(t =>
      (t.from_city === fromCity && t.to_city === toCity) ||
      (t.name?.toLowerCase().includes(fromCity.toLowerCase()) && t.name?.toLowerCase().includes(toCity.toLowerCase()))
    ) || {
      transfer_id: `TR-${fromCity.slice(0, 3)}-${toCity.slice(0, 3)}`,
      name: `Express Train ${fromCity} to ${toCity}`,
      from_city: fromCity,
      to_city: toCity,
      pricing: 'PER_PERSON',
      price: { amount: 4500, currency: 'INR' },
      duration_minutes: 120
    };

    const cost = interTransfer.pricing === 'PER_PERSON'
      ? perPerson(interTransfer, req, 'price')
      : interTransfer.price.amount;

    const linkDate = hotelStays[i]?.check_out || day(startDate, 3);
    transferItems.push({
      ...interTransfer,
      id: `intercity-${interTransfer.transfer_id}-${i}`,
      from: fromCity,
      to: toCity,
      timezone: country.timezone || 'UTC',
      departure_local: `${linkDate}T11:00:00`,
      arrival_local: shift(`${linkDate}T11:00:00`, interTransfer.duration_minutes || 120),
      total: cost
    });
  }

  // Outbound Airport Transfer
  const outAirport = returnFlight.from;
  const lastHotelArea = hotelStays[hotelStays.length - 1]?.area || '';
  const outAirportTransfer = transfers.find(t =>
    t.airport === outAirport &&
    t.area === lastHotelArea &&
    (t.max_passengers === undefined || t.max_passengers >= travelers)
  ) || transfers.find(t =>
    t.airport === outAirport &&
    (t.max_passengers === undefined || t.max_passengers >= travelers)
  ) || {
    transfer_id: `TR-${outAirport}-DEP`,
    name: `${lastCity} Airport Departure Shuttle`,
    from: lastHotelArea || lastCity,
    to: outAirport,
    pricing: 'PER_VEHICLE',
    price: { amount: 3500, currency: 'INR' }
  };

  const outCost = outAirportTransfer.pricing === 'PER_PERSON'
    ? perPerson(outAirportTransfer, req, 'price')
    : outAirportTransfer.price.amount;

  transferItems.push({
    ...outAirportTransfer,
    id: `return-${outAirportTransfer.transfer_id}`,
    from: lastHotelArea || lastCity,
    to: outAirport,
    timezone: country.timezone || 'UTC',
    departure_local: shift(returnFlight.departure_local, -(outAirportTransfer.duration_minutes || 60) - 120),
    arrival_local: shift(returnFlight.departure_local, -120),
    total: outCost
  });

  // 5. Attractions
  const attractionItems = [];
  for (let d = 1; d < totalNights; d++) {
    const actDate = day(startDate, d);
    let activeCity = cityPlan[0].city;
    let accumulatedNights = 0;
    for (const segment of cityPlan) {
      accumulatedNights += segment.nights;
      if (d < accumulatedNights) {
        activeCity = segment.city;
        break;
      }
    }

    const cityAttractions = attractions.filter(a => a.city === activeCity);
    if (cityAttractions.length > 0) {
      const idx = (d - 1) % cityAttractions.length;
      const att = cityAttractions[idx];
      const attCost = perPerson(att, req, 'price_per_person');
      const visitMinutes = att.visit_minutes || 90;
      const startIso = `${actDate}T10:00:00`;
      const endIso = shift(startIso, visitMinutes);

      attractionItems.push({
        ...att,
        date: actDate,
        day_number: d + 1,
        visit_minutes: visitMinutes,
        start_time: '10:00',
        end_time: endIso.slice(11, 16),
        start_local: startIso,
        end_local: endIso,
        total: attCost
      });
    }
  }

  // 6. Pricing Calculation (Flattened + Breakdown for Sidebar & UI)
  const flightsTotal = flightItems.reduce((acc, f) => acc + (f.total || 0), 0);
  const hotelsTotal = hotelStays.reduce((acc, h) => acc + (h.total || 0), 0);
  const transfersTotal = transferItems.reduce((acc, t) => acc + (t.total || 0), 0);
  const attractionsTotal = attractionItems.reduce((acc, a) => acc + (a.total || 0), 0);
  const grandTotal = flightsTotal + hotelsTotal + transfersTotal + attractionsTotal;
  const userBudget = Number(req.budget);

  const pricing = {
    total: grandTotal,
    budget: userBudget,
    currency: 'INR',
    within_budget: grandTotal <= userBudget,
    variance: grandTotal - userBudget,
    variance_percentage: userBudget ? Math.round(((grandTotal - userBudget) / userBudget) * 100) : 0,
    per_traveler: Math.round(grandTotal / travelers),
    flights: flightsTotal,
    hotels: hotelsTotal,
    transfers: transfersTotal,
    attractions: attractionsTotal,
    breakdown: {
      flights: flightsTotal,
      hotels: hotelsTotal,
      transfers: transfersTotal,
      attractions: attractionsTotal
    }
  };

  // 7. Day-by-Day Itinerary
  const itinerary = [];
  for (let i = 0; i <= totalNights; i++) {
    const currentDate = day(startDate, i);
    let activeCity = cityPlan[0].city;
    let nightSum = 0;
    for (const seg of cityPlan) {
      nightSum += seg.nights;
      if (i < nightSum) {
        activeCity = seg.city;
        break;
      }
      activeCity = seg.city;
    }

    const events = [];
    if (i === 0) {
      events.push({
        id: inboundFlight.flight_id,
        type: 'flight',
        title: `${inboundFlight.airline} · ${inboundFlight.from} → ${inboundFlight.to}`,
        start_local: inboundFlight.departure_local,
        end_local: inboundFlight.arrival_local,
        description: `Flight ${inboundFlight.flight_number} · Arrival in ${firstCity}`,
        timezone: country.timezone || 'UTC'
      });
      events.push({
        id: transferItems[0].id,
        type: 'transfer',
        title: transferItems[0].name,
        start_local: transferItems[0].departure_local,
        end_local: transferItems[0].arrival_local,
        description: `Airport transfer to ${firstHotelArea || firstCity}`,
        timezone: country.timezone || 'UTC'
      });
    }

    const dayAtts = attractionItems.filter(a => a.date === currentDate);
    for (const att of dayAtts) {
      events.push({
        id: att.attraction_id,
        type: 'attraction',
        title: att.name,
        start_local: `${currentDate}T${att.start_time}:00`,
        end_local: `${currentDate}T${att.end_time}:00`,
        description: `${att.duration_minutes} min visit in ${att.city}`,
        timezone: country.timezone || 'UTC'
      });
    }

    if (i < totalNights) {
      const currentHotel = hotelStays.find(h => h.check_in <= currentDate && currentDate < h.check_out) || hotelStays[0];
      if (currentHotel) {
        events.push({
          id: `hotel-${currentHotel.hotel_id}-${i}`,
          type: 'hotel',
          title: `${currentHotel.name} (${currentHotel.city})`,
          start_local: `${currentDate}T15:00:00`,
          end_local: `${currentDate}T23:59:00`,
          description: `${currentHotel.room_name} · Overnight stay`,
          timezone: country.timezone || 'UTC'
        });
      }
    }

    if (i === totalNights) {
      const returnTrans = transferItems.find(t => t.id.startsWith('return'));
      if (returnTrans) {
        events.push({
          id: returnTrans.id,
          type: 'transfer',
          title: returnTrans.name,
          start_local: returnTrans.departure_local,
          end_local: returnTrans.arrival_local,
          description: `Transfer to ${outAirport}`,
          timezone: country.timezone || 'UTC'
        });
      }
      events.push({
        id: returnFlight.flight_id,
        type: 'flight',
        title: `${returnFlight.airline} · ${returnFlight.from} → ${returnFlight.to}`,
        start_local: returnFlight.departure_local,
        end_local: returnFlight.arrival_local,
        description: `Flight ${returnFlight.flight_number} · Return flight to ${req.departure_airport}`,
        timezone: country.timezone || 'UTC'
      });
    }

    itinerary.push({
      date: currentDate,
      city: i === totalNights ? 'Departure' : activeCity,
      title: i === 0 ? `Arrival in ${firstCity}` : i === totalNights ? 'Homeward Bound' : `Explore ${activeCity}`,
      events
    });
  }

  const packageId = options.id || `pkg-${Date.now()}`;
  const warnings = [];

  const pkg = {
    id: packageId,
    status: 'DRAFT',
    country: req.country,
    country_name: country.name,
    request: {
      ...req,
      preferences: req.preferences || {
        attraction_types: [],
        hotel_category: '',
        travel_pace: 'Balanced',
        accessibility: false
      }
    },
    return_date: returnDate,
    city_plan: cityPlan,
    flights: flightItems,
    hotels: hotelStays,
    transfers: transferItems,
    attractions: attractionItems,
    pricing,
    itinerary,
    warnings,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  return pkg;
}

// Find component alternatives from MongoDB
async function findAlternativesFromDB(pkg, query) {
  const dbCatalog = await fetchCatalogFromDB();
  const { catalog, flights, hotels, rooms, attractions } = dbCatalog;
  const r = pkg.request;
  const { type, leg, city } = query;
  const totalTravelers = getTravelersCount(r);
  const adults = Number(r.adults);

  if (type === 'flight') {
    const countryObj = catalog.countries?.find(c => c.code === r.country);
    const allowedAirports = countryObj?.cities?.flatMap(c => c.airports) || [];
    const returnDate = day(r.start_date, r.nights);

    const list = flights
      .filter(f =>
        leg === 'inbound'
          ? f.from === r.departure_airport && allowedAirports.includes(f.to) && f.arrival_local?.startsWith(r.start_date)
          : f.to === r.departure_airport && allowedAirports.includes(f.from) && f.departure_local?.startsWith(returnDate)
      )
      .map(f => {
        const total = f.price_per_seat.amount * totalTravelers;
        const currentFlight = pkg.flights.find(x => x.leg === leg);
        return {
          ...f,
          id: f.flight_id,
          current: currentFlight?.flight_id === f.flight_id,
          total,
          selection: { flight_id: f.flight_id },
          price_difference: total - (currentFlight?.total || 0),
        };
      });
    return { options: list };
  }

  if (type === 'hotel') {
    const targetCity = city || pkg.city_plan[0].city;
    const stop = pkg.city_plan.find(c => c.city === targetCity) || { nights: r.nights };
    const currentHotel = pkg.hotels.find(h => h.city === targetCity);
    const cityHotels = hotels.filter(h => h.city === targetCity);

    const list = [];
    for (const h of cityHotels) {
      const hotelRooms = rooms.filter(rm => rm.hotel_id === h.hotel_id);
      for (const rm of hotelRooms) {
        const k = calculateRoomsForParty(adults, totalTravelers, rm);
        if (!k) continue;

        const total = (rm.price_per_night?.amount || 8000) * k * stop.nights;
        list.push({
          ...h,
          room_id: rm.room_id,
          room_name: rm.name,
          rooms: k,
          nights: stop.nights,
          capacity: k * ((rm.max_adults || 2) + (rm.max_children || 0)),
          total,
          id: rm.room_id,
          current: currentHotel?.room_id === rm.room_id,
          selection: { hotel_id: h.hotel_id, room_id: rm.room_id, rooms: k },
          price_difference: total - (currentHotel?.total || 0)
        });
      }
    }
    return { options: list };
  }

  if (type === 'attraction') {
    const tripCities = pkg.city_plan.map(c => c.city);
    const list = attractions
      .filter(a => tripCities.includes(a.city))
      .map(a => {
        const current = pkg.attractions?.some(x => x.attraction_id === a.attraction_id);
        const total = perPerson(a, r, 'price_per_person');
        return {
          ...a,
          id: a.attraction_id,
          current,
          total,
          selection: { attraction_id: a.attraction_id }
        };
      });
    return { options: list };
  }

  if (type === 'city_plan') {
    const options = r.country === 'JP'
      ? [
        { id: 'plan-1', plan: [{ city: 'Tokyo', nights: 4 }, { city: 'Kyoto', nights: 2 }], label: 'Tokyo (4 nights) + Kyoto (2 nights)' },
        { id: 'plan-2', plan: [{ city: 'Tokyo', nights: 3 }, { city: 'Osaka', nights: 3 }], label: 'Tokyo (3 nights) + Osaka (3 nights)' },
        { id: 'plan-3', plan: [{ city: 'Tokyo', nights: 6 }], label: 'Tokyo in-depth (6 nights)' }
      ]
      : [
        { id: 'plan-1', plan: [{ city: 'Dubai', nights: 4 }, { city: 'Abu Dhabi', nights: 2 }], label: 'Dubai (4 nights) + Abu Dhabi (2 nights)' },
        { id: 'plan-2', plan: [{ city: 'Dubai', nights: 6 }], label: 'Dubai in-depth (6 nights)' }
      ];
    return { options };
  }

  return { options: [] };
}

// Modify an existing package component
async function modifyPackageInDB(pkg, change) {
  const dbCatalog = await fetchCatalogFromDB();
  const { flights, hotels, rooms, attractions } = dbCatalog;
  const warnings = [];

  if (change.type === 'flight') {
    const flightId = change.selection?.flight_id;
    const targetFlight = flights.find(f => f.flight_id === flightId);
    if (!targetFlight) {
      throw new Error(`Flight ${flightId} is not available.`);
    }

    const leg = change.leg || 'inbound';
    const travelers = getTravelersCount(pkg.request);

    pkg.flights = pkg.flights.map(old => {
      if (old.leg === leg) {
        return {
          ...targetFlight,
          leg,
          passengers: travelers,
          total: travelers * targetFlight.price_per_seat.amount
        };
      }
      return old;
    });

    // Update itinerary flight events
    if (pkg.itinerary?.length) {
      for (const dayItem of pkg.itinerary) {
        dayItem.events = dayItem.events.map(ev => {
          if (ev.type === 'flight' && ((leg === 'inbound' && ev.title?.includes(targetFlight.from)) || (leg === 'return' && ev.title?.includes(targetFlight.to)))) {
            return {
              ...ev,
              id: targetFlight.flight_id,
              title: `${targetFlight.airline} · ${targetFlight.from} → ${targetFlight.to}`,
              start_local: targetFlight.departure_local,
              end_local: targetFlight.arrival_local,
              description: `Flight ${targetFlight.flight_number}`
            };
          }
          return ev;
        });
      }
    }

    if (leg === 'inbound') {
      warnings.push(`Flight arrival updated. Your airport pickup has been automatically adjusted to ${shift(targetFlight.arrival_local, 60).slice(11, 16)} local time.`);
    }
  } else if (change.type === 'hotel') {
    const hotelId = change.selection?.hotel_id;
    const roomId = change.selection?.room_id;
    const targetHotel = hotels.find(h => h.hotel_id === hotelId);
    const targetRoom = rooms.find(r => r.room_id === roomId);

    if (!targetHotel || !targetRoom) {
      throw new Error('Selected hotel or room is no longer available.');
    }

    const city = change.city || targetHotel.city;
    const travelers = getTravelersCount(pkg.request);
    const adults = Number(pkg.request.adults);
    const k = change.selection?.rooms || calculateRoomsForParty(adults, travelers, targetRoom) || 1;

    pkg.hotels = pkg.hotels.map(h => {
      if (h.city === city) {
        return {
          ...targetHotel,
          room_id: targetRoom.room_id,
          room_name: targetRoom.name,
          rooms: k,
          nights: h.nights,
          capacity: k * ((targetRoom.max_adults || 2) + (targetRoom.max_children || 0)),
          check_in: h.check_in,
          check_out: h.check_out,
          total: (targetRoom.price_per_night?.amount || 8000) * k * h.nights,
          refundable: true
        };
      }
      return h;
    });

    // Update itinerary hotel events
    if (pkg.itinerary?.length) {
      for (const dayItem of pkg.itinerary) {
        dayItem.events = dayItem.events.map(ev => {
          if (ev.type === 'hotel' && ev.title?.includes(city)) {
            return {
              ...ev,
              title: `${targetHotel.name} (${city})`,
              description: `${targetRoom.name} · Overnight stay`
            };
          }
          return ev;
        });
      }
    }

    warnings.push(`Accommodation updated to ${targetHotel.name} (${targetRoom.name}). Check-in from 15:00.`);
  } else if (change.type === 'attraction') {
    if (change.action === 'replace_all' && Array.isArray(change.attraction_ids)) {
      const newAttractions = [];
      if (pkg.itinerary?.length) {
        for (const dayItem of pkg.itinerary) {
          dayItem.events = dayItem.events.filter(ev => ev.type !== 'attraction');
        }
      }

      for (let i = 0; i < change.attraction_ids.length; i++) {
        const id = change.attraction_ids[i];
        const targetAttr = attractions.find(a => a.attraction_id === id);
        if (!targetAttr) continue;
        const tripDay = 1 + (i % Math.max(1, pkg.request.nights - 1));
        const visitDate = day(pkg.request.start_date, tripDay);
        const startTime = `${visitDate}T${targetAttr.open_from || '10:00'}:00`;
        const endTime = shift(startTime, targetAttr.visit_minutes || 90);
        const attCost = perPerson(targetAttr, pkg.request, 'price_per_person');

        newAttractions.push({
          ...targetAttr,
          start_local: startTime,
          end_local: endTime,
          total: attCost,
        });

        if (pkg.itinerary?.[tripDay]) {
          pkg.itinerary[tripDay].events.push({
            id: targetAttr.attraction_id,
            type: 'attraction',
            title: targetAttr.name,
            start_local: startTime,
            end_local: endTime,
            description: `${targetAttr.visit_minutes || 90} min visit in ${targetAttr.city}`,
            timezone: targetAttr.city === 'Dubai' || targetAttr.city === 'Abu Dhabi' ? 'Asia/Dubai' : 'Asia/Tokyo'
          });
        }
      }
      pkg.attractions = newAttractions;
      warnings.push(`Itinerary attractions updated (${newAttractions.length} experience(s) selected).`);
    } else {
      const attrId = change.selection?.attraction_id;
      if (change.action === 'remove') {
        pkg.attractions = pkg.attractions.filter(a => a.attraction_id !== attrId);
        if (pkg.itinerary?.length) {
          for (const dayItem of pkg.itinerary) {
            dayItem.events = dayItem.events.filter(ev => ev.id !== attrId);
          }
        }
      } else {
        if (pkg.attractions.some(a => a.attraction_id === attrId)) {
          throw new Error('This attraction is already part of your itinerary.');
        }
        const targetAttr = attractions.find(a => a.attraction_id === attrId);
        if (!targetAttr) {
          throw new Error('Attraction not found.');
        }
        const tripDay = 1 + (pkg.attractions.length % Math.max(1, pkg.request.nights - 1));
        const visitDate = day(pkg.request.start_date, tripDay);
        const startTime = `${visitDate}T${targetAttr.open_from || '11:00'}:00`;
        const endTime = shift(startTime, targetAttr.visit_minutes || 90);
        const attCost = perPerson(targetAttr, pkg.request, 'price_per_person');

        const newAtt = {
          ...targetAttr,
          start_local: startTime,
          end_local: endTime,
          total: attCost,
        };
        pkg.attractions.push(newAtt);

        if (pkg.itinerary?.[tripDay]) {
          pkg.itinerary[tripDay].events.push({
            id: targetAttr.attraction_id,
            type: 'attraction',
            title: targetAttr.name,
            start_local: startTime,
            end_local: endTime,
            description: `${targetAttr.visit_minutes || 90} min visit in ${targetAttr.city}`,
            timezone: targetAttr.city === 'Dubai' || targetAttr.city === 'Abu Dhabi' ? 'Asia/Dubai' : 'Asia/Tokyo'
          });
        }
      }
    }
  } else if (change.type === 'city_plan') {
    const rebuilt = await buildPackageFromDB(pkg.request, { cityPlan: change.plan, id: pkg.id });
    return rebuilt;
  }

  // Recalculate totals
  const flightsTotal = pkg.flights.reduce((sum, f) => sum + (f.total || 0), 0);
  const hotelsTotal = pkg.hotels.reduce((sum, h) => sum + (h.total || 0), 0);
  const transfersTotal = (pkg.transfers || []).reduce((sum, t) => sum + (t.total || 0), 0);
  const attractionsTotal = (pkg.attractions || []).reduce((sum, a) => sum + (a.total || 0), 0);
  const grandTotal = flightsTotal + hotelsTotal + transfersTotal + attractionsTotal;
  const userBudget = Number(pkg.request.budget);
  const travelers = getTravelersCount(pkg.request);

  pkg.pricing = {
    total: grandTotal,
    budget: userBudget,
    currency: 'INR',
    within_budget: grandTotal <= userBudget,
    variance: grandTotal - userBudget,
    variance_percentage: userBudget ? Math.round(((grandTotal - userBudget) / userBudget) * 100) : 0,
    per_traveler: Math.round(grandTotal / travelers),
    flights: flightsTotal,
    hotels: hotelsTotal,
    transfers: transfersTotal,
    attractions: attractionsTotal,
    breakdown: {
      flights: flightsTotal,
      hotels: hotelsTotal,
      transfers: transfersTotal,
      attractions: attractionsTotal
    }
  };

  pkg.warnings = warnings;
  pkg.updatedAt = new Date();
  return pkg;
}

module.exports = {
  fetchCatalogFromDB,
  buildPackageFromDB,
  findAlternativesFromDB,
  modifyPackageInDB,
  getCityPlan
};
