/* ================================================
   APIS Engineering — Main JavaScript
   ================================================ */

(function () {
  'use strict';

  // ---- Year in footer ----
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // ---- Mobile nav toggle ----
  const navToggle = document.getElementById('navToggle');
  const navLinks = document.getElementById('navLinks');

  if (navToggle && navLinks) {
    navToggle.addEventListener('click', function () {
      navLinks.classList.toggle('open');
      const isOpen = navLinks.classList.contains('open');
      navToggle.setAttribute('aria-expanded', isOpen);
      // Animate hamburger to X
      var spans = navToggle.querySelectorAll('span');
      if (isOpen) {
        spans[0].style.transform = 'rotate(45deg) translate(5px, 5px)';
        spans[1].style.opacity = '0';
        spans[2].style.transform = 'rotate(-45deg) translate(5px, -5px)';
      } else {
        spans[0].style.transform = '';
        spans[1].style.opacity = '';
        spans[2].style.transform = '';
      }
    });

    // Close nav when a link is clicked
    navLinks.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', function () {
        navLinks.classList.remove('open');
        var spans = navToggle.querySelectorAll('span');
        spans[0].style.transform = '';
        spans[1].style.opacity = '';
        spans[2].style.transform = '';
      });
    });

    // Close on outside click
    document.addEventListener('click', function (e) {
      if (!navLinks.contains(e.target) && !navToggle.contains(e.target)) {
        navLinks.classList.remove('open');
        var spans = navToggle.querySelectorAll('span');
        spans[0].style.transform = '';
        spans[1].style.opacity = '';
        spans[2].style.transform = '';
      }
    });
  }

  // ---- Smooth scroll for anchor links ----
  document.querySelectorAll('a[href^="#"]').forEach(function (anchor) {
    anchor.addEventListener('click', function (e) {
      var targetId = this.getAttribute('href');
      if (targetId === '#') return;
      var targetEl = document.querySelector(targetId);
      if (targetEl) {
        e.preventDefault();
        var navHeight = 70;
        var top = targetEl.getBoundingClientRect().top + window.pageYOffset - navHeight;
        window.scrollTo({ top: top, behavior: 'smooth' });
      }
    });
  });

  // ---- Active nav link on scroll ----
  var sections = document.querySelectorAll('section[id]');
  var navItems = document.querySelectorAll('.nav__links a:not(.nav__cta)');

  function highlightNav() {
    var scrollY = window.pageYOffset;
    sections.forEach(function (section) {
      var sectionTop = section.offsetTop - 100;
      var sectionHeight = section.offsetHeight;
      var sectionId = section.getAttribute('id');
      if (scrollY >= sectionTop && scrollY < sectionTop + sectionHeight) {
        navItems.forEach(function (item) {
          item.style.color = '';
          if (item.getAttribute('href') === '#' + sectionId) {
            item.style.color = '#fff';
          }
        });
      }
    });
  }

  window.addEventListener('scroll', highlightNav, { passive: true });

  // ---- Scroll fade-in animations ----
  var fadeEls = document.querySelectorAll(
    '.service-card, .industry-card, .advantage-card, .step, .stat-card, .about__text p'
  );

  fadeEls.forEach(function (el) {
    el.classList.add('fade-in');
  });

  function checkFade() {
    var windowHeight = window.innerHeight;
    fadeEls.forEach(function (el) {
      var rect = el.getBoundingClientRect();
      if (rect.top < windowHeight - 60) {
        el.classList.add('visible');
      }
    });
  }

  window.addEventListener('scroll', checkFade, { passive: true });
  window.addEventListener('load', checkFade);

  // ---- Contact form validation ----
  var form = document.getElementById('contactForm');
  var formStatus = document.getElementById('formStatus');

  if (form) {
    function validateField(fieldId, errorId, validator) {
      var field = document.getElementById(fieldId);
      var errorEl = document.getElementById(errorId);
      if (!field || !errorEl) return true;

      var value = field.value.trim();
      var isValid = validator(value);

      if (!isValid) {
        field.classList.add('invalid');
        errorEl.textContent = field.getAttribute('data-error') || 'Šis laukas yra privalomas.';
      } else {
        field.classList.remove('invalid');
        errorEl.textContent = '';
      }
      return isValid;
    }

    // Validators
    function isRequired(val) { return val.length > 0; }
    function isEmail(val) {
      if (!isRequired(val)) return true; // required check handles emptiness
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
    }
    function isPhone(val) {
      if (!isRequired(val)) return true;
      return /^[\+]?[\d\s\-()]{6,}$/.test(val);
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();

      var v1 = validateField('name', 'nameError', isRequired);
      var v2 = validateField('phone', 'phoneError', isPhone);
      var v3 = validateField('email', 'emailError', isEmail);
      var v4 = validateField('message', 'messageError', isRequired);

      if (!v1) document.getElementById('nameError').textContent = 'Prašome įvesti savo vardą ir pavardę.';
      if (!v2) document.getElementById('phoneError').textContent = 'Prašome įvesti galiojantį telefono numerį.';
      if (!v3) document.getElementById('emailError').textContent = 'Prašome įvesti galiojantį el. pašto adresą.';
      if (!v4) document.getElementById('messageError').textContent = 'Aprašykite savo projekto reikalavimus.';

      var allValid = v1 && v2 && v3 && v4;

      if (allValid) {
        // Simulate form submission — replace with real endpoint
        formStatus.className = 'form-status success';
        formStatus.textContent = 'Ačiū! Jūsų žinutė išsiųsta. Susisieksime per vieną darbo dieną.';
        form.reset();

        // Clear status after 8 seconds
        setTimeout(function () {
          formStatus.textContent = '';
          formStatus.className = 'form-status';
        }, 8000);
      } else {
        formStatus.className = 'form-status error';
        formStatus.textContent = 'Prašome pataisyti klaidas ir bandyti iš naujo.';
      }
    });

    // Clear error on input focus
    ['name', 'phone', 'email', 'message'].forEach(function (id) {
      var field = document.getElementById(id);
      if (field) {
        field.addEventListener('input', function () {
          this.classList.remove('invalid');
          var errId = id + 'Error';
          var errEl = document.getElementById(errId);
          if (errEl) errEl.textContent = '';
        });
      }
    });
  }

})();
