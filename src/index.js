const L = require('leaflet');

/**
 * Returns a flat array of L.LatLng objects
 * @param L.Polyline polyline Polyline object
 * @returns L.LatLng[] Flat array
 */
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

/**
 * Returns the (estimated) distance of a path in meters.
 * This is not a precise value, it just gives a rough estimate.
 * @param L.LatLng[] points Array of L.LatLng objects
 * @param Number startIndex First index to use in the array (optional, defaults to first element)
 * @param Number endIndex Last index to use in the array (optional, defaults to last element)
 * @returns Number Distance in meters
 */
function getLength(points, startIndex, endIndex) {
  const start = startIndex === undefined ? 0 : startIndex;
  const end = endIndex === undefined ? points.length : endIndex;

  let distance = 0;

  for (let i = start + 1; i < end; i += 1) {
    distance += points[i].distanceTo(points[i - 1]); // m
  }
  return distance;
}

/**
 * Splits a path into multiple segments of equal length
 * @param L.LatLng[] points Array of L.LatLng objects
 * @param Number distance Length of each segments (in meters)
 * @param Number startIndex First index to use in the array (optional, defaults to first element)
 * @param Number endIndex Last index to use in the array (optional, defaults to last element)
 * @returns Number[] List of starting indexes of each segments (starting index not included)
 */
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

/**
 * Returns the point closest to `latlng` in the list `points`.
 * This is a lazy port of L.Polyline.closestLayerPoint to use L.LatLng objects instead of Point.
 * @param L.LatLng[] points Array of L.LatLng objects
 * @param L.LatLng latlng Point
 * @returns [L.LatLng, Number] L.LatLng found in the list and its index in the array
 */
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
  /**
   * Stops animation
   * @returns this
   */
  _stop() {
    this._map.off('moveend', this._flyToNext);
    return this;
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
        this._map.once('moveend', () => this.fire('FlyAlong:moveend'));
      }
    }

    this.fire('FlyAlong:movestart');

    this._map.flyTo(startLatLng, startZoom, { easeLinearity: 1, duration: keyframesDuration });
    this._flyToNext = () => next.call(this);
    this._map.once('moveend', this._flyToNext);

    return this;
  },
});
