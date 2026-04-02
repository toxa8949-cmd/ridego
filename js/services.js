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
    "<div class=\"service-card-body\">"+
    "<div class=\"service-card-cats\">"+cats+"</div>"+
    "<div class=\"service-card-name\">"+s.name+"</div>"+
    "<div class=\"service-card-city\"><i class=\"fa-solid fa-location-dot\" style=\"color:var(--brand)\"></i>"+s.city+addr+"</div>"+
    "<div class=\"service-card-desc\">"+s.desc+"</div>"+
    "<div class=\"service-card-services\">"+prev+"</div>"+
    "<div class=\"service-card-footer\">"+
    "<div class=\"service-card-rating\"><span style=\"color:#ffa726\">"+stars+"</span> "+rating+"</div>"+
    "<div style=\"display:flex;flex-direction:column;align-items:flex-end;gap:5px\">"+
    shopLk+"<button class=\"service-card-btn\" onclick=\"event.stopPropagation();showServiceDetail('"+s.id+"')\">\u0414\u0435\u0442\u0430\u043b\u044c\u043d\u0456\u0448\u0435 \u2192</button>"+
    "</div></div></div></div>";
}

function _buildSvcDetailHeader(s){
  var badge=s.badge?"<div class=\"service-card-cover-badge "+s.badge+"\" style=\"font-size:12px;padding:5px 14px\">"+s.badgeLabel+"</div>":"";
  var cats=s.cats.map(function(c){return "<span class=\"service-cat-tag\">"+c+"</span>";}).join("");
  var cityLine=s.city?"<span><i class=\"fa-solid fa-location-dot\" style=\"color:var(--brand);margin-right:6px\"></i>"+s.city+(s.address?", "+s.address:"")+"</span>":"";
  var hoursLine=s.hours?"<span><i class=\"fa-solid fa-clock\" style=\"color:var(--brand);margin-right:6px\"></i>"+s.hours+"</span>":"";
  var phoneLine=s.phone?"<span><i class=\"fa-solid fa-phone\" style=\"color:var(--brand);margin-right:6px\"></i>"+s.phone+"</span>":"";
  var btnPhone=s.phone?"<button class=\"btn-primary\" style=\"padding:11px 20px;font-size:14px\" onclick=\"showToast('\u260e\ufe0f '+s.phone)\"><i class=\"fa-solid fa-phone\" style=\"margin-right:6px\"></i>\u0417\u0430\u0442\u0435\u043b\u0435\u0444\u043e\u043d\u0443\u0432\u0430\u0442\u0438</button>":"";
  var btnTg=s.telegram?"<button class=\"btn-outline\" style=\"padding:11px 20px;font-size:14px\" onclick=\"showToast('\ud83d\udcf1 '+s.telegram)\"><i class=\"fa-brands fa-telegram\" style=\"margin-right:6px;color:#2ca5e0\"></i>Telegram</button>":"";
  var btnShop=s.sellerId?"<button class=\"btn-outline\" style=\"padding:11px 20px;font-size:14px\" onclick=\"showSeller('"+s.sellerId+"')\"><i class=\"fa-solid fa-store\" style=\"margin-right:6px\"></i>Магазин</button>":"";

  var btnMsg = s.uid
    ? "<button class=\"btn-outline\" style=\"padding:11px 20px;font-size:14px\" onclick=\"_openSvcChat('"+s.uid+"','"+s.name+"')\"><i class=\"fa-solid fa-comment\" style=\"margin-right:6px\"></i>Написати</button>"
    : "";

  var coverHtml;
  if (s.photoUrl) {
    coverHtml = "<div class=\"service-detail-cover\" style=\"background:none;padding:0;overflow:hidden\">" +
      "<img src=\"" + s.photoUrl + "\" style=\"width:100%;height:100%;object-fit:cover\">" +
      badge + "</div>";
  } else {
    coverHtml = "<div class=\"service-detail-cover\" style=\"background:linear-gradient(135deg,"+s.coverColor+" 0%,var(--dark2) 100%)\"><span>"+s.icon+"</span>"+badge+"</div>";
  }

  var isOwner = (typeof currentUser !== 'undefined') && currentUser && currentUser.uid && s.uid && currentUser.uid === s.uid;
  var editPhotoBtn = isOwner
    ? "<button onclick=\"triggerSvcPhotoUpload('"+s.id+"')\" style=\"position:absolute;bottom:10px;left:10px;background:rgba(0,0,0,.6);border:none;color:#fff;border-radius:8px;padding:6px 12px;font-size:12px;cursor:pointer;display:flex;align-items:center;gap:6px\"><i class='fa-solid fa-camera'></i> Змінити фото</button>"
    : "";
  return "<div style=\"position:relative\">" + coverHtml + editPhotoBtn + "</div>"+
    "<div><div style=\"display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px\">"+cats+"</div>"+
    "<div class=\"service-detail-name\">"+s.name+"</div>"+
    "<div style=\"display:flex;flex-direction:column;gap:8px;font-size:14px;color:var(--text-muted);margin-bottom:16px\">"+cityLine+hoursLine+phoneLine+"</div>"+
    "<div style=\"display:flex;gap:8px;flex-wrap:wrap\">"+btnPhone+btnMsg+btnTg+btnShop+"</div></div>";
}

function _openSvcChat(sellerUid, svcName) {
  _startChat(sellerUid, null, svcName);
}

function triggerSvcPhotoUpload(svcId) {
  var inp = document.createElement('input');
  inp.type = 'file';
  inp.accept = 'image/*';
  inp.onchange = function(e) {
    var file = e.target.files[0];
    if (!file) return;
    showToast('⏳ Завантаження фото...');
    var reader = new FileReader();
    reader.onload = function(ev) {
      var img = new Image();
      img.onload = function() {
        var canvas = document.createElement('canvas');
        var maxW = 1200, maxH = 600;
        var w = img.width, h = img.height;
        if (w > maxW) { h = h*maxW/w; w = maxW; }
        if (h > maxH) { w = w*maxH/h; h = maxH; }
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        canvas.toBlob(function(blob) {
          var fd = new FormData();
          fd.append('file', blob, 'svc-cover.jpg');
          fd.append('upload_preset', 'ridego_unsigned');
          fd.append('folder', 'services');
          fetch('https://api.cloudinary.com/v1_1/dxgtpo5dq/image/upload', { method:'POST', body:fd })
            .then(function(r){ return r.json(); })
            .then(function(data) {
              if (!data.secure_url) { showToast('⚠️ Помилка завантаження'); return; }
              var url = data.secure_url;

              if (window._db) {
                window._db.collection('services').doc(svcId).update({ photoUrl: url })
                  .then(function() {
                    showToast('✅ Фото оновлено!');

                    var svc = _fbServices.concat(myServices).find(function(x){ return x.id === svcId; });
                    if (svc) svc.photoUrl = url;

                    var coverEl = document.querySelector('#page-service-detail .service-detail-cover img');
                    if (coverEl) {
                      coverEl.src = url;
                    } else {

                      showServiceDetail(svcId);
                    }
                  }).catch(function(e){ showToast('⚠️ ' + e.message); });
              }
            }).catch(function(){ showToast('⚠️ Помилка зв\'язку з Cloudinary'); });
        }, 'image/jpeg', 0.85);
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  };
  inp.click();
}

function _buildSvcDetailBody(s){
  var stars5="\u2605".repeat(Math.round(s.rating))+"\u2606".repeat(5-Math.round(s.rating));
  var svcList=_renderSvcList(s.services);
    var ratingNum=s.rating>0?s.rating:"\u2014";
  var ratingStars=s.rating>0?stars5:"\u2606\u2606\u2606\u2606\u2606";
  var reviewsTxt=s.reviews>0?"\u043d\u0430 \u043e\u0441\u043d\u043e\u0432\u0456 "+s.reviews+" \u0432\u0456\u0434\u0433\u0443\u043a\u0456\u0432":"\u041f\u043e\u043a\u0438 \u043d\u0435\u043c\u0430\u0454 \u0432\u0456\u0434\u0433\u0443\u043a\u0456\u0432";
  var socialBlock="";
  if(s.telegram||s.instagram){
    var tgLine=s.telegram?"<div style=\"display:flex;align-items:center;gap:10px;font-size:14px;cursor:pointer\" onclick=\"showToast('\ud83d\udcf1 "+s.telegram+"')\"><div style=\"width:36px;height:36px;border-radius:8px;background:#2ca5e020;display:flex;align-items:center;justify-content:center\"><i class=\"fa-brands fa-telegram\" style=\"color:#2ca5e0\"></i></div>"+s.telegram+"</div>":"";
    var igLine=s.instagram?"<div style=\"display:flex;align-items:center;gap:10px;font-size:14px;cursor:pointer\" onclick=\"showToast('\ud83d\udcf8 "+s.instagram+"')\"><div style=\"width:36px;height:36px;border-radius:8px;background:#e1306c20;display:flex;align-items:center;justify-content:center\"><i class=\"fa-brands fa-instagram\" style=\"color:#e1306c\"></i></div>"+s.instagram+"</div>":"";
    socialBlock="<div style=\"background:var(--card-bg);border:1px solid var(--border);border-radius:16px;padding:22px\"><div style=\"font-size:11px;font-weight:700;text-transform:uppercase;color:var(--text-muted);margin-bottom:14px\">\u0421\u043e\u0446\u043c\u0435\u0440\u0435\u0436\u0456</div><div style=\"display:flex;flex-direction:column;gap:10px\">"+tgLine+igLine+"</div></div>";
  }

  var _shopTarget = s.sellerId || (s.uid ? 'uid:'+s.uid : null);
  var shopBlock = _shopTarget ? (
    "<div style=\"background:var(--brand-dim);border:1px solid rgba(0,200,83,.25);border-radius:16px;padding:22px\">" +
    "<div style=\"font-size:11px;font-weight:700;text-transform:uppercase;color:var(--brand);margin-bottom:10px\">" +
    "<i class=\"fa-solid fa-store\" style=\"margin-right:5px\"></i>Пов'язаний магазин</div>" +
    "<p style=\"font-size:13px;color:var(--text-muted);margin-bottom:12px\">Перегляньте всі оголошення цього продавця</p>" +
    "<button class=\"btn-primary\" style=\"width:100%;padding:11px\" onclick=\"showSellerByUid('" + (s.uid||'') + "')\">Перейти до оголошень →</button>" +
    "</div>"
  ) : "";
  return "<div style=\"display:flex;flex-direction:column;gap:20px\">"+
    "<div style=\"background:var(--card-bg);border:1px solid var(--border);border-radius:16px;padding:24px\">"+
    "<div style=\"font-size:15px;font-weight:700;margin-bottom:12px\"><i class=\"fa-solid fa-circle-info\" style=\"color:var(--brand);margin-right:8px\"></i>\u041f\u0440\u043e \u0441\u0435\u0440\u0432\u0456\u0441</div>"+
    "<p style=\"font-size:14px;line-height:1.8;color:var(--text-muted)\">"+s.desc+"</p></div>"+
    "<div><div style=\"font-size:15px;font-weight:700;margin-bottom:12px\"><i class=\"fa-solid fa-list-check\" style=\"color:var(--brand);margin-right:8px\"></i>\u041f\u043e\u0441\u043b\u0443\u0433\u0438 \u0442\u0430 \u0446\u0456\u043d\u0438</div>"+
    "<div class=\"service-services-list\">"+svcList+"</div></div></div>"+
    "<div style=\"display:flex;flex-direction:column;gap:16px\">"+
    "<div style=\"background:var(--card-bg);border:1px solid var(--border);border-radius:16px;padding:22px;text-align:center\">"+
    "<div style=\"font-size:48px;font-weight:800;color:var(--brand);line-height:1\">"+ratingNum+"</div>"+
    "<div style=\"color:#ffa726;font-size:22px;margin:6px 0\">"+ratingStars+"</div>"+
    "<div style=\"font-size:13px;color:var(--text-muted);margin-bottom:14px\">"+reviewsTxt+"</div>"+
    "<button class=\"btn-outline\" style=\"width:100%;padding:10px\" onclick=\"openSvcReviewForm('"+s.uid+"')\"><i class=\"fa-solid fa-star\" style=\"margin-right:5px\"></i>Залишити відгук</button>"+
    "</div>"+
    "<div id=\"svc-review-form-"+s.uid+"\" style=\"display:none;background:var(--card-bg);border:1px solid var(--border);border-radius:16px;padding:20px\">"+
    "<div style=\"font-size:14px;font-weight:700;margin-bottom:12px\">Ваш відгук</div>"+
    "<div style=\"display:flex;gap:6px;margin-bottom:12px;font-size:28px\" id=\"svc-stars-"+s.uid+"\">"+
    "<span style=\"cursor:pointer;transition:transform .1s\" onclick=\"setSvcStar('"+s.uid+"',1)\">☆</span>"+
    "<span style=\"cursor:pointer;transition:transform .1s\" onclick=\"setSvcStar('"+s.uid+"',2)\">☆</span>"+
    "<span style=\"cursor:pointer;transition:transform .1s\" onclick=\"setSvcStar('"+s.uid+"',3)\">☆</span>"+
    "<span style=\"cursor:pointer;transition:transform .1s\" onclick=\"setSvcStar('"+s.uid+"',4)\">☆</span>"+
    "<span style=\"cursor:pointer;transition:transform .1s\" onclick=\"setSvcStar('"+s.uid+"',5)\">☆</span>"+
    "</div>"+
    "<textarea id=\"svc-review-text-"+s.uid+"\" rows=\"3\" placeholder=\"Розкажіть про досвід з цим сервісом...\" style=\"width:100%;background:var(--dark3);border:1px solid var(--border);border-radius:10px;padding:10px 14px;color:var(--text);font-family:inherit;font-size:14px;outline:none;resize:vertical;margin-bottom:10px\"></textarea>"+
    "<div style=\"display:flex;gap:8px\">"+
    "<button class=\"btn-outline\" style=\"flex:1;padding:10px\" onclick=\"closeSvcReviewForm('"+s.uid+"')\">Скасувати</button>"+
    "<button class=\"btn-primary\" style=\"flex:2;padding:10px\" onclick=\"submitSvcReview('"+s.uid+"')\"><i class=\"fa-solid fa-paper-plane\" style=\"margin-right:6px\"></i>Надіслати</button>"+
    "</div>"+
    "</div>"+
    socialBlock+shopBlock+"</div>";
}

var _svcReviewStars = {};

function openSvcReviewForm(uid) {
  if (!isLoggedIn || !currentUser || !currentUser.uid) {
    showToast('⚠️ Спочатку увійдіть в акаунт'); showPage('profile'); return;
  }
  if (currentUser.uid === uid) {
    showToast('⚠️ Не можна залишити відгук собі'); return;
  }
  var form = document.getElementById('svc-review-form-' + uid);
  if (form) form.style.display = '';
}

function closeSvcReviewForm(uid) {
  var form = document.getElementById('svc-review-form-' + uid);
  if (form) form.style.display = 'none';
}

function setSvcStar(uid, n) {
  _svcReviewStars[uid] = n;
  var starsEl = document.getElementById('svc-stars-' + uid);
  if (!starsEl) return;
  starsEl.querySelectorAll('span').forEach(function(s, i) {
    s.textContent = i < n ? '★' : '☆';
    s.style.color  = i < n ? '#ffa726' : '';
    s.style.transform = i < n ? 'scale(1.1)' : '';
  });
}

function submitSvcReview(uid) {
  if (!isLoggedIn || !currentUser || !currentUser.uid) {
    showToast('⚠️ Спочатку увійдіть в акаунт'); return;
  }
  var stars = _svcReviewStars[uid] || 0;
  if (!stars) { showToast('⚠️ Оберіть оцінку'); return; }
  var textEl = document.getElementById('svc-review-text-' + uid);
  var text = textEl ? textEl.value.trim() : '';
  if (!text) { showToast('⚠️ Напишіть текст відгуку'); return; }
  if (text.length < 10) { showToast('⚠️ Відгук занадто короткий'); return; }

  if (!window._db) return;
  window._db.collection('reviews').add({
    sellerUid:    uid,
    reviewerUid:  currentUser.uid,
    reviewerName: currentUser.name || currentUser.email || '',
    rating:  stars,
    text:    text,
    type:    'service',
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  }).then(function() {
    showToast('✅ Відгук опубліковано!');
    closeSvcReviewForm(uid);
    if (textEl) textEl.value = '';
    setSvcStar(uid, 0);

    _refreshSvcRating(uid, stars);

    if (typeof _loadSellerReviews === 'function') _loadSellerReviews(uid);
  }).catch(function(e) {
    showToast('⚠️ Помилка: ' + e.message);
  });
}

function _refreshSvcRating(uid, newStars) {
  if (!window._db) return;
  window._db.collection('reviews').where('sellerUid', '==', uid).get()
    .then(function(snap) {
      var revs = snap.docs.map(function(d){ return d.data(); });
      var total = revs.length;
      var avg = total > 0
        ? (revs.reduce(function(s,r){ return s+(r.rating||0); }, 0) / total)
        : 0;
      var avgStr = avg > 0 ? avg.toFixed(1) : '—';
      var starsStr = avg > 0
        ? ('★'.repeat(Math.round(avg)) + '☆'.repeat(5-Math.round(avg)))
        : '☆☆☆☆☆';
      var reviewsTxt = total > 0
        ? 'на основі ' + total + ' відгук' + (total===1?'а':total<5?'ів':'ів')
        : 'Поки немає відгуків';

      var form = document.getElementById('svc-review-form-' + uid);
      if (form) {

        var ratingDiv = form.previousElementSibling;
        if (ratingDiv) {
          var numEl = ratingDiv.querySelector('div[style*="font-size:48px"]');
          var starsEl = ratingDiv.querySelector('div[style*="color:#ffa726"]');
          var cntEl = ratingDiv.querySelector('div[style*="font-size:13px"][style*="text-muted"]');
          if (numEl) numEl.textContent = avgStr;
          if (starsEl) starsEl.textContent = starsStr;
          if (cntEl) cntEl.textContent = reviewsTxt;
        }
      }

      var svc = _fbServices.concat(myServices).find(function(x){ return x.uid === uid; });
      if (svc) { svc.rating = avg; svc.reviews = total; }
    }).catch(function(){});
}

function showServiceDetail(id){
  var s=_fbServices.concat(myServices).filter(function(x){return x.id===id;})[0];
  if(!s)return;
  currentServiceId=id;
  document.getElementById("svc-detail-header").innerHTML=_buildSvcDetailHeader(s);
  document.getElementById("svc-detail-body").innerHTML=_buildSvcDetailBody(s);
  document.querySelectorAll(".page").forEach(function(p){p.classList.remove("active");});
  document.getElementById("page-service-detail").classList.add("active");
  window.scrollTo({top:0,behavior:"smooth"});
  _setPath('/service/' + id);
  _updateSEO({ title: s.name, desc: s.desc ? s.desc.slice(0,160) : s.name + ' — сервісний центр у ' + (s.city||''), url: 'https://ridego.com.ua/service/' + id });

  if (window._db && s.uid) {
    window._db.collection('reviews').where('sellerUid', '==', s.uid).get()
      .then(function(snap) {
        var revs = snap.docs.map(function(d){ return d.data(); });
        if (!revs.length) return;
        var total = revs.length;
        var avg = revs.reduce(function(sum, r){ return sum + (r.rating||0); }, 0) / total;
        var avgStr = avg.toFixed(1);
        var starsStr = '★'.repeat(Math.round(avg)) + '☆'.repeat(5-Math.round(avg));
        var reviewsTxt = 'на основі ' + total + ' відгук' + (total===1?'а':total<5?'ів':'ів');

        var form = document.getElementById('svc-review-form-' + s.uid);
        if (form) {
          var ratingDiv = form.previousElementSibling;
          if (ratingDiv) {
            var numEl = ratingDiv.querySelector('div[style*="48px"]');
            var starsEl = ratingDiv.querySelector('div[style*="#ffa726"]');
            var cntEl = ratingDiv.querySelector('div[style*="13px"][style*="text-muted"]');
            if (numEl) numEl.textContent = avgStr;
            if (starsEl) starsEl.textContent = starsStr;
            if (cntEl) cntEl.textContent = reviewsTxt;
          }
        }

        s.rating = +avgStr; s.reviews = total;
      }).catch(function(){});
  }
}

function openAddServiceModal(){
  if(!isLoggedIn){showToast("\u26a0\ufe0f \u0423\u0432\u0456\u0439\u0434\u0456\u0442\u044c \u0449\u043e\u0431 \u0434\u043e\u0434\u0430\u0442\u0438 \u0441\u0435\u0440\u0432\u0456\u0441");showPage("profile");return;}
  _initSvcOblastSelect();
  document.getElementById("svc-add-services-list").innerHTML="";
  addSvcServiceRow();
  document.getElementById("add-service-modal-overlay").style.display="flex";
  document.body.style.overflow="hidden";
}

function closeAddServiceModal(){
  document.getElementById("add-service-modal-overlay").style.display="none";
  document.body.style.overflow="";
}

function onSvcOblastChange(){
  var oblast=document.getElementById("svc-add-oblast").value;
  var citySel=document.getElementById("svc-add-city");
  citySel.innerHTML="<option value=\"\">Оберіть місто...</option>";
  citySel.disabled=!oblast;
  if(!oblast)return;

  var _km={'Місто Київ':'Київ','Місто Севастополь':'Севастополь'};
  if(_km[oblast]){citySel.innerHTML='<option value="'+_km[oblast]+'">'+_km[oblast]+'</option>';citySel.disabled=false;citySel.value=_km[oblast];return;}
  var raions=(UA_GEO[oblast]&&UA_GEO[oblast].raions)||{};
  var allCities=[];
  Object.values(raions).forEach(function(r){r.cities.forEach(function(c){if(allCities.indexOf(c)<0)allCities.push(c);});});
  allCities.sort(function(a,b){return a.localeCompare(b,"uk");});
  allCities.forEach(function(c){var o=document.createElement("option");o.value=c;o.textContent=c;citySel.appendChild(o);});
  citySel.disabled=false;
}
function toggleSvcCat(el){el.classList.toggle("active");}

function addSvcServiceRow(){
  var id=++_svcRowId;
  var row=document.createElement("div");
  row.style.cssText="display:flex;gap:8px;align-items:center";
  row.innerHTML="<input type=\"text\" class=\"form-input\" id=\"svc-row-name-"+id+"\" placeholder=\"\u041d\u0430\u0437\u0432\u0430 \u043f\u043e\u0441\u043b\u0443\u0433\u0438\" style=\"flex:2\"><input type=\"text\" class=\"form-input\" id=\"svc-row-price-"+id+"\" placeholder=\"\u0426\u0456\u043d\u0430\" style=\"flex:1\"><button onclick=\"this.parentElement.remove()\" style=\"background:none;border:none;color:var(--text-muted);cursor:pointer;font-size:18px;padding:4px;flex-shrink:0\">\u00d7</button>";
  document.getElementById("svc-add-services-list").appendChild(row);
}

function submitService(){
  var name=document.getElementById("svc-add-name")?document.getElementById("svc-add-name").value.trim():"";
  var phone=document.getElementById("svc-add-phone")?document.getElementById("svc-add-phone").value.trim():"";
  var city=document.getElementById("svc-add-city")?document.getElementById("svc-add-city").value:"";
  var oblast=document.getElementById("svc-add-oblast")?document.getElementById("svc-add-oblast").value:"";
  if(!name){showToast("\u26a0\ufe0f \u0412\u0432\u0435\u0434\u0456\u0442\u044c \u043d\u0430\u0437\u0432\u0443");return;}
  if(!phone){showToast("\u26a0\ufe0f \u0412\u0432\u0435\u0434\u0456\u0442\u044c \u0442\u0435\u043b\u0435\u0444\u043e\u043d");return;}
  if(!city){showToast("\u26a0\ufe0f \u041e\u0431\u0435\u0440\u0456\u0442\u044c \u043c\u0456\u0441\u0442\u043e");return;}
  var cats=Array.from(document.querySelectorAll("#svc-add-cats .pill.active")).map(function(p){return p.dataset.cat;});
  if(!cats.length){showToast("\u26a0\ufe0f \u041e\u0431\u0435\u0440\u0456\u0442\u044c \u0442\u0438\u043f");return;}
  var svcRows=[];
  document.querySelectorAll("#svc-add-services-list > div").forEach(function(row){
    var inputs=row.querySelectorAll("input");
    var n=inputs[0]?inputs[0].value.trim():"",p=inputs[1]?inputs[1].value.trim():"";
    if(n)svcRows.push({name:n,desc:"",price:p||"\u0417\u0430 \u0434\u043e\u043c\u043e\u0432\u043b\u0435\u043d\u0456\u0441\u0442\u044e"});
  });
  var icon=cats.indexOf("\u0412\u0435\u043b\u043e\u0441\u0438\u043f\u0435\u0434\u0438")>=0?"\ud83d\udeb2":cats.indexOf("\u0415\u043b\u0435\u043a\u0442\u0440\u043e\u0441\u043a\u0443\u0442\u0435\u0440\u0438")>=0?"\ud83d\udef5":"\ud83d\udd27";
  var newSvc={
    id:"user-"+Date.now(),name:name,icon:icon,coverColor:"#1a1a1a",cats:cats,city:city,oblast:oblast,
    address:document.getElementById("svc-add-address")?document.getElementById("svc-add-address").value.trim():"",
    hours:document.getElementById("svc-add-hours")?document.getElementById("svc-add-hours").value.trim():"",
    phone:phone,
    telegram:document.getElementById("svc-add-telegram")?document.getElementById("svc-add-telegram").value.trim():"",
    instagram:document.getElementById("svc-add-instagram")?document.getElementById("svc-add-instagram").value.trim():"",
    desc:document.getElementById("svc-add-desc")?document.getElementById("svc-add-desc").value.trim():"\u0421\u0435\u0440\u0432\u0456\u0441\u043d\u0438\u0439 \u0446\u0435\u043d\u0442\u0440",
    badge:null,badgeLabel:null,sellerId:null,rating:0,reviews:0,services:svcRows
  };
  myServices.unshift(newSvc);
  closeAddServiceModal();
  showToast("\u2705 \u0421\u0435\u0440\u0432\u0456\u0441 \u043e\u043f\u0443\u0431\u043b\u0456\u043a\u043e\u0432\u0430\u043d\u043e!");
  filterServices();
}

function getSellerService(sellerId){
  return _fbServices.concat(myServices).filter(function(s){return s.sellerId===sellerId;})[0]||null;
}

var _editingSvc = null;
var _mysvcRowId = 0;
var CATS_LIST = [
  {key:"Електросамокати", label:"\u26a1 Самокати"},
  {key:"Велосипеди",      label:"🚲 Велосипеди"},
  {key:"Електровелосипеди", label:"🔋 Е-байки"},
  {key:"Електроскутери", label:"🛵 Скутери"},
  {key:"Електромотоцикли", label:"🏍 Мотоцикли"},
  {key:"Акумулятори",    label:"🔋 Акумулятори"},
];

function renderMyServiceTab() {
  var el = document.getElementById("ptab-myservice-inner");
  if (!el) return;

  var userSvcs = myServices.filter(function(s){ return s._isOwn; });

  if (!userSvcs.length) {
    el.innerHTML = _mysvcEmptyState();
    return;
  }

  var html = '<div style="display:flex;flex-direction:column;gap:16px">';
  userSvcs.forEach(function(s) {
    html += _mysvcCard(s);
  });
  html += '<button class="mysvc-add-row-btn" style="margin-top:8px;font-size:14px;padding:13px" onclick="openMysvcEditor(null)">'
    + '<i class="fa-solid fa-plus"></i> Додати ще один сервіс'
    + '</button></div>';
  el.innerHTML = html;
}

function _mysvcEmptyState() {
  return '<div style="text-align:center;padding:48px 24px">'
    + '<div style="font-size:56px;margin-bottom:16px">🔧</div>'
    + '<div style="font-size:20px;font-weight:800;margin-bottom:8px">Ще немає сервісу</div>'
    + '<p style="color:var(--text-muted);margin-bottom:24px;font-size:14px">Додайте свій сервісний центр — він з\'явиться в каталозі сервісів та на вашій сторінці магазину</p>'
    + '<button class="btn-primary" style="padding:13px 32px;font-size:15px" onclick="openMysvcEditor(null)">'
    + '<i class="fa-solid fa-plus" style="margin-right:8px"></i>Додати сервіс'
    + '</button></div>';
}

function _mysvcCard(s) {
  var stars = s.rating > 0 ? "\u2605".repeat(Math.round(s.rating)) : "";
  var cats  = s.cats.map(function(c){return '<span class="service-cat-tag">'+c+'</span>';}).join("");
  var svcPreview = _renderSvcPreview(s.services);

  return '<div class="mysvc-hero" style="flex-direction:column;align-items:stretch">'
    + '<div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px">'
    + '<div class="mysvc-hero-left">'
    + '<div class="mysvc-hero-icon">'+s.icon+'</div>'
    + '<div><div class="mysvc-hero-title">'+s.name+'</div>'
    + '<div class="mysvc-hero-meta"><i class="fa-solid fa-location-dot" style="margin-right:5px;color:var(--brand)"></i>'+s.city+(s.address?', '+s.address:'')+'</div>'
    + (s.hours?'<div class="mysvc-hero-meta"><i class="fa-solid fa-clock" style="margin-right:5px;color:var(--brand)"></i>'+s.hours+'</div>':'')
    + '</div></div>'
    + '<div style="display:flex;gap:10px;flex-wrap:wrap">'
    + '<button class="btn-outline" style="padding:9px 18px;font-size:13px" onclick="showServiceDetail(\''+s.id+'\')"><i class="fa-solid fa-eye" style="margin-right:6px"></i>Переглянути</button>'
    + '<button class="btn-primary" style="padding:9px 18px;font-size:13px" onclick="openMysvcEditor(\''+s.id+'\')"><i class="fa-solid fa-pen" style="margin-right:6px"></i>Редагувати</button>'
    + '</div></div>'
    + '<div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:12px">'+cats+'</div>'
    + '<div class="service-card-services" style="margin-top:12px">'+svcPreview+'</div>'
    + (s.services.length>3?'<div style="font-size:12px;color:var(--text-muted);margin-top:4px">+ще '+(s.services.length-3)+' послуги</div>':'')
    + '</div>';
}

function openMysvcEditor(id) {
  var s = id ? _fbServices.concat(myServices).filter(function(x){return x.id===id;})[0] : null;
  _editingSvc = s;

  var el = document.getElementById("ptab-myservice-inner");
  if (!el) return;

  var oblastOpts = '<option value="">\u041e\u0431\u0435\u0440\u0456\u0442\u044c \u043e\u0431\u043b\u0430\u0441\u0442\u044c...</option>';
  Object.keys(UA_GEO).sort(function(a,b){return a.localeCompare(b,"uk");}).forEach(function(name){
    var sel = (s && s.oblast === name) ? ' selected' : '';
    oblastOpts += '<option value="'+name+'"'+sel+'>'+name+'</option>';
  });

  var catsHtml = CATS_LIST.map(function(cat){
    var active = (s && s.cats.indexOf(cat.key)>=0) ? ' active' : '';
    return '<button type="button" class="mysvc-cat-pill'+active+'" data-cat="'+cat.key+'" onclick="toggleMysvcCatPill(this)">'
      +cat.label+'</button>';
  }).join(' ');

  var badgeOpts = [
    {v:'', l:'Без значка'},
    {v:'official', l:'\🟢 Офіційний сервіс'},
    {v:'verified', l:'\🟣 Перевірений'},
  ].map(function(o){
    var sel = (s && s.badge===o.v) || (!s && o.v==='') ? ' selected' : '';
    return '<option value="'+o.v+'"'+sel+'>'+o.l+'</option>';
  }).join('');

  _mysvcRowId = 0;
  var svcRowsHtml = '';
  if (s && s.services && s.services.length) {
    var initCats = _normalizeSvcs(s.services);
    initCats.forEach(function(catObj, idx){ svcRowsHtml += _mysvcCatBlock(catObj, idx); });
  }

  var cityOpts = '<option value="">\u041e\u0431\u0435\u0440\u0456\u0442\u044c \u043c\u0456\u0441\u0442\u043e...</option>';
  if (s && s.oblast && UA_GEO[s.oblast]) {
    var raions = UA_GEO[s.oblast].raions || {};
    var cities = [];
    Object.values(raions).forEach(function(r){r.cities.forEach(function(ci){if(cities.indexOf(ci)<0)cities.push(ci);});});
    cities.sort(function(a,b){return a.localeCompare(b,'uk');});
    // Нормалізуємо апостроф для порівняння
    var normalizeApos = function(str){ return str ? str.replace(/[\u2019\u0027\u2018\u02bc]/g, "\u2019") : str; };
    var savedCity = normalizeApos(s.city || '');
    cities.forEach(function(ci){
      var sel = (normalizeApos(ci) === savedCity) ? ' selected' : '';
      cityOpts += '<option value="'+ci+'"'+sel+'>'+ci+'</option>';
    });
  }

  var isNew = !id;
  el.innerHTML = '<div style="max-width:720px">'

    + '<div style="display:flex;align-items:center;gap:12px;margin-bottom:24px">'
    + (isNew ? '' : '<button class="btn-outline" style="padding:8px 14px;font-size:13px" onclick="renderMyServiceTab()"><i class="fa-solid fa-arrow-left"></i></button>')
    + '<div><div style="font-size:20px;font-weight:800">'+(isNew?'🔧 Новий сервіс':'\u270f\ufe0f \u0420\u0435\u0434\u0430\u0433\u0443\u0432\u0430\u0442\u0438 \u0441\u0435\u0440\u0432\u0456\u0441')+'</div>'
    + '<div style="font-size:13px;color:var(--text-muted)">'+(isNew?'\u0417\u0430\u043f\u043e\u0432\u043d\u0456\u0442\u044c \u0456\u043d\u0444\u043e\u0440\u043c\u0430\u0446\u0456\u044e \u0456 \u043e\u043f\u0443\u0431\u043b\u0456\u043a\u0443\u0439\u0442\u0435':'\u0412\u043d\u0435\u0441\u0456\u0442\u044c \u0437\u043c\u0456\u043d\u0438 \u0456 \u0437\u0431\u0435\u0440\u0435\u0436\u0456\u0442\u044c')+'</div></div></div>'

    + '<div class="mysvc-section">'
    + '<div class="mysvc-section-title"><i class="fa-solid fa-circle-info"></i> \u041e\u0441\u043d\u043e\u0432\u043d\u0430 \u0456\u043d\u0444\u043e\u0440\u043c\u0430\u0446\u0456\u044f</div>'
    + '<div class="form-group"><label>\u041d\u0430\u0437\u0432\u0430 \u0441\u0435\u0440\u0432\u0456\u0441\u0443 *</label>'
    + '<input type="text" class="form-input" id="mysvc-name" placeholder="\u041d\u0430\u043f\u0440\u0438\u043a\u043b\u0430\u0434: ScooterFix \u041a\u0438\u0457\u0432" value="'+(s?s.name:'')+'"></div>'
    + '<div class="form-group"><label>\u041e\u043f\u0438\u0441 \u0441\u0435\u0440\u0432\u0456\u0441\u0443</label>'
    + '<textarea class="form-input" id="mysvc-desc" rows="3" placeholder="\u0420\u043e\u0437\u043a\u0430\u0436\u0456\u0442\u044c \u043f\u0440\u043e \u0434\u043e\u0441\u0432\u0456\u0434, \u0433\u0430\u0440\u0430\u043d\u0442\u0456\u0457, \u0441\u043f\u0435\u0446\u0456\u0430\u043b\u0456\u0437\u0430\u0446\u0456\u044e...">'+(s?s.desc:'')+'</textarea></div>'
    + '<div class="form-group"><label>\u0417\u043d\u0430\u0447\u043e\u043a / \u0441\u0442\u0430\u0442\u0443\u0441</label>'
    + '<select class="form-input" id="mysvc-badge">'+badgeOpts+'</select></div>'
    + '</div>'

    + '<div class="mysvc-section">'
    + '<div class="mysvc-section-title"><i class="fa-solid fa-tags"></i> \u0422\u0438\u043f\u0438 \u0442\u0440\u0430\u043d\u0441\u043f\u043e\u0440\u0442\u0443</div>'
    + '<div style="display:flex;flex-wrap:wrap;gap:8px" id="mysvc-cats">'+catsHtml+'</div>'
    + '</div>'

    + '<div class="mysvc-section">'
    + '<div class="mysvc-section-title"><i class="fa-solid fa-location-dot"></i> \u041c\u0456\u0441\u0446\u0435\u0437\u043d\u0430\u0445\u043e\u0434\u0436\u0435\u043d\u043d\u044f</div>'
    + '<div class="form-row">'
    + '<div class="form-group" style="margin-bottom:0"><label>\u041e\u0431\u043b\u0430\u0441\u0442\u044c *</label>'
    + '<select class="form-input" id="mysvc-oblast" onchange="onMysvcOblastChange()">'+oblastOpts+'</select></div>'
    + '<div class="form-group" style="margin-bottom:0"><label>\u041c\u0456\u0441\u0442\u043e *</label>'
    + '<select class="form-input" id="mysvc-city" '+(s&&s.city?'':'disabled')+'>'+(s&&s.city?cityOpts:'<option value="">\u0421\u043f\u043e\u0447\u0430\u0442\u043a\u0443 \u043e\u0431\u043b\u0430\u0441\u0442\u044c</option>')+'</select></div>'
    + '</div>'
    + '<div class="form-group" style="margin-top:12px"><label>\u0410\u0434\u0440\u0435\u0441\u0430</label>'
    + '<input type="text" class="form-input" id="mysvc-address" placeholder="\u0432\u0443\u043b. \u0425\u0440\u0435\u0449\u0430\u0442\u0438\u043a 1" value="'+(s?s.address:'')+'"></div>'
    + '<div class="form-group"><label>\u0413\u0440\u0430\u0444\u0456\u043a \u0440\u043e\u0431\u043e\u0442\u0438</label>'
    + '<input type="text" class="form-input" id="mysvc-hours" placeholder="\u041f\u043d\u2013\u041f\u0442 9:00\u201318:00, \u0421\u0431 10:00\u201316:00" value="'+(s?s.hours:'')+'"></div>'
    + '</div>'

    + '<div class="mysvc-section">'
    + '<div class="mysvc-section-title"><i class="fa-solid fa-phone"></i> \u041a\u043e\u043d\u0442\u0430\u043a\u0442\u0438</div>'
    + '<div class="form-group"><label>\u0422\u0435\u043b\u0435\u0444\u043e\u043d *</label>'
    + '<input type="tel" class="form-input" id="mysvc-phone" placeholder="+380 67 000 00 00" value="'+(s?s.phone:'')+'"></div>'
    + '<div class="form-row">'
    + '<div class="form-group" style="margin-bottom:0"><label>Telegram</label>'
    + '<input type="text" class="form-input" id="mysvc-telegram" placeholder="@myservice" value="'+(s&&s.telegram?s.telegram:'')+'"></div>'
    + '<div class="form-group" style="margin-bottom:0"><label>Instagram</label>'
    + '<input type="text" class="form-input" id="mysvc-instagram" placeholder="@myservice" value="'+(s&&s.instagram?s.instagram:'')+'"></div>'
    + '</div></div>'

    + '<div class="mysvc-section">'
    + '<div class="mysvc-section-title"><i class="fa-solid fa-list-check"></i> \u041f\u043e\u0441\u043b\u0443\u0433\u0438 \u0442\u0430 \u0446\u0456\u043d\u0438</div>'
    + '<div style="display:grid;grid-template-columns:1fr 140px 120px 32px;gap:8px;margin-bottom:8px;padding:0 4px">'
    + '<span style="font-size:11px;font-weight:700;color:var(--text-muted);text-transform:uppercase">\u041d\u0430\u0437\u0432\u0430</span>'
    + '<span style="font-size:11px;font-weight:700;color:var(--text-muted);text-transform:uppercase">\u041e\u043f\u0438\u0441</span>'
    + '<span style="font-size:11px;font-weight:700;color:var(--text-muted);text-transform:uppercase">\u0426\u0456\u043d\u0430</span>'
    + '<span></span></div>'
    + '<div id="mysvc-services-list">'+svcRowsHtml+'</div>'
    + '<button type="button" class="mysvc-add-row-btn" onclick="addMysvcCategory()" style="margin-top:4px"><i class="fa-solid fa-folder-plus" style="margin-right:6px"></i>\u0414\u043e\u0434\u0430\u0442\u0438 \u0440\u043e\u0437\u0434\u0456\u043b</button>'
    + '</div>'

    + '<div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-top:8px">'
    + '<button type="button" class="mysvc-save-btn" onclick="saveMysvc()">'
    + '<i class="fa-solid fa-check"></i>'+(isNew?'\u041e\u043f\u0443\u0431\u043b\u0456\u043a\u0443\u0432\u0430\u0442\u0438':'\u0417\u0431\u0435\u0440\u0435\u0433\u0442\u0438 \u0437\u043c\u0456\u043d\u0438')+'</button>'
    + (!isNew ? '<button type="button" class="mysvc-delete-btn" onclick="deleteMysvc(\''+id+'\')"><i class="fa-solid fa-trash" style="margin-right:6px"></i>\u0412\u0438\u0434\u0430\u043b\u0438\u0442\u0438 \u0441\u0435\u0440\u0432\u0456\u0441</button>' : '')
    + '<button type="button" class="btn-outline" style="padding:13px 20px" onclick="renderMyServiceTab()">\u0421\u043a\u0430\u0441\u0443\u0432\u0430\u0442\u0438</button>'
    + '</div></div>';
}

function _mysvcServiceRow(sv) {
  var id = ++_mysvcRowId;
  return '<div class="mysvc-service-row" id="mysvc-row-'+id+'">'
    + '<input type="text" class="form-input" id="mysvc-sname-'+id+'" placeholder="\u041d\u0430\u0437\u0432\u0430 \u043f\u043e\u0441\u043b\u0443\u0433\u0438" value="'+(sv.name||'')+'">'
    + '<input type="text" class="form-input mysvc-desc-input" id="mysvc-sdesc-'+id+'" placeholder="\u041e\u043f\u0438\u0441 (\u043d\u0435\u043e\u0431\u043e\u0432\u2019\u044f\u0437\u043a\u043e\u0432\u043e)" value="'+(sv.desc||'')+'">'
    + '<input type="text" class="form-input" id="mysvc-sprice-'+id+'" placeholder="\u0426\u0456\u043d\u0430" value="'+(sv.price||'')+'">'
    + '<button type="button" onclick="document.getElementById(\'mysvc-row-'+id+'\').remove()" '
    + 'style="background:none;border:none;color:var(--text-muted);cursor:pointer;font-size:18px;width:32px;height:32px;display:flex;align-items:center;justify-content:center;border-radius:8px;transition:all .2s;flex-shrink:0"'
    + ' onmouseover="this.style.background=\'rgba(255,71,87,.1)\';this.style.color=\'#ff4757\'"'
    + ' onmouseout="this.style.background=\'none\';this.style.color=\'var(--text-muted)\'">\u00d7</button>'
    + '</div>';

  if (s) setTimeout(_syncCatBlocksWithPills, 0);
}

function addMysvcRow() {
  var list = document.getElementById("mysvc-services-list");
  if (!list) return;
  var div = document.createElement("div");
  div.innerHTML = _mysvcServiceRow({name:"",desc:"",price:""});
  list.appendChild(div.firstChild);
}

function _normalizeSvcs(services) {
  if (!services || !services.length) return [{cat:"", items:[{name:"",price:""}]}];
  if (services[0] && typeof services[0].cat !== "undefined") return services;
  return [{cat:"", items: services.map(function(sv){return {name:sv.name||"", price:sv.price||""};})}];
}

function _mysvcItemRow(item) {
  var id = ++_mysvcRowId;
  var hasPrice = item.price && item.price.trim();
  return '<div class="mysvc-service-row" id="mysvc-row-'+id+'">'
    + '<input type="text" class="form-input" id="mysvc-sname-'+id+'" '
    + 'placeholder="\u041d\u0430\u0437\u0432\u0430 \u043f\u043e\u0441\u043b\u0443\u0433\u0438" '
    + 'value="'+(item.name||'')+'" style="font-size:13px">'
    + '<div class="mysvc-price-wrap">'
    + '<input type="text" class="form-input" id="mysvc-sprice-'+id+'" '
    + 'placeholder="\u0426\u0456\u043d\u0430" '
    + 'value="'+(item.price||'')+'" '
    + 'oninput="formatMysvcPrice(this)" '
    + 'style="font-size:13px">'
    + '<span class="mysvc-price-suffix" id="mysvc-suffix-'+id+'" '
    + 'style="display:'+(hasPrice?'block':'none')+';">\u0433\u0440\u043d</span>'
    + '</div>'
    + '<button type="button" onclick="document.getElementById(\'mysvc-row-'+id+'\').remove()" '
    + 'style="background:none;border:none;color:var(--text-muted);cursor:pointer;font-size:18px;width:30px;height:30px;display:flex;align-items:center;justify-content:center;border-radius:6px;transition:all .2s;flex-shrink:0" '
    + 'onmouseover="this.style.background=\'rgba(255,71,87,.1)\';this.style.color=\'#ff4757\'" '
    + 'onmouseout="this.style.background=\'none\';this.style.color=\'var(--text-muted)\'">×</button>'
    + '</div>';
}

function _mysvcCatBlock(catObj, catIdx) {
  var rowsHtml = ((catObj && catObj.items) || [{name:"",price:""}]).map(function(item){
    return _mysvcItemRow(item);
  }).join("");
  var uid = "mysvc-cat-"+(++_mysvcRowId)+"-"+catIdx;
  return '<div class="mysvc-cat-block" id="'+uid+'">'
    + '<div class="mysvc-cat-header">'
    + '<i class="fa-solid fa-layer-group" style="color:var(--brand);font-size:12px;flex-shrink:0"></i>'
    + '<input type="text" class="mysvc-cat-name-input" '
    + 'placeholder="\u041d\u0430\u0437\u0432\u0430 \u0440\u043e\u0437\u0434\u0456\u043b\u0443 (\u043d\u0430\u043f\u0440.: \u0421\u0435\u0440\u0432\u0456\u0441 \u0441\u0430\u043c\u043e\u043a\u0430\u0442\u0456\u0432)" '
    + 'value="'+(catObj&&catObj.cat||'')+'">'
    + '<button type="button" onclick="this.closest(\'.mysvc-cat-block\').remove()" '
    + 'title="\u0412\u0438\u0434\u0430\u043b\u0438\u0442\u0438 \u0440\u043e\u0437\u0434\u0456\u043b" '
    + 'style="background:none;border:none;color:var(--text-muted);cursor:pointer;font-size:16px;padding:2px 6px;border-radius:6px;transition:color .2s;flex-shrink:0" '
    + 'onmouseover="this.style.color=\'#ff4757\'" onmouseout="this.style.color=\'var(--text-muted)\'">×</button>'
    + '</div>'
    + '<div class="mysvc-cat-rows" id="'+uid+'-rows">'+rowsHtml+'</div>'
    + '<div style="padding:0 12px 10px">'
    + '<button type="button" onclick="addMysvcItemRow(\''+uid+'-rows\')" '
    + 'style="background:none;border:1.5px dashed var(--border);color:var(--text-muted);border-radius:8px;padding:6px 14px;font-size:12px;font-weight:600;cursor:pointer;font-family:\'Inter\',sans-serif;width:100%;transition:all .2s" '
    + 'onmouseover="this.style.borderColor=\'var(--brand)\';this.style.color=\'var(--brand)\'" '
    + 'onmouseout="this.style.borderColor=\'var(--border)\';this.style.color=\'var(--text-muted)\'">'
    + '<i class="fa-solid fa-plus" style="margin-right:5px"></i>\u0414\u043e\u0434\u0430\u0442\u0438 \u043f\u043e\u0441\u043b\u0443\u0433\u0443</button>'
    + '</div></div>';
}

function formatMysvcPrice(input) {
  var id = input.id.replace("mysvc-sprice-", "");
  var suffix = document.getElementById("mysvc-suffix-"+id);
  if (!suffix) return;
  var val = input.value.trim();

  suffix.style.display = val ? "block" : "none";

}

function addMysvcItemRow(containerId) {
  var container = document.getElementById(containerId);
  if (!container) return;
  var div = document.createElement("div");
  div.innerHTML = _mysvcItemRow({name:"",price:""});
  container.appendChild(div.firstChild);
}

function addMysvcCategory() {
  var list = document.getElementById("mysvc-services-list");
  if (!list) return;
  var catIdx = list.querySelectorAll(".mysvc-cat-block").length;
  var div = document.createElement("div");
  div.innerHTML = _mysvcCatBlock({cat:"", items:[{name:"",price:""}]}, catIdx);
  list.appendChild(div.firstChild);
  var newBlock = list.lastElementChild;
  if (newBlock) {
    var inp = newBlock.querySelector(".mysvc-cat-name-input");
    if (inp) inp.focus();
  }
}

function _collectMysvcServices() {
  var result = [];
  document.querySelectorAll("#mysvc-services-list .mysvc-cat-block").forEach(function(block) {
    var catInp = block.querySelector(".mysvc-cat-name-input");
    var catName = catInp ? catInp.value.trim() : "";
    var items = [];
    block.querySelectorAll(".mysvc-service-row").forEach(function(row) {
      var id = row.id.replace("mysvc-row-","");
      var name  = (document.getElementById("mysvc-sname-"+id)||{value:""}).value.trim();
      var price = (document.getElementById("mysvc-sprice-"+id)||{value:""}).value.trim();
      if (name) {

        if (price && /^\d/.test(price) && !/\u0433\u0440\u043d|\u20ac|\$|%|\u0431\u0435\u0437/.test(price)) {
          price = price + " \u0433\u0440\u043d";
        }
        items.push({name:name, price:price||"\u0417\u0430 \u0434\u043e\u043c\u043e\u0432\u043b\u0435\u043d\u0456\u0441\u0442\u044e"});
      }
    });
    if (items.length) result.push({cat: catName, items: items});
  });
  return result;
}

function _renderSvcPreview(services) {
  var cats = _normalizeSvcs(services);
  var all = [];
  cats.forEach(function(c){ (c.items||[]).forEach(function(i){ all.push(i); }); });
  return all.slice(0,3).map(function(item){
    return '<div class="svc-item"><span class="svc-item-name">'+(item.name||"")+'</span>'
      +'<span class="svc-item-price">'+(item.price||"")+'</span></div>';
  }).join("")
  + (all.length>3?'<div style="font-size:11px;color:var(--text-muted);margin-top:4px">+\u0449\u0435 '+(all.length-3)+' \u043f\u043e\u0441\u043b\u0443\u0433\u0438</div>':"");
}

function _renderSvcList(services) {
  var cats = _normalizeSvcs(services);
  return cats.map(function(catObj){
    var hdr = catObj.cat
      ? '<div style="font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.5px;color:var(--brand);padding:10px 18px 4px;margin-top:2px">'+catObj.cat+'</div>'
      : "";
    var rows = (catObj.items||[]).map(function(item){
      return '<div class="svc-list-item"><div><div class="svc-list-name">'+(item.name||"")+'</div></div>'
        +'<div class="svc-list-price">'+(item.price||"")+'</div></div>';
    }).join("");
    return hdr+rows;
  }).join("");
}

function toggleMysvcCatPill(btn) {
  btn.classList.toggle("active");
  _syncCatBlocksWithPills();
}

function _syncCatBlocksWithPills() {
  var list = document.getElementById("mysvc-services-list");
  if (!list) return;
  hideMysvcHint();

  var activeCats = [];
  CATS_LIST.forEach(function(cat) {
    var pill = document.querySelector("#mysvc-cats [data-cat=\""+cat.key+"\"]");
    if (pill && pill.classList.contains("active")) {
      activeCats.push({key: cat.key, label: cat.label});
    }
  });

  var existing = {};
  list.querySelectorAll(".mysvc-cat-block").forEach(function(block) {
    var inp = block.querySelector(".mysvc-cat-name-input");
    var name = inp ? inp.value.trim() : "";
    existing[name] = block;
  });

  var autoCatNames = CATS_LIST.map(function(c){ return c.key; });

  activeCats.forEach(function(cat, i) {
    if (!existing[cat.key]) {

      var div = document.createElement("div");
      div.innerHTML = _mysvcCatBlock({cat: cat.key, items:[{name:"",price:""}]}, Date.now()+i);
      var newBlock = div.firstChild;

      newBlock.setAttribute("data-auto-cat", cat.key);

      var manualBlocks = Array.from(list.querySelectorAll(".mysvc-cat-block")).filter(function(b){
        return !b.getAttribute("data-auto-cat") ||
               autoCatNames.indexOf((b.querySelector(".mysvc-cat-name-input")||{value:""}).value.trim()) < 0;
      });
      if (manualBlocks.length > 0) {
        list.insertBefore(newBlock, manualBlocks[0]);
      } else {
        list.appendChild(newBlock);
      }
    }
  });

  list.querySelectorAll(".mysvc-cat-block").forEach(function(block) {
    var inp = block.querySelector(".mysvc-cat-name-input");
    var name = inp ? inp.value.trim() : "";
    var isAutoCat = autoCatNames.indexOf(name) >= 0;
    if (isAutoCat) {

      var isActive = activeCats.some(function(c){ return c.key === name; });
      if (!isActive) {

        var hasContent = false;
        block.querySelectorAll(".mysvc-service-row").forEach(function(row){
          var id = row.id.replace("mysvc-row-","");
          var val = (document.getElementById("mysvc-sname-"+id)||{value:""}).value.trim();
          if (val) hasContent = true;
        });
        if (!hasContent) block.remove();
      }
    }
  });
}

function hideMysvcHint() {
  var h = document.getElementById("mysvc-svc-hint");
  if (h) h.style.display = "none";
}

function onMysvcOblastChange() {
  var oblast  = document.getElementById("mysvc-oblast").value;
  var citySel = document.getElementById("mysvc-city");
  var prevCity = citySel.value; // зберегти поточне місто
  citySel.innerHTML = '<option value="">\u041e\u0431\u0435\u0440\u0456\u0442\u044c \u043c\u0456\u0441\u0442\u043e...</option>';
  citySel.disabled = !oblast;
  if (!oblast) return;
  var raions = (UA_GEO[oblast] && UA_GEO[oblast].raions) || {};
  var cities = [];
  Object.values(raions).forEach(function(r){ r.cities.forEach(function(ci){ if(cities.indexOf(ci)<0) cities.push(ci); }); });
  cities.sort(function(a,b){ return a.localeCompare(b,'uk'); });
  cities.forEach(function(ci){
    var o = document.createElement("option"); o.value = ci; o.textContent = ci;
    citySel.appendChild(o);
  });
  citySel.disabled = false;
  // Відновити попереднє місто якщо воно є в новому списку
  if (prevCity && cities.indexOf(prevCity) >= 0) {
    citySel.value = prevCity;
  }
}

function saveMysvc() {
  var name   = (document.getElementById("mysvc-name")||{}).value;
  var phone  = (document.getElementById("mysvc-phone")||{}).value;
  var city   = (document.getElementById("mysvc-city")||{}).value;
  var oblast = (document.getElementById("mysvc-oblast")||{}).value;

  if (!name || !name.trim())  { showToast("\u26a0\ufe0f \u0412\u0432\u0435\u0434\u0456\u0442\u044c \u043d\u0430\u0437\u0432\u0443 \u0441\u0435\u0440\u0432\u0456\u0441\u0443"); return; }
  if (!phone || !phone.trim()){ showToast("\u26a0\ufe0f \u0412\u0432\u0435\u0434\u0456\u0442\u044c \u0442\u0435\u043b\u0435\u0444\u043e\u043d"); return; }
  if (!city)                  { showToast("\u26a0\ufe0f \u041e\u0431\u0435\u0440\u0456\u0442\u044c \u043c\u0456\u0441\u0442\u043e"); return; }

  var cats = Array.from(document.querySelectorAll("#mysvc-cats .mysvc-cat-pill.active")).map(function(p){ return p.dataset.cat; });
  if (!cats.length) { showToast("\u26a0\ufe0f \u041e\u0431\u0435\u0440\u0456\u0442\u044c \u0445\u043e\u0447 \u0431 \u043e\u0434\u0438\u043d \u0442\u0438\u043f \u0442\u0440\u0430\u043d\u0441\u043f\u043e\u0440\u0442\u0443"); return; }

  var svcRows = _collectMysvcServices();
  var badgeSel = document.getElementById("mysvc-badge");
  var badge    = badgeSel ? badgeSel.value : null;
  var BADGE_LABELS = {official:"\u041e\u0444\u0456\u0446\u0456\u0439\u043d\u0438\u0439 \u0441\u0435\u0440\u0432\u0456\u0441", verified:"\u041f\u0435\u0440\u0435\u0432\u0456\u0440\u0435\u043d\u0438\u0439"};

  var icon = cats.indexOf("\u0412\u0435\u043b\u043e\u0441\u0438\u043f\u0435\u0434\u0438")>=0 ? "🚲"
           : cats.indexOf("\u0415\u043b\u0435\u043a\u0442\u0440\u043e\u0441\u043a\u0443\u0442\u0435\u0440\u0438")>=0 ? "🛵"
           : cats.indexOf("\u0410\u043a\u0443\u043c\u0443\u043b\u044f\u0442\u043e\u0440\u0438")>=0 ? "🔋"
           : cats.indexOf("\u0415\u043b\u0435\u043a\u0442\u0440\u043e\u043c\u043e\u0442\u043e\u0446\u0438\u043a\u043b\u0438")>=0 ? "🏍"
           : "🔧";

  if (_editingSvc) {

    _editingSvc.name      = name.trim();
    _editingSvc.desc      = (document.getElementById("mysvc-desc")||{}).value||"";
    _editingSvc.cats      = cats;
    _editingSvc.city      = city;
    _editingSvc.oblast    = oblast;
    _editingSvc.address   = (document.getElementById("mysvc-address")||{}).value||"";
    _editingSvc.hours     = (document.getElementById("mysvc-hours")||{}).value||"";
    _editingSvc.phone     = phone.trim();
    _editingSvc.telegram  = (document.getElementById("mysvc-telegram")||{}).value||"";
    _editingSvc.instagram = (document.getElementById("mysvc-instagram")||{}).value||"";
    _editingSvc.badge     = badge||null;
    _editingSvc.badgeLabel= badge ? BADGE_LABELS[badge] : null;
    _editingSvc.icon      = icon;
    _editingSvc.services  = svcRows;

    if (window._db && _editingSvc.id && currentUser && currentUser.uid) {
      var upd = {
        name:_editingSvc.name, desc:_editingSvc.desc, cats:cats, city:city, oblast:oblast,
        address:_editingSvc.address, hours:_editingSvc.hours, phone:phone.trim(),
        telegram:_editingSvc.telegram, instagram:_editingSvc.instagram,
        badge:badge||null, badgeLabel:badge?BADGE_LABELS[badge]:null, icon:icon, services:svcRows
      };
      window._db.collection('services').doc(_editingSvc.id).update(upd)
        .catch(function(e){ console.error('service update error:', e); });
    }
    showToast("✅ Сервіс оновлено!");
  } else {

    var newSvc = {
      id:         "own-"+Date.now(),
      name:       name.trim(),
      icon:       icon,
      coverColor: "#0a1a0a",
      cats:       cats,
      city:       city,
      oblast:     oblast,
      address:    (document.getElementById("mysvc-address")||{}).value||"",
      hours:      (document.getElementById("mysvc-hours")||{}).value||"",
      phone:      phone.trim(),
      telegram:   (document.getElementById("mysvc-telegram")||{}).value||"",
      instagram:  (document.getElementById("mysvc-instagram")||{}).value||"",
      desc:       (document.getElementById("mysvc-desc")||{}).value||"",
      badge:      badge||null,
      badgeLabel: badge ? BADGE_LABELS[badge] : null,
      sellerId:   null,
      rating:     0,
      reviews:    0,
      services:   svcRows,
      _isOwn:     true,
    };
    if (window._db && currentUser && currentUser.uid) {
      var fbSvc = Object.assign({}, newSvc, {
        uid: currentUser.uid,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      delete fbSvc.id;
      delete fbSvc._isOwn;
      window._db.collection('services').add(fbSvc)
        .then(function(ref) {
          newSvc.id = ref.id;
          newSvc._isOwn = true;
          myServices.unshift(newSvc);
          _fbServices.unshift(newSvc);
          _initSvcCitySelect();
          showToast('✅ Сервіс опубліковано!');
          renderMyServiceTab();
        }).catch(function(e) {
          newSvc._isOwn = true;
          myServices.unshift(newSvc);
          _initSvcCitySelect();
          showToast('✅ Сервіс збережено локально');
          console.error('service save error:', e);
        });
    } else {
      newSvc._isOwn = true;
      myServices.unshift(newSvc);
      _initSvcCitySelect();
      showToast('✅ Сервіс опубліковано!');
    }
  }
  _editingSvc = null;
  renderMyServiceTab();
}

function deleteMysvc(id) {
  if (!confirm("\u0412\u0438\u0434\u0430\u043b\u0438\u0442\u0438 \u0441\u0435\u0440\u0432\u0456\u0441? \u0426\u044e \u0434\u0456\u044e \u043d\u0435\u043c\u043e\u0436\u043b\u0438\u0432\u043e \u0441\u043a\u0430\u0441\u0443\u0432\u0430\u0442\u0438.")) return;
  myServices = myServices.filter(function(s){ return s.id !== id; });
  _initSvcCitySelect();
  showToast("\u2705 \u0421\u0435\u0440\u0432\u0456\u0441 \u0432\u0438\u0434\u0430\u043b\u0435\u043d\u043e");
  renderMyServiceTab();
}

