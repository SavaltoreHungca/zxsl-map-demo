L.IDW = L.Layer.extend({
    options: {
        padding: 0.1,
        opacity: 0.3,
        allowOverlap: true,
        suplementArea: false,
        cellSize: 1,
        points: [],
        getColor: (value) => 'black',
    },
    getEvents: function () {
        var events = {
            zoom: this._reset,
            viewreset: this._reset,
            moveend: this._reset,
            // click: this._onclick,
        };
        if (this._zoomAnimated) {
            events.zoomanim = this._animateZoom;
        }
        return events;
    },
    initialize: function (geoJson, options) {
        this._requestAnimationId = null;
        this._geoJson = geoJson;
        L.Util.setOptions(this, options);
        this._container = L.DomUtil.create("div");
        this._canvas = L.DomUtil.create("canvas");
        this._canvas.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
        `;

        this._container.appendChild(this._canvas);
    },
    onAdd: function (map) {
        this._map = map;
        if (this._zoomAnimated) {
            L.DomUtil.addClass(this._container, "leaflet-zoom-animated");
        }
        this.getPane().appendChild(this._container);
        this._reset();
    },
    onRemove: function (map) {
        L.DomUtil.remove(this._container);
        map.off('zoomend viewreset', this._update, this);
    },
    _animateZoom: function (e) {
        var scale = this._map.getZoomScale(e.zoom);
        var offset = this._map._latLngBoundsToNewLayerBounds(
            new L.LatLngBounds(
                this._map.layerPointToLatLng(this._bounds.min),
                this._map.layerPointToLatLng(this._bounds.max),
            )
            , e.zoom, e.center).min;
        L.DomUtil.setTransform(this._container, offset, scale);
    },
    _reset: function () {
        var p = this.options.padding;
        var size = this._map.getSize();
        var min = this._map.containerPointToLayerPoint(size.multiplyBy(-p)).round();
        this._bounds = new L.Bounds(min, min.add(size.multiplyBy(1 + p * 2)).round());
        let bounds = this._bounds;
        size = bounds.getSize();

        L.DomUtil.setPosition(this._container, bounds.min);

        this._container.style.width = size.x + 'px';
        this._container.style.height = size.y + 'px';
        this._canvas.width = size.x;
        this._canvas.height = size.y;


        L.Util.cancelAnimFrame(this._requestAnimationId);
        this._requestAnimationId = L.Util.requestAnimFrame(this._updateCanvas, this);

        // this._updateCanvas();
    },
    _getPosi: function (latLng) {
        let containerCoor = this._bounds.min;
        let poinCoor = L.point(this._map.latLngToLayerPoint(latLng))
        return L.point(
            poinCoor.x - containerCoor.x,
            poinCoor.y - containerCoor.y
        )
    },
    _isInRegion: function (latLng, polygon) {
        let features = null;
        if (Array.isArray(polygon)) {
            features = polygon.map(i => i.geometry);
        } else if (polygon.type === 'FeatureCollection') {
            features = polygon.features.map(i => i.geometry);
        } else if (polygon.type === 'Feature') {
            features = [polygon.geometry];
        }
        for (let i = 0; i < features.length; i++) {
            if (features[i].type !== 'Polygon' && features[i].type !== 'MultiPolygon') {
                continue;
            }
            if (turf.booleanPointInPolygon(latLng, features[i])) {
                return true;
            }
        }
        return false;
    },
    _getPolygonInnerPoints: function () {
        if (this._innerPoints) {
            return this._innerPoints;
        }
        this._innerPoints = [];

        if (this.options.suplementArea) {
            let bbox = turf.bbox(this._geoJson);
            let coners = turf.bboxPolygon(bbox).geometry.coordinates[0];
            coners.pop();

            coners.forEach(coner => {
                let shot = Number.MAX_SAFE_INTEGER;
                let ans = null;
                this.options.points.forEach(i => {
                    let distance = turf.distance(turf.point(coner), turf.point([i.latLng[1], i.latLng[0]]));
                    if (distance < shot) {
                        ans = i.value;
                        shot = distance;
                    }
                });
                this.options.points.push({
                    latLng: [coner[1], coner[0]],
                    value: ans
                });
            })
        }

        var collection = turf.featureCollection(this.options.points.map(i => {
            let point = turf.point([i.latLng[1], i.latLng[0]]);
            point.properties.value = i.value;
            return point;
        }));

        let grid = turf.interpolate(collection, this.options.cellSize, { gridType: 'square', property: 'value', units: 'kilometers' })

        turf.featureEach(grid, (square) => {
            square.geometry.coordinates[0].pop();
            if (this._isInRegion(turf.center(square), this._geoJson)) {
                this._innerPoints.push(square);
            }
        });
        return this._innerPoints;

    },
    _getSuitScale: function (from, to) {
        let ans = 1;
        if (from > to) {
            while (from > to) {
                ans = ans * this._map.getZoomScale(from, from - 1);
                from--;
            }
            return ans;
        } else if (from < to) {
            while (from < to) {
                ans = ans * this._map.getZoomScale(from, from + 1);
                from++;
            }
            return ans;
        }
        return 1;
    },
    _updateCanvas: function () {
        let canvas = this._canvas;
        let context = canvas.getContext('2d');
        context.globalAlpha = this.options.opacity;
        context.clearRect(0, 0, canvas.width, canvas.height);
        this._getPolygonInnerPoints().forEach(feature => {
            let topLeft = feature.geometry.coordinates[0][1];
            topLeft = [topLeft[1], topLeft[0]];
            let bottomRight = feature.geometry.coordinates[0][3];
            bottomRight = [bottomRight[1], bottomRight[0]];
            let topLeftPosi = this._getPosi(L.latLng(topLeft));
            let bottomRightPosi = this._getPosi(L.latLng(bottomRight));
            let posi = topLeftPosi;
            let w = Math.abs(bottomRightPosi.x - topLeftPosi.x);
            context.fillStyle = this.options.getColor(feature.properties.value);
            if (this.options.allowOverlap)
                context.clearRect(posi.x - 1, posi.y - 1, w + 2, w + 2);
            context.fillRect(posi.x - 1, posi.y - 1, w + 2, w + 2);
        });
    },
});