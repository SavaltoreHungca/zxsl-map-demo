// All matrix-returning operations work on 4x4 matrices
//   expressed as 16-item arrays

// Multiply two 4x4 matrices, given as 16-element arrays.
function matrixMultiply(a, b) {
	var a00 = a[0 * 4 + 0];
	var a01 = a[0 * 4 + 1];
	var a02 = a[0 * 4 + 2];
	var a03 = a[0 * 4 + 3];
	var a10 = a[1 * 4 + 0];
	var a11 = a[1 * 4 + 1];
	var a12 = a[1 * 4 + 2];
	var a13 = a[1 * 4 + 3];
	var a20 = a[2 * 4 + 0];
	var a21 = a[2 * 4 + 1];
	var a22 = a[2 * 4 + 2];
	var a23 = a[2 * 4 + 3];
	var a30 = a[3 * 4 + 0];
	var a31 = a[3 * 4 + 1];
	var a32 = a[3 * 4 + 2];
	var a33 = a[3 * 4 + 3];
	var b00 = b[0 * 4 + 0];
	var b01 = b[0 * 4 + 1];
	var b02 = b[0 * 4 + 2];
	var b03 = b[0 * 4 + 3];
	var b10 = b[1 * 4 + 0];
	var b11 = b[1 * 4 + 1];
	var b12 = b[1 * 4 + 2];
	var b13 = b[1 * 4 + 3];
	var b20 = b[2 * 4 + 0];
	var b21 = b[2 * 4 + 1];
	var b22 = b[2 * 4 + 2];
	var b23 = b[2 * 4 + 3];
	var b30 = b[3 * 4 + 0];
	var b31 = b[3 * 4 + 1];
	var b32 = b[3 * 4 + 2];
	var b33 = b[3 * 4 + 3];
	return [
		a00 * b00 + a01 * b10 + a02 * b20 + a03 * b30,
		a00 * b01 + a01 * b11 + a02 * b21 + a03 * b31,
		a00 * b02 + a01 * b12 + a02 * b22 + a03 * b32,
		a00 * b03 + a01 * b13 + a02 * b23 + a03 * b33,
		a10 * b00 + a11 * b10 + a12 * b20 + a13 * b30,
		a10 * b01 + a11 * b11 + a12 * b21 + a13 * b31,
		a10 * b02 + a11 * b12 + a12 * b22 + a13 * b32,
		a10 * b03 + a11 * b13 + a12 * b23 + a13 * b33,
		a20 * b00 + a21 * b10 + a22 * b20 + a23 * b30,
		a20 * b01 + a21 * b11 + a22 * b21 + a23 * b31,
		a20 * b02 + a21 * b12 + a22 * b22 + a23 * b32,
		a20 * b03 + a21 * b13 + a22 * b23 + a23 * b33,
		a30 * b00 + a31 * b10 + a32 * b20 + a33 * b30,
		a30 * b01 + a31 * b11 + a32 * b21 + a33 * b31,
		a30 * b02 + a31 * b12 + a32 * b22 + a33 * b32,
		a30 * b03 + a31 * b13 + a32 * b23 + a33 * b33 ];
}

// Returns an identity matrix
function identityMatrix() {
	// prettier-ignore
	return [1, 0, 0, 0,
	        0, 1, 0, 0,
	        0, 0, 1, 0,
	        0, 0, 0, 1];
}

// Returns a translation matrix
// Offset is a 3-element array
function translationMatrix(t) {
	// prettier-ignore
	return [1,    0,    0,    0,
	        0,    1,    0,    0,
	        0,    0,    1,    0,
	        t[0], t[1], t[2], 1];
}

// Returns a scale matrix
// Scale is a 3-element array
function scaleMatrix(s) {
	// prettier-ignore
	return [s[0],    0,    0, 0,
	           0, s[1],    0, 0,
	           0,    0, s[2], 0,
	           0,    0,    0, 1];
}

L.GLMarker = L.Class.extend({
	initialize: function initialize(latLng, options) {
		if ( options === void 0 ) options = {};

		this._latLng = L.latLng(latLng);
		L.Util.setOptions(this, options);
	},
});

L.Browser.gl = false;

try {
	var canvas = document.createElement("canvas");
	var context = canvas.getContext("webgl");
	if (context && typeof context.getParameter == "function") {
		L.Browser.gl = "webgl";
	} else {
		context = canvas.getContext("experimental-webgl");
		if (context && typeof context.getParameter == "function") {
			L.Browser.gl = "experimental-webgl";
		}
	}
} catch (e) {}

L.GLMarkerGroup = L.Layer.extend({
	options: {
		/// TODO: Make user-provided uniforms work!!!
		// A dictionary of WebGL uniforms that will be passed to the shaders.
		// Values can be changed during runtime (e.g. updating a 'time' uniform),
		// but no keys can be added/removed.
		// The uniforms 'uPixelSize' and 'uNow' are added automatically, no need
		// to specify them here.
		// All values are assumed to be float32s in JS TypedArrays, or `highp float`
		// (24 bits!) in the shaders
		// 		uniforms: {},

		// An array of attribute names that each GLMarker will have.
		// The attributes 'aCRSCoords' and 'aLatLngCoords' and 'aExtrudeCoords'
		// are added automatically to all vertices, no need to specify them
		// here.
		// All values are assumed to be float32s in JS TypedArrays, or `highp float`
		// (24 bits!) in the shaders. 'aCRSCoords', 'aLatLngCoords' and 'aExtrudeCoords'
		// are `vec2`s.
		attributes: [],

		// An array of up to 8 image URLs to be loaded as textures.
		// These will be available in the fragment shader as uTexture0, uTexture1, ... uTexture7.
		textures: [],

		// The vertex shader, as a text string.
		vertexShader: "",

		// The fragment shader, as a text string.
		fragmentShader: "",

		// @option padding: Number = 0.1
		// How much to extend the clip area around the map view (relative to its size)
		// e.g. 0.1 would be 10% of map view in each direction
		padding: 0.1,
	},

	initialize: function initialize(options) {
		if ( options === void 0 ) options = {};

		L.Util.setOptions(this, options);
		this._initGl();
		this._markers = [];

		this._buffersAreDirty = true;
		this._animFrameRequest;
		this._glError = false;
		this._glCreateProgram();
		this._alreadyRenderedThisFrame = false;
		this._textures = [];
		this._texturesAreLoaded = false;
	},

	onAdd: function onAdd(map) {
		this._map = map;
		// 		map.getContainer().appendChild(this._container);
		if (this._zoomAnimated) {
			L.DomUtil.addClass(this._container, "leaflet-zoom-animated");
		}
		this.getPane().appendChild(this._container);

		this._reset();
		this._redoBuffers();
	},

	onRemove: function onRemove(map) {
		L.DomUtil.remove(this._container);
		L.DomEvent.off(this._container);
		delete this._map;
		// TODO: Clean up GL resources?
	},

	// In order to make the zoom animation look decent, copy most of the
	// L.Renderer functionality for the update logic:
	getEvents: L.Renderer.prototype.getEvents,
	_onAnimZoom: function _onAnimZoom(ev) {
		this._updateTransform(ev.center, ev.zoom);
		this._redraw();
	},
	_onZoom: function _onZoom(ev) {
		this._update();
		this._redraw();
	},
	_onZoomEnd: L.Util.falseFn,
	_updateTransform: L.Renderer.prototype._updateTransform,
	_update: function _update() {
		if (this._map._animatingZoom && this._bounds) {
			return;
		}
		L.Renderer.prototype._update.call(this);

		this._center = this._map.getCenter();
		this._zoom = this._map.getZoom();

		L.Browser.retina ? 2 : 1;
			var mapPxSize = this._bounds.getSize();

		this._container.width = /*m * */ mapPxSize.x;
		this._container.height = /*m * */ mapPxSize.y;
		L.DomUtil.setPosition(this._container, this._bounds.min);
		this._redraw();
	},
	_redraw: function _redraw(ev) {
		return this.render();
	},
	_reset: function () {
		this._update();
		this._updateTransform(this._center, this._zoom);
	},

	// Exposes the WebGL rendering context
	getGlContext: function getGlContext() {
		return this._gl;
	},

	// @method addMarker(glMarker: GLMarker): this
	// Add a GL marker to this GLMarkerGroup, at the given latLng and with the
	// given options. Options will be mapped 1:1 into attributes.
	addMarker: function addMarker(glMarker) {
		this._markers.push(glMarker);
		this._buffersAreDirty = true;

		if (this._map && !this._animFrameRequest) {
			this._animFrameRequest = L.Util.requestAnimFrame(this.render, this);
		}
		return this;
	},

	// @method getGlError(): String|undefined
	// If there was any error compiling/linking the shaders, returns a string
	// with information about that error. If there was no error, returns `undefined`.
	getGlError: function () {
		return this._glError;
	},

	_initGl: function _initGl() {
		this._container = L.DomUtil.create("canvas", "leaflet-webgl");
		(this._gl = this._container.getContext(L.Browser.gl));
	},

	_glCreateProgram: function _glCreateProgram() {
		var gl = this._gl;

		var program = gl.createProgram();
		var vs = gl.createShader(gl.VERTEX_SHADER);
		var fs = gl.createShader(gl.FRAGMENT_SHADER);

		gl.shaderSource(vs, this.options.vertexShader);
		gl.shaderSource(fs, this.options.fragmentShader);
		gl.compileShader(vs);
		gl.compileShader(fs);
		if (!gl.getShaderParameter(vs, gl.COMPILE_STATUS)) {
			this._glError = gl.getShaderInfoLog(vs);
			console.error(this._glError);
			return null;
		}
		if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS)) {
			this._glError = gl.getShaderInfoLog(fs);
			console.error(this._glError);
			return null;
		}
		gl.attachShader(program, vs);
		gl.attachShader(program, fs);
		gl.linkProgram(program);
		gl.useProgram(program);

		this._attribPositions = {};
		for (var i in this.options.attributes) {
			var attribName = this.options.attributes[i];
			this._attribPositions[attribName] = gl.getAttribLocation(program, attribName);
			// 			gl.enableVertexAttribArray(this._attribPositions[ attribName ]);
		}
		this._aExtrudePosition = gl.getAttribLocation(program, "aExtrudeCoords");
		this._aCRSPosition = gl.getAttribLocation(program, "aCRSCoords");
		this._aLatLngPosition = gl.getAttribLocation(program, "aLatLngCoords");

		this._uniformPositions = {};
		this._uniformPositions.uTransformMatrix = gl.getUniformLocation(
			program,
			"uTransformMatrix"
		);
		this._uniformPositions.uNow = gl.getUniformLocation(program, "uNow");
		this._uniformPositions.uPixelSize = gl.getUniformLocation(program, "uPixelSize");
		/// TODO: loop through the user-defined uniforms

		// 4 vertices per marker
		// 8 bytes per each vec2 attribute
		// 3 always-present vec2 attributes per marker
		// 4 bytes per each float32 attribute
		// (length of this.options.attributes) float32 attributes per marker
		this._bytesPerVertex = 8 * 3 + 4 * Object.keys(this.options.attributes).length;

		// gl.disable(gl.DEPTH_TEST);
		gl.enable(gl.BLEND);
		gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE);
		gl.clearColor(0.5, 0.5, 0.5, 0.0);

		this._buffersAreDirty = true;

		this._loadTextures();

		return (this._glProgram = program);
	},

	// Fetches the images given in this.options.textures, loads them as
	// textures, and inits the values for the uniforms uTexture0...uTexture7
	_loadTextures: function _loadTextures() {
		var this$1$1 = this;

		if (this.options.textures.length === 0) {
			return (this._texturesAreLoaded = true);
		}

		var texFetches = [];
		var loop = function ( i ) {
			var url = this$1$1.options.textures[i];

			texFetches.push(
				new Promise(function (resolve, reject) {
					var image = document.createElement("img");
					image.crossOrigin = "";
					image.src = url;
					L.DomEvent.on(image, "load", resolve.bind(this$1$1, image));
					L.DomEvent.on(image, "error", reject.bind(this$1$1, image));
				})
			);
		};

		for (var i = 0; i < this$1$1.options.textures.length && i < 8; i++) loop( i );

		Promise.all(texFetches).then(function (textureImages) {
			// 			if (!this._map) { return; }
			// 			console.log(textureImages);
			var gl = this$1$1._gl;
			for (var i = 0, l = this$1$1.options.textures.length; i < l && i < 8; i++) {
				gl.activeTexture(gl.TEXTURE0 + i);
				gl.bindTexture(gl.TEXTURE_2D, (this$1$1._textures[i] = gl.createTexture()));
				gl.texImage2D(
					gl.TEXTURE_2D,
					0,
					gl.RGBA,
					textureImages[i].naturalWidth,
					textureImages[i].naturalWidth,
					0,
					gl.RGBA,
					gl.UNSIGNED_BYTE,
					null
				);
				gl.texImage2D(
					gl.TEXTURE_2D,
					0,
					gl.RGBA,
					gl.RGBA,
					gl.UNSIGNED_BYTE,
					textureImages[i]
				);
				gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
				gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_NEAREST);
				gl.generateMipmap(gl.TEXTURE_2D);
				gl.uniform1i(gl.getUniformLocation(this$1$1._glProgram, "uTexture" + i), i);
			}

			this$1$1._texturesAreLoaded = true;
			this$1$1._animFrameRequest = L.Util.requestAnimFrame(this$1$1.render, this$1$1);
		});
	},

	// Redoes the attribute and vertex buffers
	// This happens every time a marker is added/removed, or the shader is updated
	// just before a render, triggered when the buffers are marked dirty.
	_redoBuffers: function _redoBuffers() {
		// I don't really care for performance here. Every time the markers change,
		// redo all markers. Obviously the O(n) complexity is not good.

		if (!this._map) { return; }
		if (!this._glProgram) { return; }

		var gl = this._gl;
		var l = this._markers.length;

		// The main GL buffer stores all the data. Write-only. Vertex data will
		// be pushed into this buffer where needed.
		this._glBuffer = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, this._glBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, l * 4 * this._bytesPerVertex, gl.STATIC_DRAW);

		for (var i = 0; i < l; i++) {
			var marker = this._markers[i];
			var crsCoords = this._map.options.crs.project(marker._latLng);

			// Common data for all four vertices
			var commonVertexData = [
				crsCoords.x,
				crsCoords.y,
				marker._latLng.lng,
				marker._latLng.lat ];
			for (var a in this.options.attributes) {
				var attribName = this.options.attributes[a];
				commonVertexData.push(marker.options[attribName]);
			}

			// Data for each vertex is the extrude coords, which are different
			// for each, and then all the common data.
			i * 4 * this._bytesPerVertex;

			var markerVertices = new Float32Array(
				[-1, -1]
					.concat(commonVertexData)
					.concat([1, -1])
					.concat(commonVertexData)
					.concat([-1, 1])
					.concat(commonVertexData)
					.concat([1, 1])
					.concat(commonVertexData)
			);

			gl.bufferSubData(gl.ARRAY_BUFFER, i * 4 * this._bytesPerVertex, markerVertices);

			// console.log('Buffers redone. Vertices for marker ', i, ': ', markerVertex1, markerVertex2, markerVertex3, markerVertex4);
			// console.log('Buffers redone. Vertices for marker ', i, ': ', markerVertices);
		}

		// 		this._bindAttrib(this._aExtrudePosition, 2, gl.FLOAT,  false,  0,  0);
		this._bindAttrib(this._aExtrudePosition, 2, gl.FLOAT, false, this._bytesPerVertex, 0);
		this._bindAttrib(this._aCRSPosition, 2, gl.FLOAT, false, this._bytesPerVertex, 8);
		this._bindAttrib(this._aLatLngPosition, 2, gl.FLOAT, false, this._bytesPerVertex, 16);

		for (var i$1 in this.options.attributes) {
			var attribName$1 = this.options.attributes[i$1];
			// 			console.log('Attrib ', i, ' named ', attribName, ' at ', this._attribPositions[ attribName ]);
			this._bindAttrib(
				this._attribPositions[attribName$1],
				1,
				gl.FLOAT,
				false,
				this._bytesPerVertex,
				24 + i$1 * 4
			);
		}

		// Overwrite the vertex indices in the elements array
		var indices = [];
		for (var j = 0; j < l; j++) {
			var j2 = j * 4;
			indices.push(j2 + 0, j2 + 1, j2 + 2, j2 + 1, j2 + 2, j2 + 3);
		}

		this._glElementBuffer = gl.createBuffer();
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this._glElementBuffer);
		gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);

		this._buffersAreDirty = false;
	},

	_getTransformMatrix: function _getTransformMatrix() {
		var crs = this._map.options.crs;
		var CRSCenter = crs.project(this._center);
		var pxSize = crs.transformation.untransform(L.point([1, 1]), 1); /// TODO: Use pxSize as uniform too???
		var mapPxSize = this._bounds.getSize();
		var CRSUnitsPerPx = mapPxSize.divideBy(crs.scale(this._zoom));
		var half = pxSize.scaleBy(CRSUnitsPerPx);

		var transformMatrix = identityMatrix();
		transformMatrix = matrixMultiply(
			transformMatrix,
			translationMatrix([-CRSCenter.x, -CRSCenter.y, 0])
		);

		transformMatrix = matrixMultiply(
			transformMatrix,
			scaleMatrix([1 / half.x, -1 / half.y, 1])
		);

		return transformMatrix;
	},

	// Small utility function
	_bindAttrib: function _bindAttrib(attribIndex, size, type, normalized, stride, offset) {
		if ( stride === void 0 ) stride = 0;
		if ( offset === void 0 ) offset = 0;

		if (attribIndex === -1) { return; }
		this._gl.enableVertexAttribArray(attribIndex);
		this._gl.vertexAttribPointer(attribIndex, size, type, normalized, stride, offset);
	},

	// The 'render' method is public so developers can call it after modifying
	// uniforms.
	render: function render() {
		var this$1$1 = this;

		if (!this._map) { return; }
		if (this._alreadyRenderedThisFrame) { return; }

		this._alreadyRenderedThisFrame = true;
		L.Util.requestAnimFrame(function () {
			this$1$1._alreadyRenderedThisFrame = false;
		});

		this._animFrameRequest = false;
		this._rendering = true;

		var gl = this._gl;

		if (!gl) {
			// Context lost, maybe?
			console.warn("Cannot render without a GL context");
			return;
		}
		if (gl.isContextLost()) {
			console.error("No GL context when trying to render");
			return false;
		}

		var program = this._glProgram ? this._glProgram : this._glCreateProgram();

		if (!program) {
			// Program linking problem, maybe?
			console.warn("Cannot render without a GL program");
			return;
		}

		if (this._buffersAreDirty) {
			this._redoBuffers();
		}

		// Bind uniforms
		gl.uniformMatrix4fv(
			this._uniformPositions.uTransformMatrix,
			false,
			this._getTransformMatrix()
		);
		gl.uniform1f(this._uniformPositions.uNow, performance.now());
		var mapSize = this._bounds.getSize();
		gl.uniform2f(this._uniformPositions.uPixelSize, 2 / mapSize.x, 2 / mapSize.y);

		// console.log('Render, transform matrix is', this._getTransformMatrix());

		gl.clearColor(0.5, 0.5, 0.5, 0.0);
		gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
		// gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
		// gl.clear(gl.COLOR_BUFFER_BIT);

		// gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

		// gl.useProgram(program);

		/// TODO: Loop through this.options.uniforms and bind them

		// gl.bindBuffer(gl.ARRAY_BUFFER, this._glBuffer);
		// this._bindAttrib(this._aExtrudePosition, 2, gl.FLOAT,  false,  this._bytesPerVertex,  0);
		// this._bindAttrib(this._aCRSPosition,     2, gl.FLOAT,  false,  this._bytesPerVertex,  8);
		// this._bindAttrib(this._aLatLngPosition,  2, gl.FLOAT,  false,  this._bytesPerVertex,  16);

		/// TODO: Loop through custom attributes

		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this._glElementBuffer);

		gl.drawElements(
			gl.TRIANGLES, // gl.TRIANGLES,
			this._markers.length * 6 /*6*/, // two triangles per marker
			gl.UNSIGNED_SHORT,
			0
		);

		this.fire("render");

		this._rendering = false;
		if (this._uniformPositions.uNow !== null) {
			this._animFrameRequest = L.Util.requestAnimFrame(this.render, this);
		}
	},
});