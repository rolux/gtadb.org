gtadb.Maps = function(options) {

    if (!(this instanceof gtadb.Maps)) {
        return new gtadb.Maps(options)
    }
    
    let that = this
    let self = {
        v: null,
        vs: [4, 5, 6],
        mapMode: "gta",
        mapModes: ["gta", "googlemaps"],
        mapW: 32768,
        mapH: 32768,
        minX: -16000,
        maxX: 4000,
        minY: -8000,
        maxY: 12000,
        minZ: 0,
        maxZ: 6,
        zeroX: 16384,
        zeroY: 16384,
        tileSize: 256,
        tileSetRanges: {
            "original": {
                0: [[1, 1], [2, 2]],
                1: [[3, 3], [4, 4]],
                2: [[6, 6], [9, 8]],
                3: [[13, 13], [18, 17]],
                4: [[27, 27], [37, 34]],
                5: [[54, 54], [75, 68]],
                6: [[109, 109], [151, 137]]
            },
            "elevation": {
                0: [[1, 1], [2, 2]],
                1: [[3, 3], [4, 4]],
                2: [[6, 6], [9, 8]],
                3: [[13, 13], [18, 17]],
                4: [[27, 27], [37, 34]],
                5: [[54, 54], [75, 68]],
                6: [[109, 109], [151, 137]]
            },
            "satellite": {
                0: [[1, 0], [2, 2]],
                1: [[2, 1], [5, 5]],
                2: [[5, 3], [10, 10]],
                3: [[11, 7], [20, 20]],
                4: [[23, 15], [41, 41]],
                5: [[47, 31], [83, 83]],
                6: [[95, 62], [166, 167]]
            },
            "hybrid": {
                0: [[1, 0], [2, 2]],
                1: [[2, 1], [5, 4]],
                2: [[5, 3], [11, 9]],
                3: [[10, 7], [22, 19]],
                4: [[20, 15], [45, 39]],
                5: [[41, 31], [90, 79]],
                6: [[83, 62], [180, 159]]
            },
            "terrain": {
                0: [[1, 0], [2, 2]],
                1: [[2, 1], [5, 5]],
                2: [[5, 3], [10, 10]],
                3: [[11, 7], [20, 20]],
                4: [[23, 15], [41, 41]],
                5: [[47, 31], [83, 83]],
                6: [[95, 62], [166, 167]]
            },
            "roadmap": {
                0: [[1, 0], [2, 2]],
                1: [[2, 1], [5, 4]],
                2: [[5, 3], [11, 9]],
                3: [[10, 7], [22, 19]],
                4: [[20, 15], [45, 39]],
                5: [[41, 31], [90, 79]],
                6: [[83, 62], [180, 159]]
            },
            "radar": {
                0: [[1, 0], [2, 2]],
                1: [[2, 1], [5, 5]],
                2: [[5, 3], [10, 10]],
                3: [[11, 7], [20, 20]],
                4: [[23, 15], [41, 41]],
                5: [[47, 31], [83, 83]],
                6: [[95, 62], [166, 167]]
            },
            "dupzor,51": {
                0: [[0, 0], [2, 2]],
                1: [[0, 1], [4, 5]],
                2: [[0, 2], [9, 11]],
                3: [[0, 4], [19, 23]],
                4: [[0, 8], [38, 47]],
                5: [[0, 17], [77, 94]],
                6: [[1, 34], [155, 188]]
            },
            "yanis,12": {
                0: [[0, 0], [2, 2]],
                1: [[0, 1], [4, 5]],
                2: [[0, 2], [9, 11]],
                3: [[0, 4], [19, 23]],
                4: [[0, 8], [38, 47]],
                5: [[0, 17], [77, 95]],
                6: [[0, 34], [155, 190]]
            }
        },
        tileOverlayRanges: {
            "aiwe,1": {
                0: [[1, 1], [1, 1]],
                1: [[2, 3], [2, 3]],
                2: [[4, 6], [5, 6]],
                3: [[9, 12], [10, 13]],
                4: [[18, 25], [20, 27]],
                5: [[37, 50], [41, 55]],
                6: [[74, 100], [82, 110]]
            },
            "martipk,5": {
                0: [[1, 2], [1, 2]],
                1: [[3, 4], [3, 5]],
                2: [[6, 9], [7, 11]],
                3: [[12, 19], [15, 23]],
                4: [[24, 39], [31, 46]],
                5: [[48, 79], [62, 93]],
                6: [[96, 159], [124, 186]]
            },
            "rickrick,3": {
                0: [[1, 1], [2, 2]],
                1: [[3, 3], [4, 4]],
                2: [[6, 6], [9, 9]],
                3: [[12, 13], [18, 19]],
                4: [[24, 26], [36, 39]],
                5: [[48, 52], [73, 79]],
                6: [[96, 104], [147, 159]]
            }
        },
        x: null,
        y: null,
        z: null,
        l: null,
        targetX: 0,
        targetY: 0,
        targetZ: 0,
        isAnimating: false,
        isDragging: false,
        keys: {},
        keyboardFrame: null,
        keyboardTimestamp: null,
        keyboardPending: false,
        panAmount: 0.025,
        wheelAmount: 0.005,
        zoomAmount: 0.025,
        easeAmount: 0.2,
        landmarks: [],
        landmarksById: {},
        currentLandmarks: [],
        currentLandmarksIndexById: {},
        markers: {},
        editing: false,
        defaults: {
            focused: false,
            googlemaps: {
                lat: 27,
                lng: -81,
                zoom: 8,
                mapType: "satellite",
                mapTypes: [
                    "satellite",
                    "hybrid",
                    "terrain",
                    "roadmap"
                ],
            },
            gta4: {
                x: 0,
                y: 0,
                z: 1,
                tileSet: "original",
                tileSets: [
                    "original",
                    "elevation"
                ]
            },
            gta5: {
                x: -4000,
                y: 2000,
                z: 1,
                tileSet: "satellite",
                tileSets: [
                    "satellite",
                    "hybrid",
                    "terrain",
                    "roadmap",
                    "radar",
                ]
            },
            gta6: {
                x: -4000,
                y: 2000,
                z: 1,
                tileSet: "yanis,12",
                tileSets: [
                    "dupzor,51",
                    "yanis,12",
                ]
            },
            mapMode: "gta",
            mapModes: ["gta", "googlemaps"],
            parentElement: document.body,
            selected: null,
            tileOverlays: 0,
            v: 6,
            vs: [4, 5, 6],
            x: null,
            y: null,
            z: null,
        }
    }
    self.options = {...self.defaults, ...(options || {})}
    self.options.googlemaps = {...self.defaults.googlemaps, ...((options || {}).googlemaps || {})}
    self.options.gta4 = {...self.defaults.gta4, ...((options || {}).gta4 || {})}
    self.options.gta5 = {...self.defaults.gta5, ...((options || {}).gta5 || {})}
    self.options.gta6 = {...self.defaults.gta6, ...((options || {}).gta6 || {})}
    Object.entries(self.options).forEach(function([key, value]) {
        self[key] = value
    })

    that.get = function() {
        return {
            editing: self.editing,
            focused: self.focused,
            googlemaps: self.googlemaps,
            gta4: self.gta4,
            gta5: self.gta5,
            gta6: self.gta6,
            isAnimating: self.isAnimating,
            l: self.l,
            landmarks: self.landmarks,
            currentLandmarks: self.currentLandmarks,
            mapMode: self.mapMode,
            parentElement: self.parentElement,
            selected: self.l,
            targetX: self.targetX,
            targetY: self.targetY,
            targetZ: self.targetZ,
            tileOverlays: self.tileOverlays,
            tileSet: self.tileSet,
            v: self.v,
            x: self.x,
            y: self.y,
            z: self.z,
        }
    }

    that.set = function(options) {
        options = options || {}

        if ("focused" in options) {
            self.focused = options.focused
        }
        if ("editing" in options) {
            self.editing = options.editing
        }

        if ("googlemaps" in options) {
            self.googlemaps = {...self.googlemaps, ...options.googlemaps}
        }
        if ("gta5" in options) {
            self.gta5 = {...self.gta5, ...options.gta5}
        }
        if ("gta6" in options) {
            self.gta6 = {...self.gta6, ...options.gta6}
        }

        if ("landmarks" in options) {
            self.landmarks = options.landmarks
            self.landmarksById = self.landmarks.reduce(function(a, landmark) {
                a[landmark.id] = landmark
                return a
            }, {})
        }

        if ("currentLandmarks" in options) {
            self.currentLandmarks = options.currentLandmarks
        } else if ("landmarks" in options) {
            self.currentLandmarks = self.landmarks.slice()
        }

        if ("landmarks" in options || "currentLandmarks" in options) {
            self.currentLandmarksIndexById = self.currentLandmarks.reduce(function(a, landmark, i) {
                a[landmark.id] = i
                return a
            }, {})
            self.initMarkers()
            self.clearMarkers()
            self.renderMarkers()
            self.updateGooglemapsMarkers()
        }

        if ("v" in options && options.v != self.v) {
            self.setGameVersion(options.v)
        }

        if ("tileSet" in options && options.tileSet != self.tileSet) {
            self.tileSet = options.tileSet
            self.canvas.className = self.tileSet.replace(",", "-")
            self.renderMap()
        }

        if ("tileOverlays" in options && options.tileOverlays != self.tileOverlays) {
            self.tileOverlays = options.tileOverlays
            self.renderMap()
        }

        if ("mapType" in options && options.mapType != self.googlemaps.mapType) {
            self.setMapType(options.mapType)
        }

        if ("mapMode" in options && options.mapMode != self.mapMode) {
            self.setMapMode(options.mapMode)
        }

        const selected = "selected" in options ? options.selected : options.l
        if (selected !== void 0) {
            self.setLandmark(selected, options.pan)
            self.selectLandmark(selected)
        }

        if ("x" in options || "y" in options || "z" in options) {
            const x = "x" in options ? options.x : self.targetX
            const y = "y" in options ? options.y : self.targetY
            const z = "z" in options ? options.z : self.targetZ
            if (x != self.targetX || y != self.targetY || z != self.targetZ) {
                self.setTarget(x, y, z, options.immediate)
            } else {
                self.renderMap()
            }
        }

        return that
    }

    that.addEventListener = function(type, listener, options) {
        self.element.addEventListener(type, listener, options)
        return that
    }

    that.removeEventListener = function(type, listener, options) {
        self.element.removeEventListener(type, listener, options)
        return that
    }

    that.panGooglemaps = function(lat, lng) {
        return self.initGooglemaps().then(function(googleMap) {
            googleMap.panTo({lat: lat, lng: lng})
            return that
        })
    }

    that.zoomGooglemaps = function(zoom) {
        return self.initGooglemaps().then(function(googleMap) {
            googleMap.setZoom(zoom)
            return that
        })
    }

    that.exitStreetView = function() {
        return self.initGooglemaps().then(function(googleMap) {
            self.googleMap.getStreetView().setVisible(false)
            return that
        })
    }
    
    self.init = function() {

        self.element = document.createElement("div")
        self.element.id = "map"
        that.element = self.element
        self.canvas = document.createElement("canvas")
        self.canvas.id = "canvas"
        self.element.appendChild(self.canvas)
        self.context = self.canvas.getContext("2d")
        self.markersLayer = document.createElement("div")
        self.markersLayer.id = "markers"
        self.element.appendChild(self.markersLayer)
        self.googlemapsLayer = document.createElement("div")
        self.googlemapsLayer.id = "googlemapsLayer"
        self.element.appendChild(self.googlemapsLayer)

        self.streetviewIcon = document.createElement("div")
        self.streetviewIcon.classList.add("icon")
        self.streetviewIcon.id = "streetviewIcon"
        self.streetviewIcon.innerText = "X"
        self.streetviewIcon.title = "ESC"
        self.streetviewIcon.addEventListener("click", function() {
            if (self.googleMap) {
                self.googleMap.getStreetView().setVisible(false)
            }
        })
        self.element.appendChild(self.streetviewIcon)

        self.parentElement.appendChild(self.element)

        const overlayString = Object.keys(self.tileOverlayRanges).join(",")
        self.tiles = {}
        self.tilePaths = {}
        self.vs.forEach(function(v) {
            let gta = "gta" + v
            self.tiles[v] = {}
            self.tilePaths[v] = {}
            let overlays = {4: [0], 5: [0], 6: [0, 1]}[v]
            self[gta].tileSets.forEach(function(tileSet) {
                self.tiles[v][tileSet] = {}
                self.tilePaths[v][tileSet] = {}
                overlays.forEach(function(overlay) {
                    self.tiles[v][tileSet][overlay] = {}
                    self.tilePaths[v][tileSet][overlay] = {}
                    for (let z = self.minZ; z <= self.maxZ; z++) {
                        self.tiles[v][tileSet][overlay][z] = {}
                        self.tilePaths[v][tileSet][overlay][z] = {}
                        const [[x0, y0], [x1, y1]] = self.tileSetRanges[tileSet][z]
                        for (let y = y0; y <= y1; y++) {
                            self.tiles[v][tileSet][overlay][z][y] = {}
                            self.tilePaths[v][tileSet][overlay][z][y] = {}
                            for (let x = x0; x <= x1; x++) {
                                self.tiles[v][tileSet][overlay][z][y][x] = new Image()
                                self.tilePaths[v][tileSet][overlay][z][y][x] = tileSet
                                if (overlay == 1) {
                                    Object.entries(self.tileOverlayRanges).forEach(function([name, ranges]) {
                                        if (
                                            x >= ranges[z][0][0] && x <= ranges[z][1][0] &&
                                            y >= ranges[z][0][1] && y <= ranges[z][1][1] && (
                                                [ranges[z][0][0], ranges[z][1][0]].includes(x) ||
                                                [ranges[z][0][1], ranges[z][1][1]].includes(y)
                                            )
                                        ) {
                                            self.tilePaths[v][tileSet][overlay][z][y][x] = `${tileSet},${overlayString}`
                                        } else if (
                                            x > ranges[z][0][0] && x < ranges[z][1][0] &&
                                            y > ranges[z][0][1] && y < ranges[z][1][1] &&
                                            self.tilePaths[v][tileSet][overlay][z][y][x] == tileSet
                                        ) {
                                            self.tilePaths[v][tileSet][overlay][z][y][x] = name
                                        }
                                    })
                                }
                            }
                        }
                    }
                })
            })
        })

        document.addEventListener("keydown", self.onKeydown)
        document.addEventListener("keyup", self.onKeyup)
        self.markersLayer.addEventListener("mousedown", self.onMousedown)
        window.addEventListener("resize", self.onResize)
        self.markersLayer.addEventListener("wheel", self.onWheel, {passive: false})

        ;["x", "y", "z", "tileSet"].forEach(function(key) {
            self[key] = self["gta" + self.v][key]
        })
        self.targetX = self.x
        self.targetY = self.y
        self.targetZ = self.z
        self.canvas.className = self.tileSet.replace(",", "-")

        self.onResize(true)
        self.initMarkers()
        self.setMapMode(self.mapMode)
        
        return that

    }

    self.initMarkers = function() {
        if (self.markers) {
            self.removeMarkers()
        }
        self.markers = {}
        self.landmarks.filter(function(landmark) {
            return landmark.igCoordinates !== null
        }).sort(function(a, b) {
            return b.igCoordinates[1] - a.igCoordinates[1]
        }).forEach(function(landmark) {
            self.addMarker(landmark)
        })
    }

    self.googlemapsPromise = null

    self.initGooglemaps = function() {

        if (self.googleMap) {
            return Promise.resolve(self.googleMap)
        }
        if (self.googlemapsPromise) {
            return self.googlemapsPromise
        }

        self.googlemapsPromise = (async function() {
            if (!window.GOOGLE_MAPS_API_KEY) {
                throw new Error("Missing GOOGLE_MAPS_API_KEY")
            }

            (g=>{var h,a,k,p="The Google Maps JavaScript API",c="google",l="importLibrary",
            q="__ib__",m=document,b=window;b=b[c]||(b[c]={});var d=b.maps||(b.maps={}),r=new Set,
            e=new URLSearchParams,u=()=>h||(h=new Promise(async(f,n)=>{await (a=m.createElement("script"));
            e.set("libraries",[...r]+"");for(k in g)e.set(k.replace(/[A-Z]/g,t=>"_"+t[0].toLowerCase()),g[k]);
            e.set("callback",c+".maps."+q);a.src=`https://maps.${c}apis.com/maps/api/js?`+e;d[q]=f;
            a.onerror=()=>h=n(Error(p+" could not load."));a.nonce=m.querySelector("script[nonce]")?.nonce||"";
            m.head.append(a)}));d[l]?console.warn(p+" only loads once. Ignoring:",g):d[l]=(f,...n)=>r.add(f)&&u()
            .then(()=>d[l](f,...n))})({
                key: GOOGLE_MAPS_API_KEY,
                v: "weekly",
            })

            const { Map } = await google.maps.importLibrary("maps")
            const { AdvancedMarkerElement } = await google.maps.importLibrary("marker")
            self.googleMap = new Map(document.getElementById("googlemapsLayer"), {
                mapId: "b7ed25226b73d4cc3e56b039",
                center: {lat: self.googlemaps.lat, lng: self.googlemaps.lng},
                zoom: self.googlemaps.zoom,
                mapTypeId: self.googlemaps.mapType,
                cameraControl: false,
                fullscreenControl: false,
                mapTypeControl: false,
                rotateControl: true,
                rotateControlOptions: {
                    position: google.maps.ControlPosition.TOP_CENTER
                },
                scaleControl: false,
                streetViewControl: true,
                streetViewControlOptions: {
                    position: google.maps.ControlPosition.BOTTOM_CENTER
                },
                zoomControl: false,
            })

            const streetView = self.googleMap.getStreetView()
            streetView.setOptions({
                disableDefaultUI: true,
                enableCloseButton: false,
            })
            streetView.addListener("visible_changed", function() {
                document.body.classList[streetView.getVisible() ? "add" : "remove"]("streetview")
            })

            self.renderGooglemapsMarker = function(landmark) {
                let customMarker = document.createElement("div")
                customMarker.className = "marker googlemaps"
                if (self.l == landmark.id) {
                    customMarker.classList.add("selected")
                }
                customMarker.id = "googlemapsMarker_" + self.normalizeID(landmark.id)
                customMarker.dataset.id = landmark.id
                customMarker.style.backgroundColor = "#" + landmark.color
                customMarker.style.display = "block"
                const googlemapsMarker = new AdvancedMarkerElement({
                    map: self.googleMap,
                    content: customMarker,
                    position: {
                        lat: landmark.rlCoordinates[0],
                        lng: landmark.rlCoordinates[1]
                    },
                    title: landmark.title,
                    gmpClickable: true,
                    zIndex: 10
                })
                googlemapsMarker.addListener("click", function({domEvent}) {
                    const id = landmark.id
                    const isSelected = customMarker.classList.contains("selected")
                    Object.values(self.googlemapsMarkers).forEach(function(gM) {
                        gM.zIndex = 10
                    })
                    googlemapsMarker.zIndex = 100
                    if (isSelected && domEvent.metaKey) {
                        self.setLandmark(null)
                        self.selectLandmark(null)
                        self.element.dispatchEvent(new CustomEvent("select", {
                            detail: {
                                id: null
                            }
                        }))
                    } else if (!isSelected) {
                        self.setLandmark(id)
                        self.selectLandmark(id)
                        self.element.dispatchEvent(new CustomEvent("select", {
                            detail: {
                                id: id
                            }
                        }))
                    }
                })
                return googlemapsMarker
            }

            self.googlemapsMarkers = {}
            self.updateGooglemapsMarkers()

            google.maps.event.addListener(self.googleMap, "idle", function() {
                const center = self.googleMap.getCenter()
                self.googlemaps.lat = center.lat()
                self.googlemaps.lng = center.lng()
                self.googlemaps.zoom = self.googleMap.getZoom()
                self.element.dispatchEvent(new CustomEvent("mapchangeend", {
                    detail: {
                        x: self.targetX,
                        y: self.targetY,
                        z: self.targetZ
                    }
                }))
            })

            return self.googleMap

        })().catch(function(err) {
            self.googlemapsPromise = null
            throw err
        })

        return self.googlemapsPromise

    }

    self.animate = function(immediate=false) {
        if (!immediate) {
            self.isAnimating = true
        }
        const dx = self.targetX - self.x
        const dy = self.targetY - self.y
        const dz = self.targetZ - self.z
        const easeAmount = immediate ? 1 : self.easeAmount
        self.x += easeAmount * dx
        self.y += easeAmount * dy
        self.z += easeAmount * dz
        const done = immediate || (
            Math.abs(dx) <= 0.1 &&
            Math.abs(dy) <= 0.1 &&
            Math.abs(dz) <= 0.01
        )
        if (done) {
            self.x = self.targetX
            self.y = self.targetY
            self.z = self.targetZ
            self.isAnimating = false
        } else {
            self.x += easeAmount * dx
            self.y += easeAmount * dy
            self.z += easeAmount * dz
        }
        self.renderMap()
        self.element.dispatchEvent(new CustomEvent("mapchange", {
            detail: {
                x: self.targetX,
                y: self.targetY,
                z: self.targetZ
            }
        }))
        if (done && !immediate && !Object.values(self.keys).some(Boolean)) {
            self.keyboardPending = false
            self.element.dispatchEvent(new CustomEvent("mapchangeend", {
                detail: {
                    x: self.targetX,
                    y: self.targetY,
                    z: self.targetZ
                }
            }))
        }
        if (!done) {
            self.animate()
        }
    }

    self.renderMarkers = function() {
        const left = -16
        const right = self.canvas.width + 16
        const top = -24
        const bottom = self.canvas.height + 24
        const mppx = self.getMppx()
        const minX = self.x - mppx * self.canvas.width / 2
        const maxY = self.y + mppx * self.canvas.height / 2
        self.currentLandmarks.forEach(function(landmark) {
            if (landmark.igCoordinates === null) {
                return
            }
            const markerElement = self.markers[landmark.id]
            const [x, y] = landmark.igCoordinates
            const screenX = (x - minX) / mppx
            const screenY = (maxY - y) / mppx
            if (screenX >= left && screenX <= right && screenY >= top && screenY <= bottom) {
                const markerLeft = screenX + "px"
                const markerTop = screenY + "px"
                if (markerElement.style.left != markerLeft) {
                    markerElement.style.left = markerLeft
                }
                if (markerElement.style.top != markerTop) {
                    markerElement.style.top = markerTop
                }
                if (markerElement.style.display != "block") {
                    markerElement.style.display = "block"
                }
            } else if (markerElement.style.display != "none") {
                markerElement.style.display = "none"
            }
        })
    }

    self.renderMap = function() {

        function tryDrawParentTile(x, y, tx, ty) {
            const maxParentLevels = 2
            for (let parentZ = zInt - 1; parentZ >= Math.max(self.minZ, zInt - maxParentLevels); parentZ--) {
                const scale = Math.pow(2, zInt - parentZ)
                const parentX = Math.floor(x / scale)
                const parentY = Math.floor(y / scale)
                const parentRows = tiles[parentZ]
                if (!parentRows || !parentRows[parentY] || !parentRows[parentY][parentX]) {
                    continue
                }
                const parentImg = parentRows[parentY][parentX]
                if (!parentImg.complete || parentImg.naturalWidth === 0) {
                    continue
                }
                const srcSize = self.tileSize / scale
                const srcX = (x - parentX * scale) * srcSize
                const srcY = (y - parentY * scale) * srcSize
                self.context.drawImage(
                    parentImg,
                    srcX, srcY, srcSize, srcSize,
                    tx, ty, tileSize, tileSize
                )
                return true
            }
            return false
        }

        const zInt = Math.ceil(self.z)
        const mapSize = 1024 * Math.pow(2, self.z)
        const mppx = mapSize / self.mapW
        const cX = (self.x + self.zeroX) * mppx
        const cY = (self.zeroY - self.y) * mppx
        const offsetX = self.canvas.width / 2 - cX
        const offsetY = self.canvas.height / 2 - cY
        const tileSize = self.tileSize * Math.pow(2, self.z - zInt)

        const [[x0, y0], [x1, y1]] = self.tileSetRanges[self["gta" + self.v].tileSet][zInt]

        const minTx = Math.floor(-offsetX / tileSize)
        const maxTx = Math.ceil((self.canvas.width - offsetX) / tileSize)
        const minTy = Math.floor(-offsetY / tileSize)
        const maxTy = Math.ceil((self.canvas.height - offsetY) / tileSize)

        const overlays = {4: 0, 5: 0, 6: self.tileOverlays}[self.v]
        const tiles = self.tiles[self.v][self.tileSet][overlays]
        const tilePaths = self.tilePaths[self.v][self.tileSet][overlays]

        for (let y = minTy; y <= maxTy; y++) {
            for (let x = minTx; x <= maxTx; x++) {
                const tx = offsetX + x * tileSize
                const ty = offsetY + y * tileSize
                if (x < x0 || x > x1 || y < y0 || y > y1) {
                    self.context.clearRect(tx, ty, tileSize, tileSize)
                    continue
                }
                const img = tiles[zInt][y][x]
                if (img.complete && img.naturalWidth > 0) {
                    self.context.drawImage(img, tx, ty, tileSize, tileSize)
                    continue
                }
                if (!img.src) {
                    img.addEventListener("load", function() {
                        requestAnimationFrame(function() {
                            self.renderMap()
                        })
                    }, {once: true})
                    const tilePath = tilePaths[zInt][y][x]
                    img.src = `https://maps.gtadb.org/tiles/${self.v}/${tilePath}/${zInt}/${zInt},${y},${x}.jpg`
                }
                tryDrawParentTile(x, y, tx, ty)
            }
        }
        self.renderMarkers()

    }

    self.updateKeyboardNavigation = function(timestamp) {

        if (self.keyboardFrame === null) {
            return
        }

        const frameDuration = 1000 / 60
        const deltaFactor = self.keyboardTimestamp === null
            ? 1
            : Math.min((timestamp - self.keyboardTimestamp) / frameDuration, 2)
        self.keyboardTimestamp = timestamp

        const panStep = self.getMppx(self.targetZ) * self.canvas.height * self.panAmount * deltaFactor
        const zoomStep = self.zoomAmount * deltaFactor

        let targetX = self.targetX
        let targetY = self.targetY
        let targetZ = self.targetZ

        if (self.keys["ArrowDown"]) {
            targetY -= panStep
        }
        if (self.keys["ArrowLeft"]) {
            targetX -= panStep
        }
        if (self.keys["ArrowRight"]) {
            targetX += panStep
        }
        if (self.keys["ArrowUp"]) {
            targetY += panStep
        }
        if (self.keys["-"]) {
            targetZ -= zoomStep
        }
        if (self.keys["="]) {
            targetZ += zoomStep
        }

        self.setTarget(targetX, targetY, targetZ)

        if (Object.values(self.keys).some(Boolean)) {
            self.keyboardFrame = requestAnimationFrame(self.updateKeyboardNavigation)
        } else {
            self.keyboardFrame = null
            self.keyboardTimestamp = null
        }
 
    }

    self.setTarget = function(x, y, z, immediate=false) {
        x = self.clamp(x, self.minX, self.maxX)
        y = self.clamp(y, self.minY, self.maxY)
        z = self.clamp(z, self.minZ, self.maxZ)
        if (x != self.targetX || y != self.targetY || z != self.targetZ) {
            self.targetX = x
            self.targetY = y
            self.targetZ = z
            if (!self.isAnimating || immediate) {
                self.animate(immediate)
            }
        }
    }

    self.selectLandmark = function(id) {
        self.l = id
        document.querySelectorAll(".marker.selected").forEach(function(element) {
            element.classList.remove("selected")
        })
        if (self.l) {
            const domId = self.normalizeID(self.l)
            document.querySelectorAll(
                `#marker_${domId}, #googlemapsMarker_${domId}`
            ).forEach(function(element) {
                element.classList.add("selected")
            })
        }
    }

    self.setLandmark = function(id, pan) {
        self.l = id
        if (pan && id) {
            const landmark = self.landmarksById[id]
            if (landmark && landmark.igCoordinates) {
                self.targetX = landmark.igCoordinates[0]
                self.targetY = landmark.igCoordinates[1]
                self.targetZ = self.z
            }
        }
    }

    self.addMarker = function(landmark) {
        if (!self.markers[landmark.id]) {
            self.markers[landmark.id] = document.createElement("div")
            self.markers[landmark.id].id = "marker_" + self.normalizeID(landmark.id)
            self.markers[landmark.id].dataset.id = landmark.id
            self.markers[landmark.id].className = "marker"
            self.markers[landmark.id].style.backgroundColor = "#" + landmark.color
            self.markers[landmark.id].title = landmark.title
            self.markersLayer.appendChild(self.markers[landmark.id])
        }
    }

    self.clearMarkers = function() {
        self.landmarks.forEach(function(landmark) {
            if (landmark.igCoordinates === null || self.currentLandmarks.includes(landmark)) {
                return
            }
            let marker = self.markers[landmark.id]
            if (!marker) {
                return
            }
            marker.classList.remove("selected")
            marker.style.display = "none"
        })
    }

    self.removeMarker = function(id) {
        if (self.markers[id]) {
            self.markers[id].remove()
            delete self.markers[id]
        }
    }

    self.removeMarkers = function() {
        Object.keys(self.markers).forEach(function(id) {
            self.removeMarker(id)
        })
    }

    self.updateMarker = function(landmark) {
        if (landmark.igCoordinates) {
            if (self.markers[landmark.id]) {
                self.markers[landmark.id].style.backgroundColor = "#" + landmark.color
                self.markers[landmark.id].title = landmark.title
            } else {
                self.addMarker(landmark)
                if (landmark.id == self.l) {
                    self.markers[landmark.id].classList.add("selected")
                }
            }
        } else if (self.markers[landmark.id]) {
            self.removeMarker(landmark.id)
        }
    }

    self.addGooglemapsMarker = function(landmark) {
        if (!self.googlemapsMarkers || !self.renderGooglemapsMarker) {
            return
        }
        if (!self.googlemapsMarkers[landmark.id] && landmark.rlCoordinates) {
            self.googlemapsMarkers[landmark.id] = self.renderGooglemapsMarker(landmark)
        }
    }

    self.removeGooglemapsMarker = function(id) {
        if (!self.googlemapsMarkers) {
            return
        }
        if (self.googlemapsMarkers[id]) {
            self.googlemapsMarkers[id].map = null
            delete self.googlemapsMarkers[id]
        }
    }

    self.removeGooglemapsMarkers = function() {
        if (!self.googlemapsMarkers) {
            return
        }
        Object.keys(self.googlemapsMarkers).forEach(function(id) {
            self.removeGooglemapsMarker(id)
        })
    }

    self.updateGooglemapsMarker = function(landmark) {
        if (!self.googlemapsMarkers) {
            return
        }
        if (landmark.rlCoordinates) {
            if (self.googlemapsMarkers[landmark.id]) {
                self.googlemapsMarkers[landmark.id].position = {
                    lat: landmark.rlCoordinates[0],
                    lng: landmark.rlCoordinates[1]
                }
                self.googlemapsMarkers[landmark.id].title = landmark.title
                self.googlemapsMarkers[landmark.id].content.style.backgroundColor = "#" + landmark.color
            } else {
                self.addGooglemapsMarker(landmark)
            }
            self.googlemapsMarkers[landmark.id].content.classList.add("selected")
        } else if (self.googlemapsMarkers[landmark.id]) {
            self.removeGooglemapsMarker(landmark.id)
        }
    }

    self.updateGooglemapsMarkers = function() {
        if (!self.googlemapsMarkers) {
            return
        }
        self.landmarks.forEach(function(landmark) {
            if (!self.currentLandmarks.includes(landmark)) {
                self.removeGooglemapsMarker(landmark.id)
            }
        })
        self.currentLandmarks.forEach(function(landmark) {
            self.addGooglemapsMarker(landmark)
        })
    }

    self.onKeydown = function(e) {
        if (!self.focused) {
            return
        }
        if (e.altKey || e.ctrlKey || e.metaKey) {
            return
        }
        const activeElement = document.activeElement
        if (activeElement.matches("input, textarea, [contenteditable]")) {
            return
        }

        if (e.key == "g") {
            self.setMapMode(self.mapMode == "gta" ? "googlemaps" : "gta")
            return
        }
        if (e.key == "Escape" && self.mapMode == "googlemaps" && self.googleMap && self.googleMap.getStreetView().getVisible()) {
            self.googleMap.getStreetView().setVisible(false)
            return
        }

        if ("0123456".includes(e.key) && self.mapMode == "gta") {
            self.setTarget(self.targetX, self.targetY, parseInt(e.key))
        } else if ([
            "-", "=", "ArrowDown", "ArrowLeft", "ArrowRight", "ArrowUp"
        ].includes(e.key) && self.mapMode == "gta") {
            e.preventDefault()
            self.keys[e.key] = true
            self.keyboardPending = true
            if (self.keyboardFrame === null) {
                self.keyboardTimestamp = null
                self.keyboardFrame = requestAnimationFrame(self.updateKeyboardNavigation)
            }
        } else if (e.key == "Escape" && self.l) {
            self.setLandmark(null)
            self.selectLandmark(null)
            self.element.dispatchEvent(new CustomEvent("select", {
                detail: {
                    id: null
                }
            }))
        }
    }

    self.onKeyup = function(e) {
        if (e.key in self.keys) {
            self.keys[e.key] = false
            if (!Object.values(self.keys).some(Boolean) && self.keyboardFrame !== null) {
                cancelAnimationFrame(self.keyboardFrame)
                self.keyboardFrame = null
                self.keyboardTimestamp = null
                if (self.keyboardPending && !self.isAnimating) {
                    self.keyboardPending = false
                    self.element.dispatchEvent(new CustomEvent("mapchangeend", {
                        detail: {
                            x: self.targetX,
                            y: self.targetY,
                            z: self.targetZ
                        }
                    }))
                }
            }
        }
    }

    self.onMousedown = function(e) {
        self.focused = true
        if (e.target.classList.contains("marker")) {
            const id = e.target.dataset.id
            const isSelected = e.target.classList.contains("selected")
            if (isSelected && self.editing && self.landmarksById[id] && self.landmarksById[id].igCoordinates) {
                const landmark = self.landmarksById[id]
                const marker = self.markers[id]
                const mppx = self.getMppx()
                const minX = self.x - mppx * self.canvas.width / 2
                const maxY = self.y + mppx * self.canvas.height / 2
                const clientX = e.clientX
                const clientY = e.clientY
                const markerX = parseFloat(marker.style.left) || clientX
                const markerY = parseFloat(marker.style.top) || clientY
                function onMousemove(event) {
                    marker.classList.add("dragging")
                    const screenX = markerX + event.clientX - clientX
                    const screenY = markerY + event.clientY - clientY
                    const nextX = self.clamp(minX + screenX * mppx, self.minX, self.maxX)
                    const nextY = self.clamp(maxY - screenY * mppx, self.minY, self.maxY)
                    marker.style.left = screenX + "px"
                    marker.style.top = screenY + "px"
                    marker.dataset.igX = nextX
                    marker.dataset.igY = nextY
                }
                function onMouseup() {
                    document.removeEventListener("mousemove", onMousemove)
                    document.removeEventListener("mouseup", onMouseup)
                    marker.classList.remove("dragging")
                    if ("igX" in marker.dataset && "igY" in marker.dataset) {
                        self.element.dispatchEvent(new CustomEvent("edit", {
                            detail: {
                                id: id,
                                igCoordinates: [
                                    parseFloat(marker.dataset.igX),
                                    parseFloat(marker.dataset.igY)
                                ]
                            }
                        }))
                        delete marker.dataset.igX
                        delete marker.dataset.igY
                    }
                }
                document.addEventListener("mousemove", onMousemove)
                document.addEventListener("mouseup", onMouseup)
                return
            }
            if (isSelected && e.metaKey) {
                setTimeout(function() {
                    self.setLandmark(null)
                    self.selectLandmark(null)
                    self.element.dispatchEvent(new CustomEvent("select", {
                        detail: {
                            id: null
                        }
                    }))
                })
            } else if (!isSelected) {
                setTimeout(function() {
                    self.setLandmark(id)
                    self.selectLandmark(id)
                    self.element.dispatchEvent(new CustomEvent("select", {
                        detail: {
                            id: id
                        }
                    }))
                })
            }
            return
        }
        self.isDragging = false
        const clientX = e.clientX
        const clientY = e.clientY
        const [originalX, originalY, originalZ] = [self.targetX, self.targetY, self.targetZ]
        const mppx = self.getMppx()
        function onMousemove(e) {
            if (!self.isDragging) {
                self.isDragging = true
                self.element.classList.add("dragging")
            }
            self.setTarget(
                originalX - mppx * (e.clientX - clientX),
                originalY + mppx * (e.clientY - clientY),
                originalZ,
                true
            )
        }
        function onMouseup() {
            if (self.mouseTimeout) {
                clearTimeout(self.mouseTimeout)
                self.mouseTimeout = null
                self.setTarget(
                    originalX + mppx * (e.clientX - self.canvas.width / 2),
                    originalY - mppx * (e.clientY - self.canvas.height / 2),
                    originalZ
                )
            } else if (self.isDragging) {
                self.isDragging = false
                self.element.classList.remove("dragging")
                self.element.dispatchEvent(new CustomEvent("mapchangeend", {
                    detail: {
                        x: self.targetX,
                        y: self.targetY,
                        z: self.targetZ
                    }
                }))
            }
            document.removeEventListener("mousemove", onMousemove)
            document.removeEventListener("mouseup", onMouseup)
        }
        self.mouseTimeout = setTimeout(function() {
            document.addEventListener("mousemove", onMousemove)
            self.mouseTimeout = null
        }, 250)
        document.addEventListener("mouseup", onMouseup)
    }

    self.onResize = function(render=true) {
        self.canvas.width = window.innerWidth
        self.canvas.height = window.innerHeight
        if (render) {
            self.renderMap()
        }
    }

    self.onWheel = function(e) {
        e.preventDefault()
        self.focused = true
        if (self.wheelTimeout) {
            clearTimeout(self.wheelTimeout)
            self.wheelTimeout = null
        }
        const targetZ = self.clamp(self.z - e.deltaY * self.wheelAmount, self.minZ, self.maxZ)
        const mppx = self.getMppx()
        const targetMppx = self.getMppx(targetZ)
        const offsetX = e.clientX - self.canvas.width / 2
        const offsetY = e.clientY - self.canvas.height / 2
        self.setTarget(
            self.x + mppx * offsetX - targetMppx * offsetX,
            self.y - mppx * offsetY + targetMppx * offsetY,
            targetZ,
            true
        )
        self.wheelTimeout = setTimeout(function() {
            self.element.dispatchEvent(new CustomEvent("mapchangeend", {
                detail: {
                    x: self.targetX,
                    y: self.targetY,
                    z: self.targetZ
                }
            }))
            self.wheelTimeout = null
        }, 100)
    }

    self.setGameVersion = function(gameVersion) {
        self.v = gameVersion
        const key = "gta" + self.v
        ;["x", "y", "z", "tileSet"].forEach(function(key) {
            self[key] = self["gta" + self.v][key]
        })
        self.targetX = self.x
        self.targetY = self.y
        self.targetZ = self.z
        self.canvas.className = self.tileSet.replace(",", "-")
        self.initMarkers()
        if (self.googleMap) {
            self.removeGooglemapsMarkers()
            self.updateGooglemapsMarkers()
        }
        self.renderMap()
        self.selectLandmark(self.l)
    }

    self.setMapMode = function(mapMode) {
        self.mapMode = mapMode
        self.element.dispatchEvent(new CustomEvent("mapmodechange", {
            detail: {
                mapMode: self.mapMode
            }
        }))
        if (self.mapMode == "gta") {
            document.body.classList.add("gta")
            document.body.classList.remove("googlemaps")
            document.body.classList.remove("streetview")
            self.canvas.style.display = "block"
            self.markersLayer.style.display = "block"
            self.googlemapsLayer.style.display = "none"
            if (self.googleMap) {
                self.googleMap.getStreetView().setVisible(false)
            }
        } else {
            document.body.classList.add("googlemaps")
            document.body.classList.remove("gta")
            self.canvas.style.display = "none"
            self.markersLayer.style.display = "none"
            self.googlemapsLayer.style.display = "block"
            self.initGooglemaps().then(function() {
                if (self.mapMode == "gta") {
                    return
                }
                self.selectLandmark(self.l)
            })
        }
    }

    self.setMapType = function(mapType) {
        self.googlemaps.mapType = mapType
        if (self.googleMap) {
            self.googleMap.setOptions({
                mapTypeId: google.maps.MapTypeId[self.googlemaps.mapType.toUpperCase()]
            })
        }
    }

    self.clamp = function(n, min, max) {
        return Math.min(Math.max(n, min), max)
    }

    self.getMppx = function(z=self.z) {
        return self.mapW / (1024 * Math.pow(2, z))
    }

    self.normalizeID = function(id) {
        return id.toString().replace(/\//g, "-")
    }

    self.panGooglemaps = function(id) {
        if (self.googleMap && self.landmarksById[id] && self.landmarksById[id].rlCoordinates) {
            const [lat, lng] = self.landmarksById[id].rlCoordinates
            self.googleMap.panTo({lat: lat, lng: lng})
        }
    }

    that._debug = function() {
        return self
    }

    return self.init()

}
