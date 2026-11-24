(function () {
  'use strict';

  const products = window.JAZZSCRATCH_PRODUCTS || [];
  const CART_KEY = 'jazzscratch-cart';
  const REVIEWS_KEY = 'jazzscratch-reviews';
  const PREFERENCES_KEY = 'jazzscratch-preferences';
  const money = (amount) => `$${Number(amount).toFixed(2)}`;
  const byId = (id) => products.find((product) => product.id === id);

  function readCart() {
    const stored = JSON.parse(localStorage.getItem(CART_KEY) || '[]');
    if (!Array.isArray(stored)) return [];
    return stored.filter((entry) => byId(entry.id) && Number.isInteger(entry.quantity) && entry.quantity > 0);
  }

  function saveCart(cart) {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
    updateCartCount();
  }

  function updateCartCount() {
    const count = readCart().reduce((sum, item) => sum + item.quantity, 0);
    document.querySelectorAll('[data-cart-count]').forEach((counter) => {
      counter.textContent = String(count);
      counter.setAttribute('aria-label', `${count} items in cart`);
    });
  }

  function addToCart(id, quantity) {
    if (!byId(id)) return;
    const cart = readCart();
    const existing = cart.find((item) => item.id === id);
    if (existing) existing.quantity += quantity;
    else cart.push({ id, quantity });
    saveCart(cart);
    const message = document.querySelector('[data-cart-message]');
    if (message) {
      message.textContent = 'Added to your bag.';
      message.hidden = false;
    }
  }

  function renderProductCard(product) {
    return `
      <article class="product-card">
        <a class="product-image-wrap" href="product-detail.html?id=${encodeURIComponent(product.id)}" aria-label="View ${product.title} by ${product.artist}">
          <img class="product-image" src="${product.image}" alt="${product.title} by ${product.artist}" loading="lazy">
          ${product.badge ? `<span class="product-badge">${product.badge}</span>` : ''}
        </a>
        <div class="product-info">
          <p class="product-artist">${product.artist}</p>
          <h3 class="product-title"><a href="product-detail.html?id=${encodeURIComponent(product.id)}">${product.title}</a></h3>
          <div class="product-meta"><span class="product-price">${money(product.price)}</span><span class="product-format">${product.format}</span></div>
          <button class="button button-outline button-small card-add" type="button" data-add-to-cart="${product.id}">Add to bag</button>
        </div>
      </article>`;
  }

  function renderHome() {
    const grid = document.querySelector('[data-featured-products]');
    if (grid) grid.innerHTML = products.slice(0, 4).map(renderProductCard).join('');
  }

  function renderCatalog() {
    const grid = document.querySelector('[data-product-grid]');
    if (!grid) return;
    const search = document.querySelector('[data-search]');
    const format = document.querySelector('[data-format-filter]');
    const sort = document.querySelector('[data-sort]');

    function update() {
      const query = search.value.trim().toLowerCase();
      const selectedFormat = format.value;
      const matching = products.filter((product) => {
        const searchable = `${product.title} ${product.artist} ${product.format} ${product.label}`.toLowerCase();
        return searchable.includes(query) && (selectedFormat === 'all' || product.category === selectedFormat);
      });
      if (sort.value === 'price-low') matching.sort((a, b) => a.price - b.price);
      if (sort.value === 'price-high') matching.sort((a, b) => b.price - a.price);
      if (sort.value === 'title') matching.sort((a, b) => a.title.localeCompare(b.title));
      grid.innerHTML = matching.length
        ? matching.map(renderProductCard).join('')
        : '<p class="empty-state">No records found. Try a different search or format.</p>';
      const resultCount = document.querySelector('[data-result-count]');
      if (resultCount) resultCount.textContent = `${matching.length} ${matching.length === 1 ? 'record' : 'records'}`;
    }

    [search, format, sort].forEach((control) => control.addEventListener('input', update));
    [format, sort].forEach((control) => control.addEventListener('change', update));
    update();
  }

  function renderDetail() {
    const root = document.querySelector('[data-product-detail]');
    if (!root) return;
    const requestedId = new URLSearchParams(window.location.search).get('id');
    const product = byId(requestedId) || products[0];
    root.innerHTML = `
      <div>
        <img class="detail-image" src="${product.image}" alt="${product.title} by ${product.artist}">
      </div>
      <div class="detail-copy">
        <p class="eyebrow">${product.format} · ${product.label}</p>
        <h1>${product.title}</h1>
        <p class="detail-artist">${product.artist}</p>
        <p class="detail-price">${money(product.price)}</p>
        <p class="detail-description">${product.description}</p>
        <div class="detail-purchase">
          <label class="sr-only" for="detail-quantity">Quantity</label>
          <input class="quantity-input" id="detail-quantity" type="number" min="1" max="20" value="1">
          <button class="button" type="button" data-detail-add="${product.id}">Add to bag</button>
        </div>
        <p class="notice" data-cart-message hidden role="status"></p>
        <dl class="spec-list">
          <div class="spec-row"><dt>Artist</dt><dd>${product.artist}</dd></div>
          <div class="spec-row"><dt>Release</dt><dd>${product.year}</dd></div>
          <div class="spec-row"><dt>Format</dt><dd>${product.format}</dd></div>
          <div class="spec-row"><dt>Label</dt><dd>${product.label}</dd></div>
        </dl>
      </div>`;
  }

  function cartTotals(cart) {
    const subtotal = cart.reduce((sum, item) => sum + byId(item.id).price * item.quantity, 0);
    const shipping = subtotal === 0 || subtotal >= 60 ? 0 : 5;
    return { subtotal, shipping, total: subtotal + shipping };
  }

  function renderSummary(target, cart, checkout) {
    if (!target) return;
    const totals = cartTotals(cart);
    const lines = cart.map((item) => {
      const product = byId(item.id);
      return `<li><span>${product.title} × ${item.quantity}</span><strong>${money(product.price * item.quantity)}</strong></li>`;
    }).join('');
    target.innerHTML = `
      ${checkout ? `<ul class="order-lines">${lines}</ul>` : ''}
      <h2>Order summary</h2>
      <div class="summary-row"><span>Subtotal</span><strong>${money(totals.subtotal)}</strong></div>
      <div class="summary-row"><span>Shipping</span><strong>${totals.shipping === 0 ? 'Free' : money(totals.shipping)}</strong></div>
      <div class="summary-row summary-total"><span>Total</span><strong>${money(totals.total)}</strong></div>
      <p class="summary-note">${totals.subtotal >= 60 ? 'Your order ships free.' : 'Free shipping on orders over $60.'}</p>
      ${checkout ? '' : '<a class="button" href="checkout.html">Continue to checkout</a>'}`;
  }

  function renderCart() {
    const root = document.querySelector('[data-cart-content]');
    if (!root) return;
    const cart = readCart();
    if (!cart.length) {
      root.innerHTML = '<div class="empty-cart"><h2>Your bag is taking a breather.</h2><p>Find a new favorite to bring home.</p><a class="button" href="products.html">Explore the collection</a></div>';
      return;
    }
    root.innerHTML = `
      <div class="cart-layout">
        <div class="content-card" data-cart-lines>
          ${cart.map((item) => {
            const product = byId(item.id);
            return `<article class="cart-line">
              <a href="product-detail.html?id=${encodeURIComponent(product.id)}"><img src="${product.image}" alt="${product.title} by ${product.artist}"></a>
              <div>
                <h3><a href="product-detail.html?id=${encodeURIComponent(product.id)}">${product.title}</a></h3>
                <p>${product.artist} · ${product.format}</p>
                <div class="cart-line-controls">
                  <div class="qty-control" aria-label="Quantity">
                    <button type="button" data-quantity-change="${product.id}" data-change="-1" aria-label="Decrease ${product.title} quantity">−</button>
                    <span>${item.quantity}</span>
                    <button type="button" data-quantity-change="${product.id}" data-change="1" aria-label="Increase ${product.title} quantity">+</button>
                  </div>
                  <button class="remove-button" type="button" data-remove-item="${product.id}">Remove</button>
                </div>
              </div>
              <span class="line-total">${money(product.price * item.quantity)}</span>
            </article>`;
          }).join('')}
        </div>
        <aside class="content-card summary-card" data-cart-summary></aside>
      </div>`;
    renderSummary(root.querySelector('[data-cart-summary]'), cart, false);
  }

  function renderCheckout() {
    const form = document.querySelector('[data-checkout-form]');
    const root = document.querySelector('[data-checkout-content]');
    if (!form || !root) return;
    const cart = readCart();
    if (!cart.length) {
      root.innerHTML = '<div class="empty-cart"><h2>Your bag is empty.</h2><p>Add something lovely before checking out.</p><a class="button" href="products.html">Browse records</a></div>';
      return;
    }
    renderSummary(document.querySelector('[data-checkout-summary]'), cart, true);
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      if (!form.reportValidity()) return;
      const formData = new FormData(form);
      const orderNumber = `JS-${Date.now().toString().slice(-7)}`;
      const order = {
        number: orderNumber,
        name: formData.get('name'),
        email: formData.get('email'),
        total: cartTotals(cart).total,
        items: cart.map((item) => ({ id: item.id, quantity: item.quantity })),
        placedAt: new Date().toISOString()
      };
      localStorage.setItem('jazzscratch-last-order', JSON.stringify(order));
      saveCart([]);
      root.innerHTML = `<div class="content-card"><p class="eyebrow">Order confirmed</p><h2 class="serif" style="font-size:2rem">Thanks for listening with us, ${escapeHtml(order.name.split(' ')[0])}.</h2><p>Your demo order <strong>${orderNumber}</strong> is confirmed. A confirmation would be sent to <strong>${escapeHtml(order.email)}</strong> in a live store.</p><p class="notice" role="status">Your order total was ${money(order.total)}. This mockup does not process a real payment.</p><a class="button" href="products.html">Keep exploring</a></div>`;
    });
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (character) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[character]);
  }

  function readReviews() {
    const reviews = JSON.parse(localStorage.getItem(REVIEWS_KEY) || '[]');
    return Array.isArray(reviews) ? reviews : [];
  }

  function renderReviews(container, reviews) {
    if (!container) return;
    container.innerHTML = reviews.length
      ? reviews.map((review) => `<article class="review-item">
          <h3>${escapeHtml(review.album)} <span aria-label="${review.rating} out of 5 stars">${'★'.repeat(review.rating)}${'☆'.repeat(5 - review.rating)}</span></h3>
          <small>${escapeHtml(review.artist)} · ${new Date(review.createdAt).toLocaleDateString()}</small>
          <p>${escapeHtml(review.text)}</p>
          ${review.preferences ? `<div class="preference-chips">${[...review.preferences.genres, ...review.preferences.moods, ...review.preferences.formats].map((tag) => `<span class="preference-chip">${escapeHtml(tag)}</span>`).join('')}</div>` : ''}
        </article>`).join('')
      : '<p class="empty-state">No reviews yet. Share a little about what you love.</p>';
  }

  function renderReviewPage() {
    const form = document.querySelector('[data-review-form]');
    if (!form) return;
    renderReviews(document.querySelector('[data-review-list]'), readReviews());
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      if (!form.reportValidity()) return;
      const formData = new FormData(form);
      const preferences = {
        genres: formData.getAll('genre'),
        moods: formData.getAll('mood'),
        formats: formData.getAll('format')
      };
      const review = {
        album: formData.get('album').trim(),
        artist: formData.get('artist').trim(),
        rating: Number(formData.get('rating')),
        text: formData.get('review').trim(),
        preferences,
        createdAt: new Date().toISOString()
      };
      const reviews = [review, ...readReviews()];
      localStorage.setItem(REVIEWS_KEY, JSON.stringify(reviews));
      localStorage.setItem(PREFERENCES_KEY, JSON.stringify(preferences));
      form.reset();
      const status = document.querySelector('[data-review-message]');
      status.textContent = 'Thanks for sharing. Your review and listening preferences have been saved on this device.';
      status.hidden = false;
      renderReviews(document.querySelector('[data-review-list]'), reviews);
    });
  }

  function renderProfile() {
    const reviewList = document.querySelector('[data-profile-reviews]');
    if (!reviewList) return;
    const preferences = JSON.parse(localStorage.getItem(PREFERENCES_KEY) || 'null');
    const chips = document.querySelector('[data-profile-preferences]');
    if (chips) {
      const values = preferences ? [...preferences.genres, ...preferences.moods, ...preferences.formats] : [];
      chips.innerHTML = values.length
        ? values.map((value) => `<span class="preference-chip">${escapeHtml(value)}</span>`).join('')
        : '<span class="muted-copy">Your saved listening preferences will appear here after you write a review.</span>';
    }
    renderReviews(reviewList, readReviews());
  }

  function bindSharedControls() {
    document.addEventListener('click', (event) => {
      const addButton = event.target.closest('[data-add-to-cart]');
      if (addButton) addToCart(addButton.dataset.addToCart, 1);
      const detailButton = event.target.closest('[data-detail-add]');
      if (detailButton) {
        const quantity = Number(document.querySelector('#detail-quantity').value);
        if (Number.isInteger(quantity) && quantity > 0 && quantity <= 20) addToCart(detailButton.dataset.detailAdd, quantity);
        else document.querySelector('#detail-quantity').reportValidity();
      }
      const changeButton = event.target.closest('[data-quantity-change]');
      if (changeButton) {
        const cart = readCart();
        const item = cart.find((entry) => entry.id === changeButton.dataset.quantityChange);
        if (item) item.quantity += Number(changeButton.dataset.change);
        saveCart(cart.filter((entry) => entry.quantity > 0));
        renderCart();
      }
      const removeButton = event.target.closest('[data-remove-item]');
      if (removeButton) {
        saveCart(readCart().filter((item) => item.id !== removeButton.dataset.removeItem));
        renderCart();
      }
    });
    const menuButton = document.querySelector('[data-menu-toggle]');
    const nav = document.querySelector('[data-main-nav]');
    if (menuButton && nav) {
      menuButton.addEventListener('click', () => {
        const isOpen = nav.classList.toggle('is-open');
        menuButton.setAttribute('aria-expanded', String(isOpen));
      });
    }
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    document.querySelectorAll('[data-main-nav] a').forEach((link) => {
      if (link.getAttribute('href') === currentPage) link.setAttribute('aria-current', 'page');
    });
    updateCartCount();
  }

  bindSharedControls();
  renderHome();
  renderCatalog();
  renderDetail();
  renderCart();
  renderCheckout();
  renderReviewPage();
  renderProfile();
})();
