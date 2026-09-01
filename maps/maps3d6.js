var gtadb = window.gtadb || {};
window.gtadb = gtadb;

const map3d6AssetRoot = new URL(".", document.currentScript.src).href;
const map3d6Height = {
    url: "data/6/elevation.bin",
    width: 1536,
    height: 1748,
    scale: 0.083188297074,
    zero: [1108.532445611, 938.090772693],
    metersPerValue: 0.010814713959581938,
    elevationOffset: -303.1033271360121,
};
const map3d6Textures = {
    "yanis,0": {
        url: "data/6/yanis,0.png",
        scale: 0.177424,
        zero: [1902.278, 1721.760],
        background: [78, 167, 196],
    },
    "yanis,16": {
        url: "data/6/yanis,16.png",
        scale: 0.2,
        zero: [3400, 2200],
        background: [44, 103, 164],
    },
};

gtadb.Map3D6 = function(options) {

    if (!(this instanceof gtadb.Map3D6)) {
        return new gtadb.Map3D6(options);
    }

    let that = this;
    let self = {
        ambient: 0.50,
        assetRoot: map3d6AssetRoot,
        clickMoveTolerance: 5,
        currentLandmarks: null,
        distance: 17000,
        focused: false,
        height: map3d6Height,
        landmarks: [],
        maxPitch: 1.5,
        maxX: 4000,
        maxY: 12000,
        maxZ: 6,
        minNavigationEyeY: 10,
        minPitch: -1.05,
        minX: -16000,
        minY: -8000,
        minZ: 0,
        parentElement: document.body,
        selected: null,
        specular: 0.10,
        texture: null,
        textureDefinitions: map3d6Textures,
        tileSet: "yanis,16",
        v: 6,
        vfov: 45,
        x: -4000,
        y: 2000,
        yaw: -0.72,
        pitch: 0.92,
        z: 1,
    };

    Object.assign(self, options || {});
    self.currentLandmarks = self.currentLandmarks || self.landmarks.slice();
    self.l = self.selected;
    self.target = [self.x, 0, -self.y];
    self.distance = distanceFromZ(self.z);
    self.visible = false;
    self.loaded = false;
    self.loadingPromise = null;
    self.renderPending = false;
    self.heightPixels = null;
    self.heightTexture = null;
    self.surfaceTexture = null;
    self.surfaceDefinition = null;
    self.keys = {};
    self.keyboardFrame = null;
    self.keyboardTimestamp = null;
    self.wheelEndTimer = null;
    self.visibleMarkers = [];

    const height = self.height;
    height.minX = -height.zero[0] / height.scale;
    height.maxX = (height.width - height.zero[0]) / height.scale;
    height.minY = (height.zero[1] - height.height) / height.scale;
    height.maxY = height.zero[1] / height.scale;
    height.sizeX = height.maxX - height.minX;
    height.sizeY = height.maxY - height.minY;
    height.pixelMeters = 1 / height.scale;

    self.element = document.createElement("div");
    self.element.id = "map3d6";
    that.element = self.element;
    self.scene = document.createElement("canvas");
    self.scene.id = "map3d6Scene";
    self.overlay = document.createElement("canvas");
    self.overlay.id = "map3d6Overlay";
    self.loading = document.createElement("div");
    self.loading.className = "map3d6-loading";
    self.loading.textContent = "LOADING TERRAIN";
    self.element.appendChild(self.scene);
    self.element.appendChild(self.overlay);
    self.element.appendChild(self.loading);
    self.parentElement.appendChild(self.element);

    function updateBackground() {
        const definition = self.textureDefinitions[self.tileSet];
        if (!definition) return;
        const value = `rgb(${definition.background.join(", ")})`;
        self.element.style.backgroundColor = value;
        self.loading.style.backgroundColor = value;
    }

    updateBackground();

    const gl = self.scene.getContext("webgl2", {
        alpha: false,
        antialias: true,
        depth: true,
    });
    self.ctx = self.overlay.getContext("2d");
    if (!gl) {
        self.element.remove();
        throw new Error("WebGL 2 unavailable");
    }
    self.gl = gl;
    self.anisotropy = gl.getExtension("EXT_texture_filter_anisotropic")
        || gl.getExtension("WEBKIT_EXT_texture_filter_anisotropic");

    function compileShader(type, source) {
        const shader = gl.createShader(type);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            throw new Error(gl.getShaderInfoLog(shader));
        }
        return shader;
    }

    function createProgram(vertex, fragment) {
        const program = gl.createProgram();
        gl.attachShader(program, compileShader(gl.VERTEX_SHADER, vertex));
        gl.attachShader(program, compileShader(gl.FRAGMENT_SHADER, fragment));
        gl.linkProgram(program);
        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            throw new Error(gl.getProgramInfoLog(program));
        }
        return program;
    }

    const terrainProgram = createProgram(`#version 300 es
        precision highp float;

        uniform highp usampler2D u_height;
        uniform mat4 u_matrix;
        uniform ivec2 u_mesh_size;
        uniform vec2 u_height_world_min;
        uniform vec2 u_height_world_size;
        uniform vec2 u_world_min;
        uniform vec2 u_world_size;
        uniform vec2 u_texel;
        uniform float u_meters_per_value;
        uniform float u_elevation_offset;
        uniform float u_pixel_meters;

        out vec3 v_normal;
        out vec3 v_position;
        out vec2 v_world;

        float valueAt(vec2 uv) {
            ivec2 size = textureSize(u_height, 0);
            vec2 pixel = clamp(uv, 0.0, 1.0)
                * vec2(size - 1);
            ivec2 p0 = ivec2(floor(pixel));
            ivec2 p1 = min(p0 + 1, size - 1);
            vec2 amount = fract(pixel);
            float top = mix(
                float(texelFetch(u_height, ivec2(p0.x, p0.y), 0).r),
                float(texelFetch(u_height, ivec2(p1.x, p0.y), 0).r),
                amount.x
            );
            float bottom = mix(
                float(texelFetch(u_height, ivec2(p0.x, p1.y), 0).r),
                float(texelFetch(u_height, ivec2(p1.x, p1.y), 0).r),
                amount.x
            );
            return mix(top, bottom, amount.y);
        }

        float elevationAt(vec2 uv) {
            return valueAt(uv) * u_meters_per_value + u_elevation_offset;
        }

        void main() {
            int column = gl_VertexID / 2;
            int row = gl_InstanceID + gl_VertexID % 2;
            vec2 meshUv = vec2(
                float(column) / float(u_mesh_size.x - 1),
                float(row) / float(u_mesh_size.y - 1)
            );
            vec2 world = u_world_min + meshUv * u_world_size;
            vec2 heightUv = (world - u_height_world_min) / u_height_world_size;
            float elevation = elevationAt(heightUv);
            float left = elevationAt(heightUv - vec2(u_texel.x, 0.0));
            float right = elevationAt(heightUv + vec2(u_texel.x, 0.0));
            float south = elevationAt(heightUv - vec2(0.0, u_texel.y));
            float north = elevationAt(heightUv + vec2(0.0, u_texel.y));
            float dx = (right - left) / (2.0 * u_pixel_meters);
            float dy = (north - south) / (2.0 * u_pixel_meters);
            vec3 position = vec3(world.x, elevation, -world.y);

            v_normal = normalize(vec3(-dx, 1.0, dy));
            v_position = position;
            v_world = world;
            gl_Position = u_matrix * vec4(position, 1.0);
        }
    `, `#version 300 es
        precision highp float;

        uniform sampler2D u_surface;
        uniform vec2 u_surface_size;
        uniform vec2 u_surface_zero;
        uniform float u_surface_scale;
        uniform vec3 u_background;
        uniform vec3 u_eye;
        uniform float u_ambient;
        uniform float u_specular;

        in vec3 v_normal;
        in vec3 v_position;
        in vec2 v_world;
        out vec4 outColor;

        void main() {
            vec2 pixel = vec2(
                u_surface_zero.x + v_world.x * u_surface_scale,
                u_surface_zero.y - v_world.y * u_surface_scale
            );
            bool inside = all(greaterThanEqual(pixel, vec2(0.0)))
                && all(lessThanEqual(pixel, u_surface_size - vec2(1.0)));
            vec2 uv = vec2(
                pixel.x / (u_surface_size.x - 1.0),
                1.0 - pixel.y / (u_surface_size.y - 1.0)
            );
            vec3 base = inside ? texture(u_surface, uv).rgb : u_background;
            vec3 normal = normalize(v_normal);
            vec3 lightDirection = normalize(vec3(0.0, 0.82, 0.57));
            float diffuse = max(dot(normal, lightDirection), 0.0);
            float shade = u_ambient + diffuse * (1.0 - u_ambient);
            vec3 viewDirection = normalize(u_eye - v_position);
            vec3 halfDirection = normalize(lightDirection + viewDirection);
            float highlight = pow(
                max(dot(normal, halfDirection), 0.0),
                48.0
            ) * u_specular;
            outColor = vec4(base * shade + vec3(highlight), 1.0);
        }
    `);

    const uniforms = {
        ambient: gl.getUniformLocation(terrainProgram, "u_ambient"),
        background: gl.getUniformLocation(terrainProgram, "u_background"),
        elevationOffset: gl.getUniformLocation(terrainProgram, "u_elevation_offset"),
        eye: gl.getUniformLocation(terrainProgram, "u_eye"),
        height: gl.getUniformLocation(terrainProgram, "u_height"),
        heightWorldMin: gl.getUniformLocation(terrainProgram, "u_height_world_min"),
        heightWorldSize: gl.getUniformLocation(terrainProgram, "u_height_world_size"),
        matrix: gl.getUniformLocation(terrainProgram, "u_matrix"),
        meshSize: gl.getUniformLocation(terrainProgram, "u_mesh_size"),
        metersPerValue: gl.getUniformLocation(terrainProgram, "u_meters_per_value"),
        pixelMeters: gl.getUniformLocation(terrainProgram, "u_pixel_meters"),
        specular: gl.getUniformLocation(terrainProgram, "u_specular"),
        surface: gl.getUniformLocation(terrainProgram, "u_surface"),
        surfaceScale: gl.getUniformLocation(terrainProgram, "u_surface_scale"),
        surfaceSize: gl.getUniformLocation(terrainProgram, "u_surface_size"),
        surfaceZero: gl.getUniformLocation(terrainProgram, "u_surface_zero"),
        texel: gl.getUniformLocation(terrainProgram, "u_texel"),
        worldMin: gl.getUniformLocation(terrainProgram, "u_world_min"),
        worldSize: gl.getUniformLocation(terrainProgram, "u_world_size"),
    };
    self.vao = gl.createVertexArray();

    const markerProgram = createProgram(`#version 300 es
        precision highp float;

        layout(location = 0) in vec2 a_point;
        layout(location = 1) in vec3 a_position;
        layout(location = 2) in vec3 a_color;
        layout(location = 3) in float a_selected;

        uniform mat4 u_matrix;
        uniform vec2 u_viewport;
        uniform float u_size;

        out vec2 v_local;
        flat out vec3 v_color;
        flat out float v_selected;

        void main() {
            const float angle = 0.78539816339;
            mat2 rotation = mat2(
                cos(angle), sin(angle),
                -sin(angle), cos(angle)
            );
            vec2 offset = rotation * a_point * u_size;
            offset.y *= -1.0;
            vec4 clip = u_matrix * vec4(a_position, 1.0);
            clip.xy += offset * 2.0 / u_viewport * clip.w;
            gl_Position = clip;
            v_local = a_point + vec2(0.5);
            v_color = a_color;
            v_selected = a_selected;
        }
    `, `#version 300 es
        precision highp float;

        in vec2 v_local;
        flat in vec3 v_color;
        flat in float v_selected;
        out vec4 outColor;

        float markerShape(vec2 point) {
            // Corner radii: bottom-right, top-right, bottom-left, top-left.
            vec4 radii = vec4(0.0, 0.5, 0.5, 0.5);
            radii.xy = point.x > 0.0 ? radii.xy : radii.zw;
            radii.x = point.y > 0.0 ? radii.x : radii.y;
            vec2 distance = abs(point) - vec2(0.5) + radii.x;
            return min(max(distance.x, distance.y), 0.0)
                + length(max(distance, 0.0)) - radii.x;
        }

        void main() {
            float distance = markerShape(v_local);
            float antialias = fwidth(distance);
            float alpha = 1.0 - smoothstep(-antialias, antialias, distance);
            if (alpha <= 0.0) discard;
            float border = mix(2.0 / 24.0, 4.0 / 24.0, v_selected);
            float fill = 1.0 - smoothstep(
                -border - antialias,
                -border + antialias,
                distance
            );
            outColor = vec4(mix(vec3(1.0), v_color, fill), alpha);
        }
    `);
    const markerUniforms = {
        matrix: gl.getUniformLocation(markerProgram, "u_matrix"),
        size: gl.getUniformLocation(markerProgram, "u_size"),
        viewport: gl.getUniformLocation(markerProgram, "u_viewport"),
    };
    self.markerVao = gl.createVertexArray();
    self.markerCornerBuffer = gl.createBuffer();
    self.markerInstanceBuffer = gl.createBuffer();
    gl.bindVertexArray(self.markerVao);
    gl.bindBuffer(gl.ARRAY_BUFFER, self.markerCornerBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
        -1, -1, 0, -1, 0, 0,
        -1, -1, 0, 0, -1, 0,
    ]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, self.markerInstanceBuffer);
    const markerStride = 7 * Float32Array.BYTES_PER_ELEMENT;
    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 3, gl.FLOAT, false, markerStride, 0);
    gl.vertexAttribDivisor(1, 1);
    gl.enableVertexAttribArray(2);
    gl.vertexAttribPointer(
        2,
        3,
        gl.FLOAT,
        false,
        markerStride,
        3 * Float32Array.BYTES_PER_ELEMENT
    );
    gl.vertexAttribDivisor(2, 1);
    gl.enableVertexAttribArray(3);
    gl.vertexAttribPointer(
        3,
        1,
        gl.FLOAT,
        false,
        markerStride,
        6 * Float32Array.BYTES_PER_ELEMENT
    );
    gl.vertexAttribDivisor(3, 1);
    gl.bindVertexArray(null);

    function subtract(a, b) {
        return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
    }
    function add(a, b) {
        return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
    }
    function scale(value, scalar) {
        return value.map(function(component) { return component * scalar; });
    }
    function dot(a, b) {
        return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
    }
    function cross(a, b) {
        return [
            a[1] * b[2] - a[2] * b[1],
            a[2] * b[0] - a[0] * b[2],
            a[0] * b[1] - a[1] * b[0],
        ];
    }
    function normalize(value) {
        const length = Math.hypot(...value) || 1;
        return value.map(function(component) { return component / length; });
    }
    function clamp(value, minimum, maximum) {
        return Math.max(minimum, Math.min(maximum, value));
    }
    function mat4Multiply(a, b) {
        const output = new Float32Array(16);
        for (let row = 0; row < 4; row++) {
            for (let column = 0; column < 4; column++) {
                output[column * 4 + row] =
                    a[row] * b[column * 4]
                    + a[4 + row] * b[column * 4 + 1]
                    + a[8 + row] * b[column * 4 + 2]
                    + a[12 + row] * b[column * 4 + 3];
            }
        }
        return output;
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
    function distanceFromZ(z) {
        return 34000 / Math.pow(2, z);
    }
    function syncDistanceFromZ() {
        self.z = clamp(self.z, self.minZ, self.maxZ);
        self.distance = distanceFromZ(self.z);
    }
    function worldToGl(x, y, z) {
        return [x, z || 0, -y];
    }
    function cameraEye() {
        const cp = Math.cos(self.pitch);
        return [
            self.target[0] + Math.sin(self.yaw) * cp * self.distance,
            self.target[1] + Math.sin(self.pitch) * self.distance,
            self.target[2] + Math.cos(self.yaw) * cp * self.distance,
        ];
    }
    function viewProjection() {
        const projection = perspective(
            self.vfov * Math.PI / 180,
            self.width / self.height,
            Math.max(2, self.distance / 10000),
            120000
        );
        return mat4Multiply(projection, lookAt(cameraEye(), self.target, [0, 1, 0]));
    }
    function elevationFromValue(value) {
        return value * height.metersPerValue + height.elevationOffset;
    }
    function sampleElevation(worldX, worldY) {
        if (!self.heightPixels) return 0;
        const imageX = clamp(height.zero[0] + worldX * height.scale, 0, height.width - 1);
        const imageY = clamp(height.zero[1] - worldY * height.scale, 0, height.height - 1);
        const x0 = Math.floor(imageX);
        const y0 = Math.floor(imageY);
        const x1 = Math.min(height.width - 1, x0 + 1);
        const y1 = Math.min(height.height - 1, y0 + 1);
        const tx = imageX - x0;
        const ty = imageY - y0;
        const valueAt = function(x, y) {
            return self.heightPixels[y * height.width + x];
        };
        const top = valueAt(x0, y0) * (1 - tx) + valueAt(x1, y0) * tx;
        const bottom = valueAt(x0, y1) * (1 - tx) + valueAt(x1, y1) * tx;
        return elevationFromValue(top * (1 - ty) + bottom * ty);
    }
    function updateTargetHeight() {
        self.target[1] = sampleElevation(self.target[0], -self.target[2]);
    }
    function clampTarget() {
        self.target[0] = clamp(
            self.target[0],
            Math.max(self.minX, height.minX),
            Math.min(self.maxX, height.maxX)
        );
        const worldY = clamp(
            -self.target[2],
            Math.max(self.minY, height.minY),
            Math.min(self.maxY, height.maxY)
        );
        self.target[2] = -worldY;
        updateTargetHeight();
    }
    function navigationEyeAllowed(previousY, nextY) {
        if (previousY < self.minNavigationEyeY) return nextY >= previousY;
        return nextY >= self.minNavigationEyeY;
    }
    function applyNavigationChange(change) {
        const previous = {
            target: [...self.target],
            z: self.z,
            distance: self.distance,
            yaw: self.yaw,
            pitch: self.pitch,
        };
        const previousY = cameraEye()[1];
        change();
        clampTarget();
        self.pitch = clamp(self.pitch, self.minPitch, self.maxPitch);
        if (navigationEyeAllowed(previousY, cameraEye()[1])) return true;
        self.target = previous.target;
        self.z = previous.z;
        self.distance = previous.distance;
        self.yaw = previous.yaw;
        self.pitch = previous.pitch;
        return false;
    }
    function groundPoint(clientX, clientY) {
        const rect = self.scene.getBoundingClientRect();
        if (!rect.width || !rect.height) return null;
        const ndcX = ((clientX - rect.left) / rect.width) * 2 - 1;
        const ndcY = 1 - ((clientY - rect.top) / rect.height) * 2;
        const eye = cameraEye();
        const forward = normalize(subtract(self.target, eye));
        let right = cross(forward, [0, 1, 0]);
        if (Math.hypot(...right) < 1e-6) return null;
        right = normalize(right);
        const up = normalize(cross(right, forward));
        const tangent = Math.tan(self.vfov * Math.PI / 360);
        const direction = normalize(add(
            add(forward, scale(right, ndcX * tangent * self.width / self.height)),
            scale(up, ndcY * tangent)
        ));
        if (Math.abs(direction[1]) < 1e-6) return null;
        const distance = (self.target[1] - eye[1]) / direction[1];
        if (distance <= 0) return null;
        return add(eye, scale(direction, distance));
    }
    function panBy(dx, dz) {
        const right = [Math.cos(self.yaw), 0, -Math.sin(self.yaw)];
        const forward = [Math.sin(self.yaw), 0, Math.cos(self.yaw)];
        self.target[0] += right[0] * dx + forward[0] * dz;
        self.target[2] += right[2] * dx + forward[2] * dz;
    }
    function emitMapChange(end) {
        self.element.dispatchEvent(new CustomEvent("mapchange", {detail: that.get()}));
        if (end) {
            self.element.dispatchEvent(new CustomEvent("mapchangeend", {detail: that.get()}));
        }
    }
    function scheduleMapChangeEnd() {
        if (self.wheelEndTimer) clearTimeout(self.wheelEndTimer);
        self.wheelEndTimer = setTimeout(function() {
            self.wheelEndTimer = null;
            emitMapChange(true);
        }, 180);
    }
    function assetUrl(path) {
        return new URL(path, self.assetRoot).href;
    }
    function loadImage(path) {
        return new Promise(function(resolve, reject) {
            const image = new Image();
            image.crossOrigin = "anonymous";
            image.onload = function() { resolve(image); };
            image.onerror = function() { reject(new Error(`Could not load ${path}`)); };
            image.src = assetUrl(path);
        });
    }
    async function loadHeight() {
        const response = await fetch(assetUrl(height.url));
        if (!response.ok) throw new Error(`Could not load ${height.url}`);
        const buffer = await response.arrayBuffer();
        if (buffer.byteLength !== height.width * height.height * 2) {
            throw new Error("Unexpected elevation data size");
        }
        return new Uint16Array(buffer);
    }
    function createHeightTexture(pixels) {
        const texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texImage2D(
            gl.TEXTURE_2D,
            0,
            gl.R16UI,
            height.width,
            height.height,
            0,
            gl.RED_INTEGER,
            gl.UNSIGNED_SHORT,
            pixels
        );
        return texture;
    }
    function createSurfaceTexture(image) {
        const texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, image);
        gl.generateMipmap(gl.TEXTURE_2D);
        if (self.anisotropy) {
            const maximum = gl.getParameter(self.anisotropy.MAX_TEXTURE_MAX_ANISOTROPY_EXT);
            gl.texParameterf(
                gl.TEXTURE_2D,
                self.anisotropy.TEXTURE_MAX_ANISOTROPY_EXT,
                Math.min(8, maximum)
            );
        }
        return texture;
    }
    async function loadSurfaceTexture() {
        const definition = self.textureDefinitions[self.tileSet];
        if (!definition) throw new Error(`No terrain texture for ${self.tileSet}`);
        const image = await loadImage(definition.url);
        if (self.surfaceTexture) gl.deleteTexture(self.surfaceTexture);
        self.surfaceTexture = createSurfaceTexture(image);
        self.surfaceDefinition = {
            ...definition,
            width: image.naturalWidth,
            height: image.naturalHeight,
        };
        const surface = self.surfaceDefinition;
        surface.minX = -surface.zero[0] / surface.scale;
        surface.maxX = (surface.width - surface.zero[0]) / surface.scale;
        surface.minY = (surface.zero[1] - surface.height) / surface.scale;
        surface.maxY = surface.zero[1] / surface.scale;
        surface.meshMinX = Math.min(height.minX, surface.minX);
        surface.meshMaxX = Math.max(height.maxX, surface.maxX);
        surface.meshMinY = Math.min(height.minY, surface.minY);
        surface.meshMaxY = Math.max(height.maxY, surface.maxY);
        surface.meshWidth = Math.ceil(
            (surface.meshMaxX - surface.meshMinX) / height.pixelMeters
        ) + 1;
        surface.meshHeight = Math.ceil(
            (surface.meshMaxY - surface.meshMinY) / height.pixelMeters
        ) + 1;
    }
    function ensureLoaded() {
        if (self.loaded) return Promise.resolve();
        if (self.loadingPromise) return self.loadingPromise;
        self.loading.hidden = false;
        self.loadingPromise = Promise.all([loadHeight(), loadSurfaceTexture()])
            .then(function(results) {
                self.heightPixels = results[0];
                self.heightTexture = createHeightTexture(self.heightPixels);
                self.loaded = true;
                self.loading.hidden = true;
                clampTarget();
                that.render();
            })
            .catch(function(error) {
                self.loading.textContent = error.message;
                self.loading.classList.add("error");
                throw error;
            });
        return self.loadingPromise;
    }

    function markerColor(value) {
        const match = /^#?([0-9a-f]{6})$/i.exec(value || "");
        const color = parseInt(match ? match[1] : "808080", 16);
        return [
            ((color >> 16) & 255) / 255,
            ((color >> 8) & 255) / 255,
            (color & 255) / 255,
        ];
    }
    function renderMarkers(matrix, eye) {
        self.ctx.clearRect(0, 0, self.width, self.height);
        const markers = [];
        self.currentLandmarks.forEach(function(landmark) {
            if (landmark.igCoordinates === null) return;
            const [x, y] = landmark.igCoordinates;
            const elevation = sampleElevation(x, y);
            const position = worldToGl(x, y, elevation + 0.8);
            const point = transformPoint(matrix, position);
            if (point[2] < -1 || point[2] > 1) return;
            const sx = (point[0] * 0.5 + 0.5) * self.width;
            const sy = (-point[1] * 0.5 + 0.5) * self.height;
            if (sx < -24 || sx > self.width + 24 || sy < -24 || sy > self.height + 24) return;
            const delta = subtract(position, eye);
            markers.push({
                color: markerColor(landmark.color),
                distance: dot(delta, delta),
                elevation: elevation + 0.8,
                landmark: landmark,
                position: position,
                worldX: x,
                worldY: y,
                x: sx,
                y: sy,
            });
        });
        markers.sort(function(a, b) { return b.distance - a.distance; });
        const instances = new Float32Array(markers.length * 7);
        markers.forEach(function(marker, index) {
            const offset = index * 7;
            instances.set(marker.position, offset);
            instances.set(marker.color, offset + 3);
            instances[offset + 6] = marker.landmark.id == self.l ? 1 : 0;
        });
        gl.bindBuffer(gl.ARRAY_BUFFER, self.markerInstanceBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, instances, gl.DYNAMIC_DRAW);
        gl.useProgram(markerProgram);
        gl.uniformMatrix4fv(markerUniforms.matrix, false, matrix);
        gl.uniform2f(markerUniforms.viewport, self.width, self.height);
        gl.uniform1f(markerUniforms.size, 24);
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        gl.depthMask(false);
        gl.bindVertexArray(self.markerVao);
        gl.drawArraysInstanced(gl.TRIANGLES, 0, 6, markers.length);
        gl.bindVertexArray(null);
        gl.depthMask(true);
        gl.disable(gl.BLEND);
        self.visibleMarkers = markers;
    }

    function markerHasLineOfSight(marker) {
        if (marker.hasLineOfSight !== undefined) return marker.hasLineOfSight;
        const eye = cameraEye();
        const eyeWorldY = -eye[2];
        const dx = marker.worldX - eye[0];
        const dy = marker.worldY - eyeWorldY;
        const dz = marker.elevation - eye[1];
        const horizontalDistance = Math.hypot(dx, dy);
        const steps = Math.max(1, Math.ceil(horizontalDistance / height.pixelMeters));
        marker.hasLineOfSight = true;
        for (let step = 1; step < steps; step++) {
            const amount = step / steps;
            const x = eye[0] + dx * amount;
            const y = eyeWorldY + dy * amount;
            if (
                x < height.minX || x > height.maxX
                || y < height.minY || y > height.maxY
            ) continue;
            const lineElevation = eye[1] + dz * amount;
            if (sampleElevation(x, y) > lineElevation + 0.15) {
                marker.hasLineOfSight = false;
                break;
            }
        }
        return marker.hasLineOfSight;
    }

    that.get = function() {
        return {
            focused: self.focused,
            isAnimating: false,
            l: self.l,
            selected: self.l,
            targetX: self.target[0],
            targetY: -self.target[2],
            targetZ: self.z,
            tileSet: self.tileSet,
            v: self.v,
            x: self.target[0],
            y: -self.target[2],
            z: self.z,
        };
    };
    that.set = function(values) {
        values = values || {};
        if ("focused" in values) self.focused = values.focused;
        if ("landmarks" in values) self.landmarks = values.landmarks;
        if ("currentLandmarks" in values) {
            self.currentLandmarks = values.currentLandmarks;
        } else if ("landmarks" in values) {
            self.currentLandmarks = self.landmarks.slice();
        }
        if ("selected" in values) self.l = values.selected;
        if ("v" in values) self.v = values.v;
        if ("tileSet" in values && values.tileSet !== self.tileSet) {
            self.tileSet = values.tileSet;
            updateBackground();
            if (self.loaded && self.textureDefinitions[self.tileSet]) {
                loadSurfaceTexture().then(that.render);
            }
        }
        if ("x" in values || "y" in values || "z" in values) {
            that.setTarget(
                "x" in values ? values.x : self.target[0],
                "y" in values ? values.y : -self.target[2],
                "z" in values ? values.z : self.z,
                true
            );
        } else {
            that.render();
        }
        return that;
    };
    that.addEventListener = function() {
        self.element.addEventListener.apply(self.element, arguments);
    };
    that.removeEventListener = function() {
        self.element.removeEventListener.apply(self.element, arguments);
    };
    that.show = function() {
        self.visible = true;
        self.element.style.display = "block";
        that.onResize(false);
        ensureLoaded().then(that.render);
    };
    that.hide = function() {
        self.visible = false;
        self.element.style.display = "none";
    };
    that.setTarget = function(x, y, z, immediate) {
        self.target[0] = x;
        self.target[2] = -y;
        self.z = z;
        syncDistanceFromZ();
        clampTarget();
        that.render();
        emitMapChange(immediate);
    };
    that.selectLandmark = function(id) {
        self.l = id;
        that.render();
    };
    that.onResize = function(render) {
        const rect = self.element.getBoundingClientRect();
        const dpr = Math.min(2, window.devicePixelRatio || 1);
        const width = Math.max(1, Math.floor(rect.width * dpr));
        const heightValue = Math.max(1, Math.floor(rect.height * dpr));
        if (self.scene.width !== width || self.scene.height !== heightValue) {
            self.scene.width = width;
            self.scene.height = heightValue;
            self.overlay.width = width;
            self.overlay.height = heightValue;
            self.width = width;
            self.height = heightValue;
            if (render !== false) that.render();
        }
    };
    that.render = function() {
        if (!self.visible || !self.loaded || !self.surfaceDefinition) return;
        if (self.renderPending) return;
        self.renderPending = true;
        requestAnimationFrame(function() {
            self.renderPending = false;
            that.onResize(false);
            const matrix = viewProjection();
            const eye = cameraEye();
            const definition = self.surfaceDefinition;
            const background = definition.background;
            gl.viewport(0, 0, self.width, self.height);
            gl.clearColor(background[0] / 255, background[1] / 255, background[2] / 255, 1);
            gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
            gl.enable(gl.DEPTH_TEST);
            gl.disable(gl.CULL_FACE);
            gl.useProgram(terrainProgram);
            gl.uniformMatrix4fv(uniforms.matrix, false, matrix);
            gl.uniform2i(uniforms.meshSize, definition.meshWidth, definition.meshHeight);
            gl.uniform2f(uniforms.heightWorldMin, height.minX, height.minY);
            gl.uniform2f(uniforms.heightWorldSize, height.sizeX, height.sizeY);
            gl.uniform2f(uniforms.worldMin, definition.meshMinX, definition.meshMinY);
            gl.uniform2f(
                uniforms.worldSize,
                definition.meshMaxX - definition.meshMinX,
                definition.meshMaxY - definition.meshMinY
            );
            gl.uniform2f(uniforms.texel, 1 / height.width, 1 / height.height);
            gl.uniform1f(uniforms.metersPerValue, height.metersPerValue);
            gl.uniform1f(uniforms.elevationOffset, height.elevationOffset);
            gl.uniform1f(uniforms.pixelMeters, height.pixelMeters);
            gl.uniform2f(uniforms.surfaceSize, definition.width, definition.height);
            gl.uniform2f(uniforms.surfaceZero, definition.zero[0], definition.zero[1]);
            gl.uniform1f(uniforms.surfaceScale, definition.scale);
            gl.uniform3f(
                uniforms.background,
                background[0] / 255,
                background[1] / 255,
                background[2] / 255
            );
            gl.uniform3fv(uniforms.eye, eye);
            gl.uniform1f(uniforms.ambient, self.ambient);
            gl.uniform1f(uniforms.specular, self.specular);
            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, self.heightTexture);
            gl.uniform1i(uniforms.height, 0);
            gl.activeTexture(gl.TEXTURE1);
            gl.bindTexture(gl.TEXTURE_2D, self.surfaceTexture);
            gl.uniform1i(uniforms.surface, 1);
            gl.bindVertexArray(self.vao);
            gl.drawArraysInstanced(
                gl.TRIANGLE_STRIP,
                0,
                definition.meshWidth * 2,
                definition.meshHeight - 1
            );
            gl.bindVertexArray(null);
            renderMarkers(matrix, eye);
        });
    };

    self.onWheel = function(event) {
        event.preventDefault();
        self.focused = true;
        const before = groundPoint(event.clientX, event.clientY);
        const changed = applyNavigationChange(function() {
            self.z -= event.deltaY * 0.005;
            syncDistanceFromZ();
            const after = before && groundPoint(event.clientX, event.clientY);
            if (before && after) {
                self.target[0] += before[0] - after[0];
                self.target[2] += before[2] - after[2];
            }
        });
        if (changed) {
            that.render();
            emitMapChange(false);
            scheduleMapChangeEnd();
        }
    };
    self.onMousedown = function(event) {
        self.focused = true;
        const hit = that.markerAt(event.clientX, event.clientY);
        if (hit) {
            if (hit.landmark.id == self.l && event.metaKey) {
                that.selectLandmark(null);
                self.element.dispatchEvent(new CustomEvent("select", {detail: {id: null}}));
            } else if (hit.landmark.id != self.l) {
                that.selectLandmark(hit.landmark.id);
                self.element.dispatchEvent(new CustomEvent("select", {detail: {id: hit.landmark.id}}));
            }
            return;
        }
        const startX = event.clientX;
        const startY = event.clientY;
        let lastX = event.clientX;
        let lastY = event.clientY;
        let dragGround = groundPoint(event.clientX, event.clientY);
        let dragging = false;
        function onMousemove(moveEvent) {
            if (!dragging && Math.hypot(
                moveEvent.clientX - startX,
                moveEvent.clientY - startY
            ) <= self.clickMoveTolerance) return;
            dragging = true;
            self.element.classList.add("dragging");
            const dx = moveEvent.clientX - lastX;
            const dy = moveEvent.clientY - lastY;
            lastX = moveEvent.clientX;
            lastY = moveEvent.clientY;
            const changed = applyNavigationChange(function() {
                if (moveEvent.metaKey || moveEvent.ctrlKey) {
                    self.yaw -= dx * 0.006;
                    self.pitch += dy * 0.004;
                    dragGround = groundPoint(moveEvent.clientX, moveEvent.clientY);
                } else {
                    const current = dragGround && groundPoint(moveEvent.clientX, moveEvent.clientY);
                    if (current) {
                        self.target[0] += dragGround[0] - current[0];
                        self.target[2] += dragGround[2] - current[2];
                    } else {
                        const amount = self.distance / Math.max(self.width, self.height);
                        panBy(-dx * amount * 1.6, -dy * amount * 1.6);
                    }
                }
            });
            if (changed) {
                that.render();
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
    that.markerAt = function(clientX, clientY) {
        const rect = self.overlay.getBoundingClientRect();
        const x = (clientX - rect.left) * self.width / rect.width;
        const y = (clientY - rect.top) * self.height / rect.height;
        for (let i = self.visibleMarkers.length - 1; i >= 0; i--) {
            const marker = self.visibleMarkers[i];
            if (
                Math.hypot(marker.x - x, marker.y - y) <= 22
                && markerHasLineOfSight(marker)
            ) return marker;
        }
        return null;
    };
    self.onMousemove = function(event) {
        if (self.element.classList.contains("dragging")) return;
        self.element.classList.toggle(
            "marker-hover",
            Boolean(that.markerAt(event.clientX, event.clientY))
        );
    };
    self.updateKeyboardNavigation = function(timestamp) {
        if (self.keyboardFrame === null) return;
        const factor = self.keyboardTimestamp === null
            ? 1
            : Math.min((timestamp - self.keyboardTimestamp) / (1000 / 60), 2);
        self.keyboardTimestamp = timestamp;
        const step = self.distance * 0.018 * factor;
        const zoomStep = 0.025 * factor;
        const rotateStep = 0.026 * factor;
        const pitchStep = 0.018 * factor;
        let dirty = false;
        const changed = applyNavigationChange(function() {
            if (self.keys.w || self.keys.W) { panBy(0, -step); dirty = true; }
            if (self.keys.s || self.keys.S) { panBy(0, step); dirty = true; }
            if (self.keys.a || self.keys.A) { panBy(-step, 0); dirty = true; }
            if (self.keys.d || self.keys.D) { panBy(step, 0); dirty = true; }
            if (self.keys.q || self.keys.Q) { self.z -= zoomStep; dirty = true; }
            if (self.keys.e || self.keys.E) { self.z += zoomStep; dirty = true; }
            if (self.keys.ArrowLeft) { self.yaw += rotateStep; dirty = true; }
            if (self.keys.ArrowRight) { self.yaw -= rotateStep; dirty = true; }
            if (self.keys.ArrowUp) { self.pitch -= pitchStep; dirty = true; }
            if (self.keys.ArrowDown) { self.pitch += pitchStep; dirty = true; }
            if (self.keys["-"]) { self.z -= zoomStep; dirty = true; }
            if (self.keys["="]) { self.z += zoomStep; dirty = true; }
            syncDistanceFromZ();
        });
        if (dirty && changed) {
            that.render();
            emitMapChange(false);
        }
        self.keyboardFrame = requestAnimationFrame(self.updateKeyboardNavigation);
    };
    self.onKeydown = function(event) {
        if (!self.focused || event.altKey || event.ctrlKey || event.metaKey) return;
        const active = document.activeElement;
        if (active && active.matches("input, textarea, [contenteditable]")) return;
        if ("0123456".includes(event.key)) {
            that.setTarget(self.target[0], -self.target[2], Number(event.key), true);
        } else if ([
            "-", "=", "w", "a", "s", "d", "q", "e",
            "ArrowDown", "ArrowLeft", "ArrowRight", "ArrowUp",
        ].includes(event.key)) {
            event.preventDefault();
            self.keys[event.key] = true;
            if (self.keyboardFrame === null) {
                self.keyboardTimestamp = null;
                self.keyboardFrame = requestAnimationFrame(self.updateKeyboardNavigation);
            }
        } else if (event.key === "Escape" && self.l) {
            that.selectLandmark(null);
            self.element.dispatchEvent(new CustomEvent("select", {detail: {id: null}}));
        }
    };
    self.onKeyup = function(event) {
        if (!(event.key in self.keys)) return;
        self.keys[event.key] = false;
        if (!Object.values(self.keys).some(Boolean) && self.keyboardFrame !== null) {
            cancelAnimationFrame(self.keyboardFrame);
            self.keyboardFrame = null;
            self.keyboardTimestamp = null;
            emitMapChange(true);
        }
    };

    window.addEventListener("resize", function() { that.onResize(); });
    document.addEventListener("keydown", self.onKeydown);
    document.addEventListener("keyup", self.onKeyup);
    self.element.addEventListener("mousedown", self.onMousedown);
    self.element.addEventListener("mousemove", self.onMousemove);
    self.element.addEventListener("wheel", self.onWheel, {passive: false});
    clampTarget();
    that.hide();

    return that;
};

gtadb.Map3D6.supports = function(v, tileSet) {
    const match = /^yanis,(\d+)$/.exec(tileSet);
    return v === 6
        && Boolean(match)
        && (Number(match[1]) === 0 || Number(match[1]) >= 16)
        && tileSet in map3d6Textures;
};
