var gtadb = window.gtadb || {};
window.gtadb = gtadb;

gtadb.Map3D = function(options) {

    if (!(this instanceof gtadb.Map3D)) {
        return new gtadb.Map3D(options);
    }

    let that = this;
    let self = {
        mapW: 32768,
        mapH: 32768,
        minX: -16000,
        maxX: 4000,
        minY: -8000,
        maxY: 12000,
        minZ: 0,
        maxZ: 6,
        maxRenderZ: 6,
        maxTilesPerLayer: 256,
        minPitch: -1.05,
        maxPitch: 1.5,
        minNavigationEyeY: 10,
        clickMoveTolerance: 5,
        skyColor: [110, 184, 235],
        zeroX: 16384,
        zeroY: 16384,
        tileSize: 256,
        tileRoot: "/tiles",
        backgroundColors: {
            "original": [93, 124, 141],
            "elevation": [255, 234, 215],
            "satellite": [13, 43, 79],
            "hybrid": [10, 30, 54],
            "terrain": [78, 177, 208],
            "roadmap": [24, 97, 173],
            "radar": [56, 73, 80],
            "yanis,7": [24, 97, 173],
            "yanis,8": [44, 103, 164],
            "yanis,9": [44, 103, 164],
            "yanis,10": [44, 103, 164],
            "yanis,11": [44, 103, 164],
            "yanis,12": [44, 103, 164],
            "dupzor,51": [44, 103, 164],
        },
        tileSetRanges: {
            "original": {0: [[1, 1], [2, 2]], 1: [[3, 3], [4, 4]], 2: [[6, 6], [9, 8]], 3: [[13, 13], [18, 17]], 4: [[27, 27], [37, 34]], 5: [[54, 54], [75, 68]], 6: [[109, 109], [151, 137]]},
            "elevation": {0: [[1, 1], [2, 2]], 1: [[3, 3], [4, 4]], 2: [[6, 6], [9, 8]], 3: [[13, 13], [18, 17]], 4: [[27, 27], [37, 34]], 5: [[54, 54], [75, 68]], 6: [[109, 109], [151, 137]]},
            "satellite": {0: [[1, 0], [2, 2]], 1: [[2, 1], [5, 5]], 2: [[5, 3], [10, 10]], 3: [[11, 7], [20, 20]], 4: [[23, 15], [41, 41]], 5: [[47, 31], [83, 83]], 6: [[95, 62], [166, 167]]},
            "hybrid": {0: [[1, 0], [2, 2]], 1: [[2, 1], [5, 4]], 2: [[5, 3], [11, 9]], 3: [[10, 7], [22, 19]], 4: [[20, 15], [45, 39]], 5: [[41, 31], [90, 79]], 6: [[83, 62], [180, 159]]},
            "terrain": {0: [[1, 0], [2, 2]], 1: [[2, 1], [5, 5]], 2: [[5, 3], [10, 10]], 3: [[11, 7], [20, 20]], 4: [[23, 15], [41, 41]], 5: [[47, 31], [83, 83]], 6: [[95, 62], [166, 167]]},
            "roadmap": {0: [[1, 0], [2, 2]], 1: [[2, 1], [5, 4]], 2: [[5, 3], [11, 9]], 3: [[10, 7], [22, 19]], 4: [[20, 15], [45, 39]], 5: [[41, 31], [90, 79]], 6: [[83, 62], [180, 159]]},
            "radar": {0: [[1, 0], [2, 2]], 1: [[2, 1], [5, 5]], 2: [[5, 3], [10, 10]], 3: [[11, 7], [20, 20]], 4: [[23, 15], [41, 41]], 5: [[47, 31], [83, 83]], 6: [[95, 62], [166, 167]]},
            "dupzor,51": {0: [[0, 0], [2, 2]], 1: [[0, 1], [4, 5]], 2: [[0, 2], [9, 11]], 3: [[0, 4], [19, 23]], 4: [[0, 8], [38, 47]], 5: [[0, 17], [77, 94]], 6: [[1, 34], [155, 188]]},
            "yanis,12": {0: [[0, 0], [2, 2]], 1: [[0, 1], [4, 5]], 2: [[0, 2], [9, 11]], 3: [[0, 4], [19, 23]], 4: [[0, 8], [38, 47]], 5: [[0, 17], [77, 95]], 6: [[0, 34], [155, 190]]}
        },
        defaults: {
            currentLandmarks: null,
            focused: false,
            landmarks: [],
            parentElement: document.body,
            selected: null,
            tileSet: "yanis,12",
            v: 6,
            x: -4000,
            y: 2000,
            z: 1,
        }
    };

    self.options = {...self.defaults, ...(options || {})};
    Object.entries(self.options).forEach(function([key, value]) {
        self[key] = value;
    });
    self.currentLandmarks = self.currentLandmarks || self.landmarks.slice();
    self.landmarksById = self.landmarks.reduce(function(a, landmark) {
        a[landmark.id] = landmark;
        return a;
    }, {});
    self.l = self.selected;
    self.target = [self.x, self.y, 0];
    self.distance = distanceFromZ(self.z);
    self.yaw = -0.72;
    self.pitch = 0.92;
    self.vfov = 45;
    self.tiles = new Map();
    self.backgroundColor = [44, 103, 164];
    self.renderPending = false;
    self.keys = {};
    self.keyboardFrame = null;
    self.keyboardTimestamp = null;
    self.wheelEndTimer = null;

    self.element = document.createElement("div");
    self.element.id = "map3d";
    that.element = self.element;
    self.scene = document.createElement("canvas");
    self.scene.id = "map3dScene";
    self.overlay = document.createElement("canvas");
    self.overlay.id = "map3dOverlay";
    self.element.appendChild(self.scene);
    self.element.appendChild(self.overlay);
    self.parentElement.appendChild(self.element);
    self.gl = self.scene.getContext("webgl", {antialias: true, alpha: false});
    self.ctx = self.overlay.getContext("2d");
    if (!self.gl) {
        throw new Error("WebGL unavailable");
    }
    updateBackgroundColor();

    that.addEventListener = function() {
        self.element.addEventListener.apply(self.element, arguments);
    };
    that.removeEventListener = function() {
        self.element.removeEventListener.apply(self.element, arguments);
    };
    that.dispatchEvent = function() {
        self.element.dispatchEvent.apply(self.element, arguments);
    };

    that.show = function() {
        self.element.style.display = "block";
        self.onResize();
        self.render();
    };
    that.hide = function() {
        self.element.style.display = "none";
    };
    that.get = function() {
        return {
            focused: self.focused,
            isAnimating: false,
            l: self.l,
            selected: self.l,
            targetX: self.target[0],
            targetY: self.target[1],
            targetZ: self.z,
            tileSet: self.tileSet,
            v: self.v,
            x: self.target[0],
            y: self.target[1],
            z: self.z,
        };
    };
    that.set = function(options) {
        options = options || {};
        if ("focused" in options) self.focused = options.focused;
        if ("landmarks" in options) {
            self.landmarks = options.landmarks;
            self.landmarksById = self.landmarks.reduce(function(a, landmark) {
                a[landmark.id] = landmark;
                return a;
            }, {});
        }
        if ("currentLandmarks" in options) self.currentLandmarks = options.currentLandmarks;
        if ("selected" in options) self.selectLandmark(options.selected);
        if ("tileSet" in options && options.tileSet != self.tileSet) {
            self.tileSet = options.tileSet;
            self.tiles.clear();
            updateBackgroundColor();
        }
        if ("v" in options && options.v != self.v) {
            self.v = options.v;
            self.tiles.clear();
            updateBackgroundColor();
        }
        if ("x" in options || "y" in options || "z" in options) {
            self.setTarget(
                "x" in options ? options.x : self.target[0],
                "y" in options ? options.y : self.target[1],
                "z" in options ? options.z : self.z,
                true
            );
        } else {
            self.render();
        }
    };

    function compileShader(type, source) {
        const shader = self.gl.createShader(type);
        self.gl.shaderSource(shader, source);
        self.gl.compileShader(shader);
        if (!self.gl.getShaderParameter(shader, self.gl.COMPILE_STATUS)) {
            throw new Error(self.gl.getShaderInfoLog(shader));
        }
        return shader;
    }

    function createProgram(vertex, fragment) {
        const program = self.gl.createProgram();
        self.gl.attachShader(program, compileShader(self.gl.VERTEX_SHADER, vertex));
        self.gl.attachShader(program, compileShader(self.gl.FRAGMENT_SHADER, fragment));
        self.gl.linkProgram(program);
        if (!self.gl.getProgramParameter(program, self.gl.LINK_STATUS)) {
            throw new Error(self.gl.getProgramInfoLog(program));
        }
        return program;
    }

    const tileProgram = createProgram(`
        attribute vec3 a_position;
        attribute vec2 a_uv;
        uniform mat4 u_matrix;
        varying vec2 v_uv;
        void main() {
            v_uv = a_uv;
            gl_Position = u_matrix * vec4(a_position, 1.0);
        }
    `, `
        precision mediump float;
        uniform sampler2D u_texture;
        varying vec2 v_uv;
        void main() {
            gl_FragColor = texture2D(u_texture, v_uv);
        }
    `);
    const colorProgram = createProgram(`
        attribute vec3 a_position;
        uniform mat4 u_matrix;
        void main() {
            gl_Position = u_matrix * vec4(a_position, 1.0);
        }
    `, `
        precision mediump float;
        uniform vec4 u_color;
        void main() {
            gl_FragColor = u_color;
        }
    `);

    const tileBuffer = self.gl.createBuffer();
    const solidBuffer = self.gl.createBuffer();
    const tileLoc = {
        position: self.gl.getAttribLocation(tileProgram, "a_position"),
        uv: self.gl.getAttribLocation(tileProgram, "a_uv"),
        matrix: self.gl.getUniformLocation(tileProgram, "u_matrix"),
        texture: self.gl.getUniformLocation(tileProgram, "u_texture"),
    };
    const colorLoc = {
        position: self.gl.getAttribLocation(colorProgram, "a_position"),
        matrix: self.gl.getUniformLocation(colorProgram, "u_matrix"),
        color: self.gl.getUniformLocation(colorProgram, "u_color"),
    };

    function subtract(a, b) { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; }
    function add(a, b) { return [a[0] + b[0], a[1] + b[1], a[2] + b[2]]; }
    function scale(v, s) { return [v[0] * s, v[1] * s, v[2] * s]; }
    function dot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
    function cross(a, b) {
        return [
            a[1] * b[2] - a[2] * b[1],
            a[2] * b[0] - a[0] * b[2],
            a[0] * b[1] - a[1] * b[0],
        ];
    }
    function normalize(v) {
        const length = Math.hypot(v[0], v[1], v[2]) || 1;
        return [v[0] / length, v[1] / length, v[2] / length];
    }
    function clamp(n, min, max) {
        return Math.max(min, Math.min(max, n));
    }
    function distanceFromZ(z) {
        return 34000 / Math.pow(2, z);
    }
    function syncDistanceFromZ() {
        self.z = clamp(self.z, self.minZ, self.maxZ);
        self.distance = distanceFromZ(self.z);
    }
    function clampTarget() {
        self.target[0] = clamp(self.target[0], self.minX, self.maxX);
        self.target[1] = clamp(self.target[1], self.minY, self.maxY);
        self.target[2] = self.target[2] || 0;
        syncDistanceFromZ();
    }
    function constrainedValue(current, next, min, max) {
        if (current < min) return next < current ? current : Math.min(next, max);
        if (current > max) return next > current ? current : Math.max(next, min);
        return clamp(next, min, max);
    }
    function panBy(dx, dy) {
        const right = [Math.cos(self.yaw), -Math.sin(self.yaw)];
        const forward = [-Math.sin(self.yaw), Math.cos(self.yaw)];
        self.target[0] += right[0] * dx + forward[0] * dy;
        self.target[1] += right[1] * dx + forward[1] * dy;
    }
    function mat4Multiply(a, b) {
        const out = new Float32Array(16);
        for (let row = 0; row < 4; row++) {
            for (let col = 0; col < 4; col++) {
                out[col * 4 + row] =
                    a[0 * 4 + row] * b[col * 4 + 0] +
                    a[1 * 4 + row] * b[col * 4 + 1] +
                    a[2 * 4 + row] * b[col * 4 + 2] +
                    a[3 * 4 + row] * b[col * 4 + 3];
            }
        }
        return out;
    }
    function perspective(fovy, aspect, near, far) {
        const f = 1 / Math.tan(fovy / 2);
        const nf = 1 / (near - far);
        return new Float32Array([
            f / aspect, 0, 0, 0,
            0, f, 0, 0,
            0, 0, (far + near) * nf, -1,
            0, 0, 2 * far * near * nf, 0,
        ]);
    }
    function lookAt(eye, target, up) {
        const z = normalize(subtract(eye, target));
        const x = normalize(cross(up, z));
        const y = cross(z, x);
        return new Float32Array([
            x[0], y[0], z[0], 0,
            x[1], y[1], z[1], 0,
            x[2], y[2], z[2], 0,
            -dot(x, eye), -dot(y, eye), -dot(z, eye), 1,
        ]);
    }
    function transformPoint(matrix, point) {
        const x = point[0], y = point[1], z = point[2];
        const w = matrix[3] * x + matrix[7] * y + matrix[11] * z + matrix[15];
        return [
            (matrix[0] * x + matrix[4] * y + matrix[8] * z + matrix[12]) / w,
            (matrix[1] * x + matrix[5] * y + matrix[9] * z + matrix[13]) / w,
            (matrix[2] * x + matrix[6] * y + matrix[10] * z + matrix[14]) / w,
        ];
    }
    function worldToGl(x, y, z) {
        return [x, z || 0, -y];
    }
    function cameraEye() {
        const cp = Math.cos(self.pitch);
        return [
            self.target[0] + Math.sin(self.yaw) * cp * self.distance,
            self.target[2] + Math.sin(self.pitch) * self.distance,
            -self.target[1] + Math.cos(self.yaw) * cp * self.distance,
        ];
    }
    function navigationEyeAllowed(previousY, nextY) {
        if (previousY < self.minNavigationEyeY) return nextY >= previousY;
        return nextY >= self.minNavigationEyeY;
    }
    function applyNavigationChange(change) {
        const previous = {
            target: [...self.target],
            distance: self.distance,
            z: self.z,
            yaw: self.yaw,
            pitch: self.pitch,
        };
        const previousY = cameraEye()[1];
        change();
        clampTarget();
        self.pitch = constrainedValue(previous.pitch, self.pitch, self.minPitch, self.maxPitch);
        if (navigationEyeAllowed(previousY, cameraEye()[1])) return true;
        self.target = previous.target;
        self.distance = previous.distance;
        self.z = previous.z;
        self.yaw = previous.yaw;
        self.pitch = previous.pitch;
        return false;
    }
    function emitMapChange(end) {
        self.element.dispatchEvent(new CustomEvent("mapchange", {detail: that.get()}));
        if (end) self.element.dispatchEvent(new CustomEvent("mapchangeend", {detail: that.get()}));
    }
    function scheduleMapChangeEnd() {
        if (self.wheelEndTimer) window.clearTimeout(self.wheelEndTimer);
        self.wheelEndTimer = window.setTimeout(function() {
            self.wheelEndTimer = null;
            emitMapChange(true);
        }, 180);
    }
    function viewProjection() {
        const projection = perspective(self.vfov * Math.PI / 180, self.width / self.height, 1, 90000);
        return mat4Multiply(projection, lookAt(cameraEye(), worldToGl(self.target[0], self.target[1], self.target[2]), [0, 1, 0]));
    }
    function groundPoint(clientX, clientY) {
        const rect = self.scene.getBoundingClientRect();
        const ndcX = ((clientX - rect.left) / rect.width) * 2 - 1;
        const ndcY = -(((clientY - rect.top) / rect.height) * 2 - 1);
        const eye = cameraEye();
        const forward = normalize(subtract(worldToGl(self.target[0], self.target[1], self.target[2]), eye));
        const right = normalize(cross(forward, [0, 1, 0]));
        const up = normalize(cross(right, forward));
        const tan = Math.tan(self.vfov * Math.PI / 360);
        const dir = normalize(add(add(forward, scale(right, ndcX * tan * self.width / self.height)), scale(up, ndcY * tan)));
        if (Math.abs(dir[1]) < 0.0001) return null;
        const t = -eye[1] / dir[1];
        if (t <= 0) return null;
        const p = add(eye, scale(dir, t));
        return [p[0], -p[2], 0];
    }
    function createTexture(image) {
        const gl = self.gl;
        const texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
        return texture;
    }
    function updateBackgroundColor() {
        self.backgroundColor = self.backgroundColors[self.tileSet] || self.backgroundColors["yanis,12"];
        self.element.style.backgroundColor = `rgb(${self.skyColor.join(", ")})`;
    }
    function tileUrl(z, x, y) {
        return `${self.tileRoot}/${self.v}/${self.tileSet}/${z}/${z},${y},${x}.jpg`;
    }
    function tileWorldBounds(z, x, y) {
        const tilesPerSide = 4 * Math.pow(2, z);
        const tileMeters = self.mapW / tilesPerSide;
        const west = x * tileMeters - self.zeroX;
        const east = west + tileMeters;
        const north = self.zeroY - y * tileMeters;
        const south = north - tileMeters;
        return {west, east, north, south};
    }
    function loadTile(z, x, y) {
        const key = `${self.v}/${self.tileSet}/${z}/${x}/${y}`;
        if (self.tiles.has(key)) return self.tiles.get(key);
        const tile = {z, x, y, loaded: false, failed: false, texture: null};
        self.tiles.set(key, tile);
        const image = new Image();
        image.onload = function() {
            tile.texture = createTexture(image);
            tile.loaded = true;
            self.scheduleRender();
        };
        image.onerror = function() {
            tile.failed = true;
        };
        image.src = tileUrl(z, x, y);
        return tile;
    }
    function visibleTiles(z, options) {
        options = options || {};
        const range = self.tileSetRanges[self.tileSet] && self.tileSetRanges[self.tileSet][z];
        if (!range) return [];
        const [[rx0, ry0], [rx1, ry1]] = range;
        const radius = options.radius || clamp(self.distance * 0.85, 1400, 4200);
        const limit = options.limit || self.maxTilesPerLayer;
        const tilesPerSide = 4 * Math.pow(2, z);
        const tileMeters = self.mapW / tilesPerSide;
        const minX = clamp(Math.floor((self.target[0] - radius + self.zeroX) / tileMeters), rx0, rx1);
        const maxX = clamp(Math.floor((self.target[0] + radius + self.zeroX) / tileMeters), rx0, rx1);
        const minY = clamp(Math.floor((self.zeroY - (self.target[1] + radius)) / tileMeters), ry0, ry1);
        const maxY = clamp(Math.floor((self.zeroY - (self.target[1] - radius)) / tileMeters), ry0, ry1);
        const tiles = [];
        const cx = (minX + maxX) / 2;
        const cy = (minY + maxY) / 2;
        for (let y = minY; y <= maxY; y++) {
            for (let x = minX; x <= maxX; x++) {
                tiles.push({x, y, d: Math.hypot(x - cx, y - cy)});
            }
        }
        tiles.sort(function(a, b) {
            return a.d - b.d;
        });
        return tiles.slice(0, limit).map(function(tile) {
            return loadTile(z, tile.x, tile.y);
        });
    }
    function currentTileZ() {
        const approx = Math.round(7.1 - Math.log2(Math.max(900, self.distance) / 850));
        return clamp(approx, 0, self.maxRenderZ);
    }
    function drawTile(tile, matrix) {
        if (!tile.loaded) return false;
        const {west, east, north, south} = tileWorldBounds(tile.z, tile.x, tile.y);
        const vertices = new Float32Array([
            west, -0.05, -north, 0, 1,
            east, -0.05, -north, 1, 1,
            east, -0.05, -south, 1, 0,
            west, -0.05, -north, 0, 1,
            east, -0.05, -south, 1, 0,
            west, -0.05, -south, 0, 0,
        ]);
        const gl = self.gl;
        gl.useProgram(tileProgram);
        gl.uniformMatrix4fv(tileLoc.matrix, false, matrix);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, tile.texture);
        gl.uniform1i(tileLoc.texture, 0);
        gl.bindBuffer(gl.ARRAY_BUFFER, tileBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STREAM_DRAW);
        gl.enableVertexAttribArray(tileLoc.position);
        gl.vertexAttribPointer(tileLoc.position, 3, gl.FLOAT, false, 20, 0);
        gl.enableVertexAttribArray(tileLoc.uv);
        gl.vertexAttribPointer(tileLoc.uv, 2, gl.FLOAT, false, 20, 12);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
        return true;
    }
    function drawWater(matrix) {
        const gl = self.gl;
        const extent = 250000;
        const vertices = new Float32Array([
            -extent, -2, -extent, extent, -2, -extent, extent, -2, extent,
            -extent, -2, -extent, extent, -2, extent, -extent, -2, extent,
        ]);
        gl.useProgram(colorProgram);
        gl.uniformMatrix4fv(colorLoc.matrix, false, matrix);
        gl.uniform4f(
            colorLoc.color,
            self.backgroundColor[0] / 255,
            self.backgroundColor[1] / 255,
            self.backgroundColor[2] / 255,
            1
        );
        gl.bindBuffer(gl.ARRAY_BUFFER, solidBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STREAM_DRAW);
        gl.enableVertexAttribArray(colorLoc.position);
        gl.vertexAttribPointer(colorLoc.position, 3, gl.FLOAT, false, 0, 0);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
    }
    self.renderMarkers = function(matrix) {
        const ctx = self.ctx;
        ctx.clearRect(0, 0, self.width, self.height);
        const markers = [];
        self.currentLandmarks.forEach(function(landmark) {
            if (landmark.igCoordinates === null) return;
            const [x, y] = landmark.igCoordinates;
            const p = transformPoint(matrix, worldToGl(x, y, 0.8));
            if (p[2] < -1 || p[2] > 1) return;
            const sx = (p[0] * 0.5 + 0.5) * self.width;
            const sy = (-p[1] * 0.5 + 0.5) * self.height;
            if (sx < -24 || sx > self.width + 24 || sy < -24 || sy > self.height + 24) return;
            markers.push({landmark, x: sx, y: sy});
        });
        markers.sort(function(a, b) {
            return a.y - b.y;
        }).forEach(function(marker) {
            const selected = marker.landmark.id == self.l;
            drawMarkerPin(ctx, marker.x, marker.y, marker.landmark.color, selected);
        });
        self.visibleMarkers = markers;
    };
    function drawMarkerPin(ctx, x, y, color, selected) {
        const size = 24;
        const border = selected ? 4 : 2;
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(Math.PI / 4);
        ctx.fillStyle = "#" + color;
        ctx.strokeStyle = "rgb(255,255,255)";
        ctx.lineWidth = border;
        ctx.beginPath();
        markerPinPath(ctx, -size, -size, size, size, size / 2);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
    }
    function markerPinPath(ctx, x, y, w, h, r) {
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h);
        ctx.lineTo(x + r, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();
    }
    self.render = function() {
        self.renderPending = false;
        self.onResize(false);
        const gl = self.gl;
        const matrix = viewProjection();
        gl.viewport(0, 0, self.width, self.height);
        gl.clearColor(self.skyColor[0] / 255, self.skyColor[1] / 255, self.skyColor[2] / 255, 1);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        gl.disable(gl.DEPTH_TEST);
        drawWater(matrix);
        const detailZ = currentTileZ();
        const baseZ = Math.min(2, detailZ);
        visibleTiles(baseZ, {radius: Math.max(7600, self.distance * 1.2), limit: self.maxTilesPerLayer}).forEach(function(tile) {
            drawTile(tile, matrix);
        });
        visibleTiles(detailZ, {radius: clamp(self.distance * 0.45, 600, 2400), limit: self.maxTilesPerLayer}).forEach(function(tile) {
            if (!drawTile(tile, matrix) && detailZ > baseZ) {
                const parentZ = detailZ - 1;
                const scale = Math.pow(2, detailZ - parentZ);
                drawTile(loadTile(parentZ, Math.floor(tile.x / scale), Math.floor(tile.y / scale)), matrix);
            }
        });
        self.renderMarkers(matrix);
    };
    self.scheduleRender = function() {
        if (self.renderPending) return;
        self.renderPending = true;
        requestAnimationFrame(self.render);
    };
    self.setTarget = function(x, y, z, immediate) {
        self.target[0] = clamp(x, self.minX, self.maxX);
        self.target[1] = clamp(y, self.minY, self.maxY);
        self.z = clamp(z, self.minZ, self.maxZ);
        syncDistanceFromZ();
        self.render();
        emitMapChange(immediate);
    };
    self.selectLandmark = function(id) {
        self.l = id;
        self.render();
    };
    self.onResize = function(render) {
        const dpr = Math.min(2, window.devicePixelRatio || 1);
        const width = Math.max(1, Math.floor(window.innerWidth * dpr));
        const height = Math.max(1, Math.floor(window.innerHeight * dpr));
        if (self.scene.width != width || self.scene.height != height) {
            self.scene.width = width;
            self.scene.height = height;
            self.overlay.width = width;
            self.overlay.height = height;
            self.width = width;
            self.height = height;
            if (render !== false) self.render();
        }
    };
    self.onWheel = function(e) {
        e.preventDefault();
        self.focused = true;
        const before = groundPoint(e.clientX, e.clientY);
        const changed = applyNavigationChange(function() {
            self.z -= e.deltaY * 0.005;
            syncDistanceFromZ();
            const after = before && groundPoint(e.clientX, e.clientY);
            if (before && after) {
                self.target[0] += before[0] - after[0];
                self.target[1] += before[1] - after[1];
            }
        });
        if (changed) {
            self.render();
            emitMapChange(false);
            scheduleMapChangeEnd();
        }
    };
    self.onMousedown = function(e) {
        self.focused = true;
        const hit = self.markerAt(e.clientX, e.clientY);
        if (hit) {
            if (hit.landmark.id == self.l && e.metaKey) {
                self.selectLandmark(null);
                self.element.dispatchEvent(new CustomEvent("select", {detail: {id: null}}));
            } else if (hit.landmark.id != self.l) {
                self.selectLandmark(hit.landmark.id);
                self.element.dispatchEvent(new CustomEvent("select", {detail: {id: hit.landmark.id}}));
            }
            return;
        }
        const startX = e.clientX;
        const startY = e.clientY;
        let lastX = e.clientX;
        let lastY = e.clientY;
        let dragGround = groundPoint(e.clientX, e.clientY);
        let dragging = false;
        function onMousemove(event) {
            const totalX = event.clientX - startX;
            const totalY = event.clientY - startY;
            if (!dragging) {
                if (Math.hypot(totalX, totalY) <= self.clickMoveTolerance) return;
                dragging = true;
                self.element.classList.add("dragging");
            }
            const dx = event.clientX - lastX;
            const dy = event.clientY - lastY;
            lastX = event.clientX;
            lastY = event.clientY;
            const changed = applyNavigationChange(function() {
                if (event.metaKey || event.ctrlKey) {
                    self.yaw -= dx * 0.006;
                    self.pitch = constrainedValue(self.pitch, self.pitch + dy * 0.004, self.minPitch, self.maxPitch);
                    dragGround = groundPoint(event.clientX, event.clientY);
                } else {
                    const currentGround = dragGround && groundPoint(event.clientX, event.clientY);
                    if (currentGround) {
                        self.target[0] += dragGround[0] - currentGround[0];
                        self.target[1] += dragGround[1] - currentGround[1];
                    } else {
                        const scale = self.distance / Math.max(self.width, self.height);
                        panBy(-dx * scale * 1.6, -dy * scale * 1.6);
                        dragGround = groundPoint(event.clientX, event.clientY);
                    }
                }
            });
            if (changed) {
                self.render();
                emitMapChange(false);
            }
        }
        function onMouseup() {
            self.element.classList.remove("dragging");
            document.removeEventListener("mousemove", onMousemove);
            document.removeEventListener("mouseup", onMouseup);
            if (dragging) emitMapChange(true);
        }
        document.addEventListener("mousemove", onMousemove);
        document.addEventListener("mouseup", onMouseup);
    };
    self.markerAt = function(clientX, clientY) {
        const rect = self.overlay.getBoundingClientRect();
        const x = (clientX - rect.left) * (self.width / rect.width);
        const y = (clientY - rect.top) * (self.height / rect.height);
        for (let i = self.visibleMarkers.length - 1; i >= 0; i--) {
            const marker = self.visibleMarkers[i];
            if (Math.hypot(marker.x - x, marker.y - y) <= 22) return marker;
        }
        return null;
    };
    self.onMousemove = function(e) {
        if (self.element.classList.contains("dragging")) return;
        self.element.classList.toggle("marker-hover", Boolean(self.markerAt(e.clientX, e.clientY)));
    };
    self.updateKeyboardNavigation = function(timestamp) {
        if (self.keyboardFrame === null) return;
        const frameDuration = 1000 / 60;
        const deltaFactor = self.keyboardTimestamp === null ? 1 : Math.min((timestamp - self.keyboardTimestamp) / frameDuration, 2);
        self.keyboardTimestamp = timestamp;
        const step = self.distance * 0.018 * deltaFactor;
        const zoomStep = 0.025 * deltaFactor;
        const rotateStep = 0.026 * deltaFactor;
        const pitchStep = 0.018 * deltaFactor;
        const forward = [Math.sin(self.yaw), Math.cos(self.yaw)];
        const right = [Math.cos(self.yaw), -Math.sin(self.yaw)];
        let dirty = false;
        const changed = applyNavigationChange(function() {
            if (self.keys["w"] || self.keys["W"]) {
                self.target[0] -= forward[0] * step;
                self.target[1] += forward[1] * step;
                dirty = true;
            }
            if (self.keys["s"] || self.keys["S"]) {
                self.target[0] += forward[0] * step;
                self.target[1] -= forward[1] * step;
                dirty = true;
            }
            if (self.keys["a"] || self.keys["A"]) {
                self.target[0] -= right[0] * step;
                self.target[1] += right[1] * step;
                dirty = true;
            }
            if (self.keys["d"] || self.keys["D"]) {
                self.target[0] += right[0] * step;
                self.target[1] -= right[1] * step;
                dirty = true;
            }
            if (self.keys["q"] || self.keys["Q"]) { self.z -= zoomStep; dirty = true; }
            if (self.keys["e"] || self.keys["E"]) { self.z += zoomStep; dirty = true; }
            if (self.keys["ArrowLeft"]) { self.yaw += rotateStep; dirty = true; }
            if (self.keys["ArrowRight"]) { self.yaw -= rotateStep; dirty = true; }
            if (self.keys["ArrowUp"]) {
                self.pitch = constrainedValue(self.pitch, self.pitch - pitchStep, self.minPitch, self.maxPitch);
                dirty = true;
            }
            if (self.keys["ArrowDown"]) {
                self.pitch = constrainedValue(self.pitch, self.pitch + pitchStep, self.minPitch, self.maxPitch);
                dirty = true;
            }
            if (self.keys["-"]) { self.z -= zoomStep; dirty = true; }
            if (self.keys["="]) { self.z += zoomStep; dirty = true; }
        });
        if (dirty && changed) {
            self.render();
            emitMapChange(false);
        }
        self.keyboardFrame = requestAnimationFrame(self.updateKeyboardNavigation);
    };
    self.onKeydown = function(e) {
        if (!self.focused || e.altKey || e.ctrlKey || e.metaKey) return;
        const activeElement = document.activeElement;
        if (activeElement && activeElement.matches("input, textarea, [contenteditable]")) return;
        if ("0123456".includes(e.key)) {
            self.setTarget(self.target[0], self.target[1], parseInt(e.key), true);
        } else if (["-", "=", "w", "W", "a", "A", "s", "S", "d", "D", "q", "Q", "e", "E", "ArrowDown", "ArrowLeft", "ArrowRight", "ArrowUp"].includes(e.key)) {
            e.preventDefault();
            self.keys[e.key] = true;
            if (self.keyboardFrame === null) {
                self.keyboardTimestamp = null;
                self.keyboardFrame = requestAnimationFrame(self.updateKeyboardNavigation);
            }
        } else if (e.key == "Escape" && self.l) {
            self.selectLandmark(null);
            self.element.dispatchEvent(new CustomEvent("select", {detail: {id: null}}));
        }
    };
    self.onKeyup = function(e) {
        if (!(e.key in self.keys)) return;
        self.keys[e.key] = false;
        if (!Object.values(self.keys).some(Boolean) && self.keyboardFrame !== null) {
            cancelAnimationFrame(self.keyboardFrame);
            self.keyboardFrame = null;
            self.keyboardTimestamp = null;
            self.element.dispatchEvent(new CustomEvent("mapchangeend", {detail: that.get()}));
        }
    };

    window.addEventListener("resize", function() { self.onResize(); });
    document.addEventListener("keydown", self.onKeydown);
    document.addEventListener("keyup", self.onKeyup);
    self.element.addEventListener("mousedown", self.onMousedown);
    self.element.addEventListener("mousemove", self.onMousemove);
    self.element.addEventListener("wheel", self.onWheel, {passive: false});
    self.onResize(false);
    self.render();

    return that;
};
