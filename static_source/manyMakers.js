L.ManyMarkers = L.Layer.extend({
    options: {
        padding: 0.1,
        markers: [],
        onclickMarker: () => { },
        icon: 'circle',
        color: 'black',
        size: 10,
        interval: 1000,
        lineColor: 'grey',
        lineDash: [5, 5],
    },
    getEvents: function () {
        var events = {
            zoom: this._reset,
            viewreset: this._reset,
            moveend: this._reset,
            click: this._onclick,
        };
        if (this._zoomAnimated) {
            events.zoomanim = this._animateZoom;
        }
        return events;
    },
    initialize: function (options) {
        this._playAnimation = false;
        this._requestAnimFrameId = null;
        this._renderCountsTimeoutId = null;
        this._frameRate = 60 / 1000 * this.options.interval;

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
    getBounds: function () {
        return this._bounds;
    },
    _getSuitScale: function (zoom) {
        let ans = 1;
        for (let i = 18; i >= zoom + 1; i--) {
            ans = this._map.getZoomScale(i - 1, i) * ans;
        }
        return ans;
    },
    _reset: function () {
        if (this._requestAnimFrameId) {
            L.Util.cancelAnimFrame(this._requestAnimFrameId);
            this._requestAnimFrameId = null;
        }

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

        this._updateCanvas();
    },
    _getPosi: function (latLng) {
        let containerCoor = this._bounds.min;
        let poinCoor = L.point(this._map.latLngToLayerPoint(latLng))
        return L.point(
            poinCoor.x - containerCoor.x,
            poinCoor.y - containerCoor.y
        )
    },
    _updateCanvas: function () {
        var canvas = this._canvas;
        let context = canvas.getContext('2d');
        context.clearRect(0, 0, canvas.width, canvas.height);

        for (let markerIndex = 0; markerIndex < this.options.markers.length; markerIndex++) {

            let marker = this.options.markers[markerIndex];
            let posi = this._getPosi(marker.latLng);

            if (this.options.icon = 'circle') {
                let radius = this.options.size / 2;
                marker._radius = radius;

                let drawNom = () => {
                    context.beginPath();
                    context.fillStyle = this.options.color;
                    context.globalAlpha = 1;
                    context.arc(posi.x, posi.y, marker._radius, 0, Math.PI * 2, false);
                    context.fill();
                }

                let drawDeltaCircle = (whenEnd) => {
                    context.setLineDash([]);
                    context.strokeStyle = this.options.color;
                    context.fillStyle = this.options.color;
                    marker.deltaRadius = typeof marker.deltaRadius !== 'undefined' ? marker.deltaRadius : radius;
                    marker._breathDelta = typeof marker._breathDelta !== 'undefined' ? marker._breathDelta : -Math.PI / 2;
                    marker.deltaRadius += Math.PI / 50;
                    marker._breathDelta += Math.PI / 90;
                    _breathRadius = radius + Math.sin(marker._breathDelta) * (radius - 1);
                    let hoopRadius = marker.deltaRadius;
                    let alpha = 1 / hoopRadius * radius;

                    if (alpha > 0.025 && hoopRadius < 30) {
                        context.beginPath();
                        context.globalAlpha = 1;
                        context.arc(posi.x, posi.y, _breathRadius, 0, Math.PI * 2, false);
                        context.fill();

                        context.beginPath();
                        context.strokeStyle = this.options.color;
                        context.lineWidth = radius / 2;
                        context.globalAlpha = alpha;
                        context.arc(posi.x, posi.y, hoopRadius, 0, Math.PI * 2, false);
                        context.stroke();

                        for (let i = 1; i <= 10; i++) {
                            context.beginPath();
                            context.strokeStyle = this.options.color;
                            context.globalAlpha = alpha * 1 / i;
                            context.arc(posi.x, posi.y, Math.abs(hoopRadius - i), 0, Math.PI * 2, false);
                            context.stroke();
                        }
                    } else if (whenEnd) {
                        whenEnd();
                    }
                }

                let drawLine = () => {
                    if (markerIndex - 1 >= 0) {
                        if (this.options.lineDash) {
                            context.setLineDash(this.options.lineDash);
                        }
                        context.strokeStyle = this.options.lineColor;
                        let previousMarker = this.options.markers[markerIndex - 1];
                        let prePosi = this._getPosi(previousMarker.latLng);
                        context.beginPath();
                        context.globalAlpha = 1;
                        context.moveTo(prePosi.x, prePosi.y);
                        context.lineTo(posi.x, posi.y);
                        context.stroke();
                    }
                }

                let drawDeltaLine = (whenReachCall) => {
                    if (markerIndex - 1 >= 0) {
                        if (this.options.lineDash) {
                            context.setLineDash(this.options.lineDash);
                        }
                        context.strokeStyle = this.options.lineColor;
                        let previousMarker = this.options.markers[markerIndex - 1];
                        let prePosi = this._getPosi(previousMarker.latLng);

                        let lineLen = Math.sqrt(Math.pow(posi.x - prePosi.x, 2) + Math.pow(posi.y - prePosi.y, 2));
                        marker._lineDelta = typeof marker._lineDelta !== 'undefined' ? marker._lineDelta : 0;
                        marker._lineDelta += lineLen / this._frameRate;
                        let sin = (posi.y - prePosi.y) / lineLen;
                        let cos = (posi.x - prePosi.x) / lineLen;

                        if (marker._lineDelta >= lineLen) {
                            marker._lineDelta = lineLen;
                            if (whenReachCall) {
                                whenReachCall();
                            }
                            drawLine();
                        } else {
                            context.beginPath();
                            context.globalAlpha = 1;
                            context.moveTo(prePosi.x, prePosi.y);
                            context.lineTo(prePosi.x + cos * marker._lineDelta, prePosi.y + sin * marker._lineDelta);
                            context.stroke();
                        }
                    } else {
                        if (whenReachCall) {
                            whenReachCall();
                        }
                    }
                }

                if (this._playAnimation) {
                    if (markerIndex > this.options.renderCounts) {
                        break;
                    }
                    if (markerIndex === 0) drawDeltaCircle();
                    drawDeltaLine(() => {
                        drawDeltaCircle(() => {
                            drawNom();
                            drawLine();
                        });
                    });
                } else {
                    drawNom();
                }
            } else {
                // 其他icon
            }
        }
        if (this._playAnimation) {
            this._requestAnimFrameId = L.Util.requestAnimFrame(this._updateCanvas, this);
        }
    },
    togglePlay: function () {
        this._playAnimation = !this._playAnimation;
        if (this._playAnimation) {
            clearTimeout(this._renderCountsTimeoutId);
            this.options.markers.forEach(marker => {
                delete marker.deltaRadius;
                delete marker._lineDelta;
            });
            this.options.renderCounts = 1;
            let launcher = () => {
                if (this.options.renderCounts < this.options.markers.length) {
                    this._renderCountsTimeoutId = setTimeout(() => {
                        this.options.renderCounts += 1;
                        launcher();
                    }, this.options.interval);
                }
            }
            launcher();
        } else {
            clearTimeout(this._renderCountsTimeoutId);
        }
        this._updateCanvas();
    },
    _getSuitDistanceRange: function (a, b, len) {
        let pa = this._map.latLngToLayerPoint(a);
        let pb = this._map.latLngToLayerPoint(b);
        let l = Math.pow(Math.abs(pa.x - pb.x), 2) + Math.pow(Math.abs(pa.y - pb.y), 2);
        l = Math.sqrt(l);
        return l <= len + 5;
    },
    _onclick: function (e) {
        if(this._playAnimation) return;
        let nearMarkers = [];
        this.options.markers.forEach(i => {
            let pixl = this._getSuitDistanceRange(i.latLng, [e.latlng.lat, e.latlng.lng], i._radius);
            if (pixl) {
                nearMarkers.push(i);
            }
        });
        if (nearMarkers.length > 0) {
            this.options.onclickMarker(nearMarkers);
        }
    }
});