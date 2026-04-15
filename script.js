const menuToggle = document.querySelector(".menu-toggle");
const siteNav = document.querySelector("#site-nav");
const navLinks = siteNav ? siteNav.querySelectorAll("a") : [];
const revealItems = document.querySelectorAll(".reveal");
const formStatus = document.querySelector("#form-status");
const imageZoomTriggers = document.querySelectorAll(".image-zoom-trigger");
const lightbox = document.querySelector("#image-lightbox");
const lightboxImage = document.querySelector("#lightbox-image");
const lightboxCaption = document.querySelector("#lightbox-caption");
const lightboxCloseButtons = lightbox ? lightbox.querySelectorAll("[data-lightbox-close]") : [];
let lastZoomTrigger = null;

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

if (revealItems.length > 0) {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12 }
  );

  revealItems.forEach((item) => observer.observe(item));
}

const params = new URLSearchParams(window.location.search);
if (formStatus && params.get("submitted") === "true") {
  formStatus.textContent = "Thanks. Your intake was submitted successfully.";
}

if (lightbox && lightboxImage && lightboxCaption && imageZoomTriggers.length > 0) {
  const closeLightbox = () => {
    lightbox.hidden = true;
    document.body.classList.remove("modal-open");
    lightboxImage.src = "";
    lightboxImage.alt = "";
    lightboxCaption.textContent = "";

    if (lastZoomTrigger) {
      lastZoomTrigger.focus();
    }
  };

  imageZoomTriggers.forEach((trigger) => {
    trigger.addEventListener("click", () => {
      const image = trigger.querySelector("img");
      const figure = trigger.closest("figure");
      const caption = figure ? figure.querySelector("figcaption") : null;

      if (!image) {
        return;
      }

      lastZoomTrigger = trigger;
      lightboxImage.src = image.currentSrc || image.src;
      lightboxImage.alt = image.alt;
      lightboxCaption.textContent = caption ? caption.textContent.trim() : image.alt;
      lightbox.hidden = false;
      document.body.classList.add("modal-open");

      const closeButton = lightbox.querySelector(".lightbox-close");
      if (closeButton) {
        closeButton.focus();
      }
    });
  });

  lightboxCloseButtons.forEach((button) => {
    button.addEventListener("click", closeLightbox);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !lightbox.hidden) {
      closeLightbox();
    }
  });
}
