const menuToggle = document.querySelector(".menu-toggle");
const siteNav = document.querySelector("#site-nav");
const navLinks = siteNav ? siteNav.querySelectorAll("a") : [];
const revealItems = document.querySelectorAll(".reveal");
const formStatus = document.querySelector("#form-status");
const intakeForm = document.querySelector("#intro-intake-form");
const formSuccess = document.querySelector("#form-success");
const imageZoomTriggers = document.querySelectorAll(".image-zoom-trigger");
const lightbox = document.querySelector("#image-lightbox");
const lightboxImage = document.querySelector("#lightbox-image");
const lightboxCaption = document.querySelector("#lightbox-caption");
const lightboxCloseButtons = lightbox ? lightbox.querySelectorAll("[data-lightbox-close]") : [];
let lastZoomTrigger = null;

const showFormSuccess = () => {
  if (intakeForm) {
    intakeForm.hidden = true;
  }

  if (formSuccess) {
    formSuccess.hidden = false;
    formSuccess.classList.add("visible");
  }

  if (formStatus) {
    formStatus.textContent = "";
  }
};

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
if (params.get("submitted") === "true") {
  showFormSuccess();
}

if (intakeForm) {
  intakeForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (formStatus) {
      formStatus.textContent = "Submitting intake...";
    }

    const submitButton = intakeForm.querySelector('button[type="submit"]');
    if (submitButton) {
      submitButton.disabled = true;
    }

    try {
      const formData = new FormData(intakeForm);
      const payload = new URLSearchParams();

      formData.forEach((value, key) => {
        payload.append(key, String(value));
      });

      const response = await fetch("/", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body: payload.toString()
      });

      if (!response.ok) {
        throw new Error("Submission failed");
      }

      intakeForm.reset();
      showFormSuccess();
      window.history.replaceState({}, "", `${window.location.pathname}#contact`);
    } catch (error) {
      if (formStatus) {
        formStatus.textContent = "Submission failed. Please try again or email stewart@modelstewardship.com.";
      }

      if (submitButton) {
        submitButton.disabled = false;
      }
    }
  });
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
