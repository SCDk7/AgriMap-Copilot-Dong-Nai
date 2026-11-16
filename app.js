const products = window.ocopProducts;
const grid = document.getElementById("productGrid");
const searchInput = document.getElementById("searchInput");
const emptyState = document.getElementById("emptyState");
const cartCount = document.getElementById("cartCount");
const cartBackdrop = document.getElementById("cartBackdrop");
const cartItems = document.getElementById("cartItems");
const cartEmpty = document.getElementById("cartEmpty");
const toast = document.getElementById("toast");
const translateApp = (key) => window.ocopLocale ? window.ocopLocale.t(key) : key;
let activeCategory = "all";
let activeRating = "all";
let searchTerm = "";
let maxPrice = Infinity;
let sortMode = "popular";
let ascendingPrice = false;
const favorites = new Set();
const ratingCategories = { five: 5, four: 4, three: 3 };
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

function countProductsForCategory(category) {
  if (category === "all") return products.length;
  if (ratingCategories[category]) return products.filter((product) => product.rating === ratingCategories[category]).length;
  return products.filter((product) => product.category === category).length;
}

function renderFilterCounts() {
  document.querySelectorAll(".category[data-category]").forEach((button) => {
    button.querySelector("b").textContent = String(countProductsForCategory(button.dataset.category));
  });
  document.querySelectorAll(".rating-filter[data-rating]").forEach((button) => {
    const count = products.filter((product) => product.rating === Number(button.dataset.rating)).length;
    const countLabel = button.querySelector("small");
    if (countLabel) countLabel.textContent = `(${count})`;
  });
}

function productUnit(product) {
  const unitKey = product.unit === "hộp" ? "box" : product.unit === "lít" ? "liter" : "kg";
  return translateApp(`product.unit.${unitKey}`);
}

function renderCart() {
  const entries = window.ocopCart.getItems();
  const count = window.ocopCart.getCount();
  const subtotal = window.ocopCart.getSubtotal();
  cartCount.textContent = String(count);
  document.getElementById("cartItemCount").textContent = translateApp("cart.count").replace("{count}", String(count));
  document.getElementById("cartSubtotal").textContent = formatPrice(subtotal);
  document.getElementById("cartTotal").textContent = formatPrice(subtotal);
  cartEmpty.hidden = entries.length > 0;
  cartItems.hidden = entries.length === 0;
  cartItems.innerHTML = entries.map(({ product, quantity }) => `
    <article class="cart-item">
      <div class="cart-product-thumb product-image ${product.image}" aria-hidden="true"><div class="art"></div></div>
      <div class="cart-product-info">
        <strong>${product.name}</strong>
        <small>${translateApp("cart.productMeta").replace("{rating}", String(product.rating))}</small>
        <span>${formatPrice(product.price)} / ${productUnit(product)}</span>
      </div>
      <div class="cart-quantity">
        <button type="button" data-cart-action="decrease" data-id="${product.id}" aria-label="${translateApp("cart.decrease")}">−</button>
        <span>${quantity}</span>
        <button type="button" data-cart-action="increase" data-id="${product.id}" aria-label="${translateApp("cart.increase")}">+</button>
      </div>
      <strong class="cart-line-total">${formatPrice(product.price * quantity)}</strong>
      <button class="cart-remove" type="button" data-cart-action="remove" data-id="${product.id}" aria-label="${translateApp("cart.remove")}">×</button>
    </article>`).join("");
}

function openCart() {
  renderCart();
  cartBackdrop.hidden = false;
  document.body.classList.add("cart-modal-open");
  cartButton.setAttribute("aria-expanded", "true");
  document.getElementById("cartClose").focus();
}

function closeCart() {
  cartBackdrop.hidden = true;
  document.body.classList.remove("cart-modal-open");
  cartButton.setAttribute("aria-expanded", "false");
  cartButton.focus();
}

function addToCart(product, quantity, openAfterAdd) {
  window.ocopCart.add([{ id: product.id, quantity: quantity || 1 }]);
  showToast(translateApp("product.added").replace("{name}", product.name));
  if (openAfterAdd) openCart();
}

window.ocopOpenCart = openCart;

function visibleProducts() {
  return products
    .filter((product) => {
      const matchesCategory = activeCategory === "all"
        || (ratingCategories[activeCategory] ? product.rating === ratingCategories[activeCategory] : product.category === activeCategory);
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
    addToCart(product, 1, button.dataset.action === "buy");
  } else if (button.dataset.action === "favorite") {
    if (favorites.has(product.id)) favorites.delete(product.id);
    else favorites.add(product.id);
    renderProducts();
    showToast(translateApp(favorites.has(product.id) ? "product.favoriteAdded" : "product.favoriteRemoved"));
  } else {
    showToast(`${product.name} · ${formatPrice(product.price)} / ${productUnit(product)}`);
  }
});

const cartButton = document.getElementById("cartButton");
cartButton.addEventListener("click", openCart);
document.getElementById("cartClose").addEventListener("click", closeCart);
document.getElementById("cartContinue").addEventListener("click", closeCart);
cartBackdrop.addEventListener("click", (event) => {
  if (event.target === cartBackdrop) closeCart();
});
cartItems.addEventListener("click", (event) => {
  const button = event.target.closest("[data-cart-action]");
  if (!button) return;
  const id = Number(button.dataset.id);
  const entry = window.ocopCart.getItems().find((item) => item.product.id === id);
  if (!entry) return;
  if (button.dataset.cartAction === "remove") window.ocopCart.remove(id);
  else window.ocopCart.setQuantity(id, entry.quantity + (button.dataset.cartAction === "increase" ? 1 : -1));
});
window.addEventListener("ocop:cartchange", renderCart);
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !cartBackdrop.hidden) closeCart();
});
document.getElementById("backTop").addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));

window.addEventListener("ocop:languagechange", () => {
  document.getElementById("priceSort").textContent = translateApp(ascendingPrice ? "shop.priceAscending" : "shop.price");
  renderProducts();
  renderCart();
});

renderFilterCounts();
renderProducts();
renderCart();
