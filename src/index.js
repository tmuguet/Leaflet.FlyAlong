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

  /**
   * Sets the view of the map (geographical center and zoom) performing a smooth pan-zoom animation along the polyline.
   * @param L.LatLng targetCenter Coordinates to fly to
   * @param Number targetZoom New zoom value (optional)
   * @param Zoom/pan options options Options
   * @returns this
   */
  flyTo(targetCenter, targetZoom, options) {
    /* eslint-disable no-param-reassign */
    options = options || {};
    const startZoom = this._map.getZoom();
    targetZoom = targetZoom === undefined ? startZoom : targetZoom;

    if (options.animate === false || !L.Browser.any3d) {
      return this._map.setView(targetCenter, targetZoom, options);
    }
    const duration = options.duration ? options.duration : 5;

    const startCenter = this._map.getCenter();
    const points = getLatLngsFlatten(this);

    const [startLatLng, startIndex] = closestLatlng(points, startCenter);
    const [endLatLng, endIndex] = closestLatlng(points, targetCenter);
    const flyDistance = getLength(points, startIndex, endIndex);
    const keyframesFlyIndexes = splitByLength(points, flyDistance / (duration * 10), startIndex, endIndex);
    const keyframesNumber = keyframesFlyIndexes.length;

    const zoomStep = (targetZoom - startZoom) / keyframesNumber;
    const keyframesZoomValues = [];
    for (let i = 0; i < keyframesNumber; i += 1) {
      keyframesZoomValues.push(startZoom + zoomStep * i);
    }

    const keyframesDuration = duration / keyframesNumber;

    let currentKeyframe = 0;

    function next() {
      if (currentKeyframe < keyframesNumber) {
        this._map.flyTo(
          points[keyframesFlyIndexes[currentKeyframe]],
          keyframesZoomValues[currentKeyframe],
          { easeLinearity: 1, duration: keyframesDuration },
        );
        currentKeyframe += 1;
        this._flyToNext = () => next.call(this);
        this._map.once('moveend', this._flyToNext);
      } else {
        this._map.flyTo(endLatLng, targetZoom, { easeLinearity: 1, duration: keyframesDuration });
      }
    }

    this._map.flyTo(startLatLng, startZoom, { easeLinearity: 1, duration: keyframesDuration });
    this._flyToNext = () => next.call(this);
    this._map.once('moveend', this._flyToNext);

    return this;
  },
});
