let allProducts = [];

document.addEventListener('DOMContentLoaded', () => {
  initNavToggle();
  fetchProducts();
  initSearch();
  initAboutSection();
});

function initNavToggle() {
  const toggle = document.querySelector('.nav-toggle');
  const navLinks = document.querySelector('.nav-links');
  if (toggle && navLinks) {
    toggle.addEventListener('click', () => {
      navLinks.classList.toggle('open');
      toggle.classList.toggle('active');
    });

    navLinks.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', () => {
        navLinks.classList.remove('open');
        toggle.classList.remove('active');
      });
    });

    document.addEventListener('click', (event) => {
      if (!navLinks.contains(event.target) && !toggle.contains(event.target)) {
        navLinks.classList.remove('open');
        toggle.classList.remove('active');
      }
    });
  }
}

async function fetchProducts() {
  const grid = document.getElementById('productsGrid');
  showLoading(grid);

  try {
    const response = await fetch(`${API_BASE_URL}/products`);

    let result;
    try {
      result = await response.json();
    } catch {
      throw new Error('Could not reach the server. Run the backend and open http://127.0.0.1:5001');
    }

    if (!response.ok) {
      throw new Error(result.message || 'Failed to fetch products');
    }

    allProducts = result.data || [];
    renderProducts(allProducts);
  } catch (error) {
    grid.innerHTML = `<p class="error-message">${escapeHtml(error.message)}</p>`;
    showToast(error.message, 'error');
  }
}

function renderProducts(products) {
  const grid = document.getElementById('productsGrid');

  if (products.length === 0) {
    grid.innerHTML = '<p class="empty-message">No products found. Add some from the Admin panel.</p>';
    return;
  }

  grid.innerHTML = products
    .map((product) => {
      const imageUrl = getImageUrl(product.images?.[0]);
      const productId = product._id;
      const hasSale = Boolean(product.discountPrice && Number(product.discountPrice) < Number(product.price));
      const badgeMarkup = hasSale
        ? `<span class="product-sale-badge">${getDiscountBadge(product.price, product.discountPrice)}</span>`
        : '';
      const priceMarkup = hasSale
        ? `<span class="product-price-sale">${formatPrice(product.discountPrice)}</span><span class="product-price-original">${formatPrice(product.price)}</span>`
        : `<span class="product-price-normal">${formatPrice(product.price)}</span>`;

      return `
    <article class="product-card" data-id="${productId}" role="button" tabindex="0" aria-label="View ${escapeHtml(product.name)}">
      <div class="product-card-image">
        ${badgeMarkup}
        <img src="${imageUrl}" alt="${escapeHtml(product.name)}" loading="lazy"
          onerror="this.src='https://via.placeholder.com/400x400/111111/888888?text=No+Image'">
      </div>
      <div class="product-card-info">
        <span class="product-brand">${escapeHtml(product.brand)}</span>
        <h3 class="product-name">${escapeHtml(product.name)}</h3>
        <div class="product-price">${priceMarkup}</div>
        ${product.stock <= 0 ? '<span class="product-stock-badge">Out of stock</span>' : ''}
      </div>
    </article>
  `;
    })
    .join('');

  grid.querySelectorAll('.product-card').forEach((card) => {
    const openProduct = () => goToProduct(card.dataset.id);
    card.addEventListener('click', openProduct);
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openProduct();
      }
    });
  });
}

function getDiscountBadge(originalPrice, salePrice) {
  const original = Number(originalPrice);
  const sale = Number(salePrice);

  if (!original || !sale || sale >= original) {
    return '';
  }

  const discount = Math.round(((original - sale) / original) * 100);
  return `${discount}% OFF`;
}

function initSearch() {
  const searchInput = document.getElementById('searchInput');
  if (!searchInput) return;

  searchInput.addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase().trim();
    const filtered = allProducts.filter(
      (p) =>
        p.name.toLowerCase().includes(query) ||
        p.brand.toLowerCase().includes(query) ||
        p.category.toLowerCase().includes(query)
    );
    renderProducts(filtered);
  });
}

function initAboutSection() {
  const section = document.querySelector('.about-section');
  if (!section) return;

  const revealItems = section.querySelectorAll('.about-reveal');
  const counters = section.querySelectorAll('.counter-number');

  const revealObserver = new IntersectionObserver(
    (entries, observer) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.2 }
  );

  revealItems.forEach((item) => revealObserver.observe(item));

  const counterObserver = new IntersectionObserver(
    (entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting || entry.target.dataset.animated === 'true') return;

        entry.target.dataset.animated = 'true';
        animateCounter(entry.target);
        observer.unobserve(entry.target);
      });
    },
    { threshold: 0.6 }
  );

  counters.forEach((counter) => counterObserver.observe(counter));
}

function animateCounter(element) {
  const target = Number(element.dataset.target || 0);
  const suffix = element.dataset.suffix || '';
  const duration = 1400;
  const startTime = performance.now();

  const updateCounter = (timestamp) => {
    const progress = Math.min((timestamp - startTime) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    const currentValue = Math.round(target * eased);
    element.textContent = `${currentValue}${suffix}`;

    if (progress < 1) {
      requestAnimationFrame(updateCounter);
    } else {
      element.textContent = `${target}${suffix}`;
    }
  };

  requestAnimationFrame(updateCounter);
}




















// =============================================
// Hero Slider - Responsive with Desktop & Mobile
// =============================================

(function() {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSlider);
  } else {
    initSlider();
  }

  function initSlider() {
    const desktopSlider = document.getElementById('desktopSlider');
    const mobileSlider = document.getElementById('mobileSlider');
    const desktopIndicators = document.getElementById('desktopIndicators');
    const mobileIndicators = document.getElementById('mobileIndicators');
    const prevBtn = document.querySelector('.slider-control.prev');
    const nextBtn = document.querySelector('.slider-control.next');
    const heroSection = document.querySelector('.hero');
    
    // Get active slides based on viewport
    function getActiveSlider() {
      const isMobile = window.innerWidth <= 768;
      if (isMobile) {
        return {
          slides: mobileSlider ? mobileSlider.querySelectorAll('.hero-slide') : [],
          indicators: mobileIndicators ? mobileIndicators.querySelectorAll('.indicator') : []
        };
      } else {
        return {
          slides: desktopSlider ? desktopSlider.querySelectorAll('.hero-slide') : [],
          indicators: desktopIndicators ? desktopIndicators.querySelectorAll('.indicator') : []
        };
      }
    }

    let active = getActiveSlider();
    let slides = active.slides;
    let indicators = active.indicators;
    let currentSlide = 0;
    let slideInterval = null;
    let isPaused = false;
    const slideDuration = 5000;

    // Change slide function
    function changeSlide(index, slidesToUse, indicatorsToUse) {
      const activeSlides = slidesToUse || slides;
      const activeIndicators = indicatorsToUse || indicators;
      
      activeSlides.forEach(slide => slide.classList.remove('active'));
      activeIndicators.forEach(ind => ind.classList.remove('active'));
      
      if (activeSlides[index]) {
        activeSlides[index].classList.add('active');
      }
      if (activeIndicators[index]) {
        activeIndicators[index].classList.add('active');
      }
      currentSlide = index;
    }

    // Navigation functions
    function nextSlide() {
      const activeSlider = getActiveSlider();
      if (activeSlider.slides.length === 0) return;
      const next = (currentSlide + 1) % activeSlider.slides.length;
      changeSlide(next, activeSlider.slides, activeSlider.indicators);
    }

    function prevSlide() {
      const activeSlider = getActiveSlider();
      if (activeSlider.slides.length === 0) return;
      const prev = (currentSlide - 1 + activeSlider.slides.length) % activeSlider.slides.length;
      changeSlide(prev, activeSlider.slides, activeSlider.indicators);
    }

    // Auto-play
    function startAutoPlay() {
      if (slideInterval) clearInterval(slideInterval);
      if (!isPaused && slides.length > 1) {
        slideInterval = setInterval(nextSlide, slideDuration);
      }
    }

    function stopAutoPlay() {
      if (slideInterval) {
        clearInterval(slideInterval);
        slideInterval = null;
      }
    }

    function toggleAutoPlay(pause) {
      isPaused = pause;
      if (pause) {
        stopAutoPlay();
      } else {
        startAutoPlay();
      }
    }

    // Handle resize
    function handleResize() {
      const activeSlider = getActiveSlider();
      const newSlides = activeSlider.slides;
      const newIndicators = activeSlider.indicators;
      
      slides = newSlides;
      indicators = newIndicators;
      
      if (newSlides.length > 0 && currentSlide >= newSlides.length) {
        currentSlide = 0;
      }
      
      if (newSlides.length > 0) {
        changeSlide(currentSlide, newSlides, newIndicators);
      }
      
      stopAutoPlay();
      startAutoPlay();
    }

    // Initialize
    function initialize() {
      const activeSlider = getActiveSlider();
      slides = activeSlider.slides;
      indicators = activeSlider.indicators;
      
      if (slides.length === 0) return;
      
      changeSlide(0, slides, indicators);
      
      if (slides.length > 1) {
        startAutoPlay();
      }

      // Indicator clicks
      document.querySelectorAll('.indicator').forEach((indicator) => {
        indicator.addEventListener('click', function() {
          const activeSlider = getActiveSlider();
          const currentIndicators = activeSlider.indicators;
          let slideIndex = -1;
          currentIndicators.forEach((ind, idx) => {
            if (ind === indicator) slideIndex = idx;
          });
          
          if (slideIndex !== -1) {
            stopAutoPlay();
            changeSlide(slideIndex, activeSlider.slides, currentIndicators);
            startAutoPlay();
          }
        });
      });

      // Prev/Next buttons
      if (prevBtn) {
        prevBtn.addEventListener('click', function(e) {
          e.stopPropagation();
          stopAutoPlay();
          prevSlide();
          startAutoPlay();
        });
      }

      if (nextBtn) {
        nextBtn.addEventListener('click', function(e) {
          e.stopPropagation();
          stopAutoPlay();
          nextSlide();
          startAutoPlay();
        });
      }

      // Keyboard navigation
      document.addEventListener('keydown', function(e) {
        if (!heroSection) return;
        const rect = heroSection.getBoundingClientRect();
        if (rect.top > window.innerHeight || rect.bottom < 0) return;

        if (e.key === 'ArrowLeft') {
          e.preventDefault();
          stopAutoPlay();
          prevSlide();
          startAutoPlay();
        } else if (e.key === 'ArrowRight') {
          e.preventDefault();
          stopAutoPlay();
          nextSlide();
          startAutoPlay();
        }
      });

      // Pause on hover
      if (heroSection) {
        heroSection.addEventListener('mouseenter', () => toggleAutoPlay(true));
        heroSection.addEventListener('mouseleave', () => toggleAutoPlay(false));
        heroSection.addEventListener('touchstart', () => toggleAutoPlay(true), { passive: true });
        heroSection.addEventListener('touchend', () => {
          setTimeout(() => toggleAutoPlay(false), 3000);
        }, { passive: true });
      }

      // Visibility change
      document.addEventListener('visibilitychange', function() {
        if (document.hidden) {
          stopAutoPlay();
        } else {
          startAutoPlay();
        }
      });

      // Resize
      let resizeTimeout;
      window.addEventListener('resize', function() {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(handleResize, 250);
      });

      console.log('✅ Hero slider initialized with', slides.length, 'slides');
    }

    // Load images
    let imagesToLoad = 0;
    let imagesLoaded = 0;
    const allSlides = document.querySelectorAll('.hero-slide');
    
    allSlides.forEach(slide => {
      const bgImage = slide.style.backgroundImage;
      if (bgImage && bgImage !== 'none') {
        const url = bgImage.replace(/.*\(|\).*/g, '');
        if (url && url !== '') {
          imagesToLoad++;
          const img = new Image();
          img.onload = () => {
            imagesLoaded++;
            if (imagesLoaded === imagesToLoad) initialize();
          };
          img.onerror = () => {
            imagesLoaded++;
            if (imagesLoaded === imagesToLoad) initialize();
          };
          img.src = url;
        }
      }
    });

    if (imagesToLoad === 0) {
      initialize();
    } else {
      setTimeout(() => {
        if (imagesLoaded < imagesToLoad) {
          console.warn('⚠️ Some images failed to load, initializing anyway');
          initialize();
        }
      }, 5000);
    }
  }
})();