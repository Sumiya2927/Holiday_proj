
const mongoose = require("mongoose");

// Validate the user's holiday request
const validateRequest = (request) => {
  const {
    departureCity,
    destinationCountry,
    startDate,
    nights,
    adults,
    childrenAges,
    budget
  } = request;

  if (
    !departureCity ||
    !destinationCountry ||
    !startDate ||
    nights === undefined ||
    adults === undefined ||
    !Array.isArray(childrenAges) ||
    budget === undefined
  ) {
    throw new Error("All holiday request fields are required.");
  }

  if (!Number.isInteger(nights) || nights < 3 || nights > 10) {
    throw new Error("Holiday duration must be between 3 and 10 nights.");
  }

  if (!Number.isInteger(adults) || adults < 1) {
    throw new Error("At least one adult is required.");
  }

  if (
    childrenAges.some(
      age => !Number.isInteger(age) || age < 0 || age > 17
    )
  ) {
    throw new Error("Children's ages must be between 0 and 17.");
  }

  if (typeof budget !== "number" || budget <= 0) {
    throw new Error("Please enter a valid budget.");
  }

  const arrivalDate = new Date(`${startDate}T00:00:00Z`);

  if (Number.isNaN(arrivalDate.getTime())) {
    throw new Error("Invalid holiday start date.");
  }

  if (
    arrivalDate < new Date("2027-04-01T00:00:00Z") ||
    arrivalDate > new Date("2027-04-20T00:00:00Z")
  ) {
    throw new Error("Holiday start date is outside the permitted travel period.");
  }

  const returnDate = new Date(arrivalDate);
  returnDate.setUTCDate(returnDate.getUTCDate() + nights);

  if (returnDate > new Date("2027-04-20T00:00:00Z")) {
    throw new Error("Return flight must be by 20 April 2027.");
  }

  return true;
};


// Retrieve all catalog collections from MongoDB
const getCatalogData = async () => {
  const db = mongoose.connection.db;

  const [
    destinations,
    airports,
    flights,
    hotels,
    rooms,
    availability,
    transfers,
    attractions
  ] = await Promise.all([
    db.collection("destinations").find({}).toArray(),
    db.collection("airports").find({}).toArray(),
    db.collection("flights").find({}).toArray(),
    db.collection("hotels").find({}).toArray(),
    db.collection("rooms").find({}).toArray(),
    db.collection("availability").find({}).toArray(),
    db.collection("transfers").find({}).toArray(),
    db.collection("attractions").find({}).toArray()
  ]);

  return {
    destinations,
    airports,
    flights,
    hotels,
    rooms,
    availability,
    transfers,
    attractions
  };
};


// Find the cheapest eligible flight
const selectFlight = (flights, from, to, date, dateField, travelers) => {
  const eligibleFlights = flights.filter(flight => {
    const flightDate = flight[dateField]?.slice(0, 10);

    return (
      flight.from === from &&
      flight.to === to &&
      flightDate === date &&
      flight.seats_left >= travelers &&
      flight.price_per_seat?.currency === "INR"
    );
  });

  // Sort by price: cheapest flight first
  eligibleFlights.sort(
    (a, b) =>
      a.price_per_seat.amount - b.price_per_seat.amount
  );

  return eligibleFlights.length > 0
    ? eligibleFlights[0]
    : null;
};


// Select outbound and return flights
const selectFlights = (
  flights,
  departureAirport,
  arrivalAirport,
  startDate,
  returnDate,
  travelers
) => {
  const outbound = selectFlight(
    flights,
    departureAirport,
    arrivalAirport,
    startDate,
    "arrival_local",
    travelers
  );

  const returning = selectFlight(
    flights,
    arrivalAirport,
    departureAirport,
    returnDate,
    "departure_local",
    travelers
  );

  if (!outbound || !returning) {
    return null;
  }

  return {
    outbound,
    returning,
    totalFlightCost:
      (outbound.price_per_seat.amount +
       returning.price_per_seat.amount) * travelers
  };
};


const getDepartureAirport = (destinations, departureCity) => {
  const catalog = destinations[0];

  const departure = catalog.departure_cities.find(
    item =>
      item.city.toLowerCase() === departureCity.toLowerCase()
  );

  return departure ? departure.airport : null;
};


const getDestinationAirports = (destinations, countryName, cityName) => {
  const catalog = destinations[0];

  const country = catalog.countries.find(
    item =>
      item.name.toLowerCase() === countryName.toLowerCase()
  );

  if (!country) return null;

  const city = country.cities.find(
    item =>
      item.name.toLowerCase() === cityName.toLowerCase()
  );

  return city ? city.airports : null;
};


const selectCities = (destinations, countryName, nights) => {
  const catalog = destinations[0];

  const country = catalog.countries.find(
    item =>
      item.name.toLowerCase() === countryName.toLowerCase()
  );

  if (!country) {
    throw new Error("Selected destination country is not available.");
  }

  // Each city must have at least 2 nights
  const maxCities = Math.floor(nights / 2);

  const cities = country.cities;
  const links = country.links;

  // Start with the first city in the catalog
  const selectedCities = [cities[0]];

  // Add cities only when a direct transfer link exists
  for (const city of cities.slice(1)) {
    if (selectedCities.length >= maxCities) {
      break;
    }

    const previousCity =
      selectedCities[selectedCities.length - 1];

    const hasTransfer = links.some(
      link =>
        link.from_city === previousCity.name &&
        link.to_city === city.name
    );

    if (hasTransfer) {
      selectedCities.push(city);
    }
  }

  return selectedCities;
};


const selectHotelForCity = (
  hotels,
  rooms,
  availability,
  cityName,
  checkInDate,
  nights,
  adults,
  childrenAges
) => {
  const children = childrenAges.length;

  // Generate all hotel stay dates
  const stayDates = [];

  const start = new Date(`${checkInDate}T00:00:00Z`);

  for (let i = 0; i < nights; i++) {
    const date = new Date(start);
    date.setUTCDate(date.getUTCDate() + i);
    stayDates.push(date.toISOString().slice(0, 10));
  }

  // Find hotels in the selected city
  const cityHotels = hotels.filter(
    hotel => hotel.city === cityName
  );

  const availableOptions = [];

  for (const hotel of cityHotels) {
    // Find rooms belonging to this hotel
    const hotelRooms = rooms.filter(
      room =>
        room.hotel_id === hotel.hotel_id &&
        room.max_adults >= adults &&
        room.max_children >= children &&
        room.price_per_night?.currency === "INR"
    );

    for (const room of hotelRooms) {
      // Check availability on every night
      const isAvailable = stayDates.every(date =>
        availability.some(
          item =>
            item.room_id === room.room_id &&
            item.date === date &&
            item.rooms_left >= 1
        )
      );

      if (!isAvailable) continue;

      const totalCost =
        room.price_per_night.amount * nights;

      availableOptions.push({
        hotel,
        room,
        checkInDate,
        checkOutDate: stayDates[nights - 1]
          ? (() => {
              const checkout = new Date(
                `${stayDates[nights - 1]}T00:00:00Z`
              );
              checkout.setUTCDate(checkout.getUTCDate() + 1);
              return checkout.toISOString().slice(0, 10);
            })()
          : checkInDate,
        nights,
        totalCost
      });
    }
  }

  // Choose the cheapest available room
  availableOptions.sort(
    (a, b) => a.totalCost - b.totalCost
  );

  return availableOptions.length > 0
    ? availableOptions[0]
    : null;
};


const selectIntercityTransfer = (
  transfers,
  transferIds,
  adults,
  childrenAges
) => {
  const children = childrenAges.length;

  // Find transfers referenced by the destination link
  const options = transfers.filter(
    transfer =>
      transferIds.includes(transfer.transfer_id) &&
      transfer.type !== "AIRPORT_TAXI" &&
      transfer.type !== "AIRPORT_BUS" &&
      transfer.type !== "AIRPORT_VAN" &&
      transfer.price?.currency === "INR"
  );

  const availableOptions = options.map(transfer => {
    let totalCost = 0;

    if (transfer.pricing === "PER_PERSON") {
      const childPrice =
        transfer.child_price?.amount ??
        transfer.price.amount;

      totalCost =
        adults * transfer.price.amount +
        children * childPrice;
    } else if (transfer.pricing === "PER_VEHICLE") {
      const passengers = adults + children;

      const vehicles = Math.ceil(
        passengers / transfer.max_passengers
      );

      totalCost = vehicles * transfer.price.amount;
    } else {
      return null;
    }

    return {
      ...transfer,
      totalCost
    };
  }).filter(Boolean);

  // Select the cheapest transfer
  availableOptions.sort(
    (a, b) => a.totalCost - b.totalCost
  );

  return availableOptions.length > 0
    ? availableOptions[0]
    : null;
};


const selectAttractionsForDay = (
  attractions,
  cityName,
  visitDate,
  adults,
  childrenAges,
  alreadySelected = []
) => {
  const children = childrenAges.length;

  const weekday = new Date(
    `${visitDate}T00:00:00Z`
  )
    .toLocaleDateString("en-US", {
      weekday: "short",
      timeZone: "UTC"
    })
    .toUpperCase();

  const options = attractions.filter(attraction => {
    return (
      attraction.city === cityName &&
      attraction.open_days?.includes(weekday) &&
      !alreadySelected.includes(attraction.attraction_id) &&
      attraction.price_per_person?.currency === "INR" &&
      (children === 0 || attraction.child_friendly === true)
    );
  });

  // Prefer free attractions, then lower-priced attractions
  options.sort(
    (a, b) =>
      a.price_per_person.amount -
      b.price_per_person.amount
  );

  const selected = [];
  let currentTime = 10 * 60; // Start at 10:00 AM

  for (const attraction of options) {
    if (selected.length >= 2) break;

    const [openHour, openMinute] =
      attraction.open_from.split(":").map(Number);

    const [closeHour, closeMinute] =
      attraction.open_until.split(":").map(Number);

    const openingTime = openHour * 60 + openMinute;
    const closingTime = closeHour * 60 + closeMinute;

    const startTime = Math.max(
      currentTime,
      openingTime
    );

    const endTime = startTime + attraction.visit_minutes;

    if (startTime >= openingTime && endTime <= closingTime) {
      const childPrice =
        attraction.child_price?.amount ??
        attraction.price_per_person.amount;

      const totalCost =
        adults * attraction.price_per_person.amount +
        children * childPrice;

      const formatTime = minutes =>
        `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;

      selected.push({
        ...attraction,
        visit_date: visitDate,
        start_time: formatTime(startTime),
        end_time: formatTime(endTime),
        totalCost
      });

      currentTime = endTime + 30;
    }
  }

  return selected;
};


const selectAirportTransfer = (
  transfers,
  airportCode,
  hotelArea,
  adults,
  childrenAges
) => {
  const children = childrenAges.length;
  const passengers = adults + children;

  const options = transfers.filter(transfer =>
    transfer.airport === airportCode &&
    transfer.area === hotelArea &&
    transfer.type?.startsWith("AIRPORT_") &&
    transfer.price?.currency === "INR" &&
    transfer.max_passengers >= passengers
  );

  const availableOptions = options.map(transfer => {
    let totalCost;

    if (transfer.pricing === "PER_PERSON") {
      const childPrice =
        transfer.child_price?.amount ??
        transfer.price.amount;

      totalCost =
        adults * transfer.price.amount +
        children * childPrice;
    } else if (transfer.pricing === "PER_VEHICLE") {
      totalCost = transfer.price.amount;
    } else {
      return null;
    }

    return {
      ...transfer,
      totalCost
    };
  }).filter(Boolean);

  availableOptions.sort(
    (a, b) => a.totalCost - b.totalCost
  );

  return availableOptions.length > 0
    ? availableOptions[0]
    : null;
};


module.exports = {
  validateRequest,
  getCatalogData,
  selectFlight,
  selectFlights,
  getDepartureAirport,
  getDestinationAirports,
  selectCities,
  selectHotelForCity,
  selectIntercityTransfer,
  selectAttractionsForDay,
  selectAirportTransfer
};