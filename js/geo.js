// ── Географія: CITY_COORDS, UA_OBLASTS, карта, Leaflet ──

  const mapEl = document.getElementById('detail-map');
  if (!mapEl) return;

  if (detailMapInstance) {
    detailMapInstance.remove();
    detailMapInstance = null;
    detailMapMarker   = null;
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


