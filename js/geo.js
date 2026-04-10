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
    var geoData = UA_GEO[oblast];
    if (geoData && geoData.raions && Object.keys(geoData.raions).length > 0) {
      Object.entries(geoData.raions).sort((a,b) => a[0].localeCompare(b[0],"uk")).forEach(([name, data]) => {
        const o = document.createElement("option");
        o.value = name; o.textContent = name;
        o.dataset.lat = data.lat; o.dataset.lng = data.lng;
        raionSel.appendChild(o);
      });
      raionSel.disabled = false;
    } else {
      raionSel.disabled = true;
    }
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

  const mapEl = document.getElementById('detail-map');
  if (!mapEl) return;

  // Повністю очищаємо попередню карту + внутрішній Leaflet стан DOM
  if (detailMapInstance) {
    try { detailMapInstance.remove(); } catch(e) {}
    detailMapInstance = null;
    detailMapMarker   = null;
  }
  // Leaflet зберігає _leaflet_id на DOM елементі — очищаємо
  if (mapEl._leaflet_id) {
    mapEl._leaflet_id = null;
    mapEl.innerHTML = '';
  }

  _loadLeaflet(function() {
    const known = CITY_COORDS[city];
    if (known) {
      _initDetailMap(known.lat, known.lng, city, 12);
    } else {
      _initDetailMap(49.0, 32.0, city, 6);
      fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(city + ', Україна')}&format=json&limit=1&countrycodes=ua`, {
        headers: { 'Accept-Language': 'uk' }
      })
      .then(r => r.json())
      .then(data => {
        if (data[0]) {
          const lat = +data[0].lat, lng = +data[0].lon;
          CITY_COORDS[city] = { lat, lng };
          if (detailMapInstance) {
            detailMapInstance.setView([lat, lng], 13);
            if (detailMapMarker) detailMapMarker.remove();
            detailMapMarker = L.circleMarker([lat, lng], {
              radius:12, fillColor:'#00c853', color:'#fff', weight:3, opacity:1, fillOpacity:.9
            }).bindPopup(`<b>${city}</b>`).addTo(detailMapInstance).openPopup();
          }
        }
      })
      .catch(() => {});
    }
  });
}

function _initDetailMap(lat, lng, label, zoom) {
  detailMapInstance = L.map('detail-map', { zoomControl:true, scrollWheelZoom:false })
    .setView([lat, lng], zoom);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution:'© OpenStreetMap', maxZoom:18
  }).addTo(detailMapInstance);
  if (zoom > 6) {
    detailMapMarker = L.circleMarker([lat, lng], {
      radius:12, fillColor:'#00c853', color:'#fff', weight:3, opacity:1, fillOpacity:.9
    }).bindPopup(`<b>${label}</b>`).addTo(detailMapInstance).openPopup();
  }
  setTimeout(() => detailMapInstance.invalidateSize(), 80);
}

