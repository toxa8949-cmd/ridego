// ── Чат: рендер, відкриття, відправлення, push-нотифікації ──
  if (!favData.length) { grid.innerHTML=''; empty.style.display=''; return; }
  empty.style.display = 'none';
  grid.innerHTML = favData.map(l => createCard(l,'profile')).join('');
}

var _activeChatId = null;
var _chatUnsubscribe = null;

function renderChats() {
  var list = document.getElementById('chat-list');
  if (!list) return;

  if (!window._authInitialized) {
    list.innerHTML = '<div style="padding:16px;display:flex;flex-direction:column;gap:12px">'
      + [1,2,3].map(function() {
          return '<div style="display:flex;gap:12px;align-items:center">'
            + '<div class="skeleton" style="width:44px;height:44px;border-radius:50%;flex-shrink:0"></div>'
            + '<div style="flex:1;display:flex;flex-direction:column;gap:8px">'
            + '<div class="skeleton" style="height:13px;width:55%;border-radius:4px"></div>'
            + '<div class="skeleton" style="height:11px;width:80%;border-radius:4px"></div>'
            + '</div></div>';
        }).join('')
      + '</div>';
    return;
  }
  if (!isLoggedIn) {
    list.innerHTML = '<div style="text-align:center;padding:48px 24px;color:var(--text-muted)">'
      + '<i class="fa-solid fa-lock" style="font-size:36px;display:block;margin-bottom:16px;color:var(--brand)"></i>'
      + '<div style="font-size:16px;font-weight:700;margin-bottom:8px;color:var(--text)">Вхід для повідомлень</div>'
      + '<p style="margin-bottom:20px;font-size:14px">Увійдіть в акаунт щоб переглянути та відправляти повідомлення</p>'
      + '<button class="btn-primary" onclick="showPage(\'profile\')" style="padding:11px 28px">'
      + '<i class="fa-solid fa-user" style="margin-right:8px"></i>Увійти</button>'
      + '</div>';

    var inp = document.getElementById('chat-input');
    var sendBtn = document.querySelector('.send-btn');
    if (inp) { inp.disabled = true; inp.placeholder = 'Увійдіть щоб писати...'; }
    if (sendBtn) sendBtn.disabled = true;
    return;
  }

  var inp2 = document.getElementById('chat-input');
  var sendBtn2 = document.querySelector('.send-btn');
  if (inp2) { inp2.disabled = false; inp2.placeholder = 'Написати повідомлення...'; }
  if (sendBtn2) sendBtn2.disabled = false;
  if (!_fbChats.length) {
    list.innerHTML = '<div style="text-align:center;padding:32px;color:var(--text-muted)"><i class="fa-regular fa-comment-dots" style="font-size:32px;display:block;margin-bottom:12px"></i>Повідомлень поки немає</div>';
    return;
  }
  list.innerHTML = _fbChats.map(function(c) {
    var otherId = c.participants ? c.participants.find(function(p){ return p !== currentUser.uid; }) : null;
    var name = c.otherName || (otherId && c[otherId+'_name']) || 'Користувач';
    var lastMsg = c.lastMessage || '';
    var lastTime = c.lastMessageAt ? _formatChatTime(c.lastMessageAt.seconds) : '';
    var initial = (name[0] || '?').toUpperCase();
    var isActive = _activeChatId === c.id;
    var listingTag = c.listingTitle
      ? '<div style="font-size:10px;color:var(--brand);margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis"><i class="fa-solid fa-tag" style="font-size:9px;margin-right:3px"></i>' + _esc(c.listingTitle) + '</div>'
      : '';
    var unreadDot = (c.unread && c.unread > 0 && !isActive)
      ? '<span style="width:8px;height:8px;border-radius:50%;background:var(--brand);flex-shrink:0"></span>' : '';
    return '<div class="chat-item ' + (isActive ? 'active' : '') + '" onclick="openChatById(this.dataset.id)" data-id="' + c.id + '">'
      + '<div class="chat-avatar" style="cursor:pointer" onclick="event.stopPropagation();' + (otherId ? 'showSellerByUid(\''+otherId+'\')' : '') + '">' + initial + '</div>'
      + '<div style="flex:1;min-width:0">'
      + '<div style="display:flex;justify-content:space-between;align-items:center;gap:6px">'
      + '<div class="chat-name">' + _esc(name) + '</div>'
      + '<div style="display:flex;align-items:center;gap:5px;flex-shrink:0">' + unreadDot + '<div class="chat-time">' + lastTime + '</div></div>'
      + '</div>'
      + listingTag
      + '<div class="chat-last" style="margin-top:3px">' + _esc(lastMsg) + '</div>'
      + '</div></div>';
  }).join('');
}

function _formatChatTime(seconds) {
  if (!seconds) return '';
  var d = new Date(seconds * 1000);
  var now = new Date();
  var diff = now - d;
  if (diff < 86400000 && d.getDate() === now.getDate()) {
    return d.toLocaleTimeString('uk-UA', {hour:'2-digit', minute:'2-digit'});
  }
  return d.toLocaleDateString('uk-UA', {day:'numeric', month:'short'});
}

function openChatById(chatId) {
  if (!chatId || !isLoggedIn) return;
  _activeChatId = chatId;
  var c = _fbChats.find(function(x){ return x.id === chatId; });

  var otherId = c && c.participants ? c.participants.find(function(p){ return p !== currentUser.uid; }) : null;
  var name = (c && c.otherName) || (c && c[otherId + '_name']) || 'Користувач';
  var sub  = (c && c.listingTitle) ? 'Оголошення: ' + c.listingTitle : '';

  var headerName = document.getElementById('chat-header-name');
  var headerSub  = document.getElementById('chat-header-sub');
  var headerAva  = document.getElementById('chat-header-avatar');

  if (headerName) {
    if (otherId) {
      headerName.innerHTML = '<span style="cursor:pointer;text-decoration:underline;text-decoration-color:var(--brand)" onclick="showSellerByUid(\''+otherId+'\')">' + _esc(name) + '</span>';
    } else {
      headerName.textContent = name;
    }
  }

  if (headerSub) {
    if (c && c.listingId) {
      headerSub.innerHTML = '<span style="cursor:pointer;color:var(--brand)" onclick="showDetail(\''+c.listingId+'\')">'
        + '<i class="fa-solid fa-tag" style="margin-right:4px;font-size:10px"></i>' + _esc(c.listingTitle || 'Оголошення') + '</span>';
    } else {
      headerSub.textContent = sub || '';
    }
  }
  if (headerAva) headerAva.textContent = (name[0] || '?').toUpperCase();

  var layout = document.querySelector('.messages-layout');
  if (layout && window.innerWidth <= 700) {
    layout.classList.add('chat-open');
  }

  if (window._db && currentUser && currentUser.uid) {
    var resetUpd = {};
    resetUpd['unread_' + currentUser.uid] = 0;
    window._db.collection('chats').doc(chatId).update(resetUpd).catch(function(){});
    if (c) { c['unread_' + currentUser.uid] = 0; c.unread = 0; }
    _updateChatBadge();
  }

  var area = document.getElementById('messages-area');
  if (area) area.innerHTML = '<div style="text-align:center;padding:24px;color:var(--text-muted)">Завантаження...</div>';

  if (_chatUnsubscribe) { _chatUnsubscribe(); _chatUnsubscribe = null; }

  if (window._rtdb) {
    var msgsRef = window._rtdb.ref('chats/' + chatId + '/messages');
    var _rtdbCallback = msgsRef.on('value', function(snap) {
      var msgs = [];
      if (snap && snap.forEach) {
        snap.forEach(function(child) { msgs.push(child.val()); });
      }
      _renderMessages(msgs, c);
    });
    _chatUnsubscribe = function() { msgsRef.off('value', _rtdbCallback); };
  } else if (window._db) {
    _chatUnsubscribe = window._db.collection('chats').doc(chatId)
      .collection('messages').onSnapshot(function(snap) {
        var msgs = snap.docs.map(function(d){ return d.data(); });
        msgs.sort(function(a,b){ return (a.createdAt||0)-(b.createdAt||0); });
        _renderMessages(msgs, c);
      });
  }

  renderChats();
}

function _renderMessages(msgs, chat) {
  var area = document.getElementById('messages-area');
  if (!area) return;

  var html = '';

  if (chat && chat.listingId && chat.listingTitle) {
    var listing = _allListings().find(function(l){ return l && l.id === chat.listingId; });
    var imgHtml = listing && listing.photos && listing.photos[0]
      ? '<img src="' + listing.photos[0] + '" style="width:56px;height:56px;object-fit:cover;border-radius:8px;flex-shrink:0">'
      : '<div style="width:56px;height:56px;background:var(--dark3);border-radius:8px;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:22px">🛵</div>';
    var priceHtml = listing ? '<div style="color:var(--brand);font-weight:700;font-size:15px">' + listing.price.toLocaleString('uk') + ' грн</div>' : '';
    html += '<div style="margin-bottom:12px;display:flex;justify-content:center">'
      + '<div onclick="showDetail(\''+chat.listingId+'\')" style="cursor:pointer;display:flex;align-items:center;gap:12px;background:var(--card-bg);border:1px solid var(--border);border-radius:14px;padding:12px 16px;max-width:320px;width:100%;transition:box-shadow .2s" onmouseover="this.style.boxShadow=\'0 4px 16px rgba(0,200,83,.15)\'" onmouseout="this.style.boxShadow=\'none\'">'
      + imgHtml
      + '<div style="min-width:0">'
      + '<div style="font-size:11px;color:var(--text-muted);margin-bottom:2px">Оголошення</div>'
      + '<div style="font-weight:600;font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + _esc(chat.listingTitle) + '</div>'
      + priceHtml
      + '</div>'
      + '<i class="fa-solid fa-arrow-right" style="color:var(--brand);font-size:12px;flex-shrink:0;margin-left:auto"></i>'
      + '</div></div>';
  }

  if (!msgs.length) {
    html += '<div style="text-align:center;padding:24px;color:var(--text-muted)">Напишіть перше повідомлення!</div>';
    area.innerHTML = html;
    return;
  }

  html += msgs.map(function(m) {

    var myUid = currentUser && currentUser.uid;
    var mine = myUid && m.senderUid && m.senderUid === myUid;

    if (!mine && !m.senderUid && myUid && m.senderName) {
      mine = m.senderName === (currentUser.name || currentUser.email);
    }

    var time = m.createdAt ? _formatChatTime(typeof m.createdAt === 'object' ? m.createdAt.seconds : m.createdAt/1000) : '';
    return '<div class="msg ' + (mine ? 'mine' : 'theirs') + '">'
      + '<div class="msg-bubble">' + _esc(m.text || '') + '</div>'
      + '<div class="msg-time">' + time + '</div>'
      + '</div>';
  }).join('');

  area.innerHTML = html;
  area.scrollTop = area.scrollHeight;
}

function sendMessage() {
  if (!_activeChatId || !isLoggedIn) return;
  var input = document.getElementById('chat-input');
  var text = (input ? input.value : '').trim();
  if (!text) return;
  input.value = '';

  var msg = {
    text: text,
    senderUid: currentUser.uid,
    senderName: currentUser.name || currentUser.email || '',
    createdAt: Date.now()
  };

  var localChat = _fbChats.find(function(c){ return c.id === _activeChatId; });
  var receiverUid = localChat && localChat.participants
    ? localChat.participants.find(function(p){ return p !== currentUser.uid; })
    : null;

  if (localChat) {
    localChat.lastMessage   = text;
    localChat.lastMessageAt = { seconds: Math.floor(Date.now() / 1000) };
    _fbChats = [localChat].concat(_fbChats.filter(function(c){ return c.id !== _activeChatId; }));
    renderChats();
  }

  if (window._rtdb) {
    window._rtdb.ref('chats/' + _activeChatId + '/messages').push(msg);
    window._rtdb.ref('chats/' + _activeChatId).update({
      lastMessage: text,
      lastMessageAt: { seconds: Math.floor(Date.now() / 1000) }
    });
  }

  if (window._db && receiverUid) {
    var upd = {
      lastMessage: text,
      lastMessageAt: firebase.firestore.FieldValue.serverTimestamp(),
      lastSenderUid: currentUser.uid
    };

    upd['unread_' + receiverUid] = firebase.firestore.FieldValue.increment(1);
    window._db.collection('chats').doc(_activeChatId).update(upd).catch(function(){});

    // Відправити email отримувачу якщо є email в Firestore
    window._db.collection('users').doc(receiverUid).get().then(function(doc) {
      if (doc.exists && doc.data().email) {
        var chat = _fbChats.find(function(c){ return c.id === _activeChatId; });
        fetch('/api/send-email', {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({
            type: 'new_message',
            to: doc.data().email,
            data: {
              senderName: currentUser.name || currentUser.email || 'Користувач',
              message: text,
              listingTitle: chat && chat.listingTitle ? chat.listingTitle : ''
            }
          })
        }).catch(function(e){ console.log('chat email error:', e.message); });
      }
    }).catch(function(){});
  } else if (window._db) {
    window._db.collection('chats').doc(_activeChatId).update({
      lastMessage: text,
      lastMessageAt: firebase.firestore.FieldValue.serverTimestamp()
    }).catch(function(){});
  }
}

function _startChatFromListing() {
  var l = [..._fbListings, ...myListings].find(function(x){ return x && x.id === currentDetailId; });
  if (!l) return;
  _startChat(l.uid, currentDetailId, l.title);
}

function openChat() {
  showPage('messages');
}

function closeChatOnMobile() {
  var layout = document.getElementById('messages-layout');
  if (layout) layout.classList.remove('chat-open');
  _activeChatId = null;
  renderChats();
}

function _startChat(sellerUid, listingId, listingTitle) {
  if (!isLoggedIn) { showToast('⚠️ Увійдіть щоб написати'); showPage('profile'); return; }
  if (sellerUid === currentUser.uid) { showToast('ℹ️ Це ваше оголошення'); return; }

  var existing = _fbChats.find(function(c) {
    return c.participants && c.participants.indexOf(sellerUid) >= 0
      && c.participants.indexOf(currentUser.uid) >= 0;
  });

  if (existing) {

    if (listingId && existing.listingId !== listingId) {
      existing.listingId = listingId;
      existing.listingTitle = listingTitle || '';
      if (window._db) {
        window._db.collection('chats').doc(existing.id).update({
          listingId: listingId,
          listingTitle: listingTitle || ''
        }).catch(function(){});
      }
    }
    showPage('messages');
    setTimeout(function(){ openChatById(existing.id); }, 200);
    return;
  }

  if (!window._db) return;
  var chatData = {
    participants: [currentUser.uid, sellerUid],
    listingId: listingId || null,
    listingTitle: listingTitle || '',
    lastMessage: '',
    lastMessageAt: firebase.firestore.FieldValue.serverTimestamp(),
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    [currentUser.uid + '_name']: currentUser.name || currentUser.email || '',
    [sellerUid + '_name']: ''
  };

  window._db.collection('chats').add(chatData).then(function(ref) {
    var newChat = Object.assign({ id: ref.id }, chatData);
    newChat.otherName = '';
    _fbChats.unshift(newChat);
    showPage('messages');
    setTimeout(function(){ openChatById(ref.id); }, 200);

    window._db.collection('users').doc(sellerUid).get().then(function(snap) {
      if (snap.exists) {
        var sellerName = snap.data().name || '';
        var upd = { otherName: sellerName };
        upd[sellerUid + '_name'] = sellerName;
        window._db.collection('chats').doc(ref.id).update(upd);
        var chat = _fbChats.find(function(c){ return c.id === ref.id; });
        if (chat) { chat.otherName = sellerName; renderChats(); }
      }
    });
  }).catch(function(e){ showToast('⚠️ Помилка: ' + e.message); });
}

let toastTimer;
function showToast(msg) {
  const t = document.getElementById('toast');
  document.getElementById('toast-msg').textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(()=>t.classList.remove('show'), 3000);
}

document.getElementById('headerSearch').addEventListener('keydown', e=>{
  if(e.key==='Enter') {
    const q = e.target.value.trim().toLowerCase();
    if(!q) return;
    showPage('catalog');

// ── Повідомлення: startChat, toast, пошук в header ──
    currentCatFilter = 'all';
    setTimeout(()=>{
      let data = _allListings().filter(l=>l && l.status !== 'deleted' && l.status !== 'sold' && (l.title.toLowerCase().includes(q)||l.cat.toLowerCase().includes(q)||l.city.toLowerCase().includes(q)));
      document.getElementById('catalog-listings').innerHTML = data.length
        ? data.map(l=>createCard(l,'catalog')).join('')
        : '<div class="empty-state"><i class="fa-solid fa-search"></i><h3>Нічого не знайдено</h3><p>Спробуйте інший запит</p></div>';
    },50);
  }
});

var UA_GEO = window.UA_GEO || {};

const CITY_COORDS = {
  "Київ":{"lat":50.4501,"lng":30.5234},"Харків":{"lat":49.9935,"lng":36.2304},
  "Одеса":{"lat":46.4825,"lng":30.7233},"Дніпро":{"lat":48.4647,"lng":35.0462},
  "Запоріжжя":{"lat":47.8388,"lng":35.1396},"Львів":{"lat":49.8397,"lng":24.0297},
  "Кривий Ріг":{"lat":47.9135,"lng":33.3519},"Миколаїв":{"lat":46.9750,"lng":31.9946},
  "Маріуполь":{"lat":47.0953,"lng":37.5402},"Луганськ":{"lat":48.5740,"lng":39.3078},
  "Вінниця":{"lat":49.2328,"lng":28.4682},"Херсон":{"lat":46.6354,"lng":32.6169},
  "Полтава":{"lat":49.5883,"lng":34.5514},"Чернігів":{"lat":51.4982,"lng":31.2893},
  "Черкаси":{"lat":49.4444,"lng":32.0598},"Житомир":{"lat":50.2547,"lng":28.6587},
  "Суми":{"lat":50.9216,"lng":34.7981},"Хмельницький":{"lat":49.4229,"lng":26.9871},
  "Рівне":{"lat":50.6199,"lng":26.2516},"Чернівці":{"lat":48.2921,"lng":25.9358},
  "Іванo-Франківськ":{"lat":48.9226,"lng":24.7111},"Тернопіль":{"lat":49.5535,"lng":25.5948},
  "Луцьк":{"lat":50.7472,"lng":25.3254},"Ужгород":{"lat":48.6208,"lng":22.2879},
  "Кропивницький":{"lat":48.5132,"lng":32.2597},"Мукачево":{"lat":48.4414,"lng":22.7105},
  "Бровари":{"lat":50.5119,"lng":30.7895},"Буча":{"lat":50.5491,"lng":30.2340},
  "Ірпінь":{"lat":50.5225,"lng":30.2539},"Вишгород":{"lat":50.5884,"lng":30.4737},
  "Бориспіль":{"lat":50.3508,"lng":30.9636},"Переяслав":{"lat":50.0745,"lng":31.4436},
  "Бердичів":{"lat":49.9000,"lng":28.6020},"Коростень":{"lat":50.9525,"lng":28.6485},
  "Звягель":{"lat":50.9078,"lng":27.6419},"Малин":{"lat":50.7721,"lng":29.2397},
  "Новоград-Волинський":{"lat":50.5942,"lng":27.6167},"Коростишів":{"lat":50.3167,"lng":29.0667},
  "Радомишль":{"lat":50.5000,"lng":29.2333},"Баранівка":{"lat":50.2964,"lng":27.6696},
  "Любар":{"lat":50.0103,"lng":27.7641},"Овруч":{"lat":51.3250,"lng":28.8031},
  "Олевськ":{"lat":51.2167,"lng":27.6500},"Андрушівка":{"lat":50.0231,"lng":29.0019},
  "Ковель":{"lat":51.2156,"lng":24.7089},"Нововолинськ":{"lat":50.7267,"lng":24.1625},
  "Кременчук":{"lat":49.0685,"lng":33.4217},"Горішні Плавні":{"lat":49.0092,"lng":33.6486},
  "Дрогобич":{"lat":49.3503,"lng":23.5050},"Трускавець":{"lat":49.2794,"lng":23.5056},
  "Самбір":{"lat":49.5189,"lng":23.2014},"Стрий":{"lat":49.2614,"lng":23.8583},
  "Червоноград":{"lat":50.3883,"lng":24.2344},"Зборів":{"lat":49.6572,"lng":25.1478},
  "Мелітополь":{"lat":46.8481,"lng":35.3699},"Бердянськ":{"lat":46.7597,"lng":36.7968},
  "Краматорськ":{"lat":48.7195,"lng":37.5291},"Слов'янськ":{"lat":48.8597,"lng":37.6228},
  "Покровськ":{"lat":48.2831,"lng":37.1731},
  "Лисичанськ":{"lat":48.9028,"lng":38.4328},"Сєвєродонецьк":{"lat":48.9480,"lng":38.4897},
  "Рубіжне":{"lat":48.9931,"lng":38.3767},"Конотоп":{"lat":51.2303,"lng":33.2028},
  "Шостка":{"lat":51.8689,"lng":33.4658},"Охтирка":{"lat":50.3031,"lng":34.9028},
  "Умань":{"lat":48.7444,"lng":30.2269},"Золотоноша":{"lat":49.6636,"lng":32.0350},
  "Корсунь-Шевченківський":{"lat":49.4228,"lng":31.2819},"Сміла":{"lat":49.2256,"lng":31.8697},
  "Ромни":{"lat":50.7483,"lng":33.4708},"Ніжин":{"lat":51.0497,"lng":31.8892},
  "Прилуки":{"lat":50.5869,"lng":32.3886},"Новгород-Сіверський":{"lat":51.9883,"lng":33.2711},
  "Болград":{"lat":45.6842,"lng":28.6117},"Ізмаїл":{"lat":45.3500,"lng":28.8500},
  "Кам'янець-Подільський":{"lat":48.6786,"lng":26.5789},"Шепетівка":{"lat":50.1872,"lng":27.0608},
  "Чортків":{"lat":49.0161,"lng":25.7950},"Кременець":{"lat":50.0986,"lng":25.7278},
  "Богодухів":{"lat":50.1667,"lng":35.5500},"Ізюм":{"lat":49.2094,"lng":37.2783},
  "Куп'янськ":{"lat":49.7111,"lng":37.6189},"Лозова":{"lat":48.8889,"lng":36.3183},
  "Хуст":{"lat":48.1822,"lng":23.2942},
  "Свалява":{"lat":48.5406,"lng":22.9769},"Рахів":{"lat":48.0528,"lng":24.2111},
};

const UA_OBLASTS = Object.entries(UA_GEO).map(([name, data]) => ({
  name, lat: data.lat, lng: data.lng, osm: name
}));

const _settlementsCache = {};
const _raionsCache = {};

let addMapInstance = null;
let addMapMarker  = null;
let selectedCoords = null;

function initOblastSelect() {
  const sel = document.getElementById('new-oblast');
  if (!sel || sel.options.length > 1) return;
  Object.keys(UA_GEO).sort((a,b) => a.localeCompare(b,'uk')).forEach(name => {
    const opt = document.createElement('option');
    opt.value = name; opt.textContent = name;
    sel.appendChild(opt);
  });
}

function onOblastChange() {
  const oblast = document.getElementById('new-oblast').value;
  const raionSel = document.getElementById('new-raion');

  raionSel.innerHTML = '<option value="">Оберіть район...</option>';
  raionSel.disabled = !oblast;

  var cityInp = document.getElementById('new-city');
  if (cityInp) cityInp.value = '';

  var _cityOblasts2 = {'Місто Київ': 'Київ', 'Місто Севастополь': 'Севастополь'};
  if (_cityOblasts2[oblast] && cityInp) {
    cityInp.value = _cityOblasts2[oblast];
    raionSel.disabled = true;
    setTimeout(onCityChange, 50);
    return;
  }

  const hint = document.getElementById('add-location-hint');
  if (hint) hint.style.display = 'none';
  if (!oblast) return;

  const geo = UA_GEO[oblast];
  if (geo) showAddMap(geo.lat, geo.lng, oblast, 8);

  Object.entries(geo?.raions || {}).sort((a,b) => a[0].localeCompare(b[0],'uk')).forEach(([name, data]) => {
    const o = document.createElement('option');
    o.value = name; o.textContent = name;
    o.dataset.lat = data.lat; o.dataset.lng = data.lng;
    raionSel.appendChild(o);
  });
  raionSel.disabled = false;
}

function onRaionChange() {
  const raion   = document.getElementById('new-raion').value;
  if (!raion) return;

  const raionOpt = document.querySelector('#new-raion option:checked');
  if (raionOpt?.dataset.lat) {
    showAddMap(+raionOpt.dataset.lat, +raionOpt.dataset.lng, raion, 10);
  }

}

function onCityChange() {
  const oblast = document.getElementById('new-oblast').value;
  const raion  = document.getElementById('new-raion').value;
  const city   = document.getElementById('new-city').value;
  if (!city) return;

  const known = CITY_COORDS[city];
  if (known) {
    selectedCoords = known;
    showAddMap(known.lat, known.lng, city, 13);
  } else {
    const rData = UA_GEO[oblast]?.raions[raion];
    if (rData) showAddMap(rData.lat, rData.lng, city, 11);

    fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(city+', '+oblast+', Україна')}&format=json&limit=1&countrycodes=ua`, {
      headers:{'Accept-Language':'uk'}
    }).then(r=>r.json()).then(data=>{
      if (data[0]) {
        const lat = +data[0].lat, lng = +data[0].lon;
        CITY_COORDS[city] = { lat, lng };
        selectedCoords = { lat, lng };
        if (addMapInstance) {
          addMapInstance.setView([lat,lng],13);
          if (addMapMarker) addMapMarker.remove();
          addMapMarker = L.circleMarker([lat,lng],{
            radius:10,fillColor:'#00c853',color:'#fff',weight:3,opacity:1,fillOpacity:.9
          }).bindPopup('<b>'+city+'</b>').addTo(addMapInstance).openPopup();
        }
      }
    }).catch(()=>{});
  }

  const hint  = document.getElementById('add-location-hint');
  const label = document.getElementById('add-location-label');
  if (hint && label) {
    hint.style.display = '';
    label.textContent = [city, raion, oblast].filter(Boolean).join(', ');
  }
}

var _leafletLoaded = false;
var _leafletLoading = false;
var _leafletQueue = [];

function _loadLeaflet(cb) {
  if (_leafletLoaded) { cb(); return; }
  _leafletQueue.push(cb);
  if (_leafletLoading) return;
  _leafletLoading = true;

  var css = document.createElement('link');
  css.rel = 'stylesheet';
  css.href = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css';
  document.head.appendChild(css);

  var script = document.createElement('script');
  script.src = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js';
  script.onload = function() {
    _leafletLoaded = true;
    _leafletLoading = false;
    _leafletQueue.forEach(function(fn) { fn(); });
    _leafletQueue = [];
  };
  script.onerror = function() {
    _leafletLoading = false;
    _leafletQueue = [];
    console.error('Leaflet не завантажився');
  };
  document.head.appendChild(script);
}

function showAddMap(lat, lng, label, zoom) {
  const wrap = document.getElementById('add-map-wrap');
  if (!wrap) return;
  wrap.style.display = '';

  _loadLeaflet(function() {
  if (!addMapInstance) {
    addMapInstance = L.map('add-map', { zoomControl: true, scrollWheelZoom: false })
      .setView([lat, lng], zoom);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap', maxZoom: 18
    }).addTo(addMapInstance);
  } else {
    addMapInstance.setView([lat, lng], zoom);
  }

  if (addMapMarker) addMapMarker.remove();
  if (zoom >= 11) {
    addMapMarker = L.circleMarker([lat, lng], {
      radius: 10, fillColor: '#00c853', color: '#fff',
      weight: 3, opacity: 1, fillOpacity: 0.9
    }).bindPopup(`<b>${label}</b>`).addTo(addMapInstance).openPopup();
  }
  setTimeout(() => addMapInstance.invalidateSize(), 60);
  });
}

let detailMapInstance = null;
let detailMapMarker   = null;

function renderDetailMap(city, fullLocation) {
  document.getElementById('detail-location-text').textContent = fullLocation;
  document.getElementById('detail-map-link').href =
    `https://www.google.com/maps/search/${encodeURIComponent(fullLocation)}`;

