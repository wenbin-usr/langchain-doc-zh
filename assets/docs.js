(() => {
  'use strict';

  const root = document.documentElement;
  const headerHeight = () => {
    const value = getComputedStyle(root).getPropertyValue('--header-h').trim();
    return parseInt(value, 10) || 64;
  };

  /* Theme */

  const themeToggle = document.querySelector('[data-theme-toggle]');
  const storedTheme = (() => {
    try {
      return localStorage.getItem('lc-docs-theme');
    } catch (error) {
      return null;
    }
  })();

  if (storedTheme === 'dark' || storedTheme === 'light') {
    root.dataset.theme = storedTheme;
  } else {
    root.dataset.theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  const syncThemeButton = () => {
    if (!themeToggle) return;
    const isDark = root.dataset.theme === 'dark';
    themeToggle.setAttribute('aria-label', isDark ? '切换到浅色模式' : '切换到深色模式');
    themeToggle.setAttribute('title', isDark ? '切换到浅色模式' : '切换到深色模式');
    themeToggle.setAttribute('aria-pressed', String(isDark));
  };

  syncThemeButton();

  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      const next = root.dataset.theme === 'dark' ? 'light' : 'dark';
      root.dataset.theme = next;
      try {
        localStorage.setItem('lc-docs-theme', next);
      } catch (error) {
        /* ignore */
      }
      syncThemeButton();
    });
  }

  /* Mobile navigation */

  const menuToggle = document.querySelector('[data-menu-toggle]');
  const sidebarOverlay = document.querySelector('[data-sidebar-overlay]');

  const setNavOpen = (open) => {
    document.body.classList.toggle('nav-open', open);
    if (menuToggle) {
      menuToggle.setAttribute('aria-expanded', String(open));
      menuToggle.setAttribute('aria-label', open ? '关闭文档导航' : '打开文档导航');
    }
  };

  if (menuToggle) {
    menuToggle.addEventListener('click', () => {
      setNavOpen(!document.body.classList.contains('nav-open'));
    });
  }

  if (sidebarOverlay) {
    sidebarOverlay.addEventListener('click', () => setNavOpen(false));
  }

  document.querySelectorAll('.sidebar a').forEach((link) => {
    link.addEventListener('click', () => {
      if (window.innerWidth <= 980) setNavOpen(false);
    });
  });

  window.addEventListener('resize', () => {
    if (window.innerWidth > 980 && document.body.classList.contains('nav-open')) {
      setNavOpen(false);
    }
  });

  /* Sidebar search */

  const search = document.querySelector('[data-nav-search]');
  const navEmpty = document.querySelector('[data-nav-empty]');
  const navSections = Array.from(document.querySelectorAll('.nav-section'));

  if (search) {
    const links = Array.from(document.querySelectorAll('.nav-link'));

    const applyFilter = () => {
      const query = search.value.trim().toLowerCase();
      let visibleCount = 0;

      for (const link of links) {
        const haystack = (link.dataset.search || link.textContent || '').toLowerCase();
        const visible = !query || haystack.includes(query);
        link.hidden = !visible;
        if (visible) visibleCount += 1;
      }

      for (const section of navSections) {
        const hasVisible = Array.from(section.querySelectorAll('.nav-link')).some((link) => !link.hidden);
        section.hidden = !hasVisible;
      }

      for (const group of document.querySelectorAll('.nav-subgroup')) {
        const hasVisible = Array.from(group.querySelectorAll('.nav-link')).some((link) => !link.hidden);
        group.hidden = !hasVisible;
      }

      if (navEmpty) navEmpty.hidden = visibleCount !== 0;
    };

    search.addEventListener('input', applyFilter);
    search.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        search.value = '';
        applyFilter();
        search.blur();
      }
    });

    document.addEventListener('keydown', (event) => {
      if (event.key !== '/' || event.ctrlKey || event.metaKey || event.altKey) return;
      const target = event.target;
      const tag = target && target.tagName ? target.tagName.toLowerCase() : '';
      if (tag === 'input' || tag === 'textarea' || tag === 'select' || (target && target.isContentEditable)) return;
      event.preventDefault();
      if (window.innerWidth <= 980) setNavOpen(true);
      search.focus();
      search.select();
    });
  }

  /* Tabs */

  function initTabs(rootElement, tabs, panels) {
    if (!tabs.length) return;

    const select = (index, focus) => {
      tabs.forEach((tab, tabIndex) => {
        const selected = tabIndex === index;
        tab.setAttribute('aria-selected', String(selected));
        tab.setAttribute('tabindex', selected ? '0' : '-1');
        if (panels[tabIndex]) panels[tabIndex].hidden = !selected;
      });
      if (focus && tabs[index]) tabs[index].focus();
    };

    tabs.forEach((tab, index) => {
      tab.addEventListener('click', () => select(index, false));
      tab.addEventListener('keydown', (event) => {
        let next = null;
        if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
        if (event.key === 'ArrowLeft') next = (index - 1 + tabs.length) % tabs.length;
        if (event.key === 'Home') next = 0;
        if (event.key === 'End') next = tabs.length - 1;
        if (next === null) return;
        event.preventDefault();
        select(next, true);
      });
    });

    const selectedIndex = tabs.findIndex((tab) => tab.getAttribute('aria-selected') === 'true');
    select(selectedIndex >= 0 ? selectedIndex : 0, false);
  }

  document.querySelectorAll('[data-doc-tabs]').forEach((container) => {
    const list = container.querySelector(':scope > .doc-tab-list');
    const panelsWrap = container.querySelector(':scope > .doc-tab-panels');
    if (!list || !panelsWrap) return;
    initTabs(
      container,
      Array.from(list.querySelectorAll(':scope > [role="tab"]')),
      Array.from(panelsWrap.querySelectorAll(':scope > .doc-tab-panel'))
    );
  });

  document.querySelectorAll('[data-code-group]').forEach((container) => {
    const list = container.querySelector(':scope > .code-head .code-tabs');
    const panelsWrap = container.querySelector(':scope > .code-panels');
    if (!list || !panelsWrap) return;
    initTabs(
      container,
      Array.from(list.querySelectorAll(':scope > [role="tab"]')),
      Array.from(panelsWrap.querySelectorAll(':scope > .code-panel'))
    );
  });

  /* Copy code */

  function legacyCopy(text) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.top = '-1000px';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    let ok = false;
    try {
      ok = document.execCommand('copy');
    } catch (error) {
      ok = false;
    }
    textarea.remove();
    return ok;
  }

  document.querySelectorAll('[data-copy-code]').forEach((button) => {
    const label = button.querySelector('span');
    let timer = null;

    const setLabel = (text, className) => {
      if (label) label.textContent = text;
      button.classList.toggle('copied', className === 'copied');
      if (timer) window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        if (label) label.textContent = '复制';
        button.classList.remove('copied');
      }, 1600);
    };

    button.addEventListener('click', async () => {
      const wrapper = button.closest('.code-group, .code-block');
      if (!wrapper) return;

      let code = null;
      if (wrapper.classList.contains('code-group')) {
        const visiblePanel = wrapper.querySelector('.code-panel:not([hidden])');
        code = (visiblePanel || wrapper.querySelector('.code-panel'))?.querySelector('code');
      } else {
        code = wrapper.querySelector('pre code');
      }
      if (!code) return;

      const text = code.textContent || '';
      let copied = false;

      if (navigator.clipboard && window.isSecureContext) {
        try {
          await navigator.clipboard.writeText(text);
          copied = true;
        } catch (error) {
          copied = legacyCopy(text);
        }
      } else {
        copied = legacyCopy(text);
      }

      setLabel(copied ? '已复制' : '复制失败', copied ? 'copied' : 'failed');
    });
  });

  /* Sidebar active link visibility */

  const sidebarScroll = document.querySelector('.sidebar-scroll');
  const activeLink = document.querySelector('.sidebar .nav-link.active');
  if (sidebarScroll && activeLink) {
    const target = activeLink.offsetTop - sidebarScroll.clientHeight / 2;
    sidebarScroll.scrollTop = Math.max(0, target);
  }

  /* Reading progress + back to top */

  const progress = document.querySelector('[data-progress]');
  const backTop = document.querySelector('[data-back-top]');

  let ticking = false;
  const updateScroll = () => {
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    const max = document.documentElement.scrollHeight - window.innerHeight;
    if (progress) progress.style.width = (max > 0 ? Math.min(100, (scrollTop / max) * 100) : 0) + '%';
    if (backTop) backTop.classList.toggle('visible', scrollTop > 640);
    ticking = false;
  };

  const requestScrollUpdate = () => {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(updateScroll);
  };

  window.addEventListener('scroll', requestScrollUpdate, { passive: true });
  window.addEventListener('resize', requestScrollUpdate);
  updateScroll();

  if (backTop) {
    backTop.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  /* Table of contents scroll spy */

  const tocLinks = Array.from(document.querySelectorAll('.toc-link'));
  if (tocLinks.length) {
    const entries = tocLinks
      .map((link) => {
        const id = decodeURIComponent((link.getAttribute('href') || '').replace(/^#/, ''));
        const heading = id ? document.getElementById(id) : null;
        return heading ? { link, heading } : null;
      })
      .filter(Boolean);

    let activeLink = null;
    const setActive = (link) => {
      if (!link || link === activeLink) return;
      if (activeLink) activeLink.classList.remove('active');
      activeLink = link;
      activeLink.classList.add('active');
    };

    if (entries.length) setActive(entries[0].link);

    let tocTicking = false;
    const updateToc = () => {
      const threshold = window.scrollY + headerHeight() + 80;
      let current = entries[0];
      for (const entry of entries) {
        if (entry.heading.getBoundingClientRect().top + window.scrollY <= threshold) {
          current = entry;
        } else {
          break;
        }
      }
      if (current) setActive(current.link);
      tocTicking = false;
    };

    window.addEventListener('scroll', () => {
      if (tocTicking) return;
      tocTicking = true;
      window.requestAnimationFrame(updateToc);
    }, { passive: true });
    updateToc();
  }

  /* Image lightbox */

  const images = Array.from(document.querySelectorAll('.doc-image'));
  if (images.length) {
    const lightbox = document.createElement('div');
    lightbox.className = 'lightbox';
    lightbox.hidden = true;
    lightbox.setAttribute('role', 'dialog');
    lightbox.setAttribute('aria-modal', 'true');
    lightbox.setAttribute('aria-label', '查看大图');

    const image = document.createElement('img');
    image.alt = '';
    const close = document.createElement('button');
    close.className = 'lightbox-close';
    close.type = 'button';
    close.setAttribute('aria-label', '关闭大图');
    close.textContent = '×';

    lightbox.append(image, close);
    document.body.appendChild(lightbox);

    let lastFocus = null;

    const closeLightbox = () => {
      lightbox.hidden = true;
      document.body.style.overflow = '';
      if (lastFocus) lastFocus.focus();
    };

    const openLightbox = (source) => {
      lastFocus = source;
      image.src = source.currentSrc || source.src;
      image.alt = source.alt || '';
      lightbox.hidden = false;
      document.body.style.overflow = 'hidden';
      close.focus();
    };

    images.forEach((source) => {
      source.addEventListener('click', () => openLightbox(source));
      source.setAttribute('tabindex', '0');
      source.setAttribute('role', 'button');
      source.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          openLightbox(source);
        }
      });
    });

    close.addEventListener('click', closeLightbox);
    lightbox.addEventListener('click', (event) => {
      if (event.target === lightbox) closeLightbox();
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && !lightbox.hidden) closeLightbox();
    });
  }

  /* Broken image fallback */

  document.querySelectorAll('.doc-image').forEach((image) => {
    image.addEventListener('error', () => {
      image.style.display = 'none';
      const caption = image.closest('figure')?.querySelector('figcaption');
      if (caption && !caption.dataset.failed) {
        caption.dataset.failed = '1';
        caption.textContent = '图片加载失败，请查看英文原文。';
      }
    });
  });
})();
