function loadViewsStats(days) {
  if (!isLoggedIn || !currentUser || !currentUser.uid || !window._db) return;

  document.querySelectorAll('.vstab').forEach(function(b) {
    var isActive = b.id === 'vstab-' + days;
    b.style.background = isActive ? 'var(--brand)' : 'transparent';
    b.style.color = isActive ? '#000' : 'var(--text-muted)';
    b.style.borderColor = isActive ? 'var(--brand)' : 'var(--border)';
  });

  var panel = document.getElementById('views-stats-panel');
  var content = document.getElementById('views-stats-content');
  if (!panel || !content) return;
  panel.style.display = '';
  content.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text-muted)"><i class="fa-solid fa-spinner fa-spin"></i> Завантаження...</div>';

  var uid = currentUser.uid;
  var numDays = parseInt(days) || 7;

  window._db.collection('listings')
    .where('uid', '==', uid)
    .get()
    .then(function(snap) {
      var listings = snap.docs.map(function(d) {
        return Object.assign({ id: d.id }, d.data());
      }).filter(function(l) { return l.status !== 'deleted'; });

      if (!listings.length) {
        content.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text-muted)">Немає оголошень для статистики</div>';
        return;
      }

      var totalViews = listings.reduce(function(s, l) { return s + (l.views || 0); }, 0);

      var sorted = listings.slice().sort(function(a, b) { return (b.views || 0) - (a.views || 0); });
      var top3 = sorted.slice(0, 3);

      var avgViews = listings.length ? Math.round(totalViews / listings.length) : 0;

      var noViews = listings.filter(function(l) { return !l.views || l.views === 0; }).length;

      var html = '';

      html += '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:20px">';
      html += _statBox('<i class="fa-solid fa-eye"></i>', totalViews.toLocaleString('uk'), '\u0417\u0430\u0433\u0430\u043b\u044c\u043d\u043e \u043f\u0435\u0440\u0435\u0433\u043b\u044f\u0434\u0456\u0432', 'var(--brand)');
      html += _statBox('<i class="fa-solid fa-chart-simple"></i>', avgViews, '\u0421\u0435\u0440\u0435\u0434\u043d\u0454 \u043d\u0430 \u043e\u0433\u043e\u043b\u043e\u0448\u0435\u043d\u043d\u044f', '#6366f1');
      html += _statBox('<i class="fa-solid fa-list"></i>', listings.length, '\u0412\u0441\u044c\u043e\u0433\u043e \u043e\u0433\u043e\u043b\u043e\u0448\u0435\u043d\u044c', '#f59e0b');
      html += '</div>';

      if (top3.length) {
        html += '<div style="font-size:13px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:.5px;margin-bottom:10px">\u041d\u0430\u0439\u043f\u043e\u043f\u0443\u043b\u044f\u0440\u043d\u0456\u0448\u0456</div>';
        html += '<div style="display:flex;flex-direction:column;gap:8px">';
        top3.forEach(function(l, i) {
          var maxViews = top3[0].views || 1;
          var pct = Math.round(((l.views || 0) / maxViews) * 100);
          var medals = ['\uD83E\uDD47', '\uD83E\uDD48', '\uD83E\uDD49'];
          html += '<div style="background:var(--dark3);border-radius:10px;padding:10px 14px">';
          html += '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">';
          html += '<div style="font-size:13px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:70%">' + medals[i] + ' ' + (l.title || '\u0411\u0435\u0437 \u043d\u0430\u0437\u0432\u0438') + '</div>';
          html += '<div style="font-size:13px;font-weight:700;color:var(--brand);flex-shrink:0"><i class="fa-solid fa-eye" style="font-size:11px;margin-right:4px"></i>' + (l.views || 0) + '</div>';
          html += '</div>';
          html += '<div style="height:6px;background:var(--border);border-radius:3px;overflow:hidden">';
          html += '<div style="height:100%;width:' + pct + '%;background:var(--brand);border-radius:3px;transition:width .5s"></div>';
          html += '</div></div>';
        });
        html += '</div>';
      }

      if (noViews > 0) {
        html += '<div style="margin-top:14px;padding:10px 14px;background:var(--brand-dim);border-radius:10px;font-size:12px;color:var(--text-muted)">';
        html += '<i class="fa-solid fa-lightbulb" style="color:var(--brand);margin-right:6px"></i>';
        html += noViews + ' \u043e\u0433\u043e\u043b\u043e\u0448\u0435\u043d\u044c \u043d\u0435 \u043c\u0430\u044e\u0442\u044c \u043f\u0435\u0440\u0435\u0433\u043b\u044f\u0434\u0456\u0432 \u2014 \u0434\u043e\u0434\u0430\u0439\u0442\u0435 \u0444\u043e\u0442\u043e \u0430\u0431\u043e \u0430\u043a\u0442\u0438\u0432\u0443\u0439\u0442\u0435 TOP \u043f\u0440\u043e\u0441\u0443\u0432\u0430\u043d\u043d\u044f.';
        html += '</div>';
      }

      content.innerHTML = html;
    })
    .catch(function(e) {
      content.innerHTML = '<div style="text-align:center;padding:16px;color:var(--text-muted)">\u041f\u043e\u043c\u0438\u043b\u043a\u0430 \u0437\u0430\u0432\u0430\u043d\u0442\u0430\u0436\u0435\u043d\u043d\u044f: ' + e.message + '</div>';
    });
}

function _statBox(icon, value, label, color) {
  return '<div style="background:var(--dark3);border-radius:12px;padding:14px 10px;text-align:center">'
    + '<div style="font-size:20px;color:' + color + ';margin-bottom:4px">' + icon + '</div>'
    + '<div style="font-size:20px;font-weight:800;color:' + color + '">' + value + '</div>'
    + '<div style="font-size:11px;color:var(--text-muted);margin-top:2px">' + label + '</div>'
    + '</div>';
}

var _phoneConfirmResult = null;
var _recaptchaVerifier  = null;

function _initRecaptcha() {
  if (_recaptchaVerifier) return;
  if (!window._auth) return;

  var container = document.getElementById('recaptcha-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'recaptcha-container';
    document.body.appendChild(container);
  }
  try {
    _recaptchaVerifier = new firebase.auth.RecaptchaVerifier('recaptcha-container', {
      size: 'invisible',
      callback: function() {}
    });
  } catch(e) {
    console.error('recaptcha init:', e);
  }
}

function startPhoneVerification() {
  if (!isLoggedIn) { showToast('\u26a0\ufe0f \u0423\u0432\u0456\u0439\u0434\u0456\u0442\u044c \u0432 \u0430\u043a\u0430\u0443\u043d\u0442'); return; }

  var phone = document.getElementById('set-phone')?.value.trim();
  if (!phone) { showToast('\u26a0\ufe0f \u0412\u0432\u0435\u0434\u0456\u0442\u044c \u043d\u043e\u043c\u0435\u0440 \u0442\u0435\u043b\u0435\u0444\u043e\u043d\u0443'); return; }

  var normalized = phone.replace(/\s/g, '');
  if (normalized.startsWith('0')) normalized = '+38' + normalized;
  if (!normalized.startsWith('+')) normalized = '+' + normalized;
  if (!/^\+\d{10,15}$/.test(normalized)) {
    showToast('\u26a0\ufe0f \u041d\u0435\u0432\u0456\u0440\u043d\u0438\u0439 \u0444\u043e\u0440\u043c\u0430\u0442 \u0442\u0435\u043b\u0435\u0444\u043e\u043d\u0443 (\u043f\u0440\u0438\u043a\u043b\u0430\u0434: +380671234567)');
    return;
  }

  _initRecaptcha();
  if (!_recaptchaVerifier) {
    showToast('\u26a0\ufe0f reCAPTCHA \u043d\u0435 \u0456\u043d\u0456\u0446\u0456\u0430\u043b\u0456\u0437\u043e\u0432\u0430\u043d\u0430');
    return;
  }

  var btn = document.getElementById('phone-verify-btn');
  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> \u0412\u0456\u0434\u043f\u0440\u0430\u0432\u043a\u0430...'; }

  window._auth.signInWithPhoneNumber(normalized, _recaptchaVerifier)
    .then(function(confirmResult) {
      _phoneConfirmResult = confirmResult;
      document.getElementById('phone-sms-wrap').style.display = '';
      document.getElementById('phone-sms-code').focus();
      showToast('\uD83D\uDCF1 SMS \u0432\u0456\u0434\u043f\u0440\u0430\u0432\u043b\u0435\u043d\u043e \u043d\u0430 ' + normalized);
      if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-shield-halved" style="margin-right:5px"></i>\u0412\u0456\u0434\u043f\u0440\u0430\u0432\u0438\u0442\u0438 \u0449\u0435 \u0440\u0430\u0437'; }
    })
    .catch(function(e) {
      console.error('phone auth:', e);
      var msg = e.code === 'auth/invalid-phone-number' ? '\u041d\u0435\u0432\u0456\u0440\u043d\u0438\u0439 \u043d\u043e\u043c\u0435\u0440 \u0442\u0435\u043b\u0435\u0444\u043e\u043d\u0443'
              : e.code === 'auth/too-many-requests' ? '\u0417\u0430\u0431\u0430\u0433\u0430\u0442\u043e \u0441\u043f\u0440\u043e\u0431. \u0421\u043f\u0440\u043e\u0431\u0443\u0439\u0442\u0435 \u043f\u0456\u0437\u043d\u0456\u0448\u0435'
              : e.message;
      showToast('\u26a0\ufe0f ' + msg);
      if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-shield-halved" style="margin-right:5px"></i>\u0412\u0435\u0440\u0438\u0444\u0456\u043a\u0443\u0432\u0430\u0442\u0438'; }

      _recaptchaVerifier = null;
    });
}

function confirmPhoneCode() {
  if (!_phoneConfirmResult) return;
  var code = (document.getElementById('phone-sms-code')?.value || '').trim();
  if (!code || code.length < 6) { showToast('\u26a0\ufe0f \u0412\u0432\u0435\u0434\u0456\u0442\u044c 6-\u0437\u043d\u0430\u0447\u043d\u0438\u0439 \u043a\u043e\u0434'); return; }

  _phoneConfirmResult.confirm(code)
    .then(function(result) {

      var phone = document.getElementById('set-phone')?.value.trim() || '';
      if (window._db && currentUser && currentUser.uid) {
        window._db.collection('users').doc(currentUser.uid).update({
          phone: phone,
          phoneVerified: true,
          phoneVerifiedAt: firebase.firestore.FieldValue.serverTimestamp()
        }).catch(function(){});
      }

      var badge = document.getElementById('phone-verified-badge');
      if (badge) badge.style.display = 'inline';
      var btn = document.getElementById('phone-verify-btn');
      if (btn) { btn.style.display = 'none'; }
      cancelPhoneVerification();
      showToast('\u2705 \u0422\u0435\u043b\u0435\u0444\u043e\u043d \u0432\u0435\u0440\u0438\u0444\u0456\u043a\u043e\u0432\u0430\u043d\u043e!');
    })
    .catch(function(e) {
      var msg = e.code === 'auth/invalid-verification-code' ? '\u041d\u0435\u0432\u0456\u0440\u043d\u0438\u0439 \u043a\u043e\u0434 SMS'
              : e.code === 'auth/code-expired' ? '\u041a\u043e\u0434 \u0432\u0438\u0439\u0448\u043e\u0432 \u2014 \u0432\u0456\u0434\u043f\u0440\u0430\u0432\u0442\u0435 \u0449\u0435 \u0440\u0430\u0437'
              : e.message;
      showToast('\u26a0\ufe0f ' + msg);
    });
}

function cancelPhoneVerification() {
  _phoneConfirmResult = null;
  var wrap = document.getElementById('phone-sms-wrap');
  if (wrap) wrap.style.display = 'none';
  var codeEl = document.getElementById('phone-sms-code');
  if (codeEl) codeEl.value = '';
}

function _checkPhoneVerified(d) {
  if (!d || !d.phoneVerified) return;
  var badge = document.getElementById('phone-verified-badge');
  if (badge) badge.style.display = 'inline';
  var btn = document.getElementById('phone-verify-btn');
  if (btn) btn.style.display = 'none';
}

