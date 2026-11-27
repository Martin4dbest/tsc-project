import React from 'react';
import { View } from 'react-native';
import { WebView } from 'react-native-webview';

type Coordinate = {
  latitude: number;
  longitude: number;
};

type Point = Coordinate & {
  recorded_at?: string;
};

type Props = {
  coordinates: Point[];
  latest: Coordinate | null;
};

export default function OSMRouteMap({ coordinates, latest }: Props) {
  const points = JSON.stringify(coordinates);
  const center = latest
    ? [latest.latitude, latest.longitude]
    : [6.5244, 3.3792];

  const html = `
<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<style>
html,body,#map { margin:0; padding:0; width:100%; height:100%; }
</style>
</head>
<body>
<div id="map"></div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
const points = ${points};
const center = ${JSON.stringify(center)};
const map = L.map('map').setView(center, 15);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
  attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

const valid = points.filter(p =>
  Number.isFinite(p.latitude) && Number.isFinite(p.longitude)
);

const latlngs = valid.map(p => [p.latitude, p.longitude]);

if (latlngs.length > 1) {
  L.polyline(latlngs, {
    color: '#F28C28',
    weight: 4
  }).addTo(map);
}

valid.slice(0, -1).forEach(p => {
  L.circleMarker([p.latitude, p.longitude], {
    radius: 5,
    color: '#687789',
    fillColor: '#9AA5B3',
    fillOpacity: 0.8
  }).bindPopup(p.recorded_at || 'Recorded location').addTo(map);
});

if (valid.length) {
  const p = valid[valid.length - 1];

  L.circleMarker([p.latitude, p.longitude], {
    radius: 8,
    color: '#071D49',
    fillColor: '#F28C28',
    fillOpacity: 1
  }).bindPopup(p.recorded_at || 'Latest location').addTo(map);
}

if (latlngs.length > 1) {
  map.fitBounds(latlngs, { padding: [24, 24], maxZoom: 16 });
} else if (latlngs.length === 1) {
  map.setView(latlngs[0], 15);
}
</script>
</body>
</html>`;

  return (
    <View style={{ flex: 1 }}>
      <WebView
        source={{ html }}
        originWhitelist={['*']}
        javaScriptEnabled
        domStorageEnabled
        scrollEnabled={false}
        style={{ flex: 1 }}
      />
    </View>
  );
}
