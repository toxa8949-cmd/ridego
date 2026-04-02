function toggleTheme() {
  const isLight = document.body.classList.toggle('light');
  const knob = document.getElementById('themeKnob');
  knob.textContent = isLight ? '☀️' : '🌙';
  try { localStorage.setItem('eria-theme', isLight ? 'light' : 'dark'); } catch(e) {}
  showToast(isLight ? '☀️ Денна тема увімкнена' : '🌙 Нічна тема увімкнена');
}

try {
  var savedTheme = localStorage.getItem('eria-theme');

  document.documentElement.style.setProperty('--transition-override', 'none');
  var _noTransStyle = document.createElement('style');
  _noTransStyle.textContent = '*, *::before, *::after { transition: none !important; }';
  _noTransStyle.id = 'no-trans-init';
  document.head.appendChild(_noTransStyle);

  if (savedTheme === 'light' || savedTheme === null) {
    document.body.classList.add('light');
    var knob = document.getElementById('themeKnob');
    if (knob) knob.textContent = '☀️';
    if (savedTheme === null) localStorage.setItem('eria-theme', 'light');
  }

  document.documentElement.classList.remove('light-preload');

  requestAnimationFrame(function() {
    requestAnimationFrame(function() {
      var el = document.getElementById('no-trans-init');
      if (el) el.remove();
    });
  });
} catch(e) {}

// Чекаємо поки всі defer скрипти завантажаться
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', function() {
    loadSavedProfile();
    _initRouter();
  });
} else {
  loadSavedProfile();
  _initRouter();
}

