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
  return [minLatlng, minIndex, minDistance];
}

/**
 * Returns the point closest to `latlng` in the list `points`.
 * This is a lazy port of L.Polyline.closestLayerPoint to use L.LatLng objects instead of Point.
 * @param L.LatLng[] points Array of L.LatLng objects
 * @param L.LatLng latlng Point
 * @returns [L.LatLng, Number] L.LatLng found in the list and its index in the array
 */
function closestLayerLatlng(layers, latlng) {
  let minDistance = Infinity;
  let minLatlng = null;
  let minIndex = null;
  let minLayer = null;
  let minLayerIndex = null;

  for (let i = 0; i < layers.length; i += 1) {
    if (layers[i] instanceof L.Polyline) {
      const points = getLatLngsFlatten(layers[i]);
      const [layerMinLatlng, layerMinIndex, layerMinDistance] = closestLatlng(points, latlng);
      if (layerMinDistance < minDistance) {
        minDistance = layerMinDistance;
        minLatlng = layerMinLatlng;
        minIndex = layerMinIndex;
        minLayer = layers[i];
        minLayerIndex = [i];
      }
    } else if (layers[i] instanceof L.FeatureGroup) {
      const sublayers = layers[i].getLayers();
      const [layerMinLayer, layerMinLatlng, layerMinIndex, layerMinDistance] = closestLayerLatlng(sublayers, latlng);
      if (layerMinDistance < minDistance) {
        minDistance = layerMinDistance;
        minLatlng = layerMinLatlng;
        minIndex = layerMinIndex;
        minLayer = layerMinLayer;
        minLayerIndex = [i].concat(layerMinIndex);
      }
    }
  }
  return [minLayer, minLatlng, minIndex, minLayerIndex];
}

L.FeatureGroup.include({
  /**
   * Sets the view of the map (geographical center and zoom) performing a smooth pan-zoom animation along the polyline.
   * @param L.LatLng targetCenter Coordinates to fly to
   * @param Number targetZoom New zoom value (optional)
   * @param Zoom/pan options options Options
   * @returns this
   */
  flyTo(targetCenter, targetZoom, options) {
    const startCenter = this._map.getCenter();

    const layers = this.getLayers();
    // eslint-disable-next-line prefer-const
    // eslint-disable-next-line no-unused-vars
    const [startLayer, startLatLng, startIndex, startLayerIndex] = closestLayerLatlng(layers, startCenter);
    // eslint-disable-next-line prefer-const
    // eslint-disable-next-line no-unused-vars
    const [endLayer, endLatLng, endIndex, endLayerIndex] = closestLayerLatlng(layers, targetCenter);

    if (JSON.stringify(startLayerIndex) === JSON.stringify(endLayerIndex)) {
      startLayer.flyTo(targetCenter, targetZoom, options);
    } else {
      // TODO
      console.log('Not supported yet');
    }

    return this;
  },
});

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
    const startZoom = parseInt(this._map.getZoom());
    targetZoom = parseInt(targetZoom === undefined ? startZoom : targetZoom);

    if (this._flyToNext) this._stop();

    if (options.animate === false || !L.Browser.any3d) {
      return this._map.setView(targetCenter, targetZoom, options);
    }
    const duration = options.duration ? options.duration : 5;

    const startCenter = this._map.getCenter();
    const points = getLatLngsFlatten(this);

    // eslint-disable-next-line prefer-const
    let [startLatLng, startIndex, startDistance] = closestLatlng(points, startCenter);
    // eslint-disable-next-line prefer-const
    let [endLatLng, endIndex, endDistance] = closestLatlng(points, targetCenter);

    if (startIndex > endIndex) {
      points.reverse();
      startIndex = points.length - startIndex - 1;
      endIndex = points.length - endIndex - 1;
    }

    const flyDistance = getLength(points, startIndex, endIndex) + startDistance + endDistance;
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
