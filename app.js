(function () {
  'use strict';

  const products = window.JAZZSCRATCH_PRODUCTS || [];
  const CART_KEY = 'jazzscratch-cart';
  const REVIEWS_KEY = 'jazzscratch-reviews';
  const PREFERENCES_KEY = 'jazzscratch-preferences';
  const SUGGESTION_RATINGS_KEY = 'jazzscratch-suggestion-ratings';
  const money = (amount) => `$${Number(amount).toFixed(2)}`;
  const byId = (id) => products.find((product) => product.id === id);
  const productFormats = (product) => product.formats && product.formats.length ? product.formats : [product.format];
  const formatLabel = (product) => productFormats(product).length > 1 ? 'Multiple Formats' : product.format;

  function readCart() {
    const stored = JSON.parse(localStorage.getItem(CART_KEY) || '[]');
    if (!Array.isArray(stored)) return [];
    return stored.filter((entry) => byId(entry.id) && Number.isInteger(entry.quantity) && entry.quantity > 0)
      .map((entry) => ({ ...entry, format: entry.format || byId(entry.id).format }));
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

  function addToCart(id, quantity, format) {
    if (!byId(id)) return;
    const cart = readCart();
    const selectedFormat = format || byId(id).format;
    const existing = cart.find((item) => item.id === id && item.format === selectedFormat);
    if (existing) existing.quantity += quantity;
    else cart.push({ id, quantity, format: selectedFormat });
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
          <div class="product-meta"><span class="product-price">${money(product.price)}</span><span class="product-format">${formatLabel(product)}</span></div>
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
    const genre = document.querySelector('[data-genre-filter]');
    const price = document.querySelector('[data-price-filter]');
    const sort = document.querySelector('[data-sort]');

    if (genre) {
      const genres = [...new Set(products.flatMap((product) => product.genres || []))].sort();
      genre.innerHTML = '<option value="all">All genres</option>' +
        genres.map((value) => `<option value="${value}">${value}</option>`).join('');
    }

    function update() {
      const query = search.value.trim().toLowerCase();
      const selectedFormat = format.value;
      const selectedGenre = genre.value;
      const selectedPrice = price.value;
      const matching = products.filter((product) => {
        const searchable = `${product.title} ${product.artist} ${productFormats(product).join(' ')} ${(product.genres || []).join(' ')} ${product.label}`.toLowerCase();
        const matchesFormat = selectedFormat === 'all' || productFormats(product).some((value) => value.toLowerCase() === selectedFormat);
        const matchesGenre = selectedGenre === 'all' || (product.genres || []).includes(selectedGenre);
        const matchesPrice =
          selectedPrice === 'all' ||
          (selectedPrice === 'under-15' && product.price < 15) ||
          (selectedPrice === '15-25' && product.price >= 15 && product.price <= 25) ||
          (selectedPrice === '25-35' && product.price > 25 && product.price <= 35) ||
          (selectedPrice === '35-plus' && product.price >= 35);
        return searchable.includes(query) && matchesFormat && matchesGenre && matchesPrice;
      });
      if (sort.value === 'price-low') matching.sort((a, b) => a.price - b.price);
      if (sort.value === 'price-high') matching.sort((a, b) => b.price - a.price);
      if (sort.value === 'title') matching.sort((a, b) => a.title.localeCompare(b.title));
      grid.innerHTML = matching.length
        ? matching.map(renderProductCard).join('')
        : '<p class="empty-state">No records found. Try a different search or filter.</p>';
      const resultCount = document.querySelector('[data-result-count]');
      if (resultCount) resultCount.textContent = `${matching.length} ${matching.length === 1 ? 'record' : 'records'}`;
    }

    [search, format, genre, price, sort].forEach((control) => control.addEventListener('input', update));
    [format, genre, price, sort].forEach((control) => control.addEventListener('change', update));
    update();
  }

  function renderDetail() {
    const root = document.querySelector('[data-product-detail]');
    if (!root) return;
    const requestedId = new URLSearchParams(window.location.search).get('id');
    const product = byId(requestedId) || products[0];
    const formats = productFormats(product);
    const formatControl = formats.length > 1
      ? `<label class="detail-format"><span>Format</span><select class="select" data-detail-format data-detail-label="${product.label}" aria-label="Choose format">${formats.map((format) => `<option value="${format}"${format === product.format ? ' selected' : ''}>${format}</option>`).join('')}</select></label>`
      : '';
    const reviewUrl = `product-review.html?album=${encodeURIComponent(product.title)}&artist=${encodeURIComponent(product.artist)}`;
    root.innerHTML = `
      <div>
        <img class="detail-image" src="${product.image}" alt="${product.title} by ${product.artist}">
      </div>
      <div class="detail-copy">
        <p class="eyebrow" data-detail-eyebrow>${formats.length > 1 ? 'Multiple Formats' : product.format} · ${product.label}</p>
        <h1>${product.title}</h1>
        <p class="detail-artist">${product.artist}</p>
        <p class="detail-price">${money(product.price)}</p>
        <p class="detail-description">${product.description}</p>
        <div class="detail-purchase">
          ${formatControl}
          <label class="sr-only" for="detail-quantity">Quantity</label>
          <input class="quantity-input" id="detail-quantity" type="number" min="1" max="20" value="1">
          <button class="button" type="button" data-detail-add="${product.id}">Add to bag</button>
          <a class="button button-outline" href="${reviewUrl}">Write a review</a>
        </div>
        <p class="notice" data-cart-message hidden role="status"></p>
        <dl class="spec-list">
          <div class="spec-row"><dt>Artist</dt><dd>${product.artist}</dd></div>
          <div class="spec-row"><dt>Release</dt><dd>${product.year}</dd></div>
          <div class="spec-row"><dt>Format</dt><dd data-detail-format-value>${formats.length > 1 ? 'Multiple Formats' : product.format}</dd></div>
          ${product.genres ? `<div class="spec-row"><dt>Genre</dt><dd>${product.genres.join(', ')}</dd></div>` : ''}
          <div class="spec-row"><dt>Label</dt><dd>${product.label}</dd></div>
        </dl>
      </div>`;
    renderProductInterpretation(product);
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
      return `<li><span>${product.title} · ${item.format} × ${item.quantity}</span><strong>${money(product.price * item.quantity)}</strong></li>`;
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
                <p>${product.artist} · ${item.format}</p>
                <div class="cart-line-controls">
                  <div class="qty-control" aria-label="Quantity">
                    <button type="button" data-quantity-change="${product.id}" data-format="${item.format}" data-change="-1" aria-label="Decrease ${product.title} quantity">−</button>
                    <span>${item.quantity}</span>
                    <button type="button" data-quantity-change="${product.id}" data-format="${item.format}" data-change="1" aria-label="Increase ${product.title} quantity">+</button>
                  </div>
                  <button class="remove-button" type="button" data-remove-item="${product.id}" data-format="${item.format}">Remove</button>
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

  function uniqueValues(values) {
    return [...new Set(values.filter(Boolean))];
  }

  function readSuggestionRatings() {
    const stored = JSON.parse(localStorage.getItem(SUGGESTION_RATINGS_KEY) || '{}');
    return stored && typeof stored === 'object' ? stored : {};
  }

  function renderProductInterpretation(product) {
    const container = document.querySelector('[data-product-interpretation]');
    if (!container) return;

    const reviews = readReviews();
    const normalize = (value) => String(value || '').trim().toLowerCase();
    const productReviews = reviews.filter((review) =>
      normalize(review.album) === normalize(product.title) ||
      normalize(review.artist) === normalize(product.artist)
    );
    const writtenReviews = productReviews.filter((review) =>
      (review.liked || review.disliked || review.text || '').trim()
    );

    const allLikedTags = uniqueValues(reviews.flatMap((review) => review.preferences?.likedTags || []));
    const allDislikedTags = uniqueValues(reviews.flatMap((review) => review.preferences?.dislikedTags || []));
    const likedText = uniqueValues(reviews.filter((review) => review.liked).map((review) => review.liked.trim()));
    const dislikedText = uniqueValues(reviews.filter((review) => review.disliked).map((review) => review.disliked.trim()));
    const likedArtists = uniqueValues(reviews.filter((review) => (review.rating || 0) >= 7).map((review) => review.artist));
    const totalWrittenReviews = reviews.filter((review) =>
      (review.liked || review.disliked || review.text || '').trim()
    ).length;

    const productLikedTags = allLikedTags.filter((tag) =>
      (product.genres || []).some((genre) => normalize(genre) === normalize(tag)) ||
      normalize(tag) === normalize(product.artist)
    );
    const likelyLikes = uniqueValues([
      ...productLikedTags,
      ...product.genres.filter((genre) => allLikedTags.some((tag) => normalize(tag) === normalize(genre))),
      ...(likedArtists.some((artist) => normalize(artist) === normalize(product.artist)) ? [product.artist] : [])
    ]).slice(0, 5);
    const likelyDislikes = allDislikedTags.slice(0, 5);
    const dislikedMatches = likelyDislikes.filter((tag) =>
      (product.genres || []).some((genre) => normalize(genre) === normalize(tag)) ||
      normalize(tag) === normalize(product.artist)
    );

    let interpretation;
    let recommendation = 'Unsure';
    if (totalWrittenReviews < 2) {
      interpretation = 'Write more reviews to receive more accurate interpretations!';
    } else if (dislikedMatches.length) {
      recommendation = 'Not suggested';
      interpretation = `Across all written reviews you have shared, this item overlaps with ${dislikedMatches.length === 1 ? 'a preference you' : 'preferences you'} have previously disliked.`;
    } else if (likelyLikes.length) {
      recommendation = 'Suggested';
      interpretation = `Across all written reviews you have shared, this item aligns with preferences you have previously liked.`;
    } else {
      interpretation = `Across all written reviews you have shared, there is not enough overlap to clearly suggest or discourage this item.`;
    }
    if (likedText.length && totalWrittenReviews >= 2) {
      interpretation += ` Common liked themes include ${likedText.slice(0, 2).join(' and ')}.`;
    }

    const ratings = readSuggestionRatings();
    const selectedRating = ratings[product.id] || '';
    const statusClass = recommendation.toLowerCase().replace(' ', '-');
    container.innerHTML = `
      <div class="interpretation-heading">
        <div>
          <p class="eyebrow">Preference interpretation</p>
          <h2>${recommendation}</h2>
        </div>
        ${totalWrittenReviews >= 2 ? `<span class="interpretation-status interpretation-status-${statusClass}">Based on all reviews</span>` : '<span class="interpretation-status interpretation-status-unsure">Insufficient information</span>'}
      </div>
      <p class="interpretation-copy">${escapeHtml(interpretation)}</p>
      ${likelyLikes.length ? `
        <div class="interpretation-block">
          <strong>Matches preferences across all your reviews</strong>
          <div class="preference-chips">${likelyLikes.map((value) => `<span class="preference-chip">${escapeHtml(value)}</span>`).join('')}</div>
        </div>` : ''}
      ${likelyDislikes.length ? `
        <div class="interpretation-block">
          <strong>Potential dislikes across all your reviews</strong>
          <div class="preference-chips">${likelyDislikes.map((value) => `<span class="preference-chip preference-chip-disliked">${escapeHtml(value)}</span>`).join('')}</div>
        </div>` : ''}
      ${!likelyLikes.length && !likelyDislikes.length ? '<p class="muted-copy">Write more tagged reviews to receive more personalized highlights.</p>' : ''}
      ${dislikedText.length ? `<p class="interpretation-dislikes"><strong>Dislike themes:</strong> ${dislikedText.slice(0, 3).map(escapeHtml).join('; ')}</p>` : ''}
      <div class="suggestion-rating" data-suggestion-rating="${product.id}">
        <span>Does this interpretation align with your preferences?</span>
        <button type="button" class="${selectedRating === 'up' ? 'is-selected' : ''}" data-suggestion-rating-value="up" aria-label="Thumbs up" aria-pressed="${selectedRating === 'up'}">👍</button>
        <button type="button" class="${selectedRating === 'down' ? 'is-selected' : ''}" data-suggestion-rating-value="down" aria-label="Thumbs down" aria-pressed="${selectedRating === 'down'}">👎</button>
      </div>
    `;
  }

  function renderReviews(container, reviews) {
    if (!container) return;
    container.innerHTML = reviews.length
      ? reviews.map((review, index) => `<article class="review-item">
          <div class="review-item-header">
            <h3>${escapeHtml(review.album)} <span class="review-stars" aria-label="${review.rating} out of 10 stars">${'★'.repeat(Math.min(10, Math.max(0, review.rating)))}${'☆'.repeat(10 - Math.min(10, Math.max(0, review.rating)))}</span></h3>
            ${container.hasAttribute('data-profile-reviews') ? `<button class="delete-review-button" type="button" data-delete-review="${index}" aria-label="Delete review for ${escapeHtml(review.album)}">Delete</button>` : ''}
          </div>
          <small>${escapeHtml(review.artist)} · ${new Date(review.createdAt).toLocaleDateString()}</small>
          ${review.text ? `<p>${escapeHtml(review.text)}</p>` : ''}
          ${review.liked ? `<div class="review-feedback"><strong>Liked</strong><p>${escapeHtml(review.liked)}</p></div>` : ''}
          ${review.preferences && review.preferences.likedTags && review.preferences.likedTags.length ? `<div class="preference-chips">${review.preferences.likedTags.map((tag) => `<span class="preference-chip">${escapeHtml(tag)}</span>`).join('')}</div>` : ''}
          ${review.disliked ? `<div class="review-feedback review-feedback-disliked"><strong>Disliked</strong><p>${escapeHtml(review.disliked)}</p></div>` : ''}
          ${review.preferences && review.preferences.dislikedTags && review.preferences.dislikedTags.length ? `<div class="preference-chips">${review.preferences.dislikedTags.map((tag) => `<span class="preference-chip preference-chip-disliked">${escapeHtml(tag)}</span>`).join('')}</div>` : ''}
        </article>`).join('')
      : '<p class="empty-state">No reviews yet. Share a little about what you love.</p>';
  }

  function renderReviewPage() {
    const form = document.querySelector('[data-review-form]');
    if (!form) return;
    renderReviews(document.querySelector('[data-review-list]'), readReviews());
    const params = new URLSearchParams(window.location.search);
    const albumInput = form.querySelector('[name="album"]');
    const artistInput = form.querySelector('[name="artist"]');
    if (params.has('album') && albumInput) albumInput.value = params.get('album');
    if (params.has('artist') && artistInput) artistInput.value = params.get('artist');
    const starRating = form.querySelector('.star-rating');
    if (starRating) {
      starRating.addEventListener('change', (event) => {
        if (!event.target.matches('input[name="rating"]')) return;
        const selected = Number(event.target.value);
        starRating.querySelectorAll('label').forEach((label) => {
          const value = Number(label.htmlFor.replace('rating-', ''));
          label.classList.toggle('filled', value <= selected);
        });
      });
    }
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      if (!form.reportValidity()) return;
      const formData = new FormData(form);
      const preferences = {
        likedTags: formData.getAll('liked-tag'),
        dislikedTags: formData.getAll('disliked-tag')
      };
      const review = {
        album: formData.get('album').trim(),
        artist: formData.get('artist').trim(),
        rating: Number(formData.get('rating')),
        liked: formData.get('liked').trim(),
        disliked: formData.get('disliked').trim(),
        preferences,
        createdAt: new Date().toISOString()
      };
      const reviews = [review, ...readReviews()];
      localStorage.setItem(REVIEWS_KEY, JSON.stringify(reviews));
      localStorage.setItem(PREFERENCES_KEY, JSON.stringify(preferences));
      form.reset();
      const status = document.querySelector('[data-review-message]');
      status.textContent = 'Thanks for sharing. Your rating and feedback have been saved on this device.';
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
      const values = preferences
        ? [...(preferences.likedTags || []), ...(preferences.dislikedTags || []), ...(preferences.genres || []), ...(preferences.moods || []), ...(preferences.formats || [])]
        : [];
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
        const formatSelect = document.querySelector('[data-detail-format]');
        const selectedFormat = formatSelect ? formatSelect.value : byId(detailButton.dataset.detailAdd).format;
        if (Number.isInteger(quantity) && quantity > 0 && quantity <= 20) addToCart(detailButton.dataset.detailAdd, quantity, selectedFormat);
        else document.querySelector('#detail-quantity').reportValidity();
      }
      const changeButton = event.target.closest('[data-quantity-change]');
      if (changeButton) {
        const cart = readCart();
        const item = cart.find((entry) => entry.id === changeButton.dataset.quantityChange && entry.format === changeButton.dataset.format);
        if (item) item.quantity += Number(changeButton.dataset.change);
        saveCart(cart.filter((entry) => entry.quantity > 0));
        renderCart();
      }
      const removeButton = event.target.closest('[data-remove-item]');
      if (removeButton) {
        saveCart(readCart().filter((item) => !(item.id === removeButton.dataset.removeItem && item.format === removeButton.dataset.format)));
        renderCart();
      }
      const deleteReviewButton = event.target.closest('[data-delete-review]');
      if (deleteReviewButton) {
        const reviews = readReviews();
        const index = Number(deleteReviewButton.dataset.deleteReview);
        const review = reviews[index];
        if (review && window.confirm(`Delete your review for ${review.album}?`)) {
          const remaining = reviews.filter((_, reviewIndex) => reviewIndex !== index);
          localStorage.setItem(REVIEWS_KEY, JSON.stringify(remaining));
          const preferences = {
            likedTags: uniqueValues(remaining.flatMap((item) => item.preferences?.likedTags || [])),
            dislikedTags: uniqueValues(remaining.flatMap((item) => item.preferences?.dislikedTags || []))
          };
          localStorage.setItem(PREFERENCES_KEY, JSON.stringify(preferences));
          renderProfile();
        }
      }
      const suggestionButton = event.target.closest('[data-suggestion-rating-value]');
      if (suggestionButton) {
        const ratingGroup = suggestionButton.closest('[data-suggestion-rating]');
        const productId = ratingGroup.dataset.suggestionRating;
        const ratings = readSuggestionRatings();
        const value = suggestionButton.dataset.suggestionRatingValue;
        ratings[productId] = ratings[productId] === value ? '' : value;
        localStorage.setItem(SUGGESTION_RATINGS_KEY, JSON.stringify(ratings));
        ratingGroup.querySelectorAll('[data-suggestion-rating-value]').forEach((button) => {
          const selected = button.dataset.suggestionRatingValue === ratings[productId];
          button.classList.toggle('is-selected', selected);
          button.setAttribute('aria-pressed', String(selected));
        });
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
