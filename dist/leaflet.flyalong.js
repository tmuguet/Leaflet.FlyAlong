(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(_dereq_,module,exports){
(function (global){
"use strict";

function _slicedToArray(arr, i) { return _arrayWithHoles(arr) || _iterableToArrayLimit(arr, i) || _nonIterableRest(); }

function _nonIterableRest() { throw new TypeError("Invalid attempt to destructure non-iterable instance"); }

function _iterableToArrayLimit(arr, i) { if (!(Symbol.iterator in Object(arr) || Object.prototype.toString.call(arr) === "[object Arguments]")) { return; } var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"] != null) _i["return"](); } finally { if (_d) throw _e; } } return _arr; }

function _arrayWithHoles(arr) { if (Array.isArray(arr)) return arr; }

var L = (typeof window !== "undefined" ? window['L'] : typeof global !== "undefined" ? global['L'] : null);

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

function getLength(points, startIndex, endIndex) {
  var start = startIndex === undefined ? 0 : startIndex;
  var end = endIndex === undefined ? points.length : endIndex;
  var distance = 0;

  for (var i = start + 1; i < end; i += 1) {
    distance += points[i].distanceTo(points[i - 1]); // m
  }

  return distance;
}

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
  _stop: function _stop() {
    this._map.off('moveend', this._flyToNext);
  },
  flyTo: function flyTo(targetCenter, targetZoom, options) {
    var _this2 = this;

    var _options = options || {};

    if (_options.animate === false || !L.Browser.any3d) {
      return this._map.setView(targetCenter, targetZoom, _options);
    }

    var _targetZoom = targetZoom === undefined ? this._map.getZoom() : targetZoom;

    var duration = _options.duration ? _options.duration : 5;

    var center = this._map.getCenter();

    var points = getLatLngsFlatten(this);

    var _closestLatlng = closestLatlng(points, center),
        _closestLatlng2 = _slicedToArray(_closestLatlng, 2),
        start = _closestLatlng2[0],
        startIndex = _closestLatlng2[1];

    var _closestLatlng3 = closestLatlng(points, targetCenter),
        _closestLatlng4 = _slicedToArray(_closestLatlng3, 2),
        end = _closestLatlng4[0],
        endIndex = _closestLatlng4[1];

    var distance = getLength(points, startIndex, endIndex);
    var indexes = splitByLength(points, distance / (duration * 10), startIndex, endIndex);
    var stepDuration = duration / indexes.length;
    var currentIndex = 0;

    function next() {
      var _this = this;

      if (currentIndex < indexes.length) {
        var dest = points[indexes[currentIndex]];

        this._map.flyTo(dest, _targetZoom, {
          easeLinearity: 1,
          duration: stepDuration
        });

        currentIndex += 1;

        this._flyToNext = function () {
          return next.call(_this);
        };

        this._map.once('moveend', this._flyToNext);
      } else {
        this._map.flyTo(end, _targetZoom, {
          easeLinearity: 1,
          duration: stepDuration
        });
      }
    }

    this._map.flyTo(start, _targetZoom, {
      easeLinearity: 1,
      duration: stepDuration
    });

    this._flyToNext = function () {
      return next.call(_this2);
    };

    this._map.once('moveend', this._flyToNext);

    return this;
  }
});

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}]},{},[1]);
