function renderMyListings() {
  const grid  = document.getElementById('my-listings-grid');
  const empty = document.getElementById('my-listings-empty');
  if (!grid || !empty) return;
  var uid = currentUser && currentUser.uid;
  var mine = uid
    ? _allListings().filter(function(l){ return l && l.uid === uid && l.status !== 'deleted'; })
    : myListings.filter(function(l){ return l && l.status !== 'deleted'; });
  if (!mine.length) { grid.innerHTML = ''; empty.style.display = ''; return; }
  empty.style.display = 'none';
  grid.innerHTML = mine.map(function(l){ return createMyCard(l); }).join('');

  // Оновити лічильник активних
  _updateActiveCount();

  if (uid) loadViewsStats('7');
}

function _updateActiveCount() {
  var uid = currentUser && currentUser.uid;
  if (!uid) return;
  var count = _allListings().filter(function(l){
    return l && l.uid === uid && l.status !== 'deleted' && l.status !== 'sold';
  }).length;
  var el = document.getElementById('pstat-active');
  if (el) el.textContent = count;
}

function deleteListing(id) {
  if (!window._db || !currentUser) return;
  var l = _allListings().find(function(x){ return x && x.id === id; });
  var title = l ? l.title : 'це оголошення';

  if (!confirm('Видалити «' + title + '»?\nВитрачений слот не повертається.')) return;

  window._db.collection('listings').doc(id).update({
      status: 'deleted',
      deletedAt: firebase.firestore.FieldValue.serverTimestamp()
    })
    .then(function() {
      // Видалити з локальних масивів
      myListings = myListings.filter(function(x){ return x.id !== id; });
      _fbListings = _fbListings.filter(function(x){ return !x || x.id !== id; });

      // Інвалідувати кеш — примусово
      try {
        sessionStorage.removeItem('ridego_listings_cache');
        sessionStorage.removeItem('ridego_listings_cache_ts');
      } catch(e) {}
      _idbSet('listings', _fbListings);

      // Оновити UI
      renderMyListings(); // всередині вже викликає _updateActiveCount
      renderHomeListings();
      renderCatalog();
      showToast('🗑 Оголошення видалено');
    })
    .catch(function(e){ showToast('⚠️ Помилка: ' + e.message); });
}

function renewListing(id) {
  if (_totalSlots() <= 0) {
    showToast('⚠️ Немає слотів — купіть щоб поновити');
    openBuySlots();
    return;
  }
  if (!window._db || !currentUser || !currentUser.uid) return;
  var newExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  _consumeSlot().then(function(ok) {
    if (!ok) { showToast('⚠️ Помилка списання слоту'); return; }
    window._db.collection('listings').doc(id).update({
      status: 'active',
      expiresAt: firebase.firestore.Timestamp.fromDate(newExpiry),
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    }).then(function() {

      var l = myListings.find(function(x){ return x.id === id; });
      if (l) { l.status = 'active'; l.expiresAt = { seconds: Math.floor(newExpiry.getTime()/1000) }; }
      var fl = _fbListings.find(function(x){ return x.id === id; });
      if (fl) { fl.status = 'active'; fl.expiresAt = { seconds: Math.floor(newExpiry.getTime()/1000) }; }
      renderMyListings();
      showToast('✅ Оголошення поновлено на 30 днів!');
    }).catch(function(e){ showToast('⚠️ ' + e.message); });
  });
}

function createMyCard(l) {
  const base = createCard(l, 'profile');
  const hasPromo = !!l.promo;
  const promoLabel = hasPromo ? PROMO_NAMES[l.promo] : null;

  var isInactive = l.status === 'inactive' || l.status === 'expired';
  var expiryStr = '';
  if (l.expiresAt && l.expiresAt.seconds) {
    var exp = new Date(l.expiresAt.seconds * 1000);
    var daysLeft = Math.ceil((exp - new Date()) / (1000 * 60 * 60 * 24));
    if (isInactive) {
      expiryStr = '<span style="font-size:11px;color:#ff5252">Неактивне</span>';
    } else if (daysLeft <= 3) {
      expiryStr = '<span style="font-size:11px;color:#ffa726">Закінчується через ' + daysLeft + ' дн.</span>';
    } else {
      expiryStr = '<span style="font-size:11px;color:var(--text-muted)">Активне до ' + exp.toLocaleDateString('uk-UA',{day:'numeric',month:'short'}) + '</span>';
    }
  }

  const promoBtn = `
    <div style="padding: 8px 16px 12px; border-top: 1px solid var(--border); display:flex; align-items:center; justify-content:space-between; gap:8px; flex-wrap:wrap;">
      <div style="display:flex;flex-direction:column;gap:2px">
        ${expiryStr}
        ${hasPromo && !isInactive
          ? `<span style="font-size:11px;color:var(--brand);display:flex;align-items:center;gap:5px">
               <i class="fa-solid fa-circle-dot" style="font-size:8px"></i>${promoLabel}
             </span>`
          : (!isInactive ? `<span style="font-size:11px;color:var(--text-muted)">Звичайне розміщення</span>` : '')
        }
      </div>
      <div style="display:flex;gap:6px;flex-wrap:wrap">
        <button class="promo-manage-btn no-promo" style="background:var(--dark3);color:var(--text-muted)"
          onclick="event.stopPropagation(); deleteListing('${l.id}')">
          <i class="fa-solid fa-trash"></i> Видалити
        </button>
        ${l.status === 'sold'
          ? `<button class="promo-manage-btn no-promo" style="background:#e8f5e9;color:#2e7d32;cursor:default">
               <i class="fa-solid fa-circle-check"></i> Продано
             </button>`
          : `<button class="promo-manage-btn no-promo" style="background:var(--brand-dim);color:var(--brand)"
               onclick="event.stopPropagation(); markAsSold('${l.id}')">
               <i class="fa-solid fa-circle-check"></i> Продано
             </button>`
        }
        <button class="promo-manage-btn no-promo" style="background:var(--brand-dim);color:var(--brand)"
          onclick="event.stopPropagation(); openEditListing('${l.id}')">
          <i class="fa-solid fa-pen"></i> Редагувати
        </button>
        ${isInactive
          ? `<button class="promo-manage-btn has-promo" onclick="event.stopPropagation(); renewListing('${l.id}')">
               <i class="fa-solid fa-rotate-right"></i> Поновити (1 слот)
             </button>`
          : (l.status !== 'sold'
            ? `<button class="promo-manage-btn ${hasPromo ? 'has-promo' : 'no-promo'}"
                 onclick="event.stopPropagation(); openPromoModal('${l.id}', false)">
                 <i class="fa-solid fa-${hasPromo ? 'pen' : 'rocket'}"></i>
                 ${hasPromo ? 'Змінити' : 'Просувати'}
               </button>`
            : '')
        }
      </div>
    </div>`;

  const insertAt = base.lastIndexOf('</div>');
  return base.slice(0, insertAt) + promoBtn + base.slice(insertAt);
}

