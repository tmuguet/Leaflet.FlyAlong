(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(_dereq_,module,exports){
function _arrayWithHoles(arr) {
  if (Array.isArray(arr)) return arr;
}

module.exports = _arrayWithHoles;
},{}],2:[function(_dereq_,module,exports){
function _interopRequireDefault(obj) {
  return obj && obj.__esModule ? obj : {
    "default": obj
  };
}

module.exports = _interopRequireDefault;
},{}],3:[function(_dereq_,module,exports){
function _iterableToArrayLimit(arr, i) {
  if (!(Symbol.iterator in Object(arr) || Object.prototype.toString.call(arr) === "[object Arguments]")) {
    return;
  }

  var _arr = [];
  var _n = true;
  var _d = false;
  var _e = undefined;

  try {
    for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) {
      _arr.push(_s.value);

      if (i && _arr.length === i) break;
    }
  } catch (err) {
    _d = true;
    _e = err;
  } finally {
    try {
      if (!_n && _i["return"] != null) _i["return"]();
    } finally {
      if (_d) throw _e;
    }
  }

  return _arr;
}

module.exports = _iterableToArrayLimit;
},{}],4:[function(_dereq_,module,exports){
function _nonIterableRest() {
  throw new TypeError("Invalid attempt to destructure non-iterable instance");
}

module.exports = _nonIterableRest;
},{}],5:[function(_dereq_,module,exports){
var arrayWithHoles = _dereq_("./arrayWithHoles");

var iterableToArrayLimit = _dereq_("./iterableToArrayLimit");

var nonIterableRest = _dereq_("./nonIterableRest");

function _slicedToArray(arr, i) {
  return arrayWithHoles(arr) || iterableToArrayLimit(arr, i) || nonIterableRest();
}

module.exports = _slicedToArray;
},{"./arrayWithHoles":1,"./iterableToArrayLimit":3,"./nonIterableRest":4}],6:[function(_dereq_,module,exports){
(function (global){
"use strict";

var _interopRequireDefault = _dereq_("@babel/runtime/helpers/interopRequireDefault");

var _slicedToArray2 = _interopRequireDefault(_dereq_("@babel/runtime/helpers/slicedToArray"));

var L = (typeof window !== "undefined" ? window['L'] : typeof global !== "undefined" ? global['L'] : null);
/**
 * Returns a flat array of L.LatLng objects
 * @param L.Polyline polyline Polyline object
 * @returns L.LatLng[] Flat array
 */


function getLatLngsFlatten(polyline) {
  var latlngs = polyline.getLatLngs();

  if (latlngs.length > 0 && Array.isArray(latlngs[0])) {
    var result = [];

    for (var j = 0; j < latlngs.length; j += 1) {
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
  var start = startIndex === undefined ? 0 : startIndex;
  var end = endIndex === undefined ? points.length : endIndex;
  var distance = 0;

  for (var i = start + 1; i < end; i += 1) {
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
  var start = startIndex === undefined ? 0 : startIndex;
  var end = endIndex === undefined ? points.length : endIndex;
  var currentDistance = 0;
  var paths = [];

  for (var i = start + 1; i < end; i += 1) {
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
  var minDistance = Infinity;
  var minLatlng = null;
  var minIndex = null;

  for (var i = 0; i < points.length; i += 1) {
    var distance = points[i].distanceTo(latlng);

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
  _stop: function _stop() {
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
  flyTo: function flyTo(targetCenter, targetZoom, options) {
    var _this2 = this;

    /* eslint-disable no-param-reassign */
    options = options || {};

    var startZoom = this._map.getZoom();

    targetZoom = targetZoom === undefined ? startZoom : targetZoom;

    if (options.animate === false || !L.Browser.any3d) {
      return this._map.setView(targetCenter, targetZoom, options);
    }

    var duration = options.duration ? options.duration : 5;

    var startCenter = this._map.getCenter();

    var points = getLatLngsFlatten(this);

    var _closestLatlng = closestLatlng(points, startCenter),
        _closestLatlng2 = (0, _slicedToArray2["default"])(_closestLatlng, 2),
        startLatLng = _closestLatlng2[0],
        startIndex = _closestLatlng2[1];

    var _closestLatlng3 = closestLatlng(points, targetCenter),
        _closestLatlng4 = (0, _slicedToArray2["default"])(_closestLatlng3, 2),
        endLatLng = _closestLatlng4[0],
        endIndex = _closestLatlng4[1];

    var flyDistance = getLength(points, startIndex, endIndex);
    var keyframesFlyIndexes = splitByLength(points, flyDistance / (duration * 10), startIndex, endIndex);
    var keyframesNumber = keyframesFlyIndexes.length;
    var zoomStep = (targetZoom - startZoom) / keyframesNumber;
    var keyframesZoomValues = [];

    for (var i = 0; i < keyframesNumber; i += 1) {
      keyframesZoomValues.push(startZoom + zoomStep * i);
    }

    var keyframesDuration = duration / keyframesNumber;
    var currentKeyframe = 0;

    function next() {
      var _this = this;

      if (currentKeyframe < keyframesNumber) {
        this._map.flyTo(points[keyframesFlyIndexes[currentKeyframe]], keyframesZoomValues[currentKeyframe], {
          easeLinearity: 1,
          duration: keyframesDuration
        });

        currentKeyframe += 1;

        this._flyToNext = function () {
          return next.call(_this);
        };

        this._map.once('moveend', this._flyToNext);
      } else {
        this._map.flyTo(endLatLng, targetZoom, {
          easeLinearity: 1,
          duration: keyframesDuration
        });

        this._map.once('moveend', function () {
          return _this.fire('FlyAlong:moveend');
        });
      }
    }

    this.fire('FlyAlong:movestart');

    this._map.flyTo(startLatLng, startZoom, {
      easeLinearity: 1,
      duration: keyframesDuration
    });

    this._flyToNext = function () {
      return next.call(_this2);
    };

    this._map.once('moveend', this._flyToNext);

    return this;
  }
});

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"@babel/runtime/helpers/interopRequireDefault":2,"@babel/runtime/helpers/slicedToArray":5}]},{},[6]);
