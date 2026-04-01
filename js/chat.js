// chat.js — RideGO Chat Module
// Окремий файл для надійної роботи на мобільних браузерах
// Використовує REST API замість WebSocket для читання повідомлень

(function() {
  'use strict';

  var RTDB_URL = 'https://ridego-6f981-default-rtdb.europe-west1.firebasedatabase.app';
  var _pollInterval = null;
  var _lastMsgCount = -1;
  var _currentChatId = null;

  // ── Отримати токен ────────────────────────────────────────────
  function _getToken() {
    var user = window._auth && window._auth.currentUser;
    if (!user) return Promise.reject(new Error('not logged in'));
    return user.getIdToken(false);
  }

  // ── REST запит до RTDB ────────────────────────────────────────
  function _fetchMessages(chatId) {
    return _getToken().then(function(token) {
      var url = RTDB_URL + '/chats/' + chatId + '/messages.json?auth=' + token;
      return fetch(url);
    }).then(function(r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    }).then(function(val) {
      var msgs = [];
      if (val && typeof val === 'object') {
        Object.keys(val).forEach(function(k) {
          if (val[k] && typeof val[k] === 'object') msgs.push(val[k]);
        });
        msgs.sort(function(a, b) { return (a.createdAt || 0) - (b.createdAt || 0); });
      }
      return msgs;
    });
  }

  // ── Зупинити polling ──────────────────────────────────────────
  function _stopPolling() {
    if (_pollInterval) { clearInterval(_pollInterval); _pollInterval = null; }
    _lastMsgCount = -1;
    _currentChatId = null;
  }

  // ── Запустити polling для chatId ──────────────────────────────
  function _startPolling(chatId, chatData) {
    _stopPolling();
    _currentChatId = chatId;

    function _poll() {
      if (_currentChatId !== chatId) return;
      _fetchMessages(chatId).then(function(msgs) {
        if (_currentChatId !== chatId) return;
        if (msgs.length !== _lastMsgCount) {
          _lastMsgCount = msgs.length;
          if (typeof _renderMessages === 'function') {
            _renderMessages(msgs, chatData);
          }
        }
      }).catch(function(e) {
        console.warn('[chat.js poll]', e.message);
      });
    }

    // Одразу
    _poll();
    // Потім кожні 2 секунди
    _pollInterval = setInterval(_poll, 2000);
  }

  // ── Перехопити openChatById ───────────────────────────────────
  // Чекаємо поки main.js завантажиться і визначить оригінальну функцію
  function _patchOpenChatById() {
    var _origOpenChatById = window.openChatById;
    if (typeof _origOpenChatById !== 'function') {
      setTimeout(_patchOpenChatById, 100);
      return;
    }

    window.openChatById = function(chatId) {
      if (!chatId) return;

      // Чекаємо auth
      function _doOpen() {
        var user = window._auth && window._auth.currentUser;
        if (!user) {
          if (window._auth) {
            var unsub = window._auth.onAuthStateChanged(function(u) {
              unsub();
              if (u) _doOpen();
            });
          } else {
            setTimeout(_doOpen, 300);
          }
          return;
        }

        if (!window.isLoggedIn) return;

        _activeChatId = chatId;
        var c = (window._fbChats || []).find(function(x) { return x.id === chatId; });

        // Заповнити header
        var otherId = c && c.participants ? c.participants.find(function(p) { return p !== user.uid; }) : null;
        var name = (c && c.otherName) || (c && otherId && c[otherId + '_name']) || 'Користувач';

        var headerName = document.getElementById('chat-header-name');
        var headerSub  = document.getElementById('chat-header-sub');
        var headerAva  = document.getElementById('chat-header-avatar');

        if (headerName) {
          if (otherId) {
            headerName.innerHTML = '<span style="cursor:pointer;text-decoration:underline;text-decoration-color:var(--brand)" onclick="showSellerByUid(\'' + otherId + '\')">' + (window._esc ? window._esc(name) : name) + '</span>';
          } else {
            headerName.textContent = name;
          }
        }
        if (headerSub) {
          if (c && c.listingId) {
            headerSub.innerHTML = '<span style="cursor:pointer;color:var(--brand)" onclick="showDetail(\'' + c.listingId + '\')"><i class="fa-solid fa-tag" style="margin-right:4px;font-size:10px"></i>' + (window._esc ? window._esc(c.listingTitle || 'Оголошення') : (c.listingTitle || 'Оголошення')) + '</span>';
          } else {
            headerSub.textContent = c && c.listingTitle ? 'Оголошення: ' + c.listingTitle : '';
          }
        }
        if (headerAva) headerAva.textContent = (name[0] || '?').toUpperCase();

        // Мобільний слайд
        var layout = document.querySelector('.messages-layout');
        if (layout && window.innerWidth <= 900) layout.classList.add('chat-open');

        // Скинути unread
        if (window._db && window.currentUser && window.currentUser.uid) {
          var upd = {};
          upd['unread_' + window.currentUser.uid] = 0;
          window._db.collection('chats').doc(chatId).update(upd).catch(function() {});
          if (c) { c['unread_' + window.currentUser.uid] = 0; c.unread = 0; }
          if (typeof window._updateChatBadge === 'function') window._updateChatBadge();
        }

        // Показати loading
        var area = document.getElementById('messages-area');
        if (area) area.innerHTML = '<div style="text-align:center;padding:24px;color:var(--text-muted)">Завантаження...</div>';

        // Відписатись від старого
        if (window._chatUnsubscribe) { window._chatUnsubscribe(); window._chatUnsubscribe = null; }

        // Запустити REST polling
        _startPolling(chatId, c);

        // Також спробувати RTDB WebSocket (якщо працює — буде швидше)
        if (window._rtdb) {
          var msgsRef = window._rtdb.ref('chats/' + chatId + '/messages');
          var _rtdbCb = msgsRef.on('value', function(snap) {
            if (window._activeChatId !== chatId) return;
            var msgs = [];
            if (snap && snap.val()) {
              var val = snap.val();
              Object.keys(val).forEach(function(k) {
                if (val[k] && typeof val[k] === 'object') msgs.push(val[k]);
              });
              msgs.sort(function(a, b) { return (a.createdAt || 0) - (b.createdAt || 0); });
            }
            if (msgs.length !== _lastMsgCount) {
              _lastMsgCount = msgs.length;
              if (typeof _renderMessages === 'function') _renderMessages(msgs, c);
            }
          }, function(err) {
            console.warn('[chat.js RTDB]', err.code);
            // RTDB не працює — polling вже запущений, все ок
          });

          window._chatUnsubscribe = function() {
            _stopPolling();
            msgsRef.off('value', _rtdbCb);
          };
        } else {
          window._chatUnsubscribe = _stopPolling;
        }

        if (typeof window.renderChats === 'function') window.renderChats();
      }

      _doOpen();
    };

    console.log('[chat.js] openChatById patched ✅');
  }

  // Реєструємо функції для заглушок в main.js
  window._renderChats = function() {
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
    if (!window.isLoggedIn) {
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
    var chats = window._fbChats || [];
    if (!chats.length) {
      list.innerHTML = '<div style="text-align:center;padding:32px;color:var(--text-muted)"><i class="fa-regular fa-comment-dots" style="font-size:32px;display:block;margin-bottom:12px"></i>Повідомлень поки немає</div>';
      return;
    }
    var uid = window.currentUser && window.currentUser.uid;
    list.innerHTML = chats.map(function(c) {
      var otherId = c.participants ? c.participants.find(function(p){ return p !== uid; }) : null;
      var name = c.otherName || (otherId && c[otherId+'_name']) || 'Користувач';
      var lastMsg = c.lastMessage || '';
      var lastTime = c.lastMessageAt && typeof window._formatChatTime === 'function' ? window._formatChatTime(c.lastMessageAt.seconds) : '';
      var initial = (name[0] || '?').toUpperCase();
      var isActive = window._activeChatId === c.id;
      var esc = window._esc || function(s){ return s; };
      var unreadDot = (c.unread && c.unread > 0 && !isActive)
        ? '<span style="width:8px;height:8px;border-radius:50%;background:var(--brand);flex-shrink:0"></span>' : '';
      var listingTag = c.listingTitle
        ? '<div style="font-size:10px;color:var(--brand);margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis"><i class="fa-solid fa-tag" style="font-size:9px;margin-right:3px"></i>' + esc(c.listingTitle) + '</div>'
        : '';
      return '<div class="chat-item ' + (isActive ? 'active' : '') + '" onclick="openChatById(this.dataset.id)" data-id="' + c.id + '">'
        + '<div class="chat-avatar" style="cursor:pointer" onclick="event.stopPropagation();' + (otherId ? "showSellerByUid('" + otherId + "')" : '') + '">' + initial + '</div>'
        + '<div style="flex:1;min-width:0">'
        + '<div style="display:flex;justify-content:space-between;align-items:center;gap:6px">'
        + '<div class="chat-name">' + esc(name) + '</div>'
        + '<div style="display:flex;align-items:center;gap:5px;flex-shrink:0">' + unreadDot + '<div class="chat-time">' + lastTime + '</div></div>'
        + '</div>'
        + listingTag
        + '<div class="chat-last" style="margin-top:3px">' + esc(lastMsg) + '</div>'
        + '</div></div>';
    }).join('');
  };

  window.__renderMessages = function(msgs, chat) {
    var area = document.getElementById('messages-area');
    if (!area) return;
    var esc = window._esc || function(s){ return s; };
    var uid = window.currentUser && window.currentUser.uid;
    var html = '';

    if (chat && chat.listingId && chat.listingTitle) {
      html += '<div style="margin-bottom:12px;display:flex;justify-content:center">'
        + "<div onclick=\"showDetail('" + chat.listingId + "')\" style=\"cursor:pointer;display:flex;align-items:center;gap:12px;background:var(--card-bg);border:1px solid var(--border);border-radius:14px;padding:12px 16px;max-width:320px;width:100%\">"
        + '<div style="width:56px;height:56px;background:var(--dark3);border-radius:8px;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:22px">🛵</div>'
        + '<div style="min-width:0">'
        + '<div style="font-size:11px;color:var(--text-muted);margin-bottom:2px">Оголошення</div>'
        + '<div style="font-weight:600;font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + esc(chat.listingTitle) + '</div>'
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
      var mine = uid && m.senderUid === uid;
      var ft = window._formatChatTime || function(){ return ''; };
      var time = m.createdAt ? ft(typeof m.createdAt === 'object' ? m.createdAt.seconds : m.createdAt/1000) : '';
      return '<div class="msg ' + (mine ? 'mine' : 'theirs') + '">'
        + '<div class="msg-bubble">' + esc(m.text || '') + '</div>'
        + '<div class="msg-time">' + time + '</div>'
        + '</div>';
    }).join('');

    area.innerHTML = html;
    requestAnimationFrame(function() {
      area.scrollTop = area.scrollHeight;
      requestAnimationFrame(function() { area.scrollTop = area.scrollHeight; });
    });
  };

  window._sendMessage = function() {
    var chatId = window._activeChatId;
    if (!chatId || !window.isLoggedIn) return;
    var input = document.getElementById('chat-input');
    var text = (input ? input.value : '').trim();
    if (!text) return;
    input.value = '';

    var msg = {
      text: text,
      senderUid: window.currentUser.uid,
      senderName: window.currentUser.name || window.currentUser.email || '',
      createdAt: Date.now()
    };

    var chats = window._fbChats || [];
    var localChat = chats.find(function(c){ return c.id === chatId; });
    var receiverUid = localChat && localChat.participants
      ? localChat.participants.find(function(p){ return p !== window.currentUser.uid; })
      : null;

    if (localChat) {
      localChat.lastMessage = text;
      localChat.lastMessageAt = { seconds: Math.floor(Date.now()/1000) };
      window._fbChats = [localChat].concat(chats.filter(function(c){ return c.id !== chatId; }));
      renderChats();
    }

    if (window._rtdb) {
      window._rtdb.ref('chats/' + chatId + '/messages').push(msg);
      window._rtdb.ref('chats/' + chatId).update({ lastMessage: text, lastMessageAt: { seconds: Math.floor(Date.now()/1000) } });
    } else {
      // Fallback: зберегти через REST
      _getToken().then(function(token) {
        return fetch(RTDB_URL + '/chats/' + chatId + '/messages.json?auth=' + token, {
          method: 'POST',
          body: JSON.stringify(msg)
        });
      }).catch(function(e){ console.error('[chat.js send]', e); });
    }

    if (window._db && receiverUid) {
      var upd = { lastMessage: text, lastMessageAt: firebase.firestore.FieldValue.serverTimestamp(), lastSenderUid: window.currentUser.uid };
      upd['unread_' + receiverUid] = firebase.firestore.FieldValue.increment(1);
      window._db.collection('chats').doc(chatId).update(upd).catch(function(){});
    }
  };

  window.__startChatFromListing = function() {
    var all = (window._fbListings||[]).concat(window.myListings||[]);
    var l = all.find(function(x){ return x && x.id === window.currentDetailId; });
    if (!l) return;
    window.__startChat(l.uid, window.currentDetailId, l.title);
  };

  window.__startChat = function(sellerUid, listingId, listingTitle) {
    if (!window.isLoggedIn) { if(typeof showToast==='function') showToast('⚠️ Увійдіть щоб написати'); showPage('profile'); return; }
    if (sellerUid === window.currentUser.uid) { if(typeof showToast==='function') showToast('ℹ️ Це ваше оголошення'); return; }

    var chats = window._fbChats || [];
    var existing = chats.find(function(c) {
      return c.participants && c.participants.indexOf(sellerUid) >= 0 && c.participants.indexOf(window.currentUser.uid) >= 0;
    });

    if (existing) {
      if (listingId && existing.listingId !== listingId) {
        existing.listingId = listingId;
        existing.listingTitle = listingTitle || '';
        if (window._db) window._db.collection('chats').doc(existing.id).update({ listingId: listingId, listingTitle: listingTitle||'' }).catch(function(){});
      }
      showPage('messages');
      setTimeout(function(){ openChatById(existing.id); }, 200);
      return;
    }

    if (!window._db) return;
    var chatData = { participants: [window.currentUser.uid, sellerUid], listingId: listingId||null, listingTitle: listingTitle||'', lastMessage: '', lastMessageAt: firebase.firestore.FieldValue.serverTimestamp(), createdAt: firebase.firestore.FieldValue.serverTimestamp() };
    chatData[window.currentUser.uid + '_name'] = window.currentUser.name || window.currentUser.email || '';
    chatData[sellerUid + '_name'] = '';

    window._db.collection('chats').add(chatData).then(function(ref) {
      var newChat = Object.assign({ id: ref.id }, chatData);
      newChat.otherName = '';
      window._fbChats = [newChat].concat(window._fbChats || []);
      showPage('messages');
      setTimeout(function(){ openChatById(ref.id); }, 200);
      window._db.collection('users').doc(sellerUid).get().then(function(snap) {
        if (snap.exists) {
          var sn = snap.data().name || '';
          var upd = { otherName: sn };
          upd[sellerUid + '_name'] = sn;
          window._db.collection('chats').doc(ref.id).update(upd);
          var chat = (window._fbChats||[]).find(function(c){ return c.id === ref.id; });
          if (chat) { chat.otherName = sn; renderChats(); }
        }
      });
    }).catch(function(e){ if(typeof showToast==='function') showToast('⚠️ Помилка: ' + e.message); });
  };

  // ── Запуск ────────────────────────────────────────────────────
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _patchOpenChatById);
  } else {
    _patchOpenChatById();
  }

})();
