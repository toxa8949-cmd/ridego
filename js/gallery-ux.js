// gallery-ux.js — Mobile gallery: swipe, pinch-zoom, fullscreen
// Підключати після main.js і extra.js
// Не змінює існуючий код — лише розширює через event listeners

(function () {
  'use strict';

  // ── Fullscreen overlay ────────────────────────────────────────
  var _fsOverlay = null;
  var _fsImg = null;
  var _fsCounter = null;
  var _fsClose = null;

  function _createOverlay() {
    if (_fsOverlay) return;

    _fsOverlay = document.createElement('div');
    _fsOverlay.id = 'gallery-fs-overlay';
    _fsOverlay.style.cssText = [
      'display:none',
      'position:fixed',
      'inset:0',
      'z-index:99999',
      'background:rgba(0,0,0,.96)',
      'touch-action:none',
      'user-select:none',
      '-webkit-user-select:none',
    ].join(';');

    _fsImg = document.createElement('img');
    _fsImg.style.cssText = [
      'position:absolute',
      'top:50%',
      'left:50%',
      'transform:translate(-50%,-50%) scale(1)',
      'max-width:100vw',
      'max-height:100vh',
      'object-fit:contain',
      'transition:transform .15s ease',
      'will-change:transform',
      'touch-action:none',
    ].join(';');

    _fsCounter = document.createElement('div');
    _fsCounter.style.cssText = [
      'position:absolute',
      'bottom:20px',
      'left:50%',
      'transform:translateX(-50%)',
      'color:#fff',
      'font-family:Inter,sans-serif',
      'font-size:14px',
      'font-weight:600',
      'opacity:.7',
      'pointer-events:none',
    ].join(';');

    _fsClose = document.createElement('button');
    _fsClose.innerHTML = '&times;';
    _fsClose.style.cssText = [
      'position:absolute',
      'top:16px',
      'right:16px',
      'width:44px',
      'height:44px',
      'border-radius:50%',
      'border:none',
      'background:rgba(255,255,255,.15)',
      'color:#fff',
      'font-size:28px',
      'line-height:1',
      'cursor:pointer',
      'display:flex',
      'align-items:center',
      'justify-content:center',
      'z-index:2',
      'backdrop-filter:blur(8px)',
    ].join(';');
    _fsClose.onclick = closeFullscreen;

    // Prev / Next arrows (visible on desktop too)
    var _fsPrev = document.createElement('button');
    _fsPrev.innerHTML = '&#8249;';
    _fsPrev.style.cssText = [
      'position:absolute',
      'left:12px',
      'top:50%',
      'transform:translateY(-50%)',
      'width:44px',
      'height:44px',
      'border-radius:50%',
      'border:none',
      'background:rgba(255,255,255,.15)',
      'color:#fff',
      'font-size:32px',
      'cursor:pointer',
      'display:flex',
      'align-items:center',
      'justify-content:center',
      'z-index:2',
      'backdrop-filter:blur(8px)',
    ].join(';');
    _fsPrev.onclick = function(e) { e.stopPropagation(); _fsNavDir(-1); };

    var _fsNext = document.createElement('button');
    _fsNext.innerHTML = '&#8250;';
    _fsNext.style.cssText = _fsPrev.style.cssText.replace('left:12px', 'right:12px').replace('left:50%','right:12px');
    _fsNext.style.left = '';
    _fsNext.style.right = '12px';
    _fsNext.onclick = function(e) { e.stopPropagation(); _fsNavDir(1); };

    _fsOverlay.appendChild(_fsImg);
    _fsOverlay.appendChild(_fsCounter);
    _fsOverlay.appendChild(_fsClose);
    _fsOverlay.appendChild(_fsPrev);
    _fsOverlay.appendChild(_fsNext);
    document.body.appendChild(_fsOverlay);

    // Close on background tap (not on image)
    _fsOverlay.addEventListener('click', function(e) {
      if (e.target === _fsOverlay) closeFullscreen();
    });

    // Keyboard
    document.addEventListener('keydown', function(e) {
      if (_fsOverlay.style.display === 'none') return;
      if (e.key === 'Escape') closeFullscreen();
      if (e.key === 'ArrowLeft') _fsNavDir(-1);
      if (e.key === 'ArrowRight') _fsNavDir(1);
    });

    _initFsSwipe();
    _initFsPinch();
  }

  function openFullscreen(idx) {
    _createOverlay();
    if (!window.galleryImgs || !window.galleryImgs.length) return;
    window.galleryIdx = idx !== undefined ? idx : (window.galleryIdx || 0);
    _fsRender();
    _fsOverlay.style.display = 'block';
    document.body.style.overflow = 'hidden';
  }

  function closeFullscreen() {
    if (!_fsOverlay) return;
    _fsOverlay.style.display = 'none';
    document.body.style.overflow = '';
    _resetZoom();
  }

  function _fsRender() {
    var imgs = window.galleryImgs || [];
    var idx = window.galleryIdx || 0;
    if (!imgs.length) return;
    var src = imgs[idx];
    // Use CDN helper if available
    if (typeof window._cdnDetail === 'function') src = window._cdnDetail(src) || src;
    else if (typeof _cdnDetail === 'function') src = _cdnDetail(src) || src;
    _fsImg.src = src;
    _fsImg.alt = '';
    _resetZoom();
    _fsCounter.textContent = (idx + 1) + ' / ' + imgs.length;
  }

  function _fsNavDir(dir) {
    var imgs = window.galleryImgs || [];
    if (!imgs.length) return;
    window.galleryIdx = ((window.galleryIdx || 0) + dir + imgs.length) % imgs.length;
    _fsRender();
    // Sync main gallery
    if (typeof setGalleryIdx === 'function') setGalleryIdx(window.galleryIdx);
  }

  // ── Pinch-to-zoom in fullscreen ───────────────────────────────
  var _scale = 1;
  var _lastScale = 1;
  var _originX = 0;
  var _originY = 0;
  var _translateX = 0;
  var _translateY = 0;

  function _resetZoom() {
    _scale = 1; _lastScale = 1;
    _translateX = 0; _translateY = 0;
    if (_fsImg) {
      _fsImg.style.transition = 'transform .15s ease';
      _fsImg.style.transform = 'translate(-50%,-50%) scale(1)';
    }
  }

  function _applyTransform(animate) {
    if (!_fsImg) return;
    _fsImg.style.transition = animate ? 'transform .15s ease' : 'none';
    _fsImg.style.transform =
      'translate(calc(-50% + ' + _translateX + 'px), calc(-50% + ' + _translateY + 'px)) scale(' + _scale + ')';
  }

  function _initFsPinch() {
    var startDist = 0;
    var startScale = 1;
    var midX = 0, midY = 0;
    var panStartX = 0, panStartY = 0;
    var panStartTX = 0, panStartTY = 0;
    var isPinching = false;

    _fsOverlay.addEventListener('touchstart', function(e) {
      if (e.touches.length === 2) {
        isPinching = true;
        startDist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        startScale = _scale;
        midX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
        midY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
        e.preventDefault();
      } else if (e.touches.length === 1 && _scale > 1) {
        panStartX = e.touches[0].clientX;
        panStartY = e.touches[0].clientY;
        panStartTX = _translateX;
        panStartTY = _translateY;
      }
    }, { passive: false });

    _fsOverlay.addEventListener('touchmove', function(e) {
      if (e.touches.length === 2 && isPinching) {
        var dist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        _scale = Math.min(5, Math.max(1, startScale * dist / startDist));
        _applyTransform(false);
        e.preventDefault();
      } else if (e.touches.length === 1 && _scale > 1) {
        _translateX = panStartTX + (e.touches[0].clientX - panStartX);
        _translateY = panStartTY + (e.touches[0].clientY - panStartY);
        _applyTransform(false);
        e.preventDefault();
      }
    }, { passive: false });

    _fsOverlay.addEventListener('touchend', function(e) {
      if (e.touches.length < 2) isPinching = false;
      if (_scale < 1.05) _resetZoom();
      _lastScale = _scale;
    });

    // Double-tap to zoom
    var _lastTap = 0;
    _fsOverlay.addEventListener('touchend', function(e) {
      if (e.touches.length > 0) return;
      var now = Date.now();
      if (now - _lastTap < 300) {
        if (_scale > 1) {
          _resetZoom();
        } else {
          _scale = 2.5;
          _applyTransform(true);
        }
      }
      _lastTap = now;
    });
  }

  // ── Swipe in fullscreen ───────────────────────────────────────
  function _initFsSwipe() {
    var startX = 0, startY = 0, moved = false;

    _fsOverlay.addEventListener('touchstart', function(e) {
      if (e.touches.length !== 1) return;
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      moved = false;
    }, { passive: true });

    _fsOverlay.addEventListener('touchend', function(e) {
      if (_scale > 1.05) return; // don't swipe when zoomed
      var dx = e.changedTouches[0].clientX - startX;
      var dy = e.changedTouches[0].clientY - startY;
      if (Math.abs(dx) < 40) return;
      if (Math.abs(dy) > Math.abs(dx) * 1.5) return; // mostly vertical — ignore
      _fsNavDir(dx < 0 ? 1 : -1);
    }, { passive: true });
  }

  // ── Swipe on main gallery (detail page) ──────────────────────
  function _attachMainGallerySwipe() {
    var wrap = document.getElementById('detail-main-img-wrap');
    if (!wrap || wrap._swipeAttached) return;
    wrap._swipeAttached = true;

    var startX = 0, startY = 0;

    wrap.addEventListener('touchstart', function(e) {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
    }, { passive: true });

    wrap.addEventListener('touchend', function(e) {
      var dx = e.changedTouches[0].clientX - startX;
      var dy = e.changedTouches[0].clientY - startY;
      if (Math.abs(dx) < 40) return;
      if (Math.abs(dy) > Math.abs(dx) * 1.5) return;
      if (typeof galleryNav === 'function') galleryNav(dx < 0 ? 1 : -1);
    }, { passive: true });

    // Tap to open fullscreen
    wrap.addEventListener('click', function() {
      if (window.galleryImgs && window.galleryImgs.length) {
        openFullscreen(window.galleryIdx || 0);
      }
    });

    // Visual hint — cursor pointer
    wrap.style.cursor = 'zoom-in';
  }

  // ── Patch renderGalleryImage to re-attach swipe after render ──
  var _origRender = window.renderGalleryImage;
  if (typeof _origRender === 'function') {
    window.renderGalleryImage = function(l) {
      _origRender(l);
      setTimeout(_attachMainGallerySwipe, 50);
    };
  }

  // ── Patch galleryNav to update fullscreen if open ─────────────
  var _origNav = window.galleryNav;
  if (typeof _origNav === 'function') {
    window.galleryNav = function(dir) {
      _origNav(dir);
      if (_fsOverlay && _fsOverlay.style.display !== 'none') _fsRender();
    };
  }

  var _origSetIdx = window.setGalleryIdx;
  if (typeof _origSetIdx === 'function') {
    window.setGalleryIdx = function(i) {
      _origSetIdx(i);
      if (_fsOverlay && _fsOverlay.style.display !== 'none') _fsRender();
    };
  }

  // ── Init on DOMContentLoaded + MutationObserver for SPA ──────
  function _tryAttach() {
    _attachMainGallerySwipe();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _tryAttach);
  } else {
    _tryAttach();
  }

  // Re-attach when detail page becomes visible (SPA navigation)
  var _mo = new MutationObserver(function(mutations) {
    mutations.forEach(function(m) {
      if (m.target && m.target.id === 'page-detail') {
        setTimeout(_tryAttach, 100);
      }
    });
  });
  var _detailPage = document.getElementById('page-detail');
  if (_detailPage) {
    _mo.observe(_detailPage, { attributes: true, attributeFilter: ['class'] });
  }

  // Expose for manual use
  window._galleryOpenFullscreen = openFullscreen;
  window._galleryCloseFullscreen = closeFullscreen;

})();
