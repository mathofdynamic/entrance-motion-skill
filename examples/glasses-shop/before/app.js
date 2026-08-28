(() => {
  const select = (selector, root = document) => root.querySelector(selector);
  const selectAll = (selector, root = document) => [...root.querySelectorAll(selector)];
  let activeSurface = null;
  let activeTrigger = null;
  let bagCount = 0;

  const focusTarget = (surface) => select('[data-surface-focus], button:not([disabled]), input, a[href]', surface);

  const syncBag = () => {
    selectAll('[data-bag-count]').forEach((node) => { node.textContent = String(bagCount); });
    const empty = select('[data-bag-empty]');
    const filled = select('[data-bag-filled]');
    if (empty && filled) {
      empty.hidden = bagCount > 0;
      filled.hidden = bagCount === 0;
    }
  };

  const closeSurface = (surface = activeSurface) => {
    if (!surface) return;
    const backdrop = surface.closest('[data-surface-backdrop]');
    surface.hidden = true;
    surface.dataset.motionState = 'closed';
    surface.setAttribute('aria-hidden', 'true');
    if (backdrop) backdrop.hidden = true;
    if (activeTrigger) {
      activeTrigger.setAttribute('aria-expanded', 'false');
      activeTrigger.focus({ preventScroll: true });
    }
    activeSurface = null;
    activeTrigger = null;
  };

  const openSurface = (surface, trigger) => {
    if (!surface) return;
    if (activeSurface && activeSurface !== surface) closeSurface();
    const backdrop = surface.closest('[data-surface-backdrop]');
    if (backdrop) backdrop.hidden = false;
    surface.hidden = false;
    surface.dataset.motionState = 'open';
    surface.setAttribute('aria-hidden', 'false');
    activeSurface = surface;
    activeTrigger = trigger || null;
    if (trigger) trigger.setAttribute('aria-expanded', 'true');
    const target = focusTarget(surface);
    if (target) target.focus({ preventScroll: true });
  };

  const openProduct = (card) => {
    const dialog = select('#product-dialog');
    const backdrop = select('#product-backdrop');
    const image = select('[data-dialog-image]', dialog);
    const source = select('img', card);
    select('[data-dialog-name]', dialog).textContent = card.dataset.name;
    select('[data-dialog-description]', dialog).textContent = card.dataset.description;
    select('[data-dialog-price]', dialog).textContent = card.dataset.price;
    image.src = source.currentSrc || source.src;
    image.alt = source.alt;
    dialog.dataset.productId = card.dataset.productId;
    openSurface(dialog, null);
    backdrop.hidden = false;
  };

  document.addEventListener('click', (event) => {
    const opener = event.target.closest('[data-surface-open]');
    if (opener) {
      event.preventDefault();
      openSurface(document.getElementById(opener.dataset.surfaceOpen), opener);
      return;
    }

    const productButton = event.target.closest('[data-product-open]');
    if (productButton) {
      event.preventDefault();
      openProduct(productButton.closest('.product-card[data-product-id]'));
      return;
    }

    const closeButton = event.target.closest('[data-surface-close]');
    if (closeButton) {
      event.preventDefault();
      closeSurface(closeButton.closest('[data-motion-surface]'));
      return;
    }

    if (activeSurface && !activeSurface.contains(event.target) && !event.target.closest('[data-surface-open]')) closeSurface();
    if (event.target.matches('[data-surface-backdrop]')) closeSurface(activeSurface);
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && activeSurface) {
      event.preventDefault();
      closeSurface();
    }
  });

  selectAll('[data-filter]').forEach((button) => {
    button.addEventListener('click', () => {
      const filter = button.dataset.filter;
      selectAll('[data-filter]').forEach((item) => item.setAttribute('aria-pressed', String(item === button)));
      const visible = selectAll('.product-card[data-product-id]').filter((card) => {
        const show = filter === 'all' || card.dataset.category === filter;
        card.hidden = !show;
        return show;
      });
      const count = select('[data-filter-count]');
      if (count) count.textContent = `${visible.length} frames`;
    });
  });

  selectAll('[data-add-to-bag]').forEach((button) => {
    button.addEventListener('click', () => {
      bagCount += 1;
      syncBag();
      const dialog = select('#product-dialog');
      closeSurface(dialog);
      openSurface(select('#bag-panel'), select('[data-surface-open="bag-panel"]'));
    });
  });

  selectAll('[data-search-form]').forEach((form) => {
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const query = new FormData(form).get('q')?.toString().trim();
      select('[data-search-status]', form).textContent = query ? `Looking for "${query}"... try the collection.` : 'Type a frame, color, or mood.';
    });
  });

  selectAll('[data-newsletter-form]').forEach((form) => {
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      select('[data-newsletter-status]', form).textContent = 'You are on the list. Watch the light.';
      form.reset();
    });
  });

  syncBag();
})();
