(() => {
  const root = document.documentElement;
  root.classList.add("motion-enabled");

  const select = (selector, scope = document) => scope.querySelector(selector);
  const selectAll = (selector, scope = document) => [...scope.querySelectorAll(selector)];
  const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  const pageSections = selectAll("[data-motion-section]");
  const surfaceMeta = new WeakMap();
  const MOTION_DURATION = 100;
  const MOTION_LEAD = MOTION_DURATION / 3;
  const CLOSE_DURATION = 66;

  let activeSurface = null;
  let activeTrigger = null;
  let bagCount = 0;

  const prefersReducedMotion = () => motionQuery.matches;

  root.style.setProperty("--motion-duration", `${MOTION_DURATION}ms`);
  root.style.setProperty("--motion-lead", `${MOTION_LEAD}ms`);
  root.style.setProperty("--motion-close-duration", `${CLOSE_DURATION}ms`);

  const getSurfaceMeta = (surface) => {
    let meta = surfaceMeta.get(surface);
    if (!meta) {
      meta = {
        closeHandler: null,
        closeTimer: null,
        closeWaiters: [],
        generation: 0,
        openFrames: [],
        trigger: null,
      };
      surfaceMeta.set(surface, meta);
    }
    return meta;
  };

  const focusTarget = (surface) => select(
    "[data-surface-focus], input, button:not([disabled]), a[href]",
    surface,
  );

  const focusTrigger = (trigger) => {
    if (trigger && trigger.isConnected && typeof trigger.focus === "function") {
      trigger.focus({ preventScroll: true });
    }
  };

  const settleClose = (surface, didClose) => {
    const meta = getSurfaceMeta(surface);
    const waiters = meta.closeWaiters.splice(0);
    waiters.forEach((resolve) => resolve(didClose));
  };

  const clearSurfaceHandles = (surface) => {
    const meta = getSurfaceMeta(surface);
    meta.generation += 1;
    meta.openFrames.forEach((frame) => window.cancelAnimationFrame(frame));
    meta.openFrames = [];
    if (meta.closeTimer !== null) {
      window.clearTimeout(meta.closeTimer);
      meta.closeTimer = null;
    }
    if (meta.closeHandler) {
      surface.removeEventListener("transitionend", meta.closeHandler);
      meta.closeHandler = null;
    }
  };

  const finishSurfaceClose = (surface) => {
    if (!surface) return;
    const meta = getSurfaceMeta(surface);
    clearSurfaceHandles(surface);
    surface.hidden = true;
    surface.dataset.motionState = "closed";
    surface.setAttribute("aria-hidden", "true");
    surface.setAttribute("inert", "");

    const backdrop = surface.closest("[data-surface-backdrop]");
    if (backdrop) {
      backdrop.hidden = true;
      backdrop.dataset.motionBackdropState = "closed";
    }

    if (meta.trigger) meta.trigger.setAttribute("aria-expanded", "false");
    if (activeSurface === surface) {
      activeSurface = null;
      activeTrigger = null;
    }
    meta.trigger = null;
    settleClose(surface, true);
  };

  const cancelSurfaceClose = (surface) => {
    const meta = getSurfaceMeta(surface);
    clearSurfaceHandles(surface);
    settleClose(surface, false);
  };

  const prepareSurfaceItems = (surface) => {
    selectAll("[data-motion-surface-item]", surface).forEach((item, index) => {
      item.style.setProperty("--motion-index", String(index));
    });
  };

  const setSurfaceState = (surface, state) => {
    surface.dataset.motionState = state;
    surface.setAttribute("aria-hidden", state === "closing" || state === "closed" ? "true" : "false");
    if (state === "closing" || state === "closed") surface.setAttribute("inert", "");
    else surface.removeAttribute("inert");

    const backdrop = surface.closest("[data-surface-backdrop]");
    if (backdrop) backdrop.dataset.motionBackdropState = state;
  };

  const openSurface = (surface, trigger = null) => {
    if (!surface) return;

    if (activeSurface && activeSurface !== surface) finishSurfaceClose(activeSurface);
    selectAll("[data-motion-surface][data-motion-state='closing']").forEach((candidate) => {
      if (candidate !== surface) finishSurfaceClose(candidate);
    });

    const meta = getSurfaceMeta(surface);
    if (surface.dataset.motionState === "closing") cancelSurfaceClose(surface);
    clearSurfaceHandles(surface);
    prepareSurfaceItems(surface);

    const backdrop = surface.closest("[data-surface-backdrop]");
    surface.hidden = false;
    if (backdrop) backdrop.hidden = false;
    meta.trigger = trigger;
    activeSurface = surface;
    activeTrigger = trigger;
    if (trigger) trigger.setAttribute("aria-expanded", "true");

    if (prefersReducedMotion()) {
      setSurfaceState(surface, "open");
      const target = focusTarget(surface);
      if (target) target.focus({ preventScroll: true });
      return;
    }

    setSurfaceState(surface, "opening");
    const generation = meta.generation;
    const target = focusTarget(surface);
    if (target) target.focus({ preventScroll: true });

    const firstFrame = window.requestAnimationFrame(() => {
      const secondFrame = window.requestAnimationFrame(() => {
        if (meta.generation !== generation || surface.hidden || surface.dataset.motionState !== "opening") return;
        setSurfaceState(surface, "open");
      });
      meta.openFrames.push(secondFrame);
    });
    meta.openFrames.push(firstFrame);
  };

  const closeSurface = (surface = activeSurface, options = {}) => {
    if (!surface) return Promise.resolve(false);

    const meta = getSurfaceMeta(surface);
    if (surface.dataset.motionState === "closing") {
      return new Promise((resolve) => meta.closeWaiters.push(resolve));
    }

    if (surface.hidden && surface.dataset.motionState === "closed") return Promise.resolve(false);

    const promise = new Promise((resolve) => meta.closeWaiters.push(resolve));
    const trigger = meta.trigger || (activeSurface === surface ? activeTrigger : null);
    clearSurfaceHandles(surface);
    if (trigger) trigger.setAttribute("aria-expanded", "false");
    if (options.focusReturn !== false || surface.contains(document.activeElement)) {
      if (trigger) focusTrigger(trigger);
      else if (document.activeElement && typeof document.activeElement.blur === "function") document.activeElement.blur();
    }
    if (activeSurface === surface) {
      activeSurface = null;
      activeTrigger = null;
    }

    if (prefersReducedMotion()) {
      finishSurfaceClose(surface);
      return promise;
    }

    setSurfaceState(surface, "closing");
    const generation = meta.generation;
    const onTransitionEnd = (event) => {
      if (event.target === surface && event.propertyName === "opacity" && meta.generation === generation) {
        finishSurfaceClose(surface);
      }
    };
    meta.closeHandler = onTransitionEnd;
    surface.addEventListener("transitionend", onTransitionEnd);
    meta.closeTimer = window.setTimeout(() => finishSurfaceClose(surface), CLOSE_DURATION + 100);
    return promise;
  };

  const openProduct = (card, trigger) => {
    const dialog = select("#product-dialog");
    const image = select("[data-dialog-image]", dialog);
    const source = select("img", card);
    select("[data-dialog-name]", dialog).textContent = card.dataset.name;
    select("[data-dialog-description]", dialog).textContent = card.dataset.description;
    select("[data-dialog-price]", dialog).textContent = card.dataset.price;
    image.src = source.currentSrc || source.src;
    image.alt = source.alt;
    openSurface(dialog, trigger);
  };

  const pageSectionItems = new Map();
  const registeredPageItems = new Set();

  const registerPageSection = (section) => {
    const items = selectAll("[data-motion-page-item]", section).filter(
      (item) => item.closest("[data-motion-section]") === section,
    );
    items.forEach((item, index) => {
      item.style.setProperty("--motion-index", String(index));
      registeredPageItems.add(item);
    });
    pageSectionItems.set(section, items);
  };

  const revealPageSection = (section) => {
    if (section.dataset.motionSeen === "true") return;
    section.dataset.motionSeen = "true";
    (pageSectionItems.get(section) || []).forEach((item) => item.classList.add("is-motion-visible"));
  };

  const revealAllPageContent = () => {
    selectAll("[data-motion-page-item]").forEach((item) => item.classList.add("is-motion-visible"));
    pageSections.forEach((section) => { section.dataset.motionSeen = "true"; });
  };

  const startPageMotion = () => {
    pageSections.forEach(registerPageSection);
    selectAll("[data-motion-page-item]").filter((item) => !registeredPageItems.has(item)).forEach((item) => {
      item.style.setProperty("--motion-index", "0");
      item.classList.add("is-motion-visible");
    });

    if (prefersReducedMotion() || !("IntersectionObserver" in window)) {
      revealAllPageContent();
      return;
    }

    pageObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        revealPageSection(entry.target);
        pageObserver.unobserve(entry.target);
      });
    }, { rootMargin: "0px 0px -6% 0px", threshold: 0.05 });

    pageSections.forEach((section) => pageObserver.observe(section));
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        pageSections.forEach((section) => {
          const bounds = section.getBoundingClientRect();
          if (bounds.bottom > 0 && bounds.top < window.innerHeight * 0.94) {
            revealPageSection(section);
            pageObserver.unobserve(section);
          }
        });
      });
    });
  };

  const syncBag = () => {
    selectAll("[data-bag-count]").forEach((node) => { node.textContent = String(bagCount); });
    const empty = select("[data-bag-empty]");
    const filled = select("[data-bag-filled]");
    if (empty && filled) {
      empty.hidden = bagCount > 0;
      filled.hidden = bagCount === 0;
    }
  };

  document.addEventListener("click", (event) => {
    const target = event.target instanceof Element ? event.target : null;
    if (!target) return;

    const opener = target.closest("[data-surface-open]");
    if (opener) {
      event.preventDefault();
      openSurface(document.getElementById(opener.dataset.surfaceOpen), opener);
      return;
    }

    const productButton = target.closest("[data-product-open]");
    if (productButton) {
      event.preventDefault();
      openProduct(productButton.closest(".product-card[data-product-id]"), productButton);
      return;
    }

    const closeButton = target.closest("[data-surface-close]");
    if (closeButton) {
      event.preventDefault();
      closeSurface(closeButton.closest("[data-motion-surface]"));
      return;
    }

    if (activeSurface && !activeSurface.contains(target) && !target.closest("[data-surface-open]")) closeSurface();
    if (target.matches("[data-surface-backdrop]")) closeSurface(activeSurface);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && activeSurface) {
      event.preventDefault();
      closeSurface();
    }
  });

  selectAll("[data-filter]").forEach((button) => {
    button.addEventListener("click", () => {
      const filter = button.dataset.filter;
      selectAll("[data-filter]").forEach((item) => item.setAttribute("aria-pressed", String(item === button)));
      const visible = selectAll(".product-card[data-product-id]").filter((card) => {
        const show = filter === "all" || card.dataset.category === filter;
        card.hidden = !show;
        return show;
      });
      const count = select("[data-filter-count]");
      if (count) count.textContent = `${visible.length} frames`;
    });
  });

  selectAll("[data-add-to-bag]").forEach((button) => {
    button.addEventListener("click", () => {
      bagCount += 1;
      syncBag();
      const dialog = select("#product-dialog");
      const bagTrigger = select('[data-surface-open="bag-panel"]');
      closeSurface(dialog, { focusReturn: false }).then((didClose) => {
        if (didClose) openSurface(select("#bag-panel"), bagTrigger);
      });
    });
  });

  selectAll("[data-search-form]").forEach((form) => {
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const query = new FormData(form).get("q")?.toString().trim();
      select("[data-search-status]", form).textContent = query ? `Looking for "${query}"... try the collection.` : "Type a frame, color, or mood.";
    });
  });

  selectAll("[data-newsletter-form]").forEach((form) => {
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      select("[data-newsletter-status]", form).textContent = "You are on the list. Watch the light.";
      form.reset();
    });
  });

  const handleMotionPreferenceChange = () => {
    if (!prefersReducedMotion()) return;
    revealAllPageContent();
    selectAll("[data-motion-surface]").forEach((surface) => {
      if (surface.dataset.motionState === "closing") finishSurfaceClose(surface);
      else if (surface.dataset.motionState === "opening") {
        clearSurfaceHandles(surface);
        setSurfaceState(surface, "open");
      }
    });
  };

  if (typeof motionQuery.addEventListener === "function") motionQuery.addEventListener("change", handleMotionPreferenceChange);
  else if (typeof motionQuery.addListener === "function") motionQuery.addListener(handleMotionPreferenceChange);

  selectAll("[data-motion-surface]").forEach((surface) => {
    surface.dataset.motionState = "closed";
    surface.setAttribute("aria-hidden", "true");
    surface.setAttribute("inert", "");
    prepareSurfaceItems(surface);
  });

  startPageMotion();
  syncBag();
})();
