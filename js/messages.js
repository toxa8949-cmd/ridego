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
    currentCatFilter = 'all';
    setTimeout(()=>{
      let data = _allListings().filter(l=>l && l.status !== 'deleted' && l.status !== 'sold' && (l.title.toLowerCase().includes(q)||l.cat.toLowerCase().includes(q)||l.city.toLowerCase().includes(q)));
      document.getElementById('catalog-listings').innerHTML = data.length
        ? data.map(l=>createCard(l,'catalog')).join('')
        : '<div class="empty-state"><i class="fa-solid fa-search"></i><h3>Нічого не знайдено</h3><p>Спробуйте інший запит</p></div>';
    },50);
  }
});

