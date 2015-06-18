/*
 * L.Renderer is a base class for renderer implementations (SVG, Canvas);
 * handles renderer container, bounds and zoom animation.
 */

L.Renderer = L.Layer.extend({

	options: {
		// how much to extend the clip area around the map view (relative to its size)
		// e.g. 0.1 would be 10% of map view in each direction; defaults to clip with the map view
		padding: 0.1
	},

	initialize: function (options) {
		L.setOptions(this, options);
		L.stamp(this);
	},

	onAdd: function (map) {
		if (!this._container) {
			this._initContainer(); // defined by renderer implementations

			if (this._zoomAnimated) {
				L.DomUtil.addClass(this._container, 'leaflet-zoom-animated');
			}
		}
		this.getPane().appendChild(this._container);

		this._update();
		map.on('rotate', this._update, this);
	},

	onRemove: function () {
		L.DomUtil.remove(this._container);
		this._map.off('rotate', this._update, this);
	},

	getEvents: function () {
		var events = {
			viewreset: this._reset,
			zoom: this._updateTransform,
			moveend: this._update
		};
		if (this._zoomAnimated) {
			events.zoomanim = this._animateZoom;
		}
		return events;
	},

	_animateZoom: function (e) {
		var scale = this._map.getZoomScale(e.zoom, this._zoom),
		    offset = this._map._latLngToNewLayerPoint(this._topLeft, e.zoom, e.center);

		L.DomUtil.setTransform(this._container, offset, scale);
	},

	_updateTransform: function () {
		var zoom = this._map.getZoom(),
		    center = this._map.getCenter(),
		    scale = this._map.getZoomScale(zoom, this._zoom),
		    offset = this._map._latLngToNewLayerPoint(this._topLeft, zoom, center);

		L.DomUtil.setTransform(this._container, offset, scale);
	},

	_reset: function () {
		this._update();
		this._updateTransform();
	},

	_update: function () {
		// update pixel bounds of renderer container (for positioning/sizing/clipping later)
		var p = this.options.padding,
		    map = this._map,
		    size = this._map.getSize(),
		    padMin = size.multiplyBy(-p);
		    padMax = size.multiplyBy(1 + p);
		    //// TODO: Somehow refactor this out into map.something() - the code is
		    ////   pretty much the same as in GridLayer.
		    clip = new L.Bounds([
		        map.containerPointToLayerPoint([padMin.x, padMin.y]).floor(),
		        map.containerPointToLayerPoint([padMin.x, padMax.y]).floor(),
		        map.containerPointToLayerPoint([padMax.x, padMin.y]).floor(),
		        map.containerPointToLayerPoint([padMax.x, padMax.y]).floor()
		    ]);
// 		    min = this._map.containerPointToLayerPoint(size.multiplyBy(-p)).round();

// 		this._bounds = new L.Bounds(min, min.add(size.multiplyBy(1 + p * 2)).round());
		this._bounds = clip;

		this._topLeft = this._map.layerPointToLatLng(clip.min);
		this._zoom = this._map.getZoom();
	}
});


L.Map.include({
	// used by each vector layer to decide which renderer to use
	getRenderer: function (layer) {
		var renderer = layer.options.renderer || this._getPaneRenderer(layer.options.pane) || this.options.renderer || this._renderer;

		if (!renderer) {
			renderer = this._renderer = (this.options.preferCanvas && L.canvas()) || L.svg();
		}

		if (!this.hasLayer(renderer)) {
			this.addLayer(renderer);
		}
		return renderer;
	},

	_getPaneRenderer: function (name) {
		if (name === 'overlayPane' || name === undefined) {
			return false;
		}

		var renderer = this._paneRenderers[name];
		if (renderer === undefined) {
			renderer = (L.SVG && L.svg({pane: name})) || (L.Canvas && L.canvas({pane: name}));
			this._paneRenderers[name] = renderer;
		}
		return renderer;
	}
});
