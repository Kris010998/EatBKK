# Eat BKK design QA

- Source visual truth: `qa/approved-mobile-design.png`
- Browser-rendered middle state: `qa/implementation-mobile-middle.jpg`
- Browser-rendered map state: `qa/implementation-mobile-map.jpg`
- Full-view comparison: `qa/comparison-collapsible-mobile.jpg`
- Desktop implementation check: `qa/implementation-desktop-responsive.jpg`
- Viewport: 390 × 844 mobile; 1440 × 900 desktop resilience check
- State: Quick mode, 5 km radius, ฿400 budget, all cuisines; middle and collapsed sheet snaps

## Findings

- [P0] Live map state cannot be visually verified
  - Location: map region and map-linked controls.
  - Evidence: the approved design shows the Bangkok basemap, radius circle, restaurant pins and cat marker; the local browser-rendered implementation shows the intentional `Map unavailable` fallback because no `GOOGLE_MAPS_KEY` is configured locally. The live deployment previously returned `BillingNotEnabledMapError`.
  - Impact: marker styling, draggable cat behavior, radius-circle rendering and restaurant-to-map focus cannot receive a passing browser-based visual comparison yet.
  - Fix: enable Google Maps billing, rotate and restrict the browser key, configure `GOOGLE_MAPS_KEY` and `GOOGLE_MAPS_MAP_ID` in Vercel/local development, then repeat the same 390 × 844 capture and interaction checks.

- No actionable P0/P1/P2 differences were found in the rendered collapsible bottom-sheet experience.
  - Fonts and typography: Inter is used at readable mobile sizes; hierarchy and wrapping remain clear at 390 px.
  - Spacing and layout rhythm: the middle snap leaves roughly 58% of the phone viewport available for the map. Step 1 and Step 2 collapse to 68 px summaries, while the 104 px map state leaves only the persistent search summary visible.
  - Colors and tokens: sage, pale lavender, cobalt and forest-green states match the selected direction and retain sufficient contrast.
  - Image quality and asset fidelity: restaurant cards intentionally use no imagery; no AI or unverified restaurant photos are shown. The supplied cat asset is used directly in the map marker code, but its live rendering remains part of the map blocker above.
  - Copy and content: every mode includes novice-facing explanatory copy; Step 2 is explicitly optional. `Open now` is intentionally omitted because the dataset has no opening-hours field. Cuisine defaults to `All cuisines` rather than illustrative mock content.
  - Icons: Material Symbols Rounded supplies one consistent icon family; no emoji or handcrafted SVG substitutes are used.
  - Accessibility: native disclosure controls expose expanded/collapsed semantics; mode controls expose radio semantics; filters have accessible labels; focus styles are visible; touch targets are at least 44 px; the sheet handle supports click, pointer drag and arrow keys; reduced motion is respected.

## Interaction checks

- Mode switch: Quick → Explore updated selected state and explanatory copy.
- Cuisine filter: selecting Sichuan & Chongqing updated subtypes and reduced results from 35 to 7.
- Radius filter: selecting 2 km updated the radius label and reduced results from 7 to 3.
- Bottom sheet: handle changed middle → expanded with matching `aria-expanded` state.
- Disclosure flow: opening Step 1 expanded the sheet; selecting Explore closed Step 1 and opened Step 2; `Show results` returned to the middle snap.
- Map/List toggle: Map collapsed the panel to a 104 px summary; List restored the middle snap.
- Viewport stability: map container remained at `top: 0`, height `844 px`, and app scroll position `0` through middle, expanded and collapsed states.
- Responsive layout: checked at 390 × 844 and 1440 × 900.
- Console: no browser console errors or warnings were reported for application code in the local fallback state.

## Comparison history

### Pass 1

- [P2] The middle sheet began too high compared with the approved map-first proportion.
- [P2] Dataset image URLs were not guaranteed to be merchant-owned, while the approved final mock used no photos.

Fixes made:

- Changed the middle snap from 32% to 43%, increasing visible map area and making Step 1 the dominant first action.
- Removed restaurant imagery from the rendered cards; the design now relies on typography and verified data only.

Post-fix evidence:

- `qa/comparison-mobile.png` shows the revised map/sheet proportion and the approved Step 1 hierarchy.
- Bottom-sheet P0/P1/P2 findings are resolved; the Google Maps environment remains the sole blocking item.

### Pass 2

- [P1] Step 1 and Step 2 consumed too much of the mobile sheet before restaurant results became reachable.
- [P1] Moving the transformed sheet below the viewport caused the app shell to scroll by about 130 px, shifting the map's visible origin.
- [P2] Users lacked an explicit one-tap way to give the map nearly the full viewport.

Fixes made:

- Converted Step 1 and Step 2 into compact native disclosures with current-selection summaries; only one opens at a time on mobile.
- Added a fixed search summary plus Map/List toggle and a `Show results` action.
- Changed the mobile bottom sheet to a fixed overlay rather than an absolutely positioned transformed child, preventing it from contributing to app-shell scroll overflow.
- Kept the map container full-viewport and made all restaurant-list scrolling local to the sheet.
- Kept both disclosures expanded by default in the 430 px desktop sidebar while sharing the same data, recommendation and filter code.

Post-fix evidence:

- `qa/implementation-mobile-middle.jpg` shows the two compact step summaries with results visible in the default state.
- `qa/implementation-mobile-map.jpg` shows the 104 px map state with the full map viewport preserved.
- `qa/comparison-collapsible-mobile.jpg` confirms the approved palette, typography, borders, icons and information hierarchy remain intact after the interaction change.
- `qa/implementation-desktop-responsive.jpg` confirms the same controls and result data remain available in the desktop sidebar.

## Follow-up polish

- [P3] After the real map is available, tune the radius-label position against the actual Bangkok viewport and validate marker density at 1 km, 5 km and 10 km.

## Final result

final result: blocked

Blocker: browser-rendered Google Maps evidence is unavailable until billing and the restricted Maps configuration are active.
