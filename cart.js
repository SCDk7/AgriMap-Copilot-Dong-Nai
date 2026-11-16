(() => {
  const storageKey = "ocop-cart";
  const productsById = new Map(window.ocopProducts.map((product) => [product.id, product]));

  function readCart() {
    const stored = localStorage.getItem(storageKey);
    if (!stored) return new Map();

    let entries;
    try {
      entries = JSON.parse(stored);
    } catch (error) {
      console.error("Could not read the saved OCOP cart.", error);
      return new Map();
    }

    if (!Array.isArray(entries)) {
      console.error("Saved OCOP cart data is not a list.");
      return new Map();
    }

    const cart = new Map();
    entries.forEach((entry) => {
      const product = entry && productsById.get(Number(entry.id));
      const quantity = Number(entry && entry.quantity);
      if (!product || !Number.isInteger(quantity) || quantity < 1) {
        console.error("Skipped an invalid saved OCOP cart item.", entry);
        return;
      }
      cart.set(product.id, quantity);
    });
    return cart;
  }

  let items = readCart();

  function save() {
    localStorage.setItem(storageKey, JSON.stringify([...items].map(([id, quantity]) => ({ id, quantity }))));
    window.dispatchEvent(new CustomEvent("ocop:cartchange"));
  }

  function requireProduct(id) {
    const product = productsById.get(Number(id));
    if (!product) throw new RangeError(`Unknown OCOP product id: ${id}`);
    return product;
  }

  window.ocopCart = {
    getItems() {
      return [...items].map(([id, quantity]) => ({ product: requireProduct(id), quantity }));
    },
    getCount() {
      return [...items.values()].reduce((count, quantity) => count + quantity, 0);
    },
    getSubtotal() {
      return [...items].reduce((subtotal, [id, quantity]) => subtotal + requireProduct(id).price * quantity, 0);
    },
    add(entries) {
      const additions = entries.map((entry) => {
        const product = requireProduct(entry.id);
        const quantity = Number(entry.quantity);
        if (!Number.isInteger(quantity) || quantity < 1) throw new RangeError("Cart quantity must be a positive integer.");
        return { id: product.id, quantity };
      });
      additions.forEach(({ id, quantity }) => items.set(id, (items.get(id) || 0) + quantity));
      save();
    },
    setQuantity(id, quantity) {
      const product = requireProduct(id);
      const nextQuantity = Number(quantity);
      if (!Number.isInteger(nextQuantity) || nextQuantity < 0) throw new RangeError("Cart quantity must be a non-negative integer.");
      if (nextQuantity === 0) items.delete(product.id);
      else items.set(product.id, nextQuantity);
      save();
    },
    remove(id) {
      items.delete(requireProduct(id).id);
      save();
    }
  };
})();
