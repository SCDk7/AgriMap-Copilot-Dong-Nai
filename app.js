const products = [
  { id: 1, name: "Hạt điều vị rang muối nguyên bản Nga Biên", category: "farm", rating: 5, price: 350000, unit: "kg", image: "cashew", bestseller: 2 },
  { id: 2, name: "Bột cacao nguyên chất Trọng Đức", category: "herbal", rating: 5, price: 250000, unit: "hộp", image: "cacao", bestseller: 1 },
  { id: 3, name: "Trà sen Nhơn Trạch", category: "herbal", rating: 4, price: 500000, unit: "hộp", image: "tea", bestseller: 4 },
  { id: 4, name: "Mật ong hoa tràm / hoa cao su Đồng Nai", category: "spice", rating: 4, price: 250000, unit: "lít", image: "honey", bestseller: 3 }
];

const grid = document.getElementById("productGrid");
const searchInput = document.getElementById("searchInput");
const emptyState = document.getElementById("emptyState");
const cartCount = document.getElementById("cartCount");
const toast = document.getElementById("toast");
const translateApp = (key) => window.ocopLocale ? window.ocopLocale.t(key) : key;
let activeCategory = "all";
let activeRating = "all";
let searchTerm = "";
let maxPrice = Infinity;
let sortMode = "popular";
let ascendingPrice = false;
let itemCount = 0;
const favorites = new Set();
let toastTimer;

function formatPrice(price) {
  return `${price.toLocaleString("vi-VN")} đ`;
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 2300);
}

function visibleProducts() {
  return products
    .filter((product) => {
      const matchesCategory = activeCategory === "all" || activeCategory === "five" ? activeCategory === "all" || product.rating === 5 : activeCategory === "four" ? product.rating === 4 : activeCategory === "three" ? product.rating === 3 : product.category === activeCategory;
      const matchesRating = activeRating === "all" || product.rating === Number(activeRating);
      const matchesSearch = `${product.name} Đồng Nai`.toLocaleLowerCase("vi").includes(searchTerm.toLocaleLowerCase("vi"));
      return matchesCategory && matchesRating && matchesSearch && product.price <= maxPrice;
    })
    .sort((a, b) => sortMode === "bestseller" ? a.bestseller - b.bestseller : ascendingPrice ? a.price - b.price : a.id - b.id);
}

function renderProducts() {
  const found = visibleProducts();
  grid.innerHTML = found.map((product) => `
    <article class="product-card">
      <div class="product-image ${product.image}" role="img" aria-label="${product.name}">
        <span class="rating-badge">${translateApp("product.rating").replace("{rating}", String(product.rating))}</span><div class="art" aria-hidden="true"></div>
      </div>
      <div class="product-info">
        <div class="product-meta"><span class="province">${translateApp("product.province")}</span><span class="review">${translateApp("product.review")}</span></div>
        <h3>${product.name}</h3>
        <div class="product-price"><span>${translateApp("product.price")}</span><b>${formatPrice(product.price)} / ${translateApp(`product.unit.${product.unit === "hộp" ? "box" : product.unit === "lít" ? "liter" : "kg"}`)}</b></div>
        <button class="details-button" type="button" data-action="details" data-id="${product.id}">${translateApp("product.details")}</button>
        <div class="product-actions">
          <button class="buy" type="button" data-action="buy" data-id="${product.id}">${translateApp("product.buy")}</button>
          <button class="add-cart" type="button" data-action="cart" data-id="${product.id}" aria-label="${translateApp("product.addCart")}">🛒</button>
          <button class="favorite ${favorites.has(product.id) ? "saved" : ""}" type="button" data-action="favorite" data-id="${product.id}" aria-label="${translateApp("product.favorite")}">${favorites.has(product.id) ? "♥" : "♡"}</button>
        </div>
      </div>
    </article>`).join("");
  emptyState.hidden = found.length > 0;
  grid.hidden = found.length === 0;
}

document.getElementById("categoryFilters").addEventListener("click", (event) => {
  const button = event.target.closest("[data-category]");
  if (!button) return;
  activeCategory = button.dataset.category;
  document.querySelectorAll(".category").forEach((item) => item.classList.toggle("active", item === button));
  renderProducts();
});

document.querySelectorAll(".rating-filter").forEach((button) => {
  button.addEventListener("click", () => {
    activeRating = button.dataset.rating;
    document.querySelectorAll(".rating-filter").forEach((item) => item.classList.toggle("active", item === button));
    renderProducts();
  });
});

document.querySelectorAll(".sort[data-sort]").forEach((button) => {
  button.addEventListener("click", () => {
    sortMode = button.dataset.sort;
    document.querySelectorAll(".sort[data-sort]").forEach((item) => item.classList.toggle("active", item === button));
    renderProducts();
  });
});

searchInput.addEventListener("input", () => {
  searchTerm = searchInput.value.trim();
  renderProducts();
});

document.querySelectorAll("[data-search]").forEach((button) => {
  button.addEventListener("click", () => {
    searchInput.value = button.dataset.search;
    searchTerm = button.dataset.search;
    renderProducts();
    document.getElementById("products").scrollIntoView({ behavior: "smooth" });
  });
});

document.querySelectorAll("[data-max]").forEach((button) => {
  button.addEventListener("click", () => {
    maxPrice = Number(button.dataset.max);
    renderProducts();
    showToast(translateApp("product.budget").replace("{amount}", formatPrice(maxPrice)));
  });
});

document.getElementById("priceSort").addEventListener("click", (event) => {
  ascendingPrice = !ascendingPrice;
  event.currentTarget.textContent = translateApp(ascendingPrice ? "shop.priceAscending" : "shop.priceDescending");
  renderProducts();
});

document.getElementById("resetFilters").addEventListener("click", () => {
  activeCategory = "all";
  activeRating = "all";
  searchTerm = "";
  maxPrice = Infinity;
  sortMode = "popular";
  ascendingPrice = false;
  searchInput.value = "";
  document.querySelectorAll(".category").forEach((item) => item.classList.toggle("active", item.dataset.category === "all"));
  document.querySelectorAll(".rating-filter").forEach((item) => item.classList.toggle("active", item.dataset.rating === "all"));
  document.querySelectorAll(".sort[data-sort]").forEach((item) => item.classList.toggle("active", item.dataset.sort === "popular"));
  document.getElementById("priceSort").textContent = translateApp("shop.price");
  renderProducts();
});

grid.addEventListener("click", (event) => {
  const button = event.target.closest("[data-action]");
  if (!button) return;
  const product = products.find((item) => item.id === Number(button.dataset.id));
  if (button.dataset.action === "cart" || button.dataset.action === "buy") {
    itemCount += 1;
    cartCount.textContent = itemCount;
    showToast(translateApp("product.added").replace("{name}", product.name));
  } else if (button.dataset.action === "favorite") {
    if (favorites.has(product.id)) favorites.delete(product.id);
    else favorites.add(product.id);
    renderProducts();
    showToast(translateApp(favorites.has(product.id) ? "product.favoriteAdded" : "product.favoriteRemoved"));
  } else {
    const unitKey = product.unit === "hộp" ? "box" : product.unit === "lít" ? "liter" : "kg";
    showToast(`${product.name} · ${formatPrice(product.price)} / ${translateApp(`product.unit.${unitKey}`)}`);
  }
});

document.getElementById("cartButton").addEventListener("click", () => showToast(translateApp("product.cartStatus").replace("{count}", String(itemCount))));
document.getElementById("chatOpen").addEventListener("click", () => showToast(translateApp("product.assistant")));
document.getElementById("floatingChat").addEventListener("click", () => showToast(translateApp("product.assistant")));
document.getElementById("backTop").addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));

window.addEventListener("ocop:languagechange", () => {
  document.getElementById("priceSort").textContent = translateApp(ascendingPrice ? "shop.priceAscending" : "shop.price");
  renderProducts();
});

renderProducts();
