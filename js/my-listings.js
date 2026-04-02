// ── Мої оголошення, видалення, поновлення, createMyCard ──
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

