# Frontend API handoff

No backend exists in this checkout. This is the **proposed integration contract**, based on the original build prompt. Adapt `client/src/api/http.js` when the backend contract is available. Tests use fixtures; the application never falls back to them.

## Transport

`VITE_API_BASE_URL` defaults to `/api`. During Vite development `/api` proxies to `http://127.0.0.1:3000`. Set `client/.env.local` for a different base URL (the backend must allow the frontend origin if cross-origin).

Success: `{ "success": true, "data": ... }`. Failure: `{ "success": false, "error": { "code": "...", "message": "Traveler-readable explanation", "details": {} } }` with an appropriate HTTP status. Export returns a JSON file directly. The UI handles transport failures and non-JSON errors.

## Operations

| Method | Path (after `/api`) | Data / behavior |
|---|---|---|
| GET | `/catalog/options` | `{ departure_cities: [{ airport, city }], countries: [{ code, name }], rules }` |
| POST | `/packages/generate` | Trip request below; returns complete package |
| GET | `/packages/:id` | Complete current package |
| GET | `/packages/:id/alternatives?type=flight&leg=inbound` | `{ options: [...] }`; `leg` is `inbound` or `return` |
| GET | `/packages/:id/alternatives?type=hotel&city=Tokyo` | Eligible complete-stay hotel/room combinations |
| GET | `/packages/:id/alternatives?type=attraction` | Eligible attractions for the whole trip |
| PATCH | `/packages/:id` | Modification below; returns entire revalidated package |
| POST | `/packages/:id/confirm` | Idempotently confirms; returns entire booked package |
| GET | `/reservations/:reference` | Complete immutable booked package; 404 when absent |
| GET | `/packages/:id/export` | Authoritative downloadable JSON, not an envelope |

Trip request has exactly seven logical inputs:

```json
{
  "departure_airport": "BLR",
  "country": "JP",
  "start_date": "2027-04-10",
  "nights": 6,
  "adults": 2,
  "children_ages": [6],
  "budget": 350000
}
```

The start date is destination arrival date. The frontend validates the supplied 3–10 night and April 2027 input rules; the backend must validate everything independently.

## Package view model

All arrays below are required, even when empty. Numbers are numbers; IDs and references are strings. This is a frontend view model, **not the official judge export schema**.

```text
Package {
  id, status: "DRAFT" | "BOOKED", country: "JP" | "AE", country_name,
  request: TripRequest, return_date: "YYYY-MM-DD",
  booking?: { reference: exactly ten digit characters },
  city_plan: [{ city, nights }],
  pricing: { flights, hotels, transfers, attractions, total, budget },
  flights: [{ flight_id, leg: "inbound" | "return", airline, flight_number,
    from, to, departure_local, arrival_local, departure_timezone,
    arrival_timezone, duration_minutes, stops, passengers, cabin, total }],
  hotels: [{ hotel_id, room_id, name, city, area, stars, image?, room_name,
    rooms, nights, check_in, check_out, total }],
  transfers: [{ id, transfer_id, name, from, to, departure_local,
    timezone, duration_minutes, type, total }],
  attractions: [{ attraction_id, name, city, image?, start_local,
    end_local, visit_minutes, total }],
  itinerary: [{ date, city, title, events: [{ id,
    type: "flight" | "hotel" | "transfer" | "attraction",
    title, description, start_local, end_local?, timezone,
    start_at: ISO UTC timestamp }] }]
}
```

Component prices are final group totals supplied by the backend. The frontend only formats amounts and subtracts displayed total from displayed budget. Times are displayed literally as catalog-local times with IANA timezone labels. Events sort on `start_at`; return standardized UTC timestamps so lexical order matches chronological order. The backend groups days and includes the previous-day Indian flight when appropriate. It must not emit hotel nights or attractions on the return day. The UI does not hide invalid server events or claim to validate travel rules.

## Alternatives and mutations

Every alternative includes `id`, `total`, optional `price_difference`, `current`, `available` (false disables selection), optional traveler-readable `reason`, and a `selection` object containing the original catalog IDs and required choice metadata.

- Flight display fields: `airline`, `flight_number`, `from`, `to`, `departure_local`, `arrival_local`, `duration_minutes`. Selection: `{ flight_id }`.
- Hotel display fields: `name`, `image?`, `city`, `area`, `room_name`, `rooms`, `nights`, `capacity`. Selection: `{ hotel_id, room_id, rooms }`.
- Attraction fields: `attraction_id`, `name`, `city`, `open_from`, `open_until`, `visit_minutes`. Selection: `{ attraction_id }`. The backend chooses a valid schedule on addition.

PATCH examples:

```json
{ "type": "flight", "leg": "inbound", "selection": { "flight_id": "catalog-flight-id" } }
```
```json
{ "type": "hotel", "city": "Tokyo", "selection": { "hotel_id": "catalog-hotel-id", "room_id": "catalog-room-id", "rooms": 1 } }
```
```json
{ "type": "attraction", "action": "remove", "selection": { "attraction_id": "catalog-attraction-id" } }
```

The backend must apply a change atomically after full validation, return recalculated itinerary/pricing, and reject changes to BOOKED packages. The UI retains the previous package until success, and sends one attraction add/remove per request.

## Errors and confirmation

- `OVER_BUDGET`: optional `details: { budget, lowest_valid_total, suggestions: string[] }`. Return `lowest_valid_total` only when a minimum is proven.
- `NO_VALID_PACKAGE`: explanatory message and optional suggestions.
- `SEARCH_INCOMPLETE`: honest incomplete-search message; no claim of impossibility or global minimum.
- Validation/conflict errors: clear `message`; existing package stays unchanged.
- HTTP 404 for missing package/reservation. Unknown reference displays “Reservation not found”.

Confirmation must be idempotent per package on the server. The UI prevents concurrent clicks. After an uncertain response it requires fetching current package status before retrying. A 10-digit reference is always a string, including leading zeroes. Reservation persistence, uniqueness and availability are backend responsibilities.

Export must come from the backend and satisfy the official data dictionary when supplied, including `country`, hotel `room_id`, `status: BOOKED` and `booking.reference`. That dictionary is not present here; official export compliance has not been verified.
