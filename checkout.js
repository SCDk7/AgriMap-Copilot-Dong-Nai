(() => {
  const products = window.ocopProducts;
  const byId = new Map(products.map((product) => [product.id, product]));
  const params = new URLSearchParams(location.search);
  const cartKey = "ocop-cart";
  let items = [];
  try { items = JSON.parse(localStorage.getItem(cartKey) || "[]"); } catch { items = []; }
  if (!Array.isArray(items)) items = [];
  items = items.filter((item) => byId.has(Number(item.id)) && Number.isInteger(Number(item.quantity)) && Number(item.quantity) > 0);
  const buyId = Number(params.get("buy"));
  if (byId.has(buyId)) {
    const existing = items.find((item) => Number(item.id) === buyId);
    if (existing) existing.quantity = 1;
    else items = [{ id: buyId, quantity: 1 }];
    localStorage.setItem(cartKey, JSON.stringify(items));
  }
  const itemHost = document.getElementById("orderItems");
  let voucher = "";
  let discountValue = 0;
  const money = (value) => `${Math.max(0, value).toLocaleString("vi-VN")} ₫`;
  function subtotal() { return items.reduce((sum, item) => sum + byId.get(Number(item.id)).price * Number(item.quantity), 0); }
  function render() {
    itemHost.innerHTML = items.length ? items.map((item, index) => {
      const product = byId.get(Number(item.id));
      return `<div class="order-line"><select aria-label="Sản phẩm" data-product="${index}">${products.map((option) => `<option value="${option.id}" ${option.id === product.id ? "selected" : ""}>${option.name} · ${option.price.toLocaleString("vi-VN")} ₫ / ${option.unit}</option>`).join("")}</select><input type="number" min="1" max="99" value="${item.quantity}" aria-label="Số lượng" data-quantity="${index}"><button type="button" data-remove="${index}">Xóa</button></div>`;
    }).join("") : `<p>Đơn hàng chưa có sản phẩm. <a href="shop.html#products">Quay lại cửa hàng để chọn sản phẩm.</a></p>`;
    const sum = subtotal();
    if (voucher === "OCOP2026") discountValue = sum ? Math.min(50000, sum) : 0;
    else if (voucher === "FREESHIP") discountValue = sum ? Math.min(25000, sum) : 0;
    else if (voucher === "GIAM20K") discountValue = sum ? Math.min(20000, sum) : 0;
    document.getElementById("subtotal").textContent = money(sum);
    document.getElementById("discount").textContent = `−${money(discountValue)}`;
    document.getElementById("discountRow").hidden = !voucher;
    document.getElementById("total").textContent = money(sum - discountValue);
  }
  function persist() { localStorage.setItem(cartKey, JSON.stringify(items)); render(); }
  itemHost.addEventListener("change", (event) => {
    if (event.target.matches("[data-product]")) items[Number(event.target.dataset.product)].id = Number(event.target.value);
    if (event.target.matches("[data-quantity]")) items[Number(event.target.dataset.quantity)].quantity = Math.max(1, Math.min(99, Number(event.target.value) || 1));
    persist();
  });
  itemHost.addEventListener("click", (event) => {
    if (!event.target.matches("[data-remove]")) return;
    items.splice(Number(event.target.dataset.remove), 1); persist();
  });
  document.getElementById("addProduct").addEventListener("click", () => {
    if (!items.length) items.push({ id: products[0].id, quantity: 1 });
    else items.push({ id: products.find((product) => !items.some((item) => Number(item.id) === product.id))?.id || products[0].id, quantity: 1 });
    persist();
  });
  function applyVoucher(code) {
    const normalized = (code || document.getElementById("voucherInput").value).trim().toUpperCase();
    const status = document.getElementById("voucherStatus");
    if (!["OCOP2026", "FREESHIP", "GIAM20K"].includes(normalized)) {
      voucher = ""; status.textContent = "Mã chưa hợp lệ. Vui lòng kiểm tra và thử lại."; status.style.color = "#b43344";
    } else { voucher = normalized; status.textContent = `Đã áp dụng mã ${normalized}.`; status.style.color = "#087b57"; }
    document.getElementById("voucherInput").value = normalized;
    render();
  }
  document.getElementById("applyVoucher").addEventListener("click", () => applyVoucher());
  document.querySelectorAll("[data-voucher]").forEach((button) => button.addEventListener("click", () => applyVoucher(button.dataset.voucher)));
  document.querySelectorAll("[name=payment]").forEach((radio) => radio.addEventListener("change", () => {
    document.querySelectorAll(".payment-option").forEach((label) => label.classList.toggle("selected", label.contains(document.querySelector("[name=payment]:checked"))));
  }));
  const backdrop = document.getElementById("paymentBackdrop");
  function closePayment() { backdrop.hidden = true; }
  document.getElementById("paymentClose").addEventListener("click", closePayment);
  backdrop.addEventListener("click", (event) => { if (event.target === backdrop) closePayment(); });
  document.getElementById("finishPayment").addEventListener("click", () => {
    localStorage.removeItem(cartKey); items = []; render(); closePayment();
    document.getElementById("formStatus").textContent = "Đã ghi nhận đơn mô phỏng. Nhà bán hàng sẽ liên hệ xác nhận.";
    document.getElementById("checkoutForm").reset();
  });
  document.getElementById("checkoutForm").addEventListener("submit", (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const status = document.getElementById("formStatus");
    if (!items.length) { status.textContent = "Vui lòng thêm ít nhất một sản phẩm."; return; }
    if (!form.reportValidity()) return;
    const method = document.querySelector("[name=payment]:checked").value;
    const amount = subtotal() - discountValue;
    document.getElementById("dialogTotal").textContent = money(amount);
    document.getElementById("orderCode").textContent = `OCOP DON ${Math.random().toString(16).slice(2, 10).toUpperCase()}`;
    document.getElementById("dialogMethod").textContent = method === "vietqr" ? "BIDV / VietQR (mô phỏng)" : method === "momo" ? "Ví MoMo (mô phỏng)" : "Thanh toán khi nhận hàng";
    document.getElementById("qrBrand").textContent = method === "momo" ? "MoMo · mô phỏng" : "VietQR · mô phỏng";
    document.getElementById("paymentInstruction").textContent = method === "cod" ? "Đơn hàng thanh toán khi nhận hàng" : "Mã minh họa, không thực hiện giao dịch thật";
    document.querySelector(".qr-fake").hidden = method === "cod";
    document.querySelector(".demo-warning").hidden = method === "cod";
    backdrop.hidden = false;
  });
  document.addEventListener("keydown", (event) => { if (event.key === "Escape" && !backdrop.hidden) closePayment(); });
  render();
})();
