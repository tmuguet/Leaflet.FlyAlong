# Leaflet FlyAlong

Leaflet FlyAlong is a plugin for [Leaflet](http://leafletjs.com/) to move the view of the map with a smooth animation along a `L.PolyLine` object.

This plugins adds one method to `L.Polyline` objects:

- `flyTo(latlng: L.LatLng, zoom?: number, options?: Zoom/pan options)`: sets the view of the map (geographical center and zoom) performing a smooth pan-zoom animation along this polyline.  
If the starting point for the animation is not on the polyline, there will be a first animation towards its closest point on the polyline.  
If the ending point for the animation is not on the polyline, there will be a last animation from its closest point on the polyline.  
**Note**: Zoom/pan options `easeLinearity` and `noMoveStart` are not supported.

