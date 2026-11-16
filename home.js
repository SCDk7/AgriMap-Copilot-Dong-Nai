const locationTabs = document.querySelectorAll(".location-tab");
const storeCards = document.querySelectorAll(".store-card");
const selectedName = document.getElementById("selectedName");
const selectedAddress = document.getElementById("selectedAddress");
const selectedPhone = document.getElementById("selectedPhone");
const selectedProduct = document.getElementById("selectedProduct");
const locationMap = document.getElementById("locationMap");
const mapOpenLink = document.getElementById("mapOpenLink");
const directionsLink = document.getElementById("directionsLink");
const landingToast = document.getElementById("landingToast");
let landingToastTimer;
let currentMapQuery = "Đồng Nai, Việt Nam";
let currentZoom = 9;

function updateMap(query, zoom) {
  currentMapQuery = query;
  currentZoom = zoom;
  const encodedQuery = encodeURIComponent(query);
  locationMap.src = `https://maps.google.com/maps?q=${encodedQuery}&z=${zoom}&output=embed`;
  mapOpenLink.href = `https://www.google.com/maps/search/?api=1&query=${encodedQuery}`;
  directionsLink.href = `https://www.google.com/maps/dir/?api=1&destination=${encodedQuery}`;
}

function selectLocation(source, selectedElement) {
  const { location, address, title, phone, product, mapQuery, zoom } = source.dataset;
  selectedName.textContent = title || location;
  selectedAddress.textContent = `📍 ${address}`;
  selectedPhone.textContent = phone || "1900 888 688";
  selectedProduct.textContent = product || "Đặc sản OCOP Đồng Nai";
  updateMap(mapQuery || `${title || location}, ${address}`, Number(zoom) || 14);
  const hasMatchingTab = [...locationTabs].some((tab) => tab.dataset.location === location);
  locationTabs.forEach((tab) => {
    const active = tab.dataset.location === location || (!hasMatchingTab && tab === locationTabs[0]);
    tab.classList.toggle("active", active);
    tab.setAttribute("aria-selected", String(active));
  });
  storeCards.forEach((card) => {
    const active = card === selectedElement || (!selectedElement && card.dataset.location === location);
    card.classList.toggle("selected", active);
    card.setAttribute("aria-pressed", String(active));
  });
}

function showLandingToast(message) {
  landingToast.textContent = message;
  landingToast.classList.add("show");
  clearTimeout(landingToastTimer);
  landingToastTimer = setTimeout(() => landingToast.classList.remove("show"), 2300);
}

locationTabs.forEach((tab) => {
  tab.addEventListener("click", () => selectLocation(tab, null));
});

storeCards.forEach((card) => {
  card.addEventListener("click", () => {
    selectLocation(card, card);
  });
});

document.getElementById("mapCenter").addEventListener("click", () => {
  updateMap(currentMapQuery, currentZoom);
});

document.getElementById("assistantButton").addEventListener("click", () => {
  showLandingToast(window.ocopLocale.t("home.assistantToast"));
});
