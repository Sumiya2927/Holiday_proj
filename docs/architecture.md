# Frontend architecture

The existing repository root serves as the markdown's `build-my-holiday/` root. The React/Vite client is an npm workspace. Existing catalog import scripts remain separate and unchanged.

## Structure

- `client/src/pages/`: seven route screens. Original `PlanTripPage`, `PackagePage`, `ConfirmationPage`, and `ReservationLookupPage` names are retained. `CustomizePage` composes the in-place drawer and has no independent route.
- `client/src/components/`: the original named booking cards, request form, timeline, route summary, pricing, alternative selector and validation message; `Layout` and `UI` provide shared shell and accessible primitives.
- `client/src/api/http.js`: API adapter, normalized service errors, export download. It is the integration boundary for a teammate's backend.
- `client/src/hooks/usePackage.js`: abortable resource retrieval, refresh and package state.
- `client/src/utils/format.js`: presentation formatting and request-input validation only.
- `client/src/styles/index.css`: Tailwind entry, shared design tokens, responsive application styles and reduced-motion rules.
- `client/src/tests/`: isolated transport and UI fixtures, never loaded by production code.

## Data flow

Form → API generation → `/packages?id=...` → package ID lookup → detail screen → validated PATCH → replace whole package → review → confirmation → reference lookup.

Form values persist in sessionStorage only to restore user input on back navigation/refresh. Storage errors do not prevent use. Packages and reservations always reload from the API. No MongoDB connection, catalog search, rule solver, inventory mutation or booking snapshot storage runs in the browser. No authentication, payment or AI calls are included.

## UX and accessibility

The seven screens follow the supplied design brief: navy/teal palette, coral hero action, Plus Jakarta Sans/Inter, 1200px container, photography on discovery screens, compact informational booking cards, and a sticky price summary at desktop widths.

Native dialog drawers provide focus containment and Escape handling; focus returns to the launch control. Busy mutations cannot be closed midway. Native buttons, labels, alert/status messages, skip link, keyboard focus indicators, and reduced-motion styles support accessibility. Form dropdowns are catalogue-driven; departure search filters options without silently replacing the selected city.

The booking summary is read-only, supports direct URLs and exposes full itinerary details. All prices and authoritative validation decisions come from the backend. The frontend's local subtraction of total from budget is presentation only.

## Assets and limitations

No project photo assets or attribution file were supplied. The home page references two Unsplash destination photographs and links the license. Hotel/attraction image failures use neutral placeholders. Google Fonts and destination photos require Internet access; system fonts and a dark hero fallback preserve usability offline.

The API contract is proposed, not discovered from a running backend. The backend must provide the shape documented in `api.md` or the adapter must normalize its actual format. A React error boundary handles unexpected rendering failures without reporting false booking success.

For non-Vite hosting, configure an SPA fallback to `index.html` for application routes and route `/api` to the backend. Do not rewrite API responses to the SPA.
