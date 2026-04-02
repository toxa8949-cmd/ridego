// ── Редагування оголошення ──
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

function renderServices(){_initSvcCitySelect();filterServices();_initSvcOblastSelect();}

function _initSvcCitySelect(){var sel=document.getElementById("svc-city-select");if(!sel)return;var all=_fbServices.concat(myServices);var cities=[];all.forEach(function(s){if(s.city&&cities.indexOf(s.city)<0)cities.push(s.city);});cities.sort(function(a,b){return a.localeCompare(b,"uk");});var cur=sel.value;sel.innerHTML="<option value=\"\">📍 Всі міста</option>";cities.forEach(function(c){var o=document.createElement("option");o.value=c;o.textContent="📍 "+c;sel.appendChild(o);});if(cur)sel.value=cur;}
function _initSvcOblastSelect(){
  var sel=document.getElementById("svc-add-oblast");
  if(!sel||sel.options.length>1)return;
  Object.keys(UA_GEO).sort(function(a,b){return a.localeCompare(b,"uk");}).forEach(function(name){
    var o=document.createElement("option");o.value=name;o.textContent=name;sel.appendChild(o);
  });
}

function setSvcCat(cat,el){
  currentServiceFilter=cat;
  document.querySelectorAll(".svc-filter-pill").forEach(function(p){p.classList.remove("active");});
  el.classList.add("active");
  filterServices();
}

function filterServices(){
  var q=(document.getElementById("svc-search-input")?document.getElementById("svc-search-input").value:"").toLowerCase().trim();
  var cityF=document.getElementById("svc-city-select")?document.getElementById("svc-city-select").value:"";
  var all=_fbServices.concat(myServices);
  var filtered=all.filter(function(s){
    var mc=!currentServiceFilter||s.cats.indexOf(currentServiceFilter)>=0;
    var mq=!q||s.name.toLowerCase().indexOf(q)>=0||(s.city||"").toLowerCase().indexOf(q)>=0||(s.desc||"").toLowerCase().indexOf(q)>=0||s.services.some(function(sv){return sv.name.toLowerCase().indexOf(q)>=0;});
    var mct=!cityF||s.city===cityF;
    return mc&&mq&&mct;
  });
  var grid=document.getElementById("services-grid");
  var empty=document.getElementById("services-empty");
  if(!grid)return;
  var lbl=document.getElementById("svc-count-label");
  var sub=document.getElementById("svc-count-sub");
  var cLbl=document.getElementById("svc-city-select")?document.getElementById("svc-city-select").value:"";
  var mLbl=currentServiceFilter||(cLbl?"\u041c\u0456\u0441\u0442\u043e: "+cLbl:"\u0412\u0441\u0456 \u0441\u0435\u0440\u0432\u0456\u0441\u0438");
  if(lbl)lbl.textContent=mLbl;
  if(sub)sub.textContent="\u0417\u043d\u0430\u0439\u0434\u0435\u043d\u043e: "+filtered.length+" \u0441\u0435\u0440\u0432\u0456\u0441\u0456\u0432"+(cLbl?" \u2022 "+cLbl:"");
  if(!filtered.length){grid.innerHTML="";if(empty)empty.style.display="";return;}
  if(empty)empty.style.display="none";
  grid.innerHTML=filtered.map(function(s){return createServiceCard(s);}).join("");
}

function createServiceCard(s){
  var stars="\u2605".repeat(Math.round(s.rating));
  var badge=s.badge?"<div class=\"service-card-cover-badge "+s.badge+"\">"+s.badgeLabel+"</div>":"";
  var shopLk=s.sellerId?"<button onclick=\"event.stopPropagation();showSeller('"+s.sellerId+"')\" style=\"font-size:11px;color:var(--brand);background:none;border:none;cursor:pointer;padding:0;font-family:inherit;display:flex;align-items:center;gap:4px\"><i class=\"fa-solid fa-store\"></i> \u041c\u0430\u0433\u0430\u0437\u0438\u043d</button>":"";
  var prev=_renderSvcPreview(s.services);
      var cats=s.cats.map(function(c){return "<span class=\"service-cat-tag\">"+c+"</span>";}).join("");
  var addr=s.address?" \u00b7 "+s.address:"";
  var rating=s.rating>0?s.rating+" \u00b7 "+s.reviews+" \u0432\u0456\u0434\u0433\u0443\u043a\u0456\u0432":"\u041d\u043e\u0432\u0438\u0439";
  return "<div class=\"service-card\" onclick=\"showServiceDetail('"+s.id+"')\">"+
    (s.photoUrl
      ? "<div class=\"service-card-cover\" style=\"background:none;padding:0;overflow:hidden\"><img src=\""+s.photoUrl+"\" style=\"width:100%;height:100%;object-fit:cover\">"+badge+"</div>"
      : "<div class=\"service-card-cover\" style=\"background:linear-gradient(135deg,"+s.coverColor+" 0%,var(--dark2) 100%)\"><div class=\"service-card-cover-icon\">"+s.icon+"</div>"+badge+"</div>"
    )+

