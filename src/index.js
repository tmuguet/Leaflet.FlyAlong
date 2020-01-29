const L = require('leaflet');

function getLatLngsFlatten(polyline) {
  const latlngs = polyline.getLatLngs();

  if (latlngs.length > 0 && Array.isArray(latlngs[0])) {
    let result = [];

    for (let j = 0; j < latlngs.length; j += 1) {
      result = result.concat(latlngs[j]);
    }

    return result;
  }

  return latlngs;
}

function getLength(points, startIndex, endIndex) {
  const start = startIndex === undefined ? 0 : startIndex;
  const end = endIndex === undefined ? points.length : endIndex;

  let distance = 0;

  for (let i = start + 1; i < end; i += 1) {
    distance += points[i].distanceTo(points[i - 1]); // m
  }
  return distance;
}

function splitByLength(points, distance, startIndex, endIndex) {
  const start = startIndex === undefined ? 0 : startIndex;
  const end = endIndex === undefined ? points.length : endIndex;

  let currentDistance = 0;

  const paths = [];

  for (let i = start + 1; i < end; i += 1) {
    currentDistance += points[i].distanceTo(points[i - 1]); // m

    if (currentDistance >= distance) {
      paths.push(i);
      currentDistance = 0;
    }
  }
  return paths;
}

function closestLatlng(points, latlng) {
  let minDistance = Infinity;
  let minLatlng = null;
  let minIndex = null;

  for (let i = 0; i < points.length; i += 1) {
    const distance = points[i].distanceTo(latlng);
    if (distance < minDistance) {
      minDistance = distance;
      minLatlng = points[i];
      minIndex = i;
    }
  }
  return [minLatlng, minIndex];
}

L.Polyline.include({
  _stop() {
    this._map.off('moveend', this._flyToNext);
  },

  flyTo(targetCenter, targetZoom, options) {
    const _options = options || {};
    if (_options.animate === false || !L.Browser.any3d) {
      return this._map.setView(targetCenter, targetZoom, _options);
    }
    const _targetZoom = targetZoom === undefined ? this._map.getZoom() : targetZoom;
    const duration = _options.duration ? _options.duration : 5;

    const center = this._map.getCenter();
    const points = getLatLngsFlatten(this);

    const [start, startIndex] = closestLatlng(points, center);
    const [end, endIndex] = closestLatlng(points, targetCenter);
    const distance = getLength(points, startIndex, endIndex);
    const indexes = splitByLength(points, distance / (duration * 10), startIndex, endIndex);

    const stepDuration = duration / indexes.length;

    let currentIndex = 0;

    function next() {
      if (currentIndex < indexes.length) {
        const dest = points[indexes[currentIndex]];
        this._map.flyTo(dest, _targetZoom, { easeLinearity: 1, duration: stepDuration });
        currentIndex += 1;
        this._flyToNext = () => next.call(this);
        this._map.once('moveend', this._flyToNext);
      } else {
        this._map.flyTo(end, _targetZoom, { easeLinearity: 1, duration: stepDuration });
      }
    }

    this._map.flyTo(start, _targetZoom, { easeLinearity: 1, duration: stepDuration });
    this._flyToNext = () => next.call(this);
    this._map.once('moveend', this._flyToNext);

    return this;
  },
});
