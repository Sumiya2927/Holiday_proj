# Build My Holiday

Frontend-only implementation of the supplied holiday planner brief. React + Vite, Tailwind CSS, React Router, Lucide icons, and a centralized Fetch API adapter. The existing MongoDB catalog tooling is preserved below.

## Start the frontend

From this folder in PowerShell (Node.js 22+):

```powershell
npm.cmd install
npm.cmd run dev
```

Open the Local URL printed by Vite, normally `http://127.0.0.1:5173`.

```powershell
npm.cmd run build
npm.cmd test
```

`build` creates `client/dist`. The root scripts forward to the `client` workspace. Existing `db:*` commands still work independently.

## Backend connection

There is **no backend implementation in this repository**. Vite proxies `/api` to `http://127.0.0.1:3000`. The backend teammate should implement [the API contract](docs/api.md), or adapt `client/src/api/http.js` to the agreed actual contract.

For a different API origin, copy `client/.env.example` to `client/.env.local` and set `VITE_API_BASE_URL`. Restart Vite after changing it. Only public frontend configuration belongs in `VITE_*`; never include MongoDB credentials. The existing root `.env` is not exposed to the frontend.

The home page works independently. The trip form loads its options from the API and shows a retry state if it cannot connect. Generation, package retrieval, modifications, confirmation, lookup and export require the backend. Production code has no mock-data fallback and never fabricates a booking.

## Screens and workflow

1. `/` — photographic destination discovery and navigation.
2. `/plan` — seven logical request fields, catalog-driven choices, children's ages, validation and restored input.
3. `/packages?id=...` — generated package summary, reloadable by ID.
4. `/packages/:id` — itinerary, city route, component details, pricing, export, and three customization drawers.
5. `/review/:id` — final review and confirmation with uncertain-response recovery.
6. `/booking/:reference` — reference copy, saved reservation, expandable complete details and JSON export.
7. `/find-booking` — 10-digit reference lookup, including leading zeroes.

Booked packages are read-only. Package changes replace the UI state only after backend acceptance. No payment, authentication, dashboard, live AI or external travel booking is included.

## Integration demo

Once a compatible backend is running, enter BLR → Japan, destination arrival 10 April 2027, 6 nights, 2 adults, child age 6 and ₹3,50,000. Generate, inspect each day and transfer, change a flight or hotel, add/remove an attraction, review and confirm. Refresh the booking URL, look up the reference from Find Booking and download the backend export. Repeat for another departure and UAE. The UI does not assume either request is feasible; it displays backend outcomes.

## Design and implementation notes

The app follows the attached navy/teal/coral travel design, responsive layouts, keyboard-accessible native dialog drawers, reduced-motion preferences and clear loading/error states. System fonts and placeholders support failed external assets. Home photography is from Unsplash, credited in the footer note; Google Fonts supplies Inter and Plus Jakarta Sans. No supplied image directory was present.

See [architecture](docs/architecture.md) for component organization and state flow. The original client folder conventions and component names are retained, with extra pages for the expanded seven-screen brief.

## Testing and limitations

Vitest tests cover request boundaries, local-time display, transport failures, request payloads, leading-zero references, export blobs and the primary API-driven UI workflows. Fixtures under `client/src/tests` are test-only and are not real catalog packages. Frontend tests do not establish travel-rule correctness or backend persistence.

The backend chooses cities, enforces all travel rules, calculates authoritative prices, proves cheapest totals, stores reservations, and produces judge-format exports. `DATA_DICTIONARY.md` and `trip_format_example.json` were not supplied, so the frontend API view model is documented separately and official export-schema compliance is unverified. No production deployment is included; other static hosts need an SPA fallback for client routes.

## Existing MongoDB setup

The eight source JSON files are copied unchanged into `data/catalog`. Node.js 22+ is required. The MongoDB driver dependency is recorded in `package.json`; a successful `npm.cmd install` generates `package-lock.json`.

## Connect to Atlas

Edit `.env` in this folder:

```dotenv
MONGODB_URI="mongodb+srv://USERNAME:PASSWORD@YOUR-CLUSTER.mongodb.net/?retryWrites=true&w=majority"
MONGODB_DB="holiday_package"
```

Use your Atlas cluster's connection string (the same cluster you connect to in Compass), a database user's credentials, and an Atlas Network Access entry allowing your machine. Percent-encode special characters in the username/password. Keep `.env` private; it is excluded from Git. The importer explicitly uses `MONGODB_DB`, even if your URI includes a different database name.

From this folder in PowerShell:

```powershell
npm.cmd install
npm.cmd run db:validate
npm.cmd run db:import
npm.cmd run db:verify
```

`db:validate` checks files, duplicate keys and references without connecting to MongoDB. `db:import` creates collections and indexes, imports records, and compares every source field with the database. `db:verify` performs the comparison without writing. After import, refresh the Databases view in Compass and open `holiday_package` on your Atlas connection.

If PyMongo is already installed (as on this machine), no npm download is needed: use `npm.cmd run db:import:python` and `npm.cmd run db:verify:python`. These use the same validated dataset, indexes and collection schemas through the Python driver.

## Collections

| Collection | Source records | Unique key |
| --- | ---: | --- |
| airports | 10 | code |
| destinations | 1 | _id = "catalog" |
| hotels | 49 | hotel_id |
| rooms | 125 | room_id |
| availability | 2,500 | room_id + date |
| flights | 469 | flight_id |
| transfers | 66 | transfer_id |
| attractions | 56 | attraction_id |
| **Total** | **3,376** | |

`destinations.json` is a single object, stored as one document with its countries, departure cities and rules intact. Other source files are arrays, with one document per element. MongoDB adds `_id` values; original business IDs remain strings.

New collections receive nested BSON validation inferred from all source records, preserving optional fields and explicit null values. Existing collection validators are not changed. Unique indexes prevent duplicate catalog keys, and secondary indexes support flight route/date searches, hotels by city, rooms by hotel, nightly availability, transfers and attractions.

Relationships remain references: `rooms.hotel_id` joins `hotels.hotel_id`; `availability.room_id` joins `rooms.room_id`; flight endpoints and transfer airports join `airports.code`; destination links refer to `transfers.transfer_id`. The importer validates these references before any writes. MongoDB does not enforce foreign keys on subsequent application writes.

Dates and local times remain the exact source strings. Flight endpoints use their respective airport time zones, so do not treat these strings as UTC. Prices remain nested `{ amount, currency }` objects. Image paths remain strings; this setup does not upload image files.

The import uses upserts: re-running updates source fields on matching records and inserts missing records. It does not drop collections, remove unrelated records, or remove extra application fields. Re-running restores source inventory values such as `rooms_left` and `seats_left`; use this as catalog setup, not as a live booking inventory refresh. A failed import may leave partial writes; fix the reported problem and rerun. Existing duplicates must be resolved before unique indexes can be created.

Driver reference: [MongoDB bulk writes](https://www.mongodb.com/docs/drivers/node/current/crud/bulk-write/).

## Example filters in Compass

Select `hotels` and paste this into Filter:

```json
{ "city": "Kyoto" }
```

Select `availability` to inspect the four nights of a stay checking out April 15:

```json
{ "room_id": "RM-TYO-001-A", "date": { "$gte": "2027-04-11", "$lt": "2027-04-15" }, "rooms_left": { "$gte": 2 } }
```

The application must find all four nights to accept the stay; a missing night is unavailable.

Select `flights` to find flights from Delhi arriving at Haneda on April 1:

```json
{ "from": "DEL", "to": "HND", "arrival_local": { "$gte": "2027-04-01T00:00:00", "$lt": "2027-04-02T00:00:00" } }
```
