function doLogin() {
  var email = document.getElementById('login-email').value.trim();
  var pass  = document.getElementById('login-pass').value;
  if (!email) { showToast('⚠️ Введіть email'); return; }
  if (!pass)  { showToast('⚠️ Введіть пароль'); return; }
  if (window._auth) {
    window._auth.signInWithEmailAndPassword(email, pass)
      .then(function() { showToast('✅ Вхід успішний!'); showPage('profile'); })
      .catch(function(e) {
        if (e.code === 'auth/too-many-requests') showToast('⚠️ Забагато спроб. Зачекайте');
        else showToast('⚠️ Невірний email або пароль');
      });
  }
}
function doSocialLogin(provider) {
  if (provider === 'Google' && window._auth) {
    var gProvider = new firebase.auth.GoogleAuthProvider();
    gProvider.setCustomParameters({ prompt: 'select_account' });
    window._auth.signInWithPopup(gProvider)
      .then(function(result) {
        var user = result.user;
        isLoggedIn = true;

        currentUser = currentUser || {};
        currentUser.uid     = user.uid;
        currentUser.email   = user.email;
        currentUser.name    = user.displayName || user.email.split('@')[0];
        currentUser.initial = currentUser.name[0].toUpperCase();

        window._db.collection('users').doc(user.uid).get().then(function(snap) {
          if (snap.exists) {
            var d = snap.data();
            currentUser.name    = d.name || currentUser.name;
            currentUser.initial = currentUser.name[0].toUpperCase();
            currentUser.type    = d.type || 'personal';
          } else {
            window._db.collection('users').doc(user.uid).set({
              name: user.displayName, email: user.email, uid: user.uid,
              type: 'personal', listings: 0, status: 'active',
              createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
          }
          showToast('✅ Вхід через Google!');
          showPage('profile');
        }).catch(function() {
          showToast('✅ Вхід через Google!');
          showPage('profile');
        });
      })
      .catch(function(e) {
        if (e.code === 'auth/popup-blocked') {
          showToast('⚠️ Дозвольте popup для цього сайту і спробуйте знову');
        } else if (e.code !== 'auth/popup-closed-by-user') {
          showToast('⚠️ ' + e.message);
        }
      });
  } else {
    showToast('⚠️ Поки підтримується тільки Google');
  }
}
function doLogout() {
  if (window._auth) {
    if (typeof _chatsUnsubscribe === 'function') { _chatsUnsubscribe(); window._chatsUnsubscribe = null; }
    if (typeof _chatUnsubscribe  === 'function') { _chatUnsubscribe();  _chatUnsubscribe = null; }
    window._auth.signOut().then(function() {
      isLoggedIn  = false;
      myListings  = [];
      _fbChats    = [];
      currentUser = { name:'', email:'', initial:'' };
      if (typeof renderProfile    === 'function') renderProfile();
      if (typeof renderChats      === 'function') renderChats();
      if (typeof _updateChatBadge === 'function') _updateChatBadge();
      showToast('До побачення!');
      showPage('home');
    });
  }
}
function showRegister() {
  document.getElementById('auth-form-title').textContent = 'Реєстрація';
  document.getElementById('auth-form-sub').textContent = 'Приєднуйтесь до RideGO!';
  document.getElementById('auth-form-body').innerHTML = `
    <div class="form-group"><label>Ім'я</label><input type="text" class="form-input" id="reg-name" placeholder="Ваше ім'я"></div>
    <div class="form-group"><label>Email</label><input type="email" class="form-input" id="reg-email" placeholder="your@email.com"></div>
    <div class="form-group"><label>Пароль</label><input type="password" class="form-input" id="reg-pass" placeholder="Мін. 8 символів"></div>
    <button class="btn-primary" style="width:100%;padding:14px;font-size:15px;margin-top:8px" onclick="doRegister()">Зареєструватись</button>
  `;
  document.querySelector('.auth-switch').innerHTML = 'Вже є акаунт? <a onclick="resetAuthForm()">Увійти</a>';
}
function resetAuthForm() { showPage('profile'); }
function doRegister() {
  var name  = (document.getElementById('reg-name')  || {}).value || '';
  var email = (document.getElementById('reg-email') || {}).value || '';
  var pass  = (document.getElementById('reg-pass')  || {}).value || '';
  name = name.trim(); email = email.trim();
  if (!name)  { showToast('⚠️ Введіть ім’я'); return; }
  if (!email) { showToast('⚠️ Введіть email'); return; }
  if (pass.length < 6) { showToast('⚠️ Пароль мінімум 6 символів'); return; }
  if (window._auth) {
    window._auth.createUserWithEmailAndPassword(email, pass)
      .then(function(cred) {
        return cred.user.updateProfile({displayName: name}).then(function() {
          return window._db.collection('users').doc(cred.user.uid).set({
            name: name, email: email, uid: cred.user.uid,
            type: 'personal', listings: 0, status: 'active',
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
          });
        });
      })
      .then(function() { showToast('✅ Акаунт створено!'); showPage('profile'); })
      .catch(function(e) {
        if (e.code === 'auth/email-already-in-use') showToast('⚠️ Цей email вже використовується');
        else if (e.code === 'auth/weak-password') showToast('⚠️ Пароль мінімум 6 символів');
        else showToast('⚠️ ' + e.message);
      });
  }
}

