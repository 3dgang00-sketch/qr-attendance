// Haversine formula to calculate distance between two GPS coordinates
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000; // Earth's radius in meters
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  return distance; // in meters
}

function toRad(deg) {
  return deg * (Math.PI / 180);
}

// Validate if student is within geofence
function validateGeofence(studentLat, studentLon, geofenceLat, geofenceLon, radiusMeters) {
  const distance = calculateDistance(studentLat, studentLon, geofenceLat, geofenceLon);
  return {
    isWithin: distance <= radiusMeters,
    distance: Math.round(distance),
    radiusMeters,
  };
}

// Check if point is within polygon (for multiple geofences)
function isPointInPolygon(point, polygon) {
  const { lat, lon } = point;
  let inside = false;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].lat;
    const yi = polygon[i].lon;
    const xj = polygon[j].lat;
    const yj = polygon[j].lon;

    const intersect = ((yi > lon) !== (yj > lon)) &&
      (lat < (xj - xi) * (lon - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }

  return inside;
}

module.exports = {
  calculateDistance,
  validateGeofence,
  isPointInPolygon,
};
