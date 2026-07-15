const MODES = {
  free: {
    label: "Free",
    summary: "Browse without ranking",
    helper: "Free ranks every nearby match, then lets you browse the full shortlist."
  },
  quick: {
    label: "Quick",
    summary: "Best nearby matches",
    helper: "Quick balances distance, ratings and popularity."
  },
  explore: {
    label: "Explore",
    summary: "Try something different",
    helper: "Explore adds variety and gives less obvious places a chance."
  },
  budget: {
    label: "Budget",
    summary: "Keep within a limit",
    helper: "Budget favors places closest to your selected price limit."
  }
};

const state = {
  restaurants: [],
  decisionMode: "quick",
  userLat: 13.7563,
  userLon: 100.5018,
  maxDistance: 5,
  userBudget: 400,
  primaryCuisine: "",
  cuisineSubtype: "",
  map: null,
  mapReady: false,
  markerLibrary: null,
  restaurantMarkers: [],
  userMarker: null,
  radiusCircle: null,
  radiusLabelMarker: null,
  ranked: [],
  selected: [],
  activeUrl: null,
  randomize: false,
  toastTimer: null
};

const elements = {};

document.addEventListener("DOMContentLoaded", async () => {
  cacheElements();
  bindModeControls();
  bindFilters();
  bindLocation();
  bindBottomSheet();
  bindDisclosureControls();
  bindSurprise();

  await loadRestaurants();
  populateCuisineFilters();
  generateRecommendations();
  loadGoogleMaps();
});

function cacheElements() {
  elements.bottomSheet = document.getElementById("bottomSheet");
  elements.sheetHandle = document.getElementById("sheetHandle");
  elements.sheetScroll = document.getElementById("sheetScroll");
  elements.compactResultCount = document.getElementById("compactResultCount");
  elements.compactSelection = document.getElementById("compactSelection");
  elements.viewMapButton = document.getElementById("viewMapButton");
  elements.modeDisclosure = document.getElementById("modeDisclosure");
  elements.filterDisclosure = document.getElementById("filterDisclosure");
  elements.modeSummary = document.getElementById("modeSummary");
  elements.filterSummary = document.getElementById("filterSummary");
  elements.filterDoneButton = document.getElementById("filterDoneButton");
  elements.modeGrid = document.getElementById("modeGrid");
  elements.modeHelper = document.getElementById("modeHelper");
  elements.radiusSelect = document.getElementById("radiusSelect");
  elements.budgetSelect = document.getElementById("budgetSelect");
  elements.primarySelect = document.getElementById("primarySelect");
  elements.subtypeSelect = document.getElementById("subtypeSelect");
  elements.radiusBadge = document.getElementById("radiusBadge");
  elements.resultCount = document.getElementById("resultCount");
  elements.resultsTrack = document.getElementById("resultsTrack");
  elements.resultsSection = document.getElementById("resultsSection");
  elements.emptyState = document.getElementById("emptyState");
  elements.surpriseButton = document.getElementById("surpriseButton");
  elements.locateButton = document.getElementById("locateButton");
  elements.mapError = document.getElementById("mapError");
  elements.mapErrorMessage = document.getElementById("mapErrorMessage");
  elements.toast = document.getElementById("toast");
}

async function loadRestaurants() {
  try {
    const response = await fetch("./restaurants.json", { cache: "no-cache" });
    if (!response.ok) throw new Error(`Data request failed (${response.status})`);
    const data = await response.json();
    if (!Array.isArray(data)) throw new Error("Restaurant data is not an array");
    state.restaurants = data.filter(isUsableRestaurant);
  } catch (error) {
    console.error(error);
    elements.resultCount.textContent = "Restaurant data could not load";
    elements.compactResultCount.textContent = "Restaurant data unavailable";
    showToast("Restaurant data could not load. Please refresh and try again.");
  }
}

function isUsableRestaurant(restaurant) {
  return Boolean(
    restaurant &&
    restaurant.name &&
    Number.isFinite(restaurant.lat) &&
    Number.isFinite(restaurant.lon) &&
    restaurant.url
  );
}

function bindModeControls() {
  elements.modeGrid.addEventListener("click", (event) => {
    const button = event.target.closest("[data-mode]");
    if (!button) return;
    setMode(button.dataset.mode);
  });
}

function setMode(mode) {
  if (!MODES[mode]) return;
  state.decisionMode = mode;
  state.randomize = false;

  document.querySelectorAll("[data-mode]").forEach((button) => {
    const active = button.dataset.mode === mode;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-checked", String(active));
  });

  const helperCopy = elements.modeHelper.querySelector("span:last-child");
  helperCopy.textContent = MODES[mode].helper;
  elements.modeSummary.textContent = `${MODES[mode].label} · ${MODES[mode].summary}`;

  if (mode === "budget" && state.userBudget === 0) {
    state.userBudget = 400;
    elements.budgetSelect.value = "400";
    updateFilterStyles();
  }

  updateSearchSummary();
  generateRecommendations();

  // Keep the selected mode open so first-time users can read its explanation.
  // Step 2 opens only when the user explicitly chooses it.
}

function bindFilters() {
  elements.radiusSelect.addEventListener("change", () => {
    state.maxDistance = Number(elements.radiusSelect.value);
    elements.radiusBadge.textContent = `${state.maxDistance} km radius`;
    state.randomize = false;
    updateSearchSummary();
    updateRadiusCircle();
    generateRecommendations();
  });

  elements.budgetSelect.addEventListener("change", () => {
    state.userBudget = Number(elements.budgetSelect.value);
    state.randomize = false;
    updateFilterStyles();
    generateRecommendations();
  });

  elements.primarySelect.addEventListener("change", () => {
    state.primaryCuisine = elements.primarySelect.value;
    state.cuisineSubtype = "";
    populateSubtypeFilter();
    state.randomize = false;
    updateFilterStyles();
    generateRecommendations();
  });

  elements.subtypeSelect.addEventListener("change", () => {
    state.cuisineSubtype = elements.subtypeSelect.value;
    state.randomize = false;
    updateFilterStyles();
    generateRecommendations();
  });

  document.querySelectorAll(".filter-control select").forEach((select) => {
    select.addEventListener("focus", () => setSheetSnap("expanded"));
  });
}

function populateCuisineFilters() {
  const cuisines = uniqueSorted(
    state.restaurants.map((restaurant) => restaurant.primary_cuisine).filter(Boolean)
  );

  replaceOptions(elements.primarySelect, [
    { value: "", label: "All cuisines" },
    ...cuisines.map((cuisine) => ({ value: cuisine, label: cuisine }))
  ]);
  elements.primarySelect.value = state.primaryCuisine;
  populateSubtypeFilter();
  updateFilterStyles();
}

function populateSubtypeFilter() {
  const source = state.primaryCuisine
    ? state.restaurants.filter((restaurant) => restaurant.primary_cuisine === state.primaryCuisine)
    : state.restaurants;
  const subtypes = uniqueSorted(source.map((restaurant) => restaurant.cuisine_subtype).filter(Boolean));

  replaceOptions(elements.subtypeSelect, [
    { value: "", label: "All dishes" },
    ...subtypes.map((subtype) => ({ value: subtype, label: subtype }))
  ]);
  elements.subtypeSelect.value = subtypes.includes(state.cuisineSubtype)
    ? state.cuisineSubtype
    : "";
  state.cuisineSubtype = elements.subtypeSelect.value;
}

function replaceOptions(select, options) {
  select.replaceChildren();
  options.forEach(({ value, label }) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = label;
    select.appendChild(option);
  });
}

function updateFilterStyles() {
  const controls = document.querySelectorAll(".filter-control");
  controls[0]?.classList.add("is-active");
  controls[1]?.classList.toggle("is-active", state.userBudget > 0);
  controls[2]?.classList.toggle("is-active", Boolean(state.primaryCuisine));
  controls[3]?.classList.toggle("is-active", Boolean(state.cuisineSubtype));
  updateSearchSummary();
}

function updateSearchSummary() {
  if (!elements.compactSelection || !elements.filterSummary) return;
  const mode = MODES[state.decisionMode];
  const budget = state.userBudget > 0 ? `Under ฿${state.userBudget.toLocaleString()}` : "Any budget";
  const cuisine = state.cuisineSubtype || state.primaryCuisine || "All cuisines";
  const filterCopy = `${state.maxDistance} km · ${budget} · ${cuisine}`;
  elements.filterSummary.textContent = filterCopy;
  elements.compactSelection.textContent = `${mode.label} · ${filterCopy}`;
}

function uniqueSorted(values) {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b));
}

function haversine(lat1, lon1, lat2, lon2) {
  const radius = 6371;
  const toRadians = (value) => value * Math.PI / 180;
  const deltaLat = toRadians(lat2 - lat1);
  const deltaLon = toRadians(lon2 - lon1);
  const a =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) *
    Math.cos(toRadians(lat2)) *
    Math.sin(deltaLon / 2) ** 2;
  return radius * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

function withDistances(list) {
  return list.map((restaurant) => ({
    ...restaurant,
    distance: haversine(state.userLat, state.userLon, restaurant.lat, restaurant.lon)
  }));
}

function generateRecommendations() {
  if (!state.restaurants.length) {
    renderRecommendations([], []);
    return;
  }

  let filtered = state.restaurants;
  if (state.primaryCuisine) {
    filtered = filtered.filter((restaurant) => restaurant.primary_cuisine === state.primaryCuisine);
  }
  if (state.cuisineSubtype) {
    filtered = filtered.filter((restaurant) => restaurant.cuisine_subtype === state.cuisineSubtype);
  }
  if (state.userBudget > 0) {
    filtered = filtered.filter((restaurant) => restaurant.price_mid <= state.userBudget);
  }

  const candidates = withDistances(filtered);
  let ranked = [];
  let selected = [];

  if (state.decisionMode === "quick") {
    ranked = rankQuick(candidates);
    selected = selectCuisineDiversity(ranked, 5);
  } else if (state.decisionMode === "explore") {
    ranked = rankExplore(candidates);
    selected = shuffle(ranked.slice(0, 30)).slice(0, 5);
  } else if (state.decisionMode === "budget") {
    ranked = rankBudget(candidates);
    selected = ranked.slice(0, 5);
  } else {
    ranked = rankFree(candidates);
    selected = ranked.slice(0, 5);
  }

  if (state.randomize && ranked.length) {
    selected = shuffle(ranked.slice(0, 20)).slice(0, 5);
  }

  state.randomize = false;
  state.ranked = ranked;
  state.selected = selected;
  if (!selected.some((restaurant) => restaurant.url === state.activeUrl)) {
    state.activeUrl = selected[0]?.url || null;
  }
  renderRecommendations(ranked, selected);
}

function rankFree(candidates) {
  return candidates
    .filter((restaurant) => restaurant.distance <= state.maxDistance)
    .map((restaurant) => ({
      ...restaurant,
      score:
        0.45 * restaurant.rating_norm +
        0.35 * (1 - restaurant.distance / state.maxDistance) +
        0.15 * restaurant.review_weight_norm
    }))
    .sort((a, b) => b.score - a.score);
}

function rankQuick(candidates) {
  const radius = Math.min(state.maxDistance, 5);
  return candidates
    .filter((restaurant) => restaurant.distance <= radius)
    .map((restaurant) => ({
      ...restaurant,
      score:
        0.5 * restaurant.rating_norm +
        0.4 * (1 - restaurant.distance / radius) +
        0.1 * restaurant.review_weight_norm
    }))
    .sort((a, b) => b.score - a.score);
}

function rankExplore(candidates) {
  const radius = state.maxDistance + 3;
  return candidates
    .filter((restaurant) => restaurant.distance <= radius)
    .map((restaurant) => ({
      ...restaurant,
      score:
        0.35 * restaurant.rating_norm +
        0.25 * (1 - restaurant.distance / radius) +
        0.15 * restaurant.review_weight_norm +
        (restaurant.review_count < 100 ? 0.15 : 0) +
        Math.random() * 0.15
    }))
    .sort((a, b) => b.score - a.score);
}

function rankBudget(candidates) {
  const targetBudget = state.userBudget || 400;
  return candidates
    .filter((restaurant) => restaurant.distance <= state.maxDistance)
    .map((restaurant) => {
      const priceDifference = Math.abs(restaurant.price_mid - targetBudget);
      if (priceDifference > targetBudget * 0.5) return { ...restaurant, score: -1 };
      const priceScore = 1 - priceDifference / targetBudget;
      return {
        ...restaurant,
        score:
          0.35 * restaurant.rating_norm +
          0.25 * (1 - restaurant.distance / state.maxDistance) +
          0.25 * priceScore +
          0.15 * restaurant.review_weight_norm
      };
    })
    .filter((restaurant) => restaurant.score >= 0)
    .sort((a, b) => b.score - a.score);
}

function selectCuisineDiversity(ranked, limit) {
  const selected = [];
  const usedCuisines = new Set();

  ranked.forEach((restaurant) => {
    if (selected.length >= limit) return;
    if (!usedCuisines.has(restaurant.primary_cuisine)) {
      usedCuisines.add(restaurant.primary_cuisine);
      selected.push(restaurant);
    }
  });

  ranked.forEach((restaurant) => {
    if (selected.length >= limit) return;
    if (!selected.some((item) => item.url === restaurant.url)) selected.push(restaurant);
  });
  return selected;
}

function shuffle(values) {
  const copy = values.slice();
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }
  return copy;
}

function renderRecommendations(ranked, selected) {
  elements.resultsTrack.replaceChildren();
  elements.emptyState.hidden = selected.length > 0;
  elements.resultsTrack.hidden = selected.length === 0;

  if (!selected.length) {
    elements.resultCount.textContent = state.restaurants.length
      ? "0 places match these choices"
      : "Restaurant data could not load";
    elements.compactResultCount.textContent = state.restaurants.length
      ? "No matches in this range"
      : "Restaurant data unavailable";
    renderMapMarkers();
    return;
  }

  elements.resultCount.textContent = `${ranked.length} places · showing ${selected.length}`;
  elements.compactResultCount.textContent = `${selected.length} picks from ${ranked.length} nearby`;
  selected.forEach((restaurant, index) => {
    elements.resultsTrack.appendChild(createRestaurantCard(restaurant, index));
  });
  renderMapMarkers();
}

function createRestaurantCard(restaurant, index) {
  const card = document.createElement("article");
  card.className = "restaurant-card";
  card.dataset.url = restaurant.url;
  card.dataset.mapRank = String(index + 1);
  card.tabIndex = 0;
  const isActive = restaurant.url === state.activeUrl;
  card.classList.toggle("is-selected", isActive);
  card.setAttribute("aria-current", isActive ? "true" : "false");
  card.setAttribute("aria-label", `Map ${index + 1}: ${restaurant.name}`);

  const body = document.createElement("div");
  body.className = "restaurant-card__body";

  const rank = document.createElement("span");
  rank.className = "restaurant-card__rank";
  rank.textContent = `Map ${index + 1}`;

  const name = document.createElement("h3");
  name.className = "restaurant-card__name";
  name.textContent = restaurant.name;

  const cuisine = document.createElement("p");
  cuisine.className = "restaurant-card__cuisine";
  cuisine.textContent = [restaurant.primary_cuisine, restaurant.cuisine_subtype]
    .filter(Boolean)
    .join(" · ");

  const facts = document.createElement("ul");
  facts.className = "restaurant-card__facts";
  facts.append(
    createFact("near_me", formatDistance(restaurant.distance)),
    createFact("sell", formatPrice(restaurant)),
    createFact("star", `${restaurant.weighted_rating.toFixed(1)} (${formatCount(restaurant.review_count)})`)
  );

  const actions = document.createElement("div");
  actions.className = "restaurant-card__actions";

  const directions = document.createElement("a");
  directions.className = "directions-button";
  directions.href = restaurant.url;
  directions.target = "_blank";
  directions.rel = "noopener noreferrer";
  directions.append(createIcon("navigation"), document.createTextNode("Directions"));

  const showOnMap = document.createElement("button");
  showOnMap.className = "show-on-map-button";
  showOnMap.type = "button";
  showOnMap.setAttribute("aria-label", `Show ${restaurant.name} on map`);
  showOnMap.append(createIcon("location_on"), document.createTextNode(`Map ${index + 1}`));
  showOnMap.addEventListener("click", () => focusRestaurant(restaurant, { source: "list" }));

  actions.append(directions, showOnMap);
  body.append(rank, name, cuisine, facts, actions);
  card.appendChild(body);

  card.addEventListener("click", (event) => {
    if (event.target.closest("a, button")) return;
    focusRestaurant(restaurant, { source: "list" });
  });
  card.addEventListener("keydown", (event) => {
    if (!['Enter', ' '].includes(event.key)) return;
    event.preventDefault();
    focusRestaurant(restaurant, { source: "list" });
  });
  return card;
}

function createFact(iconName, value) {
  const item = document.createElement("li");
  item.append(createIcon(iconName), document.createTextNode(value));
  return item;
}

function createIcon(name) {
  const icon = document.createElement("span");
  icon.className = "material-symbols-rounded";
  icon.setAttribute("aria-hidden", "true");
  icon.textContent = name;
  return icon;
}

function formatDistance(distance) {
  if (distance < 1) return `${Math.round(distance * 1000)} m`;
  return `${distance.toFixed(1)} km`;
}

function formatPrice(restaurant) {
  if (Number.isFinite(restaurant.price_min) && Number.isFinite(restaurant.price_max)) {
    return `฿${Math.round(restaurant.price_min)}–${Math.round(restaurant.price_max)}`;
  }
  return `≈ ฿${Math.round(restaurant.price_mid)}`;
}

function formatCount(value) {
  return new Intl.NumberFormat("en-US").format(value);
}

function bindSurprise() {
  elements.surpriseButton.addEventListener("click", () => {
    state.randomize = true;
    generateRecommendations();
    elements.resultsTrack.scrollTo({ left: 0, behavior: "smooth" });
  });
}

function bindLocation() {
  elements.locateButton.addEventListener("click", locateUser);
}

function locateUser() {
  if (!navigator.geolocation) {
    showToast("Location is not available in this browser.");
    return;
  }

  elements.locateButton.disabled = true;
  elements.locateButton.setAttribute("aria-busy", "true");
  navigator.geolocation.getCurrentPosition(
    (position) => {
      state.userLat = position.coords.latitude;
      state.userLon = position.coords.longitude;
      if (state.userMarker) state.userMarker.position = currentPosition();
      if (state.map) {
        state.map.panTo(currentPosition());
        state.map.setZoom(14);
      }
      updateRadiusCircle();
      generateRecommendations();
      showToast("Using your current location.");
      resetLocationButton();
    },
    () => {
      showToast("We could not access your location. You can still browse Bangkok.");
      resetLocationButton();
    },
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
  );
}

function resetLocationButton() {
  elements.locateButton.disabled = false;
  elements.locateButton.removeAttribute("aria-busy");
}

function currentPosition() {
  return { lat: state.userLat, lng: state.userLon };
}

function loadGoogleMaps() {
  window.initMap = initMap;
  window.gm_authFailure = () => {
    showMapError("Google Maps rejected this deployment. Check billing and API-key restrictions.");
  };
  window.handleMapsScriptError = (message) => {
    showMapError(message || "Google Maps could not load. Restaurant results still work below.");
  };

  const script = document.createElement("script");
  script.src = "/api/maps";
  script.async = true;
  script.onerror = () => window.handleMapsScriptError();
  document.head.appendChild(script);
}

async function initMap() {
  try {
    let mapId = "DEMO_MAP_ID";
    try {
      const response = await fetch("/api/config", { cache: "no-store" });
      if (response.ok) {
        const config = await response.json();
        if (config.mapId) mapId = config.mapId;
      }
    } catch (error) {
      console.info("Using the Google Maps demo map ID for local preview.", error);
    }

    const [{ Map }, markerLibrary] = await Promise.all([
      google.maps.importLibrary("maps"),
      google.maps.importLibrary("marker")
    ]);
    state.markerLibrary = markerLibrary;
    state.map = new Map(document.getElementById("map"), {
      center: currentPosition(),
      zoom: 13,
      mapId,
      disableDefaultUI: true,
      clickableIcons: false,
      gestureHandling: "greedy"
    });
    state.mapReady = true;
    elements.mapError.hidden = true;
    createUserMarker();
    updateRadiusCircle();
    renderMapMarkers();
  } catch (error) {
    console.error(error);
    showMapError("Google Maps could not initialize. Restaurant results still work below.");
  }
}

function createUserMarker() {
  if (!state.mapReady || !state.markerLibrary) return;
  if (state.userMarker) state.userMarker.map = null;

  const badge = document.createElement("div");
  badge.className = "user-marker";
  const image = document.createElement("img");
  image.src = "cat_images.png";
  image.alt = "";
  badge.appendChild(image);

  state.userMarker = new state.markerLibrary.AdvancedMarkerElement({
    map: state.map,
    position: currentPosition(),
    title: "Your location — drag to move",
    content: badge,
    gmpDraggable: true,
    zIndex: 1000
  });

  state.userMarker.addListener("dragend", (event) => {
    const position = event.latLng;
    state.userLat = position.lat();
    state.userLon = position.lng();
    updateRadiusCircle();
    generateRecommendations();
  });
}

function updateRadiusCircle() {
  if (!state.mapReady || !state.map) return;
  if (state.radiusCircle) state.radiusCircle.setMap(null);
  state.radiusCircle = new google.maps.Circle({
    map: state.map,
    center: currentPosition(),
    radius: state.maxDistance * 1000,
    strokeColor: "#3155eb",
    strokeOpacity: 0.85,
    strokeWeight: 2,
    fillColor: "#3155eb",
    fillOpacity: 0.1,
    clickable: false
  });

  const labelPosition = destinationPoint(currentPosition(), state.maxDistance, 55);
  elements.radiusBadge.textContent = `${state.maxDistance} km radius`;
  elements.radiusBadge.hidden = false;
  if (!state.radiusLabelMarker) {
    state.radiusLabelMarker = new state.markerLibrary.AdvancedMarkerElement({
      map: state.map,
      position: labelPosition,
      title: `${state.maxDistance} kilometre search boundary`,
      content: elements.radiusBadge,
      zIndex: 450
    });
  } else {
    state.radiusLabelMarker.map = state.map;
    state.radiusLabelMarker.position = labelPosition;
    state.radiusLabelMarker.title = `${state.maxDistance} kilometre search boundary`;
  }
}

function destinationPoint(origin, distanceKm, bearingDegrees) {
  const earthRadiusKm = 6371;
  const angularDistance = distanceKm / earthRadiusKm;
  const bearing = bearingDegrees * Math.PI / 180;
  const startLat = origin.lat * Math.PI / 180;
  const startLng = origin.lng * Math.PI / 180;
  const endLat = Math.asin(
    Math.sin(startLat) * Math.cos(angularDistance) +
    Math.cos(startLat) * Math.sin(angularDistance) * Math.cos(bearing)
  );
  const endLng = startLng + Math.atan2(
    Math.sin(bearing) * Math.sin(angularDistance) * Math.cos(startLat),
    Math.cos(angularDistance) - Math.sin(startLat) * Math.sin(endLat)
  );
  return { lat: endLat * 180 / Math.PI, lng: endLng * 180 / Math.PI };
}

function renderMapMarkers() {
  state.restaurantMarkers.forEach((marker) => { marker.map = null; });
  state.restaurantMarkers = [];
  if (!state.mapReady || !state.markerLibrary || !state.map) return;

  const selectedRanks = new Map(
    state.selected.map((restaurant, index) => [restaurant.url, index + 1])
  );
  state.selected.forEach((restaurant) => {
    const mapRank = selectedRanks.get(restaurant.url);
    const isSelected = Boolean(mapRank);
    const isActive = restaurant.url === state.activeUrl;
    const pin = new state.markerLibrary.PinElement({
      background: isActive || isSelected ? "#3155eb" : "#075c3a",
      borderColor: "#fffdf9",
      glyphColor: "#fffdf9",
      glyph: isSelected ? String(mapRank) : "",
      scale: isActive ? 1.24 : isSelected ? 1.08 : 0.82
    });
    const markerContent = document.createElement("div");
    markerContent.className = "restaurant-map-marker";
    markerContent.classList.toggle("is-active", isActive);
    if (isActive) {
      const label = document.createElement("div");
      label.className = "restaurant-map-marker__label";
      const labelName = document.createElement("strong");
      labelName.textContent = restaurant.name;
      const labelDistance = document.createElement("span");
      labelDistance.textContent = formatDistance(restaurant.distance);
      label.append(labelName, labelDistance);
      markerContent.appendChild(label);
    }
    markerContent.appendChild(pin instanceof Element ? pin : pin.element);
    const marker = new state.markerLibrary.AdvancedMarkerElement({
      map: state.map,
      position: { lat: restaurant.lat, lng: restaurant.lon },
      title: restaurant.name,
      content: markerContent,
      gmpClickable: true,
      zIndex: isActive ? 500 : isSelected ? 100 : 1
    });
    if (typeof marker.addEventListener === "function") {
      marker.addEventListener("gmp-click", () => focusRestaurant(restaurant, { source: "map" }));
    } else {
      marker.addListener("click", () => focusRestaurant(restaurant, { source: "map" }));
    }
    state.restaurantMarkers.push(marker);
  });
}

function focusRestaurant(restaurant) {
  state.activeUrl = restaurant.url;
  document.querySelectorAll(".restaurant-card").forEach((card) => {
    const active = card.dataset.url === restaurant.url;
    card.classList.toggle("is-selected", active);
    card.setAttribute("aria-current", active ? "true" : "false");
  });
  renderMapMarkers();

  const card = [...document.querySelectorAll(".restaurant-card")]
    .find((item) => item.dataset.url === restaurant.url);

  if (state.map) {
    state.map.panTo({ lat: restaurant.lat, lng: restaurant.lon });
    state.map.setZoom(15);
  }
  if (window.innerWidth <= 768) {
    elements.modeDisclosure.open = false;
    elements.filterDisclosure.open = false;
    setSheetSnap("middle");
    scheduleRestaurantReveal(card);
  } else {
    revealRestaurantCard(card);
  }

  elements.compactResultCount.textContent = `Map ${card?.dataset.mapRank || ""} · ${restaurant.name}`;
}

function revealRestaurantCard(card) {
  if (!card) return;
  if (window.innerWidth <= 768) {
    const targetTop = Math.max(0, elements.resultsSection.offsetTop - 8);
    elements.sheetScroll.scrollTo({ top: targetTop, behavior: "smooth" });
  }
  const targetLeft = card.offsetLeft - (elements.resultsTrack.clientWidth - card.clientWidth) / 2;
  elements.resultsTrack.scrollTo({ left: Math.max(0, targetLeft), behavior: "smooth" });
}

function scheduleRestaurantReveal(card) {
  window.setTimeout(() => revealRestaurantCard(card), 300);
}

function showMapError(message) {
  elements.mapErrorMessage.textContent = message;
  elements.mapError.hidden = false;
}

function bindBottomSheet() {
  const snapOrder = ["expanded", "middle", "collapsed"];
  let startY = 0;
  let startHeight = 0;
  let moved = false;

  const heightForSnap = (snap) => snap === "expanded"
    ? Math.min(window.innerHeight * 0.88, 760)
    : snap === "middle"
      ? Math.min(window.innerHeight * 0.48, 430)
      : 104;

  elements.sheetHandle.addEventListener("pointerdown", (event) => {
    if (window.innerWidth > 768) return;
    startY = event.clientY;
    startHeight = elements.bottomSheet.offsetHeight;
    moved = false;
    elements.bottomSheet.dataset.dragging = "true";
    elements.sheetHandle.setPointerCapture(event.pointerId);
  });

  elements.sheetHandle.addEventListener("pointermove", (event) => {
    if (elements.bottomSheet.dataset.dragging !== "true") return;
    const delta = event.clientY - startY;
    if (Math.abs(delta) > 5) moved = true;
    const next = Math.max(
      heightForSnap("collapsed"),
      Math.min(heightForSnap("expanded"), startHeight - delta)
    );
    elements.bottomSheet.style.setProperty("--sheet-height", `${next}px`);
  });

  const finishDrag = (event) => {
    if (elements.bottomSheet.dataset.dragging !== "true") return;
    const delta = event.clientY - startY;
    const current = Math.max(
      heightForSnap("collapsed"),
      Math.min(heightForSnap("expanded"), startHeight - delta)
    );
    const snap = snapOrder.reduce((closest, candidate) => (
      Math.abs(heightForSnap(candidate) - current) < Math.abs(heightForSnap(closest) - current)
        ? candidate
        : closest
    ), "middle");
    elements.bottomSheet.dataset.dragging = "false";
    elements.bottomSheet.style.removeProperty("--sheet-height");
    setSheetSnap(snap);
    if (elements.sheetHandle.hasPointerCapture(event.pointerId)) {
      elements.sheetHandle.releasePointerCapture(event.pointerId);
    }
  };

  elements.sheetHandle.addEventListener("pointerup", finishDrag);
  elements.sheetHandle.addEventListener("pointercancel", finishDrag);

  elements.sheetHandle.addEventListener("click", () => {
    if (moved || window.innerWidth > 768) return;
    const current = elements.bottomSheet.dataset.snap || "middle";
    const next = current === "collapsed" ? "middle" : current === "middle" ? "expanded" : "middle";
    setSheetSnap(next);
  });

  elements.sheetHandle.addEventListener("keydown", (event) => {
    if (!['ArrowUp', 'ArrowDown'].includes(event.key)) return;
    event.preventDefault();
    const current = snapOrder.indexOf(elements.bottomSheet.dataset.snap || "middle");
    const next = event.key === "ArrowUp"
      ? Math.max(0, current - 1)
      : Math.min(snapOrder.length - 1, current + 1);
    setSheetSnap(snapOrder[next]);
  });

  elements.viewMapButton.addEventListener("click", () => {
    const current = elements.bottomSheet.dataset.snap || "middle";
    setSheetSnap(current === "expanded" ? "middle" : current === "middle" ? "expanded" : "middle");
  });
}

function bindDisclosureControls() {
  const disclosures = [elements.modeDisclosure, elements.filterDisclosure];
  let desktopLayout = null;

  const applyLayoutDefaults = () => {
    const nextDesktopLayout = window.innerWidth > 768;
    if (nextDesktopLayout === desktopLayout) return;
    desktopLayout = nextDesktopLayout;
    disclosures.forEach((item) => { item.open = desktopLayout; });
  };

  disclosures.forEach((disclosure) => {
    disclosure.addEventListener("toggle", () => {
      if (!disclosure.open || window.innerWidth > 768) return;
      disclosures.forEach((other) => {
        if (other !== disclosure) other.open = false;
      });
      setSheetSnap("expanded");
    });
  });

  elements.filterDoneButton.addEventListener("click", () => {
    elements.filterDisclosure.open = false;
    setSheetSnap("middle");
    scheduleRestaurantReveal(
      [...document.querySelectorAll(".restaurant-card")]
        .find((card) => card.dataset.url === state.activeUrl)
    );
  });

  window.addEventListener("resize", applyLayoutDefaults);
  applyLayoutDefaults();
}

function setSheetSnap(snap) {
  if (!['expanded', 'middle', 'collapsed'].includes(snap)) return;
  if (snap === "collapsed" && document.activeElement instanceof HTMLElement) {
    document.activeElement.blur();
  }
  elements.bottomSheet.dataset.snap = snap;
  elements.sheetHandle.setAttribute("aria-expanded", String(snap === "expanded"));
  elements.sheetHandle.setAttribute(
    "aria-label",
    snap === "expanded" ? "Reduce restaurant finder" : "Expand restaurant finder"
  );
  const viewMapIcon = elements.viewMapButton.querySelector(".material-symbols-rounded");
  const viewMapLabel = elements.viewMapButton.querySelector("span:last-child");
  const mapIsPrimary = snap === "collapsed";
  viewMapIcon.textContent = mapIsPrimary ? "list" : snap === "expanded" ? "splitscreen" : "view_agenda";
  viewMapLabel.textContent = mapIsPrimary ? "List" : snap === "expanded" ? "Map + list" : "Full list";
  elements.viewMapButton.setAttribute(
    "aria-label",
    mapIsPrimary
      ? "Show the restaurant list with the map"
      : snap === "expanded"
        ? "Show the map and restaurant list together"
        : "Expand the restaurant list"
  );
  if (snap === "collapsed") {
    elements.modeDisclosure.open = false;
    elements.filterDisclosure.open = false;
  }
  if (snap === "expanded") elements.sheetScroll.focus({ preventScroll: true });
}

function showToast(message) {
  window.clearTimeout(state.toastTimer);
  elements.toast.textContent = message;
  elements.toast.hidden = false;
  state.toastTimer = window.setTimeout(() => {
    elements.toast.hidden = true;
  }, 3200);
}
