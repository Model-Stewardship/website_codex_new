/* ============================================================
   script-v2.js — Model Stewardship v2
   ============================================================ */

// ── DOM refs ────────────────────────────────────────────────

const menuToggle = document.querySelector(".menu-toggle");
const siteNav = document.querySelector("#site-nav");
const navLinks = siteNav ? siteNav.querySelectorAll("a") : [];
const revealItems = document.querySelectorAll(".reveal");
const formStatus = document.querySelector("#form-status");
const intakeForm = document.querySelector("#intro-intake-form");
const formSuccess = document.querySelector("#form-success");
const submitBtn = document.querySelector("#submit-btn");
const imageZoomTriggers = document.querySelectorAll(".image-zoom-trigger");
const lightbox = document.querySelector("#image-lightbox");
const lightboxImage = document.querySelector("#lightbox-image");
const lightboxCaption = document.querySelector("#lightbox-caption");
const lightboxCloseButtons = lightbox ? lightbox.querySelectorAll("[data-lightbox-close]") : [];
const siteHeader = document.querySelector(".site-header");
const scrollProgressEl = document.querySelector("#scroll-progress");
let lastZoomTrigger = null;

// ── Form success ─────────────────────────────────────────────

const showFormSuccess = () => {
  if (intakeForm) intakeForm.hidden = true;
  if (formSuccess) {
    formSuccess.hidden = false;
    formSuccess.classList.add("visible");
  }
  if (formStatus) formStatus.textContent = "";
};

// ── Mobile nav ───────────────────────────────────────────────

if (menuToggle && siteNav) {
  menuToggle.addEventListener("click", () => {
    const isOpen = siteNav.classList.toggle("open");
    menuToggle.setAttribute("aria-expanded", String(isOpen));
  });

  navLinks.forEach((link) => {
    link.addEventListener("click", () => {
      siteNav.classList.remove("open");
      menuToggle.setAttribute("aria-expanded", "false");
    });
  });
}

// ── Scroll-reveal ────────────────────────────────────────────

if (revealItems.length > 0) {
  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
          revealObserver.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12 }
  );
  revealItems.forEach((item) => revealObserver.observe(item));
}

// ── Pre-submitted state ──────────────────────────────────────

const params = new URLSearchParams(window.location.search);
if (params.get("submitted") === "true") {
  showFormSuccess();
}

// ── Scroll progress bar + header shrink ─────────────────────

function updateScrollState() {
  const scrollTop = window.scrollY;

  if (scrollProgressEl) {
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    const pct = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
    scrollProgressEl.style.width = `${pct}%`;
  }

  if (siteHeader) {
    siteHeader.classList.toggle("scrolled", scrollTop > 60);
  }
}

window.addEventListener("scroll", updateScrollState, { passive: true });
updateScrollState();

// ── Active nav section tracking ──────────────────────────────

const navLinkEls = siteNav ? [...siteNav.querySelectorAll("a[data-navlink]")] : [];
const trackedSections = document.querySelectorAll("section[id]");

if (navLinkEls.length > 0 && trackedSections.length > 0) {
  const sectionObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const sectionId = entry.target.id;
          navLinkEls.forEach((link) => {
            link.classList.toggle(
              "active",
              link.getAttribute("data-navlink") === sectionId
            );
          });
        }
      });
    },
    {
      threshold: 0.35,
      rootMargin: "-60px 0px -40% 0px",
    }
  );
  trackedSections.forEach((section) => sectionObserver.observe(section));
}

// ── Hero network — canvas with cursor repulsion ──────────────
//
// Nodes drift slowly at all times. The cursor repels nearby
// nodes (parting-water effect). Scrolling briefly boosts speed.
// Animation pauses when the hero is scrolled out of view.

function buildHeroNetwork() {
  const container = document.querySelector(".hero-network");
  if (!container) return;

  const heroSection = container.closest(".hero");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const canvas = document.createElement("canvas");
  canvas.style.cssText = "position:absolute;inset:0;width:100%;height:100%;";
  container.appendChild(canvas);

  const ctx = canvas.getContext("2d");

  const NODE_COUNT      = 20;
  const BASE_SPEED      = 0.32;   // px/frame baseline drift
  const CONNECT_RATIO   = 0.22;   // edge draw threshold as fraction of canvas width
  const INFLUENCE_R     = 85;     // cursor influence radius, px
  const REPULSION       = 0.13;   // force magnitude per frame at cursor edge
  const FRICTION        = 0.993;  // velocity decay per frame (nodes settle after cursor leaves)
  const MAX_SPEED       = 2.5;    // hard cap, px/frame

  let nodes = [];
  let animFrame = null;
  let heroVisible = true;
  let scrollBoost = 0;

  // Cursor position in canvas coords (-9999 = off-canvas)
  let mouseX = -9999;
  let mouseY = -9999;

  // ── Cursor tracking ─────────────────────────────────────
  // Listen on the hero section (canvas has pointer-events:none)

  const eventTarget = heroSection || container;

  eventTarget.addEventListener("mousemove", (e) => {
    const rect = canvas.getBoundingClientRect();
    mouseX = e.clientX - rect.left;
    mouseY = e.clientY - rect.top;
  });

  eventTarget.addEventListener("mouseleave", () => {
    mouseX = -9999;
    mouseY = -9999;
  });

  // Touch: treat finger as cursor (passive — don't block scroll)
  eventTarget.addEventListener("touchmove", (e) => {
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];
    mouseX = touch.clientX - rect.left;
    mouseY = touch.clientY - rect.top;
  }, { passive: true });

  eventTarget.addEventListener("touchend", () => {
    mouseX = -9999;
    mouseY = -9999;
  }, { passive: true });

  // ── Scroll boost ─────────────────────────────────────────

  window.addEventListener("scroll", () => {
    scrollBoost = Math.min(scrollBoost + 2.5, 5);
  }, { passive: true });

  // ── Node factory ─────────────────────────────────────────

  function makeNode(w, h) {
    const angle = Math.random() * Math.PI * 2;
    const speed = BASE_SPEED * (0.6 + Math.random() * 0.8);
    return {
      x:     Math.random() * w,
      y:     Math.random() * h,
      vx:    Math.cos(angle) * speed,
      vy:    Math.sin(angle) * speed,
      r:     2.4 + Math.random() * 1.4,
      phase: Math.random() * Math.PI * 2,
    };
  }

  function init() {
    canvas.width  = container.offsetWidth;
    canvas.height = container.offsetHeight;
    nodes = Array.from({ length: NODE_COUNT }, () =>
      makeNode(canvas.width, canvas.height)
    );
  }

  // ── Draw loop ────────────────────────────────────────────

  function draw(timestamp) {
    const w = canvas.width;
    const h = canvas.height;
    const t = timestamp / 1000;
    const CONNECT_DIST = w * CONNECT_RATIO;

    ctx.clearRect(0, 0, w, h);

    scrollBoost *= 0.94;
    const speedMult = 1 + scrollBoost;

    nodes.forEach((node) => {
      // ── Cursor repulsion ──
      const cdx = node.x - mouseX;
      const cdy = node.y - mouseY;
      const cdist = Math.sqrt(cdx * cdx + cdy * cdy);
      if (cdist < INFLUENCE_R && cdist > 0) {
        const force = REPULSION * (1 - cdist / INFLUENCE_R);
        node.vx += (cdx / cdist) * force;
        node.vy += (cdy / cdist) * force;
      }

      // ── Friction (lets nodes settle after cursor interaction) ──
      node.vx *= FRICTION;
      node.vy *= FRICTION;

      // ── Re-energise if almost stopped ──
      // Uses a slow deterministic angle so nodes don't cluster
      const spd = Math.sqrt(node.vx * node.vx + node.vy * node.vy);
      if (spd < BASE_SPEED * 0.25) {
        const nudgeAngle = node.phase + t * 0.3;
        node.vx += Math.cos(nudgeAngle) * BASE_SPEED * 0.08;
        node.vy += Math.sin(nudgeAngle) * BASE_SPEED * 0.08;
      }

      // ── Speed cap ──
      const spd2 = Math.sqrt(node.vx * node.vx + node.vy * node.vy);
      if (spd2 > MAX_SPEED) {
        node.vx = (node.vx / spd2) * MAX_SPEED;
        node.vy = (node.vy / spd2) * MAX_SPEED;
      }

      // ── Move ──
      node.x += node.vx * speedMult;
      node.y += node.vy * speedMult;

      // ── Soft wall bounce ──
      if (node.x < 0) { node.x = 0; node.vx =  Math.abs(node.vx); }
      if (node.x > w) { node.x = w; node.vx = -Math.abs(node.vx); }
      if (node.y < 0) { node.y = 0; node.vy =  Math.abs(node.vy); }
      if (node.y > h) { node.y = h; node.vy = -Math.abs(node.vy); }
    });

    // ── Edges ──
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const ex = nodes[i].x - nodes[j].x;
        const ey = nodes[i].y - nodes[j].y;
        const ed = Math.sqrt(ex * ex + ey * ey);
        if (ed < CONNECT_DIST) {
          ctx.beginPath();
          ctx.moveTo(nodes[i].x, nodes[i].y);
          ctx.lineTo(nodes[j].x, nodes[j].y);
          ctx.strokeStyle = `rgba(110, 200, 162, ${(1 - ed / CONNECT_DIST) * 0.13})`;
          ctx.lineWidth = 0.6;
          ctx.stroke();
        }
      }
    }

    // ── Nodes ──
    nodes.forEach((node) => {
      const pulse = reducedMotion
        ? 0.22
        : 0.18 + 0.14 * Math.sin(t * 0.75 + node.phase);
      ctx.beginPath();
      ctx.arc(node.x, node.y, node.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(136, 228, 187, ${pulse})`;
      ctx.fill();
    });

    if (!reducedMotion && heroVisible) {
      animFrame = requestAnimationFrame(draw);
    }
  }

  // ── Resize: scale node positions proportionally ──────────

  new ResizeObserver(() => {
    const oldW = canvas.width  || 1;
    const oldH = canvas.height || 1;
    canvas.width  = container.offsetWidth;
    canvas.height = container.offsetHeight;
    const sx = canvas.width  / oldW;
    const sy = canvas.height / oldH;
    nodes.forEach((n) => { n.x *= sx; n.y *= sy; });
  }).observe(container);

  // ── Pause animation when hero scrolls out of view ────────

  new IntersectionObserver(([entry]) => {
    heroVisible = entry.isIntersecting;
    if (heroVisible && !reducedMotion && !animFrame) {
      animFrame = requestAnimationFrame(draw);
    }
    if (!heroVisible && animFrame) {
      cancelAnimationFrame(animFrame);
      animFrame = null;
    }
  }).observe(heroSection || container);

  // ── Boot ─────────────────────────────────────────────────

  init();
  animFrame = requestAnimationFrame(draw); // first frame always fires
}

buildHeroNetwork();

// ── Proof tabs ───────────────────────────────────────────────

const proofTabs = document.querySelectorAll(".proof-tab");
const proofPanels = document.querySelectorAll(".proof-panel");

if (proofTabs.length > 0 && proofPanels.length > 0) {
  proofTabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      const idx = parseInt(tab.getAttribute("data-tab"), 10);

      proofTabs.forEach((t) => {
        t.classList.remove("active");
        t.setAttribute("aria-selected", "false");
      });
      tab.classList.add("active");
      tab.setAttribute("aria-selected", "true");

      proofPanels.forEach((panel, i) => {
        if (i === idx) {
          panel.classList.add("active");
          panel.hidden = false;
        } else {
          panel.classList.remove("active");
          panel.hidden = true;
        }
      });
    });

    // Arrow key navigation
    tab.addEventListener("keydown", (e) => {
      const tabs = [...proofTabs];
      const idx = tabs.indexOf(tab);
      let next = -1;
      if (e.key === "ArrowRight") next = (idx + 1) % tabs.length;
      if (e.key === "ArrowLeft")  next = (idx - 1 + tabs.length) % tabs.length;
      if (next >= 0) {
        tabs[next].focus();
        tabs[next].click();
        e.preventDefault();
      }
    });
  });
}

// ── Intake form with spinner ─────────────────────────────────

if (intakeForm) {
  intakeForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (formStatus) formStatus.textContent = "Submitting intake...";
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.classList.add("btn-loading");
    }

    try {
      const formData = new FormData(intakeForm);
      const payload = new URLSearchParams();
      formData.forEach((value, key) => payload.append(key, String(value)));

      const response = await fetch("/", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: payload.toString(),
      });

      if (!response.ok) throw new Error("Submission failed");

      intakeForm.reset();
      showFormSuccess();
      window.history.replaceState({}, "", `${window.location.pathname}#contact`);
    } catch {
      if (formStatus) {
        formStatus.textContent =
          "Submission failed. Please try again or email stewart@modelstewardship.com.";
      }
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.classList.remove("btn-loading");
      }
    }
  });
}

// ── Lightbox ─────────────────────────────────────────────────

if (lightbox && lightboxImage && lightboxCaption && imageZoomTriggers.length > 0) {
  const closeLightbox = () => {
    lightbox.hidden = true;
    document.body.classList.remove("modal-open");
    lightboxImage.src = "";
    lightboxImage.alt = "";
    lightboxCaption.textContent = "";
    if (lastZoomTrigger) lastZoomTrigger.focus();
  };

  imageZoomTriggers.forEach((trigger) => {
    trigger.addEventListener("click", () => {
      const image = trigger.querySelector("img");
      const figure = trigger.closest("figure");
      const caption = figure ? figure.querySelector("figcaption") : null;
      if (!image) return;

      lastZoomTrigger = trigger;
      lightboxImage.src = image.currentSrc || image.src;
      lightboxImage.alt = image.alt;
      lightboxCaption.textContent = caption ? caption.textContent.trim() : image.alt;
      lightbox.hidden = false;
      document.body.classList.add("modal-open");

      const closeButton = lightbox.querySelector(".lightbox-close");
      if (closeButton) closeButton.focus();
    });
  });

  lightboxCloseButtons.forEach((btn) => btn.addEventListener("click", closeLightbox));

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !lightbox.hidden) closeLightbox();
  });
}
