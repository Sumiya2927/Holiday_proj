
const mongoose = require("mongoose");
require("dotenv").config();

const {
  validateRequest,
  getCatalogData,
  getDepartureAirport,
  getDestinationAirports,
  selectCities,
  selectFlight,
  selectFlights,
  selectHotelForCity,
  selectIntercityTransfer,
  selectAttractionsForDay,
  selectAirportTransfer
} = require("./services/packageService");

const test = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    console.log("\n==================================");
    console.log(" BUILD MY HOLIDAY - BACKEND TESTS ");
    console.log("==================================");

    const catalog = await getCatalogData();

    console.log("\n1. CATALOG DATA");
    Object.entries(catalog).forEach(([name, records]) => {
      console.log(`${name}: ${records.length} records`);
    });

    console.log("\n2. REQUEST VALIDATION");

    const request = {
      departureCity: "Bengaluru",
      destinationCountry: "Japan",
      startDate: "2027-04-10",
      nights: 6,
      adults: 2,
      childrenAges: [6],
      budget: 350000
    };

    console.log("Valid request:", validateRequest(request));

    console.log("\n3. DEPARTURE AIRPORT");

    const departureAirport = getDepartureAirport(
      catalog.destinations,
      "Bengaluru"
    );

    console.log("Bengaluru airport:", departureAirport);

    console.log("\n4. DESTINATION AIRPORTS");

    const destinationAirports = getDestinationAirports(
      catalog.destinations,
      "Japan",
      "Tokyo"
    );

    console.log("Tokyo airports:", destinationAirports);

    console.log("\n5. CITY SELECTION");

    const cities = selectCities(
      catalog.destinations,
      "Japan",
      6
    );

    console.log(
      "Selected cities:",
      cities.map(city => city.name)
    );

    console.log("\n6. OUTBOUND FLIGHT");

    const outbound = selectFlight(
      catalog.flights,
      "BLR",
      "NRT",
      "2027-04-10",
      "arrival_local",
      3
    );

    console.log(outbound || "No matching outbound flight");

    console.log("\n7. RETURN FLIGHT");

    const returning = selectFlight(
      catalog.flights,
      "KIX",
      "BLR",
      "2027-04-16",
      "departure_local",
      3
    );

    console.log(returning || "No matching return flight");

    console.log("\n8. HOTEL SELECTION");

    const hotel = selectHotelForCity(
      catalog.hotels,
      catalog.rooms,
      catalog.availability,
      "Tokyo",
      "2027-04-10",
      2,
      2,
      [6]
    );

    console.log(hotel || "No matching hotel");

    console.log("\n9. INTERCITY TRANSFER");

    const japan = catalog.destinations[0].countries.find(
      country => country.name === "Japan"
    );

    const tokyoKyotoLink = japan.links.find(
      link =>
        link.from_city === "Tokyo" &&
        link.to_city === "Kyoto"
    );

    const intercityTransfer = selectIntercityTransfer(
      catalog.transfers,
      tokyoKyotoLink.transfer_ids,
      2,
      [6]
    );

    console.log(intercityTransfer || "No matching transfer");

    console.log("\n10. AIRPORT TRANSFER");

    const airportTransfer = selectAirportTransfer(
      catalog.transfers,
      "NRT",
      "Shibuya",
      2,
      [6]
    );

    console.log(airportTransfer || "No matching airport transfer");

    console.log("\n11. ATTRACTION SELECTION");

    const attractions = selectAttractionsForDay(
      catalog.attractions,
      "Kyoto",
      "2027-04-12",
      2,
      [6],
      []
    );

    console.log(
      attractions.length > 0
        ? attractions.map(item => ({
            name: item.name,
            start: item.start_time,
            end: item.end_time,
            cost: item.totalCost
          }))
        : "No matching attractions"
    );

    console.log("\n12. COMBINED FLIGHT SELECTION HELPER");

    const combinedFlights = selectFlights(
      catalog.flights,
      "BLR",
      "NRT",
      "2027-04-10",
      "2027-04-16",
      3
    );

    console.log(combinedFlights || "No matching flight combination");

    console.log("\n==================================");
    console.log(" BACKEND TESTING COMPLETED ");
    console.log("==================================");

  } catch (error) {
    console.error("\nTEST ERROR:", error.message);
  } finally {
    await mongoose.disconnect();
  }
};

test();
