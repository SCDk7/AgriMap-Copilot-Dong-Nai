(() => {
  const panel = document.getElementById("ocopChat");
  if (!panel) return;

  const messages = panel.querySelector(".chat-messages");
  const input = panel.querySelector("#chatbotInput");
  const form = panel.querySelector("#chatbotForm");
  const status = panel.querySelector("#chatbotStatus");
  const attachment = panel.querySelector("#chatbotAttachment");
  let lastLauncher = null;
  const supportContacts = [
    { title: "chat.support.admin1", phoneKey: "chat.support.hotline", phone: "0912 345 678", dial: "0912345678", zalo: true },
    { title: "chat.support.admin2", phoneKey: "chat.support.hotline", phone: "0918 888 688", dial: "0918888688", zalo: true },
    { title: "chat.support.admin3", phoneKey: "chat.support.hotline", phone: "0909 123 456", dial: "0909123456", zalo: true },
    { title: "chat.support.admin4", phoneKey: "chat.support.total", phone: "1900 888 688", dial: "1900888688", zalo: false }
  ];

  function t(key) {
    return window.ocopLocale ? window.ocopLocale.t(key) : key;
  }

  function launchers() {
    return document.querySelectorAll("#assistantButton, #chatOpen, #floatingChat");
  }

  function setOpen(open, launcher, restoreFocus) {
    panel.hidden = !open;
    launchers().forEach((button) => button.setAttribute("aria-expanded", String(open)));
    if (open) {
      lastLauncher = launcher || lastLauncher;
      input.focus();
      messages.scrollTop = messages.scrollHeight;
    } else if (restoreFocus !== false && lastLauncher) {
      lastLauncher.focus();
    }
  }

  function appendMessage(text, type) {
    const row = document.createElement("div");
    row.className = `chat-message ${type}`;
    row.dataset.chatDynamic = "true";

    if (type === "assistant") {
      const avatar = document.createElement("span");
      avatar.className = "chat-avatar";
      avatar.setAttribute("aria-hidden", "true");
      avatar.textContent = "🤖";
      row.append(avatar);
    }

    const bubble = document.createElement("div");
    bubble.className = "chat-bubble";
    bubble.textContent = text;
    row.append(bubble);
    messages.append(row);
    messages.scrollTop = messages.scrollHeight;
    return bubble;
  }

  function fill(key, values) {
    return Object.entries(values).reduce((text, [name, value]) => text.replace(`{${name}}`, String(value)), t(key));
  }

  function formatMoney(amount) {
    return `${amount.toLocaleString("vi-VN")} đ`;
  }

  function parseBudget(text) {
    const normalized = text.toLocaleLowerCase();
    if (/một triệu|one million/.test(normalized)) return 1000000;
    if (/nửa triệu|half a million/.test(normalized)) return 500000;

    const match = normalized.match(/(\d+(?:[.,]\d+)*)(?:\s*(triệu|tr|million|nghìn|ngàn|thousand|m|k))?/i);
    if (!match) return null;

    const raw = match[1];
    const suffix = match[2] || "";
    const grouped = /^\d{1,3}(?:[.,]\d{3})+$/.test(raw);
    let amount = grouped ? Number(raw.replace(/[.,]/g, "")) : Number(raw.replace(",", "."));
    if (["triệu", "tr", "million", "m"].includes(suffix)) amount *= 1000000;
    else if (["nghìn", "ngàn", "thousand", "k"].includes(suffix)) amount *= 1000;
    else if (amount < 1000 && /(ngân sách|budget|mức giá|tầm giá|khoảng|around|under)/.test(normalized)) amount *= 1000;
    else if (amount < 1000 && !/(đ|₫|vnd|vnđ)/.test(normalized)) return null;

    return Number.isFinite(amount) && amount > 0 ? Math.round(amount) : null;
  }

  function askBudgetChoice(amount) {
    const bubble = appendMessage(fill("chat.budgetChoose", { amount: formatMoney(amount) }), "assistant");
    const actions = document.createElement("div");
    actions.className = "chat-budget-actions";
    [
      { value: "single", label: t("chat.budgetSingle") },
      { value: "combo", label: t("chat.budgetCombo") }
    ].forEach(({ value, label }) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "chat-chip";
      button.dataset.chatChoice = value;
      button.dataset.chatBudget = String(amount);
      button.textContent = label;
      actions.append(button);
    });
    bubble.append(actions);
    messages.scrollTop = messages.scrollHeight;
  }

  function appendProductCard(bubble, product) {
    const card = document.createElement("article");
    card.className = "chat-recommendation";
    const head = document.createElement("div");
    head.className = "chat-recommendation-head";
    const name = document.createElement("strong");
    name.textContent = product.name;
    const price = document.createElement("span");
    const unitKey = product.unit === "hộp" ? "box" : product.unit === "lít" ? "liter" : "kg";
    price.textContent = `${formatMoney(product.price)} / ${t(`product.unit.${unitKey}`)}`;
    head.append(name, price);
    const add = document.createElement("button");
    add.type = "button";
    add.className = "chat-recommendation-add";
    add.dataset.chatAddProduct = String(product.id);
    add.textContent = t("chat.productAdd");
    card.append(head, add);
    bubble.append(card);
  }

  function showSingleOptions(budget) {
    const matching = window.ocopProducts
      .filter((product) => product.price <= budget)
      .sort((a, b) => b.price - a.price);
    const bubble = appendMessage(matching.length
      ? fill("chat.singleOptions", { amount: formatMoney(budget) })
      : t("chat.noSingle"), "assistant");
    if (matching.length) {
      const list = document.createElement("div");
      list.className = "chat-recommendations";
      bubble.append(list);
      matching.forEach((product) => appendProductCard(list, product));
    }
    messages.scrollTop = messages.scrollHeight;
  }

  function getCombos(budget) {
    const combos = [];
    function collect(index, chosen, total) {
      if (chosen.length >= 2 && total <= budget) combos.push({ products: chosen, total });
      if (index >= window.ocopProducts.length) return;
      collect(index + 1, chosen, total);
      const product = window.ocopProducts[index];
      if (total + product.price <= budget) collect(index + 1, [...chosen, product], total + product.price);
    }
    collect(0, [], 0);
    return combos.sort((a, b) => b.total - a.total || b.products.length - a.products.length).slice(0, 3);
  }

  function showComboOptions(budget) {
    const combos = getCombos(budget);
    const bubble = appendMessage(combos.length
      ? fill("chat.comboIntro", { amount: formatMoney(budget) })
      : t("chat.noCombo"), "assistant");
    if (combos.length) {
      const list = document.createElement("div");
      list.className = "chat-recommendations";
      combos.forEach((combo, index) => {
        const card = document.createElement("article");
        card.className = "chat-recommendation";
        const head = document.createElement("div");
        head.className = "chat-recommendation-head";
        const title = document.createElement("strong");
        title.textContent = fill("chat.comboTitle", { index: index + 1, count: combo.products.length });
        const total = document.createElement("span");
        total.textContent = formatMoney(combo.total);
        head.append(title, total);
        const items = document.createElement("ul");
        items.className = "chat-recommendation-items";
        combo.products.forEach((product) => {
          const item = document.createElement("li");
          const name = document.createElement("span");
          name.textContent = product.name;
          const price = document.createElement("strong");
          price.textContent = formatMoney(product.price);
          item.append(name, price);
          items.append(item);
        });
        const remainder = document.createElement("div");
        remainder.className = "chat-recommendation-total";
        const remainderLabel = document.createElement("span");
        remainderLabel.textContent = t("chat.budgetRemainder");
        const remainderAmount = document.createElement("strong");
        remainderAmount.textContent = formatMoney(budget - combo.total);
        remainder.append(remainderLabel, remainderAmount);
        const add = document.createElement("button");
        add.type = "button";
        add.className = "chat-recommendation-add";
        add.dataset.chatAddCombo = JSON.stringify(combo.products.map((product) => product.id));
        add.textContent = t("chat.comboAdd");
        card.append(head, items, remainder, add);
        list.append(card);
      });
      bubble.append(list);
    }
    messages.scrollTop = messages.scrollHeight;
  }

  function handleBudgetChoice(choice, amount, selectedButton) {
    const budget = amount || pendingBudget;
    pendingBudget = null;
    if (selectedButton) selectedButton.disabled = true;
    if (choice === "single") showSingleOptions(budget);
    else showComboOptions(budget);
  }

  function addSelectionToCart(entries) {
    window.ocopCart.add(entries);
    if (window.ocopOpenCart) {
      if (window.ocopCloseChat) window.ocopCloseChat();
      window.ocopOpenCart();
      return;
    }
    const count = entries.reduce((sum, entry) => sum + entry.quantity, 0);
    appendMessage(fill("chat.cartAdded", { count }), "assistant");
    const bubble = appendMessage("", "assistant");
    const link = document.createElement("a");
    link.href = "shop.html";
    link.textContent = t("chat.openStoreCart");
    bubble.append(link);
  }

  function createSupportAction(parent, labelKey, href, external) {
    const link = document.createElement("a");
    link.className = "chat-support-action";
    link.href = href;
    link.textContent = t(labelKey);
    if (external) {
      link.target = "_blank";
      link.rel = "noopener noreferrer";
    }
    parent.append(link);
  }

  function showSupportContacts() {
    const bubble = appendMessage(t("chat.supportIntro"), "assistant");
    const list = document.createElement("div");
    list.className = "chat-support-list";

    supportContacts.forEach((contact, index) => {
      const card = document.createElement("article");
      card.className = "chat-support-card";
      card.dataset.contact = String(index + 1);
      const number = document.createElement("span");
      number.className = "chat-support-number";
      number.textContent = String(index + 1);
      const details = document.createElement("div");
      details.className = "chat-support-details";
      const title = document.createElement("strong");
      title.textContent = t(contact.title);
      const phone = document.createElement("small");
      phone.textContent = fill(contact.phoneKey, { phone: contact.phone });
      details.append(title, phone);
      const actions = document.createElement("div");
      actions.className = "chat-support-actions";

      if (contact.zalo) {
        createSupportAction(actions, "chat.support.call", `tel:${contact.dial}`, false);
        createSupportAction(actions, "chat.support.zalo", `https://zalo.me/${contact.dial}`, true);
      } else {
        createSupportAction(actions, "chat.support.hotlineAction", `tel:${contact.dial}`, false);
        createSupportAction(actions, "chat.support.messenger", "https://m.me/", true);
      }

      card.append(number, details, actions);
      list.append(card);
    });

    bubble.append(list);
    messages.scrollTop = messages.scrollHeight;
  }

  let pendingBudget = null;

  function getResponse(intent, text) {
    if (!intent) {
      const normalized = text.toLocaleLowerCase();
      if (/đơn|đặt hàng|mua hàng/.test(normalized)) intent = "order";
      else if (/mã đơn|kiểm tra|tra cứu đơn|theo dõi/.test(normalized)) intent = "tracking";
      else if (/khiếu nại|đổi trả|hoàn tiền|lỗi/.test(normalized)) intent = "returns";
      else if (/sản phẩm|đặc sản|bưởi|cacao|ca cao|hạt điều|trà|mật ong/.test(normalized)) intent = "product";
    }

    const responseKeys = {
      product: "chat.responseProduct",
      order: "chat.responseOrder",
      tracking: "chat.responseTracking",
      returns: "chat.responseReturns"
    };
    return t(responseKeys[intent] || "chat.responseGeneral");
  }

  launchers().forEach((button) => {
    button.classList.add("chat-launcher-open");
    button.setAttribute("aria-haspopup", "dialog");
    button.setAttribute("aria-expanded", "false");
    button.addEventListener("click", () => {
      lastLauncher = button;
      setOpen(panel.hidden, button);
    });
  });

  panel.querySelector(".chat-close").addEventListener("click", () => setOpen(false));
  window.ocopCloseChat = () => setOpen(false, null, false);
  panel.querySelector(".chat-reset").addEventListener("click", () => {
    messages.querySelectorAll("[data-chat-dynamic]").forEach((message) => message.remove());
    input.value = "";
    status.textContent = "";
    pendingBudget = null;
    messages.scrollTop = 0;
    input.focus();
  });

  panel.addEventListener("click", (event) => {
    const supportButton = event.target.closest("[data-chat-support]");
    if (supportButton) {
      appendMessage(supportButton.textContent.trim(), "user");
      showSupportContacts();
      return;
    }

    const choiceButton = event.target.closest("[data-chat-choice]");
    if (choiceButton) {
      appendMessage(choiceButton.textContent.trim(), "user");
      handleBudgetChoice(choiceButton.dataset.chatChoice, Number(choiceButton.dataset.chatBudget), choiceButton);
      return;
    }

    const productButton = event.target.closest("[data-chat-add-product]");
    if (productButton) {
      addSelectionToCart([{ id: Number(productButton.dataset.chatAddProduct), quantity: 1 }]);
      return;
    }

    const comboButton = event.target.closest("[data-chat-add-combo]");
    if (comboButton) {
      const combo = JSON.parse(comboButton.dataset.chatAddCombo);
      addSelectionToCart(combo.map((id) => ({ id, quantity: 1 })));
      return;
    }

    const intentButton = event.target.closest("[data-chat-intent]");
    if (!intentButton) return;
    const intent = intentButton.dataset.chatIntent;
    appendMessage(intentButton.textContent.trim(), "user");
    appendMessage(getResponse(intent, ""), "assistant");
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const text = input.value.trim();
    if (!text) return;
    appendMessage(text, "user");
    const budget = parseBudget(text);
    if (budget !== null) {
      pendingBudget = budget;
      askBudgetChoice(budget);
    } else if (pendingBudget && /\b(combo|set|món|một món|single|one item)\b/i.test(text)) {
      handleBudgetChoice(/\b(combo|set)\b/i.test(text) ? "combo" : "single");
    } else {
      pendingBudget = null;
      appendMessage(getResponse("", text), "assistant");
    }
    input.value = "";
    status.textContent = "";
    input.focus();
  });

  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      form.requestSubmit();
    }
  });

  panel.querySelector(".chat-attach").addEventListener("click", () => attachment.click());
  attachment.addEventListener("change", () => {
    if (!attachment.files || !attachment.files.length) return;
    status.textContent = t("chat.fileLocalOnly").replace("{name}", attachment.files[0].name);
    attachment.value = "";
  });

  panel.querySelector(".chat-voice").addEventListener("click", () => {
    status.textContent = t("chat.voiceUnavailable");
    input.focus();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !panel.hidden) setOpen(false);
  });

  document.addEventListener("click", (event) => {
    if (!panel.hidden && !panel.contains(event.target) && !event.target.closest("#assistantButton, #chatOpen, #floatingChat")) {
      setOpen(false, null, false);
    }
  });
})();
