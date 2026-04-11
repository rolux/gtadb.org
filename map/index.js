var gtadb = window.gtadb || {}
window.gtadb = gtadb

gtadb.API = function(options) {
    if (!(this instanceof gtadb.API)) {
        return new gtadb.API(options)
    }
    let that = this
    let self = {
        defaults: {
            url: "api"
        },
        options: options
    }
    self.options = {...self.defaults, ...self.options}
    that.getUser = function() {
        return self.sendRequest({
            action: "get_user"
        }).then(function(ret) {
            return [ret.username, ret.session_id, ret.profile_color]
        })
    }
    that.createAccount = function(inviteCode, username, password, repeatPassword) {
        return self.sendRequest({
            action: "create_account",
            invite_code: inviteCode,
            username: username,
            password: password,
            repeat_password: repeatPassword
        }).then(function(ret) {
            return [ret.username, ret.session_id, ret.profile_color]
        })
    }
    that.login = function(username, password) {
        return self.sendRequest({
            action: "login",
            username: username,
            password: password
        }).then(function(ret) {
            return [ret.username, ret.session_id, ret.profile_color]
        })
    }
    that.changePassword = function(username, oldPassword, newPassword, repeatNewPassword) {
        return self.sendRequest({
            action: "change_password",
            username: username,
            old_password: oldPassword,
            new_password: newPassword,
            repeat_new_password: repeatNewPassword,
        })
    }
    that.logout = function() {
        return self.sendRequest({
            action: "logout"
        })
    }
    that.getLandmarks = function(since) {
        return self.sendRequest({
            action: "get_landmarks",
            since: since
        })
    }
    that.addLandmark = function(game, igCoordinates) {
        return self.sendRequest({
            action: "add_landmark",
            game: game,
            key: "ig_coordinates",
            value: igCoordinates
        })
    }
    that.editLandmark = function(game, id, key, value) {
        return self.sendRequest({
            action: "edit_landmark",
            game: game,
            id: id,
            key: key,
            value: value
        })
    }
    that.removeLandmark = function(game, id) {
        return self.sendRequest({
            action: "remove_landmark",
            game: game,
            id: id,
        })
    }
    self.sendRequest = function(data) {
        if ("game" in data) {
            data.game = data.game.toString()
        }
        const isFile = data.value instanceof File
        if (isFile) {
            const form = new FormData()
            form.append("action", data.action)
            form.append("game", data.game)
            form.append("id", data.id)
            form.append("key", data.key)
            form.append("value", data.value)
            data = form
        } else {
            data = JSON.stringify(data)
        }
        let requestData = {
            method: "POST",
            body: data,
            credentials: "include"
        }
        if (!isFile) {
            requestData.headers = {"Content-Type": "application/json"}
        }
        return fetch(self.options.url, requestData).then(function(req) {
            if (!req.ok) {
                throw new Error(req.status)
            }
            return req.json()
        }).then(function(ret) {
            if (ret.status == "error") {
                throw new Error(ret.message)
            }
            return ret
        })
    }
    return that
}

gtadb.Map = function() {

    if (!(this instanceof gtadb.Map)) {
        return new gtadb.Map()
    }
    
    // Settings ////////////////////////////////////////////////////////////////////////////////////

    let that = this
    let self = {
        v: null,
        vs: [5, 6],
        gameColors: { // FIXME: move into class
            4: "rgb(192, 64, 64)",
            5: "rgb(64, 192, 64)",
            6: "rgb(64, 64, 192)"
        },
        mapMode: "gta",
        mapModes: ["gta", "googlemaps"],
        minX: -16000,
        maxX: 4000,
        minY: -8000,
        maxY: 12000,
        minZ: 0,
        maxZ: 6,
        x: null,
        y: null,
        z: null,
        l: null,
        targetX: 0,
        targetY: 0,
        targetZ: 0,
        isAnimating: false,
        landmarks: [],
        landmarksById: {},
        landmarksIndexById: {},
        currentLandmarks: [],
        currentLandmarksIndexById: {},
        find: "",
        filter: "all",
        filterOptions: {
            "all": "all",
            "igNameConfirmed": "IG name confirmed",
            "igNameUnconfirmed": "IG name unconfirmed",
            "igNameUnknown": "IG name unknown",
            "igLatLngConfirmed": "IG latlng confirmed",
            "igLatLngUnconfirmed": "IG latlng unconfirmed",
            "igLatLngUnknown": "IG latlng unknown",
            "igWithPhoto": "with IG photo",
            "igWithoutPhoto": "without IG photo",
            "rlLandmarkConfirmed": "RL landmark confirmed",
            "rlLandmarkUnconfirmed": "RL landmark unconfirmed",
            "rlLandmarkUnknown": "RL landmark unknown",
            "rlLatLngMissing": "RL latlng missing",
            "rlWithPhoto": "with RL photo",
            "rlWithoutPhoto": "without RL photo",
            "mapIncluded": "included on the map",
            "mapNotIncluded": "not included on the map"
        },
        sort: "igAddress",
        sortOptions: {
            igAddress: "in-game address",
            igLatitude: "in-game latitude",
            igLongitude: "in-game longitude",
            rlAddress: "real-life address",
            rlLatitude: "real-life latitude",
            rlLongitude: "real-life longitude",
            tags: "tags",
            id: "id",
            edited: "last edited"
        },
        landmarkTypes: [
            "agriculture",
            "government",
            "hotel",
            "industrial",
            "landmark",
            "leisure",
            "mixed",
            "natural",
            "office",
            "other",
            "public",
            "restaurant",
            "residential",
            "retail",
            "transportation",
            "utilities"
        ],
        ui: true,
        themes: [
            "light",
            "dark",
            "michael",
            "amanda",
            "jimmy",
            "tracey",
            "trevor"
        ],
        markers: {},
        focus: "map",
        api: gtadb.API("api"),
        username: "",
        sessionId: "",
        defaults: {
            v: 6,
            gta5: {
                x: -4000,
                y: 2000,
                z: 1,
                l: null,
                find: "",
                filter: "all",
                sort: "igAddress",
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
                l: null,
                find: "",
                filter: "all",
                sort: "igAddress",
                tileSet: "yanis,11",
                tileSets: [
                    "dupzor,51",
                    "yanis,11",
                ]
            },
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
            mapMode: "gta",
            profileColor: "3f7703",
            theme: "light",
            tileOverlays: 0
        },
    }
    Object.entries(self.defaults).forEach(function([key, value]) {
        self[key] = value
    })

    // Init ////////////////////////////////////////////////////////////////////////////////////////

    self.init = function() {

        self.maps = gtadb.Maps({
            focused: true,
            googlemaps: self.googlemaps,
            gta5: self.gta5,
            gta6: self.gta6,
            mapMode: self.mapMode,
            parentElement: document.body,
            selected: self.l,
            tileOverlays: self.tileOverlays,
            v: self.v,
            x: self.targetX,
            y: self.targetY,
            z: self.targetZ,
        })
        self.maps.addEventListener("select", function(e) {
            const id = e.detail.id
            self.setLandmark(id)
            self.selectLandmark(id)
        })
        self.maps.addEventListener("edit", function(e) {
            self.editLandmark(e.detail.id, "ig_coordinates", e.detail.igCoordinates)
        })
        self.maps.addEventListener("mapchange", function(e) {
            const mapState = self.maps.get()
            self.isAnimating = mapState.isAnimating
            self.x = mapState.x
            self.y = mapState.y
            self.z = mapState.z
            self.targetX = mapState.targetX
            self.targetY = mapState.targetY
            self.targetZ = mapState.targetZ
        })
        self.maps.addEventListener("mapchangeend", function() {
            const mapState = self.maps.get()
            self.isAnimating = mapState.isAnimating
            self.x = mapState.x
            self.y = mapState.y
            self.z = mapState.z
            self.targetX = mapState.targetX
            self.targetY = mapState.targetY
            self.targetZ = mapState.targetZ
            self.googlemaps = {...mapState.googlemaps}
            if (self.mapMode == "googlemaps") {
                self.setUserSettings()
            } else {
                self.setHash()
            }
        })
        self.maps.addEventListener("mapmodechange", function(e) {
            self.mapMode = e.detail.mapMode
            self.setUserSettings()
            self.updateAddItemButton()
        })
        self.maps.element.addEventListener("mousedown", function() {
            if (self.focus != "dialog") {
                self.setFocus("map")
            }
        })
        self.maps.element.addEventListener("wheel", function() {
            if (self.focus != "dialog") {
                self.setFocus("map")
            }
        }, {passive: true})

        document.addEventListener("keydown", self.onKeydown)
        document.addEventListener("keyup", self.onKeyup)
        window.addEventListener("hashchange", self.onHashchange)

        self.getUserSettings()
        self.api.getUser().then(function([username, sessionId, profileColor]) {
            if (username) {
                self.onLogin(username, sessionId, profileColor)
            } else {
                self.onLogout()
            }
        }).catch(function(error) {
            console.log(error)
        }).finally(function() {
            const urls = self.vs.map(function(v) {
                return `data/${v}/landmarks.json`
            })
            self.loadJSON(urls).then(function(landmarks) {
                self.landmarksData = {}
                self.vs.map(function(v, i) {
                    self.landmarksData[v] = landmarks[i]
                })
                self.setTheme()
                self.initUI(self.landmarksData[self.v])
                self.maps.set({
                    currentLandmarks: self.currentLandmarks,
                    focused: self.focus == "map",
                    googlemaps: self.googlemaps,
                    gta5: self.gta5,
                    gta6: self.gta6,
                    landmarks: self.landmarks,
                    mapMode: self.mapMode,
                    selected: self.l,
                    tileOverlays: self.tileOverlays,
                    tileSet: self.tileSet,
                    v: self.v,
                    x: self.targetX,
                    y: self.targetY,
                    z: self.targetZ,
                })
                self.setMapMode(self.mapMode)
                self.onHashchange()
            })
        })
        
        return that

    }

    self.initMarkers = function() {
        self.maps.set({
            landmarks: self.landmarks,
            currentLandmarks: self.currentLandmarks,
            selected: self.l,
        })
    }

    self.initUI = function(landmarks) {

        self.parseLandmarks(landmarks) // populates self.landmarks / ...ById / current...
        self.initMarkers()

        self.uiIcon = document.createElement("div")
        self.uiIcon.classList.add("icon")
        self.uiIcon.id = "uiIcon"
        self.uiIcon.innerText = "UI"
        self.uiIcon.title = "H"
        self.uiIcon.addEventListener("click", function() {
            self.toggleUI()
        })
        self.maps.element.appendChild(self.uiIcon)

        self.streetviewIcon = document.createElement("div")
        self.streetviewIcon.classList.add("icon")
        self.streetviewIcon.id = "streetviewIcon"
        self.streetviewIcon.innerText = "X"
        self.streetviewIcon.title = "ESC"
        self.streetviewIcon.addEventListener("click", function() {
            self.maps.exitStreetView()
        })
        self.maps.element.appendChild(self.streetviewIcon)

        self.listPanel = document.createElement("div")
        self.listPanel.className = "mapPanel"
        self.listPanel.id = "listPanel"
        self.listPanel.addEventListener("mousedown", function(e) {
            setTimeout(function() { // allow for blur
                self.setFocus("list")
                const element = e.target.closest(".item")
                if (element) {
                    const id = element.id.replace("item_", "")
                    if (e.metaKey && element.classList.contains("selected")) {
                        self.setLandmark(null)
                    } else {
                        self.setLandmark(id, true)
                        self.panGooglemaps(id)
                    }
                }
            })
        })
        self.maps.element.appendChild(self.listPanel)

        // Title Bar

        self.titleElement = document.createElement("div")
        self.titleElement.id = "titleElement"

        self.siteIcon = document.createElement("div")
        self.siteIcon.classList.add("icon")
        self.siteIcon.id = "siteIcon"
        self.siteIcon.innerText = "gtadb"
        self.siteIcon.title = "GTADB.ORG"
        self.siteIcon.style.backgroundColor = "rgb(" + [0, 1, 2].map(function() {
            return Math.floor(Math.random() * 192)
        }).join(", ") + ")"
        self.siteIcon.addEventListener("click", function() {
            window.location.href = "https://gtadb.org"
        })
        self.titleElement.appendChild(self.siteIcon)

        self.gameIcon = document.createElement("div")
        self.gameIcon.classList.add("icon")
        self.gameIcon.id = "gameIcon"
        self.gameIcon.innerText = {4: "IV", 5: "V", 6: "VI"}[self.v]
        self.gameIcon.title = "V"
        self.gameIcon.style.backgroundColor = self.gameColors[self.v]
        self.gameIcon.addEventListener("click", function() {
            self.setGameVersion(self.v == 5 ? 6 : 5)
        })
        self.titleElement.appendChild(self.gameIcon)

        self.googlemapsIcon = document.createElement("div")
        self.googlemapsIcon.classList.add("icon")
        self.googlemapsIcon.id = "googlemapsIcon"
        self.googlemapsIcon.innerText = "G"
        self.googlemapsIcon.title = "G"
        self.googlemapsIcon.addEventListener("click", function() {
            self.setMapMode(self.mapMode == "gta" ? "googlemaps" : "gta")
        })
        self.titleElement.appendChild(self.googlemapsIcon)
        
        self.userIcon = document.createElement("div")
        self.userIcon.classList.add("icon")
        self.userIcon.classList.add("auth")
        self.userIcon.id = "userIcon"
        self.userIcon.title = `USER: ${self.username}`
        self.userIcon.style.backgroundColor = "#" + self.profileColor
        self.userIcon.addEventListener("click", function() {
            self.settingsPanel.set({selected: 3})
            self.settingsDialog.open()
            self.setFocus("dialog")
        })
        self.titleElement.appendChild(self.userIcon)

        self.aboutButton = gtadb.Button({
            click: function() {
                self.aboutDialog.open()
                self.setFocus("dialog")
            },
            text: "ABOUT",
            tooltip: "."
        })

        self.settingsButton = gtadb.Button({
            click: function() {
                self.settingsDialog.open()
                self.setFocus("dialog")
            },
            text: "SETTINGS",
            tooltip: ","
        })
       
        self.titleBar = gtadb.Bar({
            buttons: [self.aboutButton, self.settingsButton],
            element: self.titleElement,
        })
        self.titleBar.element.id = "titleBar"
        self.listPanel.appendChild(self.titleBar.element)

        // Find

        self.findElement = document.createElement("input")
        self.findElement.id = "find"
        self.findElement.type = "text"
        self.findElement.value = self.find
        self.findElement.placeholder = "FIND"
        self.findElement.autocomplete = "off"
        self.findElement.spellcheck = false
        self.findElement.title = "F"
        self.findElement.addEventListener("change", function(e) {
            self.findElement.blur()
            setTimeout(function() {
                // allow for clear button
                self.findAndFilterLandmarks(self.findElement.value, self.filter)
            })
        })
        self.findElement.addEventListener("input", function(e) {
            self.clearFindButton.element.style.display = self.findElement.value ? "block" : "none"
        })

        self.clearFindButton = gtadb.Button({
            mousedown: function() {
                self.findElement.value = ""
                self.findAndFilterLandmarks("", self.filter)
                self.clearFindButton.element.style.display = "none"
            },
            text: "CLEAR",
            tooltip: "⇧ F"
        })
        self.clearFindButton.element.style.display = self.find ? "block" : "none"

        self.findBar = gtadb.Bar({
            buttons: [self.clearFindButton],
            element: self.findElement
        })
        self.findBar.element.id = "findBar"
        self.listPanel.appendChild(self.findBar.element)

        // Filter

        self.filterElement = document.createElement("select")
        Object.entries(self.filterOptions).forEach(function([key, value]) {
            const element = document.createElement("option")
            element.value = key
            element.textContent = ("Filter: " + value).toUpperCase()
            element.selected = key == self.filter
            self.filterElement.appendChild(element)
        })
        self.filterElement.value = self.filter
        self.filterElement.addEventListener("change", function() {
            this.blur()
            self.clearFilterButton.element.style.display = this.value == "all" ? "none" : "block"
            self.findAndFilterLandmarks(self.find, this.value)
        })

        self.clearFilterButton = gtadb.Button({
            mousedown: function() {
                self.filterElement.value = "all"
                self.clearFilterButton.element.style.display = "none"
                self.findAndFilterLandmarks(self.find, "all")
            },
            text: "CLEAR",
        })
        self.clearFilterButton.element.style.display = self.filter == "all" ? "none" : "block"

        self.filterBar = gtadb.Bar({
            buttons: [self.clearFilterButton],
            element: self.filterElement
        })
        self.filterBar.element.id = "filterBar"
        self.listPanel.appendChild(self.filterBar.element)

        // Sort

        self.sortElement = document.createElement("select")
        Object.entries(self.sortOptions).forEach(function([key, value]) {
            const element = document.createElement("option")
            element.value = key
            element.textContent = ("Sort by " + value).toUpperCase()
            element.selected = key == self.sort
            self.sortElement.appendChild(element)
        })
        self.sortElement.value = self.sort
        self.sortElement.addEventListener("change", function() {
            this.blur()
            self.sortLandmarks(this.value)
            self.renderList()
            if (self.l) {
                self.selectLandmark(self.l)
            }
        })
        self.sortBar = gtadb.Bar({
            buttons: [],
            element: self.sortElement
        })
        self.sortBar.element.id = "sortBar"
        self.sortBar.element.addEventListener("click", function(e) {
            if (e.target == self.sortBar.element) {
                self.listBody.scrollTo(0, 0)
            }
        })
        self.listPanel.appendChild(self.sortBar.element)

        // List

        self.listBody = document.createElement("div")
        self.listBody.id = "listBody"
        self.listPanel.appendChild(self.listBody)

        // Status

        self.listStatusElement = document.createElement("div")

        self.removeItemButton = gtadb.Button({
            click: function() {
                self.removeLandmark()
            },
            text: "REMOVE",
            tooltip: "DELETE"
        })
        self.removeItemButton.element.classList.add("auth")

        self.addItemButton = gtadb.Button({
            click: function() {
                self.addLandmark()
            },
            text: "ADD",
            tooltip: "A"
        })
        self.addItemButton.element.classList.add("auth")

        self.listStatusBar = gtadb.Bar({
            border: "top",
            buttons: [self.removeItemButton, self.addItemButton],
            element: self.listStatusElement
        })
        self.listStatusBar.element.id = "listStatusBar"
        self.listStatusBar.element.addEventListener("click", function(e) {
            if (e.target == self.listStatusBar.element) {
                self.listBody.scrollTo(0, self.landmarks.length * 32)
            }
        })
        self.renderStatus()
        self.listPanel.appendChild(self.listStatusBar.element)

        // Item

        self.itemPanel = document.createElement("div")
        self.itemPanel.className = "mapPanel"
        self.itemPanel.id = "itemPanel"
        self.maps.element.appendChild(self.itemPanel)

        self.itemId = document.createElement("div")
        self.itemId.id = "itemId"

        self.editItemButton = gtadb.Button({
            click: function() {
                self.startEditing()
            },
            text: "EDIT",
            tooltip: "E"
        })
        self.editItemButton.element.id = "editItemButton"
        self.editItemButton.element.classList.add("auth")

        self.closeItemButton = gtadb.Button({
            click: function() {
                self.setLandmark(null)
            },
            text: "CLOSE",
            tooltip: "ESC"
        })

        self.itemBar = gtadb.Bar({
            buttons: [self.editItemButton, self.closeItemButton],
            element: self.itemId
        })
        self.itemBar.element.id = "itemBar"
        self.itemPanel.appendChild(self.itemBar.element)

        self.itemBody = document.createElement("div")
        self.itemBody.id = "itemBody"
        self.itemPanel.appendChild(self.itemBody)

        self.itemIgAddress = document.createElement("div")
        self.itemIgAddress.id = "itemIgAddress"
        self.itemIgAddress.className = "address"
        self.itemBody.appendChild(self.itemIgAddress)

        self.itemIgCoordinates = document.createElement("div")
        self.itemIgCoordinates.className = "coordinates"
        self.itemBody.appendChild(self.itemIgCoordinates)

        self.itemIgPhoto = document.createElement("div")
        self.itemIgPhoto.className = "photo"
        self.itemBody.appendChild(self.itemIgPhoto)

        self.editItemIgPhoto = gtadb.Input({
            change: function(value) {
                self.editLandmark(self.l, "ig_photo", value)
            },
            height: 139.5,
            type: "file",
            value: "",
            width: 248
        })
        self.editItemIgPhoto.element.id = "editItemIgPhoto"
        self.editItemIgPhoto.element.classList.add("auth")
        self.itemBody.appendChild(self.editItemIgPhoto.element)

        self.itemRlAddress = document.createElement("div")
        self.itemRlAddress.id = "itemRlAddress"
        self.itemRlAddress.className = "address"
        self.itemBody.appendChild(self.itemRlAddress)

        self.itemRlCoordinates = document.createElement("div")
        self.itemRlCoordinates.className = "coordinates"
        self.itemBody.appendChild(self.itemRlCoordinates)

        self.itemRlPhoto = document.createElement("div")
        self.itemRlPhoto.className = "photo"
        self.itemBody.appendChild(self.itemRlPhoto)

        self.editItemRlPhoto = gtadb.Input({
            change: function(value) {
                self.editLandmark(self.l, "rl_photo", value)
            },
            height: 139.5,
            type: "file",
            value: "",
            width: 248
        })
        self.editItemRlPhoto.element.id = "editItemRlPhoto"
        self.editItemRlPhoto.element.classList.add("auth")
        self.itemBody.appendChild(self.editItemRlPhoto.element)

        self.itemTags = document.createElement("div")
        self.itemTags.id = "itemTags"
        self.itemBody.appendChild(self.itemTags)

        self.itemStatus = document.createElement("div")
        self.itemStatus.id = "itemStatus"
        self.itemBody.appendChild(self.itemStatus)

        self.itemStatusElement = document.createElement("div")
        self.itemStatusElement.id = "itemStatusElement"
 
        self.itemStatusBar = gtadb.Bar({
            border: "top",
            element: self.itemStatusElement
        })
        self.itemStatusBar.element.id = "itemStatusBar"
        self.itemPanel.appendChild(self.itemStatusBar.element)

        // Dialog Layer

        self.dialogLayer = gtadb.DialogLayer()
        self.dialogLayer.element.id = "dialogLayer"
        self.maps.element.appendChild(self.dialogLayer.element)

        // About Dialog

        self.aboutThisMapElement = document.createElement("div")
        self.aboutThisMapElement.style.margin = "8px"
        self.aboutThisMapElement.innerHTML = `<p><b>map.gtadb.org</b>
            is an interactive map of Grand Theft Auto V and VI that
            includes all landmarks that have been identified so far.</p>
            <p>Our current goal is to find the real-life equivalent of
            every single in-game building in GTA VI. This is going to be
            a collaborative effort, way beyond the release of the game.</p>
            <p>Huge thanks to all contributors, on the GTA VI Mapping
            Discord and elsewhere!</p>`

        self.sourceCodeElement = document.createElement("div")
        self.sourceCodeElement.style.margin = "8px"
        self.sourceCodeElement.innerHTML = `<p>This website, including
            the GTA VI map application, is free Open Source software
            (MIT License), written in JavaScript and Python.</p>
            <p>You can get the source code on GitHub. That's also the
            best place to request features or report bugs.</p>
            <p><a href="https://github.com/rolux/gtadb.org"
            target="_blank">https://github.com/rolux/gtadb.org</a></p>
            <p>Please note that this is a desktop app, intentionally.
            It is not supposed to work on mobile.<p>`

        self.landmarkDataElement = document.createElement("div")
        self.landmarkDataElement.style.margin = "8px"
        self.landmarkDataElement.innerHTML = `<p>You are welcome
            to use the landmark data for your own purposes.</p>
            <p>The latest versions (CC-BY 4.0) can always be found here:</p>
            <p><a href="https://map.gtadb.org/data/5/landmarks.json"
            target="_blank">https://map.gtadb.org/data/5/landmarks.json</a>
            </p>
            <p><a href="https://map.gtadb.org/data/6/landmarks.json"
            target="_blank">https://map.gtadb.org/data/6/landmarks.json</a>
            </p>`

        self.keyboardShortcutsElement = document.createElement("div")
        self.keyboardShortcutsElement.style.margin = "8px"
        self.keyboardShortcutsElement.innerHTML = `<table>
            <tr><td>← → ↑ ↓</td><td>Pan</td></tr>
            <tr><td>&ndash;</td><td>Zoom out</td></tr>
            <tr><td>=</td><td>Zoom in</td></tr>
            <tr><td>0 1 2 3 4 5 6</td><td>Set zoom level</td></tr>
            <tr><td>V</td><td>Switch game version (GTA V / GTA VI)</td></tr>
            <tr><td>G</td><td>Switch map mode (GTA / Google Maps)</td></tr>
            <tr><td>T</td><td>Switch tile set (GTA) or map type (Google Maps)</td></tr>
            <tr><td>⇧ T</td><td>Toggle overlays (GTA VI)</td></tr>
            <tr><td>ESC</td><td>Exit StreetView</td></tr>
            <tr><td>&nbsp;</td><td>&nbsp;</td></tr>
            <tr><td>F</td><td>Find</td></tr>
            <tr><td>⇧ F</td><td>Clear find</td></tr>
            <tr><td>↑ ↓</td><td>Select previous / next landmark</td></tr>
            <tr><td>← →</td><td>Select first / last landmark</td></tr>
            <tr><td>ESC</td><td>Deselect landmark</td></tr>
            <tr><td>H</td><td>Toggle UI</td></tr>
            <tr><td>&nbsp;</td><td>&nbsp;</td></tr>
            <tr><td>.</td><td>Open About dialog</td></tr>
            <tr><td>,</td><td>Open Settings dialog</td></tr>
            <tr><td>← →</td><td>Switch photo</td></tr>
            <tr><td>ESC</td><td>Close dialog</td></tr>
            <tr><td>&nbsp;</td><td>&nbsp;</td></tr>
            <tr><td>A</td><td>Add landmark</td></tr>
            <tr><td>E</td><td>Edit landmark</td></tr>
            <tr><td>DEL</td><td>Remove Landmark</td></tr>
            </table>`

        self.editingGuidelinesElement = document.createElement("div")
        self.editingGuidelinesElement.style.margin = "8px"
        self.editingGuidelinesElement.innerHTML = `<p class="title">Who can edit the landmarks?</p>
            <p>Accounts are invite-only. If you can think of anyone who would be a great
            contributor, please get in touch on the Discord.</p>
            <p class="title">What qualifies as a landmark?</p>
            <p>In principle, everything that is based on something in real life, including
            natural features. If a landmark contains other landmarks, it doesn't have to be
            added. For example, rather than adding "Key Lento", add buildings on Key Lento.
            Beaches or parks with landmarks may be an exception.</p>
            <p class="title">IDs</p>
            <p>IDs are assigned sequentially and are not supposed to mean anything. Deleting
            landmarks will create holes in the sequence of IDs (unless it's the most
            recently added landmark), so delete sparingly. IDs are meant to be tied to the
            in-game landmark – so if a marker is associated with the wrong landmark, don't
            edit the address, but move the marker to the correct location.</p>
            <p class="title">In-game addresses</p>
            <p>The standard format is "Name, Street Address, City". If there is no name, it
            can be left out. If the landmark is not in a specific city or town, use the
            county name instead. If we don't even know the county, use "Leonida". But don't
            add unnecessary county or state names, like "..., Vice City, Vice-Dale County,
            Leondia".</p>
            <p class="title">In-game coordinates</p>
            <p>For now, they can be approximate, based on the most accurate map. Once there
            is an official map, markers can be moved to their precise in-game location.</p>
            <p class="title">In-game photos</p>
            <p>For now, they are not needed, other than for disambiguation purposes. In
            cases where we have no information for the landmark, it's a good idea to add a
            photo to make it obvious what the marker is referring to. If you're adding a
            screenshot from 2022, please add a 2022 tag to make sure the image is not
            visible to the general public.</p>
            <p class="title">Real-life addresses</p>
            <p>The standard format is "Name, Street Address, FL 12345, USA". If there is no
            name, it can be left out. Generally, the address should be chosen so that Google
            Maps can translate it to the correct coordinates. In some cases, Plus Codes
            (like in "Sombrero Key Light, JVHQ+5M, Marathon, FL, USA") are the best choice.
            If the name of a landmark has changed since the scouting period (2015-2016),
            then the original name from that period should be used.
            </p>
            <p class="title">Real-life coordinates</p>
            <p>Currently, these are based on the real-life address and cannot be edited.
            This may change in the future.</p>
            <p class="title">Real-life photos</p>
            <p>Again, these are not needed for now. Later on, the goal is to add matching
            in-game and real-life photos that best convey the similarities.</p>
            <p class="title">Tags</p>
            <p>Tags can be anything. Common tags are DEMOLISHED (for landmarks that no longer
            exist in real life), EVENTS (for places we only know of by way of the 2022 events
            list), REUSED (for duplicated building assets) and UNCONFIRMED (for speculative
            real-life matches).
            Tags can also be used for a taxonomy of landmark types. A good set of types
            may be AGRICULTURE, GOVERNMENT, HOTEL, INDUSTRIAL, LANDMARK, LEISURE, MIXED,
            NATURAL, OFFICE, PUBLIC, RESIDENTIAL, RESTAURANT, RETAIL, TRANSPORTATION,
            UTILITIES, OTHER. But this is not set in stone.</p>`

        self.aboutPanel = gtadb.Panel({
            height: 512,
            elements: {
                "About This Map": self.aboutThisMapElement,
                "Source Code": self.sourceCodeElement,
                "Landmark Data": self.landmarkDataElement,
                "Keyboard Shortcuts": self.keyboardShortcutsElement,
                "Editing Guidelines": self.editingGuidelinesElement,
            },
            width: 768
        })

        self.switchToSettingsButton = gtadb.Button({
            "click": function() {
                self.aboutDialog.close()
                self.settingsDialog.open()
            },
            "text": "SETTINGS",
            "tooltip": ","
        })

        self.aboutDialog = gtadb.Dialog({
            buttons: [self.switchToSettingsButton],
            onClose: function() {
                self.setFocus("list")
            },
            content: self.aboutPanel.element,
            height: 544,
            layer: self.dialogLayer,
            title: "GTA VI Landmarks Map",
            width: 768
        })
        self.aboutDialog.element.id = "aboutDialog"

        // Settings Dialog

        self.mapSettingsElement = document.createElement("div")
        self.mapSettingsElement.style.margin = "8px"

        self.gameVersionSelect = document.createElement("select")
        self.vs.forEach(function(v) {
            const element = document.createElement("option")
            element.value = v
            element.textContent = "GAME VERSION: GTA " + ({4: "IV", 5: "V", 6: "VI"}[v])
            element.selected = v == self.v
            self.gameVersionSelect.appendChild(element)
        })
        self.gameVersionSelect.value = self.v
        self.gameVersionSelect.addEventListener("change", function() {
            this.blur()
            self.setGameVersion(this.value)
        })
        self.mapSettingsElement.appendChild(self.gameVersionSelect) 

        self.tileSetVSelect = document.createElement("select")
        self.defaults.gta5.tileSets.forEach(function(tileSet) {
            const element = document.createElement("option")
            element.value = tileSet
            element.textContent = ("GTA V TILE SET: " + tileSet).toUpperCase()
            element.selected = tileSet == self.gta5.tileSet
            self.tileSetVSelect.appendChild(element)
        })
        self.tileSetVSelect.value = self.gta5.tileSet
        self.tileSetVSelect.addEventListener("change", function() {
            this.blur()
            self.gta5.tileSet = this.value
            if (self.v == 5) { // FIXME: shouldn't be needed
                self.tileSet = self.gta5.tileSet
                self.maps.set({
                    tileSet: self.tileSet,
                })
            }
            self.setUserSettings()
        })
        self.mapSettingsElement.appendChild(self.tileSetVSelect)

        self.tileSetVISelect = document.createElement("select")
        self.defaults.gta6.tileSets.forEach(function(tileSet) {
            const element = document.createElement("option")
            element.value = tileSet
            element.textContent = ("GTA VI TILE SET: " + tileSet.replace(",", " V")).toUpperCase()
            element.selected = tileSet == self.gta6.tileSet
            self.tileSetVISelect.appendChild(element)
        })
        self.tileSetVISelect.value = self.gta6.tileSet
        self.tileSetVISelect.addEventListener("change", function() {
            this.blur()
            self.gta6.tileSet = this.value
            if (self.v == 6) { // FIXME: shouldn't be needed
                self.tileSet = self.gta6.tileSet
                self.maps.set({
                    tileSet: self.tileSet,
                })
            }
            self.setUserSettings()
        })
        self.mapSettingsElement.appendChild(self.tileSetVISelect)

        self.tileOverlaysSelect = document.createElement("select")
        ;["off", "on"].forEach(function(value, i) {
            const element = document.createElement("option")
            element.value = i
            element.textContent = ("GTA VI TILE OVERLAYS: " + value).toUpperCase()
            element.selected = value == self.tileOverlays
            self.tileOverlaysSelect.appendChild(element)
        })
        self.tileOverlaysSelect.value = self.tileOverlays
        self.tileOverlaysSelect.addEventListener("change", function() {
            this.blur()
            self.tileOverlays = this.value
            self.setUserSettings()
            self.maps.set({
                tileOverlays: self.tileOverlays,
            })
        })
        self.mapSettingsElement.appendChild(self.tileOverlaysSelect)

        self.mapModeSelect = document.createElement("select")
        self.mapModes.forEach(function(mapMode) {
            const element = document.createElement("option")
            element.value = mapMode
            element.textContent = ("MAP MODE: " + mapMode.replace("googlemaps", "google maps")).toUpperCase()
            element.selected = mapMode == self.mapMode
            self.mapModeSelect.appendChild(element)
        })
        self.mapModeSelect.value = self.mapMode
        self.mapModeSelect.addEventListener("change", function() {
            this.blur()
            self.setMapMode(this.value)
        })
        self.mapSettingsElement.appendChild(self.mapModeSelect)

        self.mapTypeSelect = document.createElement("select")
        self.defaults.googlemaps.mapTypes.forEach(function(mapType) {
            const element = document.createElement("option")
            element.value = mapType
            element.textContent = ("GOOGLE MAPS MAP TYPE: " + mapType).toUpperCase()
            element.selected = mapType == self.googlemaps.mapType
            self.mapTypeSelect.appendChild(element)
        })
        self.mapTypeSelect.value = self.googlemaps.mapType
        self.mapTypeSelect.addEventListener("change", function() {
            this.blur()
            self.setMapType(this.value)
        })
        self.mapSettingsElement.appendChild(self.mapTypeSelect)

        self.appearanceElement = document.createElement("div")
        self.appearanceElement.style.margin = "8px"

        self.appearanceSelect = document.createElement("select")
        self.themes.forEach(function(theme) {
            const element = document.createElement("option")
            element.value = theme
            element.textContent = ("Theme: " + theme).toUpperCase()
            element.selected = theme == self.theme
            self.appearanceSelect.appendChild(element)
        })
        self.appearanceSelect.value = self.theme
        self.appearanceSelect.addEventListener("change", function() {
            this.blur()
            self.theme = this.value
            self.setUserSettings()
            self.setTheme()
        })
        self.appearanceElement.appendChild(self.appearanceSelect)

        self.createAccountForm = gtadb.Form({
            buttonText: "CREATE ACCOUNT",
            click: function(data) {
                self.api.createAccount(
                    data.inviteCode,
                    data.username,
                    data.password,
                    data.repeatPassword
                ).then(function([username, sessionId, profileColor]) {
                    self.onLogin(username, sessionId, profileColor)
                }).catch(function(error) {
                    self.createAccountForm.setMessage("error", error.message)
                })
            },
            inputs: {
                "inviteCode": ["INVITE CODE", "text", ""],
                "username": ["USERNAME", "text", ""],
                "password": ["PASSWORD", "password", ""],
                "repeatPassword": ["REPEAT PASSWORD", "password", ""]
            },
            width: 496
        })
        self.createAccountForm.element.style.margin = "8px"

        self.changePasswordForm = gtadb.Form({
            buttonText: "CHANGE PASSWORD",
            click: function(data) {
                self.api.changePassword(
                    self.username,
                    data.oldPassword,
                    data.newPassword,
                    data.repeatNewPassword
                ).then(function() {
                    self.changePasswordForm.setMessage("ok", "Password changed")
                }).catch(function(error) {
                    self.changePasswordForm.setMessage("error", error.message)
                })
            },
            inputs: {
                "username": ["USERNAME", "text", self.username],
                "oldPassword": ["OLD PASSWORD", "password", ""],
                "newPassword": ["NEW PASSWORD", "password", ""],
                "repeatNewPassword": ["REPEAT NEW PASSWORD", "password", ""]                
            },
            width: 496,
            _readonly: ["username"] // only present to prevent find input autofill
        })
        self.changePasswordForm.element.style.margin = "8px"

        self.loginForm = gtadb.Form({
            buttonText: "LOGIN",
            click: function(data) {
                self.api.login(
                    data.username,
                    data.password
                ).then(function([username, sessionId, profileColor]) {
                    self.onLogin(username, sessionId, profileColor)
                }).catch(function(error) {
                    self.loginForm.setMessage("error", error.message)
                })
            },
            inputs: {
                "username": ["USERNAME", "text", ""],
                "password": ["PASSWORD", "password", ""]
            },
            width: 496
        })
        self.loginForm.element.style.margin = "8px"

        self.logoutForm = gtadb.Form({
            buttonText: "LOGOUT",
            click: function() {
                self.api.logout().then(function() {
                    self.onLogout()
                }).catch(function(error) {

                })
            },
            inputs: {
                "username": ["USERNAME", "text", self.username],
            },
            width: 496,
            _readonly: ["username"]
        })
        self.logoutForm.element.style.margin = "8px"

        self.settingsPanel = gtadb.Panel({
            height: 512,
            elements: self.sessionId ? {
                "Map Settings": self.mapSettingsElement,
                "Appearance": self.appearanceElement,
                "Change Password": self.changePasswordForm.element,
                "Logout": self.logoutForm.element,
            } : {
                "Map Settings": self.mapSettingsElement,
                "Appearance": self.appearanceElement,
                "Create Account": self.createAccountForm.element,
                "Login": self.loginForm.element,
            },
            width: 768
        })

        self.switchToAboutButton = gtadb.Button({
            "click": function() {
                self.settingsDialog.close()
                self.aboutDialog.open()
            },
            "text": "ABOUT",
            "tooltip": "."
        })

        self.settingsDialog = gtadb.Dialog({
            buttons: [self.switchToAboutButton],
            onClose: function() {
                self.setFocus("list")
            },
            content: self.settingsPanel.element,
            height: 544,
            layer: self.dialogLayer,
            title: "Settings",
            width: 768
        })
        self.settingsDialog.element.id = "settingsDialog"

        // Photo Dialog

        self.switchPhotoButton = gtadb.Button({
            click: function() {
                self.switchPhoto()
            },
            text: "SWITCH",
            tooltip: "← / →"
        })
        self.photoDialog = gtadb.Dialog({
            buttons: [self.switchPhotoButton],
            onClose: function() {
                self.setFocus("list")
            },
            content: document.createElement("div"),
            layer: self.dialogLayer,
            title: ""
        })
        self.photoDialog.element.id = "photoDialog"

    }

    // Map /////////////////////////////////////////////////////////////////////////////////////////

    self.animate = function(immediate=false) {
        self.maps.set({
            x: self.targetX,
            y: self.targetY,
            z: self.targetZ,
            immediate: immediate,
        })
    }

    self.renderMarkers = function() {
        self.maps.set({
            currentLandmarks: self.currentLandmarks,
            selected: self.l,
        })
    }

    self.renderMap = function() {
        self.maps.set({
            x: self.x,
            y: self.y,
            z: self.z,
            immediate: true,
        })

    }

    self.setHash = function() {
        const hash = {4: "IV", 5: "V", 6: "VI"}[self.v] + "," + [self.targetX, self.targetY, self.targetZ].map(function (v) {
            return v.toFixed(3)
        }).join(",") + (self.l ? "," + self.l : "")
        if (window.location.hash.slice(1) != hash) {
            // history.replaceState(null, "", "#" + hash)
            window.location.hash = hash
        }
    }

    self.setTarget = function(x, y, z, immediate=false) {
        self.maps.set({
            x: x,
            y: y,
            z: z,
            immediate: immediate,
        })
    }

    // Landmarks ///////////////////////////////////////////////////////////////////////////////////

    self.addLandmark = function() {
        self.api.addLandmark(self.v, [self.x, self.y]).then(function(ret) {
            if (ret.status == "ok") {
                self.clearFindAndFilter()
                let landmark = self.parseLandmark(ret.id, ret.data)
                self.landmarks.push(landmark)
                self.landmarksById[ret.id] = landmark
                self.landmarksIndexById[ret.id] = self.landmarks.length - 1
                self.currentLandmarks.push(landmark)
                self.maps.set({
                    landmarks: self.landmarks,
                    currentLandmarks: self.currentLandmarks,
                })
                self.setLandmark(ret.id)
                self.renderMarkers()
                self.renderList()
                self.renderStatus()
                self.startEditing()
            } else {
                console.log(ret)
            }
        })
    }

    self.editLandmark = function(id, key, value) {
        self.api.editLandmark(self.v, id, key, value).then(function(ret) {
            if (ret.status == "ok") {
                let landmark = self.parseLandmark(id, ret.data)
                let index = self.landmarksIndexById[id]
                if (index !== void 0) {
                    self.landmarks[index] = landmark
                }
                self.landmarksById[id] = landmark
                index = self.currentLandmarksIndexById[id]
                if (index !== void 0) {
                    self.currentLandmarks[index] = landmark
                }
                self.maps.set({
                    landmarks: self.landmarks,
                    currentLandmarks: self.currentLandmarks,
                    selected: self.l,
                })
                self.renderList()
                self.renderStatus()
                self.renderItem()
                if (self.mapMode == "googlemaps") {
                    self.panGooglemaps(id)
                }
            } else {
                console.log(ret)
            }
        })
    }

    self.removeLandmark = function() {
        self.api.removeLandmark(self.v, self.l).then(function(ret) {
            if (ret.status == "ok") {
                let index = self.landmarksIndexById[self.l]
                if (index !== void 0) {
                    self.landmarks.splice(index, 1)
                    self.landmarksIndexById = self.landmarks.reduce(function(a, landmark, i) {
                        a[landmark.id] = i
                        return a
                    }, {})
                }
                delete self.landmarksById[self.l]
                index = self.currentLandmarksIndexById[self.l]
                if (index !== void 0) {
                    self.currentLandmarks.splice(index, 1)
                    self.currentLandmarksIndexById = self.currentLandmarks.reduce(function(a, landmark, i) {
                        a[landmark.id] = i
                        return a
                    }, {})
                }
                self.l = null
                self.maps.set({
                    landmarks: self.landmarks,
                    currentLandmarks: self.currentLandmarks,
                    selected: null,
                })
                self.setLandmark(null)
                self.renderList()
                self.renderStatus()
            } else {
                console.log(ret)
            }
        })
    }

    self.parseLandmark = function(id, item) {
        let landmark = {
            "id": id,
            "idSortString": self.getIdSortString(id),
            "igAddress": item[0],
            "igAddressSortString": self.getAddressSortString(item[0]),
            "igCoordinates": item[1] && item[1].length ? item[1] : null, // FIXME: item[1] should never be null
            "igPhotoSize": item[2].length ? item[2] : null,
            "igPhotoRatio": item[2].length ? [item[2][0] / item[2][1]] : 0,
            "rlAddress": item[3].replace(/(?<=.)\?$/, ""),
            "rlAddressSortString": self.getAddressSortString(item[3].replace(/(?<=.)\?$/, "")),
            "rlCoordinates": item[4] && item[4].length ? item[4] : null, // FIXME: item[4] should never be null
            "rlStatus": item[3] == "?" ? "unknown" : item[6].includes("unconfirmed") ? "unconfirmed" : "confirmed",
            "rlPhotoSize": item[5].length ? item[5] : null,
            "rlPhotoRatio": item[5].length ? [item[5][0] / item[5][1]] : 0,
            "tags": item[6],
            "color": item[7],
            "edited": item[8],
            "findString": id + "\n" + item[0].toLowerCase() + "\n" + item[3].toLowerCase() + "\n" + item[6].join("\n")
        }
        landmark.title = self.getLandmarkTitle(landmark)
        return landmark
    }

    self.parseLandmarks = function(landmarks) {
        self.landmarks = Object.entries(landmarks).map(function([id, item]) {
            return self.parseLandmark(id, item)
        })
        self.landmarksById = {}
        self.landmarksIndexById = {}
        self.landmarks.forEach(function(landmark, index) {
            self.landmarksById[landmark.id] = landmark
            self.landmarksIndexById[landmark.id] = index
        })
        self.currentLandmarks = self.landmarks.slice()
    }

    self.selectLandmark = function(id) {
        self.l = id
        self.setUserSettings()
        document.querySelectorAll(".marker.selected").forEach(function(element) {
            element.classList.remove("selected")
        })
        if (self.l) {
            document.querySelectorAll(
                `#marker_${self.l}, #googlemapsMarker_${self.l}`
            ).forEach(function(element) {
                element.classList.add("selected")
            })
        }
        let element = document.querySelector(".item.selected")
        if (element) {
            element.classList.remove("selected")
        }
        if (self.l) {
            element = document.querySelector("#item_" + self.l)
            if (element) {
                element.classList.add("selected")
                const top = 128, bottom = window.innerHeight - 64
                const y = element.getBoundingClientRect().y
                if (y < top) {
                    self.listBody.scrollTo(0, self.listBody.scrollTop + y - top)
                } else if (y > bottom) {
                    self.listBody.scrollTo (0, self.listBody.scrollTop + y - bottom)
                }
            }
        }
        self.updateRemoveItemButton()
        self.renderItem()
        self.maps.set({
            selected: self.l,
        })
        if (self.mapMode == "gta") {
            self.panGooglemaps(id)
        }
    }

    self.setLandmark = function(id, pan) {
        if (id != self.l && self.editing) {
            self.stopEditing()
        }
        self.l = id
        if (pan) {
            const landmark = self.landmarksById[id]
            if (landmark.igCoordinates) {
                self.targetX = landmark.igCoordinates[0]
                self.targetY = landmark.igCoordinates[1]
                self.targetZ = self.z
            }
        }
        self.setHash()
    }

    self.sortLandmarks = function(option) {
        self.sort = option
        self.setUserSettings()
        self.currentLandmarks.sort(function(a, b) {
            let sortValues = [a, b].map(function(v) {
                if (self.sort == "igAddress") {
                    return v.igAddressSortString + "\n" + v.rlAddressSortString
                } else if (self.sort == "igLatitude") {
                    return v.igCoordinates ? -v.igCoordinates[1] : 1e6
                } else if (self.sort == "igLongitude") {
                    return v.igCoordinates ? v.igCoordinates[0] : 1e6
                } else if (self.sort == "rlAddress") {
                    return v.rlAddressSortString + "\n" + v.igAddressSortString
                } else if (self.sort == "rlLatitude") {
                    return v.rlCoordinates ? -v.rlCoordinates[0] : 1e6
                } else if (self.sort == "rlLongitude") {
                    return v.rlCoordinates ? v.rlCoordinates[1] : 1e6
                } else if (self.sort == "tags") {
                    return [v.tags.join(", ")].concat(v.igAddress.split(", ").reverse()).join(", ")
                } else if (self.sort == "id") {
                    return v.idSortString
                } else if (self.sort == "edited") {
                    return -v.edited[0]
                }
            })
            return sortValues[0] < sortValues[1] ? -1 : sortValues[0] > sortValues[1] ? 1 : 0
        })
        self.currentLandmarksIndexById = self.currentLandmarks.reduce(function(a, v, i) {
            a[v.id] = i
            return a
        }, {})
    }

    self.updateGooglemapsMarkers = function() {
        self.maps.set({
            currentLandmarks: self.currentLandmarks,
            selected: self.l,
        })
    }

    // Photo Dialog ////////////////////////////////////////////////////////////////////////////////

    self.openPhotoDialog = function(landmark, selected) {
        self.dialogPhoto = document.createElement("img")
        const index = selected == "ig" ? 1 : 2
        self.dialogPhoto.src = `photos/${self.v}/${landmark.id},${selected}.jpg?v=${landmark.edited[index]}`
        self.dialogPhoto.id = "dialogPhoto"
        self.photoDialog.set({
            content: self.dialogPhoto,
            title: selected == "ig" ? (landmark.igAddress || "?") : (landmark.rlAddress || "?")
        })
        self.resizePhotoDialog()
        self.switchPhotoButton.element.style.display = self.hasBothPhotos(landmark) ? "block" : "none"
        self.photoDialog.open()
        self.setFocus("dialog")
    }

    self.switchPhoto = function() {
        const landmark = self.landmarksById[self.l]
        if (!self.hasBothPhotos(landmark)) {
            return
        }
        const selected = self.dialogPhoto.src.includes(",ig.jpg") ? "rl" : "ig"
        const index = selected == "ig" ? 1 : 2
        self.dialogPhoto.addEventListener("load", function() {
            self.photoDialog.set({
                title: landmark[selected == "ig" ? "igAddress" : "rlAddress"]
            })
            self.resizePhotoDialog()
        })
        self.dialogPhoto.src = `photos/${self.v}/${self.l},${selected}.jpg?v=${landmark.edited[index]}`
    }

    self.resizePhotoDialog = function() {
        if (!self.dialogPhoto) {
            return
        }
        const margin = 64
        const windowRatio = (window.innerWidth - margin) / (window.innerHeight - margin)
        ///const dialogRatio = self.dialogPhoto.naturalWidth / (self.dialogPhoto.naturalHeight + 32)
        const key = self.dialogPhoto.src.includes(",ig.jpg") ? "igPhotoSize" : "rlPhotoSize"
        const dialogRatio = self.landmarksById[self.l][key][0] / (self.landmarksById[self.l][key][1] + 32)
        let dialogWidth, dialogHeight
        if (dialogRatio >= windowRatio) {
            dialogWidth = window.innerWidth - margin
            dialogHeight = dialogWidth / dialogRatio
        } else {
            dialogHeight = window.innerHeight - margin
            dialogWidth = dialogHeight * dialogRatio
        }
        self.photoDialog.set({
            height: dialogHeight,
            width: dialogWidth
        })
        self.dialogPhoto.style.width = dialogWidth + "px"
        self.dialogPhoto.style.height = dialogHeight - 32 + "px"
    }

    self.closePhotoDialog = function() {
        self.dialogLayer.element.style.display = "none"
        self.photoDialog.style.display = "none"
        self.setFocus("list")
    }

    self.hasBothPhotos = function(landmark) {
        return landmark.igPhotoSize && landmark.rlPhotoSize && (
            self.sessionId || !landmark.tags.includes("2022")
        )
    }

    // Find & Filter ///////////////////////////////////////////////////////////////////////////////

    self.clearFindAndFilter = function() {
        self.find = ""
        self.findElement.value = ""
        self.clearFindButton.element.style.display = "none"
        self.filter = "all"
        self.filterElement.value = "all"
        self.clearFilterButton.element.style.display = "none"
    }

    self.findAndFilterLandmarks = function(find, filter) {
        self.find = find.toLowerCase()
        self.filter = filter
        self.setUserSettings()
        self.currentLandmarks = self.landmarks.filter(function(landmark) {
            return landmark.findString.includes(self.find) && (
                self.filter == "all" ||
                self.filter == "igNameConfirmed" && !landmark.igAddress.includes("?") && landmark.igAddress[0] != '"' ||
                self.filter == "igNameUnconfirmed" && landmark.igAddress.includes("?") && landmark.igAddress[0] != "?" ||
                self.filter == "igNameUnknown" && (landmark.igAddress[0] == "?" || landmark.igAddress[0] == '"') ||
                self.filter == "igLatLngConfirmed" && landmark.igAddress.slice(-1) != "?" && landmark.igCoordinates !== null ||
                self.filter == "igLatLngUnconfirmed" && landmark.igAddress.slice(-1) == "?" ||
                self.filter == "igLatLngUnknown" && landmark.igCoordinates === null ||
                self.filter == "igWithPhoto" && landmark.igPhotoRatio ||
                self.filter == "igWithoutPhoto" && !landmark.igPhotoRatio ||
                self.filter == "rlLandmarkConfirmed" && landmark.rlStatus == "confirmed" ||
                self.filter == "rlLandmarkUnconfirmed" && landmark.rlStatus == "unconfirmed" ||
                self.filter == "rlLandmarkUnknown" && landmark.rlStatus == "unknown" ||
                self.filter == "rlLatLngMissing" && landmark.rlAddress[0] != "?" && landmark.rlCoordinates === null ||
                self.filter == "rlWithPhoto" && landmark.rlPhotoRatio ||
                self.filter == "rlWithoutPhoto" && !landmark.rlPhotoRatio ||
                self.filter == "mapIncluded" && parseInt(landmark.id.slice(1)) <= 344 ||
                self.filter == "mapNotIncluded" && parseInt(landmark.id.slice(1)) > 344
            )
        })
        // FIXME: duplicated
        self.currentLandmarksIndexById = self.currentLandmarks.reduce(function(a, v, i) {
            a[v.id] = i
            return a
        }, {})
        if (self.l && self.currentLandmarksIndexById[self.l] === void 0) {
            self.l = null
        }
        self.renderMarkers()
        self.updateGooglemapsMarkers()
        self.sortLandmarks(self.sort) // update indexById 
        self.renderList()
        self.renderStatus()
        self.setLandmark(self.l) // scroll into view. calls renderItem
    }

    // Event Handlers

    self.onBlur = function(e) {
        const key = {
            "itemIgAddress": "ig_address",
            "itemRlAddress": "rl_address",
            "itemTags": "tags"
        }[e.target.id]
        let value = e.target.innerText.trim()
        if (key == "tags") {
            value = value.replace(/^TAGS:/, "")
            value = value.split(",").map(function(tag) {
                return tag.trim().replace(" ", "").toLowerCase()
            }).filter(function(tag) {
                return !!tag
            })
        }
        self.editLandmark(e.target.dataset.landmarkId, key, value)
    }

    self.onHashchange = function() {
        let values = window.location.hash.slice(1).split(",")
        if (values.length > 5) {
            values[4] = values.slice(4).join(",")
        }
        let v, l, lx, ly, lz, f
        if (["IV", "V", "VI"].includes(values[0])) {
            v = values[0]
            values = values.slice(1)
        } else {
            v = {4: "IV", 5: "V", 6: "VI"}[self.defaults.v]
        }
        if (values.length) {
            let last = values[values.length - 1]
            if (isNaN(last)) {
                if (self.landmarksById[last]) {
                    l = last
                    if (self.landmarksById[last].igCoordinates) {
                        lx = self.landmarksById[last].igCoordinates[0]
                        ly = self.landmarksById[last].igCoordinates[1]
                        lz = 5
                    } else {
                        lx = self.x
                        ly = self.y
                        lz = self.z
                    }
                } else {
                    const landmarks = self.landmarks.filter(function(landmark) {
                        return landmark.findString.includes(last.toLowerCase())
                    })
                    if (landmarks.length == 1) {
                        l = landmarks[0].id
                        if (landmarks[0].igCoordinates) {
                            lx = landmarks[0].igCoordinates[0]
                            ly = landmarks[0].igCoordinates[1]
                            lz = 5
                        } else {
                            lx = self.x
                            ly = self.y
                            lz = self.z
                        }
                    } else {
                        if (last != self.find && !/^L\d+$/.test(last)) {
                            // last part of hash is find query
                            f = decodeURIComponent(last.replace(/\+/g, " "))
                            self.findElement.value = f
                            self.clearFindButton.element.style.display = "block"
                            self.filterElement.value = "all"
                            self.clearFilterButton.element.style.display = "none"
                            self.findAndFilterLandmarks(f, "all") // this calls setLandmark, which calls setHash
                        }
                    }
                }
            }
        }
        if (l && self.currentLandmarksIndexById[l] === void 0) {
            // selected landmark is not in current find & filter
            self.clearFindAndFilter()
            self.findAndFilterLandmarks("", "all") // this calls setLandmark, which calls setHash
        }
        if (l || f || values.length == 4) {
            values = values.slice(0, -1)
        }
        values = values.map(parseFloat)
        if (values.length == 0) {
            values = l ? [lx, ly, lz] : [self.x, self.y, self.z]
        } else if (values.length == 1) {
            values = l ? [lx, ly, values[0]] : [self.x, self.y, values[0]]
        } else if (values.length == 2) {
            values = [values[0], values[1], self.z]
        }
        const hash = v + "," + values.map(function(v, i) {
            const value = [self.x, self.y, self.z][i]
            const minV = [self.minX, self.minY, self.minZ][i]
            const maxV = [self.maxX, self.maxY, self.maxZ][i]
            v = isNaN(v) ? value : self.clamp(v, minV, maxV)
            return v.toFixed(3)
        }).join(",") + (l ? "," + l : "")
        if (hash != window.location.hash.substr(1)) {
            window.location.hash = hash
            return
        }
        //;[self.x, self.y, self.z] = values
        //self.l = l || self.l
        //self.setUserSettings()
        v = {"IV": 4, "V": 5, "VI": 6}[v]
        if (v != self.v) {
            self.v = v
            self.setGameVersion(self.v)
        }
        ;[self.targetX, self.targetY, self.targetZ] = values
        self.l = l
        self.findAndFilterLandmarks(self.find, self.filter)
        if (self.l != self.previousL) { // FIXME: ugly
            self.previousL = self.l
            self.selectLandmark(l)
        }
        if (!self.isAnimating) {
            self.animate()
        }
    }

    self.onKeydown = function(e) {
        if (e.altKey || e.ctrlKey || e.metaKey) {
            return
        }
        const activeElement = document.activeElement
        if (activeElement.matches("input, textarea") && e.key == "Escape") {
            activeElement.blur()
        }
        if (activeElement.matches("[contenteditable]") && e.key == "Enter") {
            activeElement.blur()
        }
        if (activeElement.matches("input, textarea, [contenteditable]")) {
            return
        }

        if (self.focus != "dialog") {
            if (e.key == "a") {
                if (self.sessionId && self.mapMode == "gta") {
                    self.addLandmark()
                }
            } else if (e.key == "e") {
                if (self.sessionId && self.l) {
                    self.editing ? self.stopEditing() : self.startEditing()
                }
            } else if (e.key == "Delete") {
                if (self.sessionId && self.l) {
                    self.removeLandmark(self.l)
                }
            } else if (e.key == "f") {
                if (self.findElement) {
                    e.preventDefault()
                    self.findElement.focus()
                    self.findElement.select()
                }
            } else if (e.key == "F") {
                if (self.find && self.clearFindButton) {
                    self.clearFindButton.element.dispatchEvent(new Event("mousedown", {bubbles: true}))
                }
            } else if (e.key == "h") {
                self.toggleUI()
            } else if (e.key == "t") {
                e.preventDefault()
                if (self.mapMode == "gta") {
                    const key = "gta" + self.v
                    const tileSets = self.defaults[key].tileSets
                    self[key].tileSet = tileSets[(tileSets.indexOf(self[key].tileSet) + 1) % tileSets.length]
                    self.tileSet = self[key].tileSet
                    self.setUserSettings()
                    self.maps.set({
                        tileSet: self.tileSet,
                    })
                } else {
                    const mapTypes = self.defaults.googlemaps.mapTypes
                    self.setMapType(mapTypes[(mapTypes.indexOf(self.googlemaps.mapType) + 1) % mapTypes.length])
                }
            } else if (e.key == "T") {
                if (self.mapMode == "gta") {
                    self.tileOverlays = 1 - self.tileOverlays
                    self.setUserSettings()
                    if (self.v == 6) {
                        self.maps.set({
                            tileOverlays: self.tileOverlays,
                        })
                    }
                }
            } else if (e.key == "v") {
                self.setGameVersion(self.v == 5 ? 6 : 5)
            } else if (e.key == ".") {
                if (self.aboutDialog) {
                    self.aboutDialog.open()
                    self.setFocus("dialog")
                }
            } else if (e.key == ",") {
                if (self.settingsDialog) {
                    self.settingsDialog.open()
                    self.setFocus("dialog")
                }
            }
        }

        if (self.focus == "list") {

            if (self.l === null) {
                return
            }
            if (["ArrowDown", "ArrowLeft", "ArrowRight", "ArrowUp"].includes(e.key)) {
                e.preventDefault()
                const index = self.currentLandmarksIndexById[self.l]
                let id = self.l
                if (e.key == "ArrowDown") {
                    if (index < self.currentLandmarks.length - 1) {
                        id = self.currentLandmarks[index + 1].id
                        self.setLandmark(id, true)
                        self.panGooglemaps(id)
                    }
                } else if (e.key == "ArrowLeft") {
                    if (index > 0) {
                        id = self.currentLandmarks[0].id
                        self.setLandmark(id, true)
                        self.panGooglemaps(id)
                    }
                } else if (e.key == "ArrowRight") {
                    if (index < self.currentLandmarks.length - 1) {
                        id = self.currentLandmarks[self.currentLandmarks.length - 1].id
                        self.setLandmark(id, true)
                        self.panGooglemaps(id)
                    }
                } else if (e.key == "ArrowUp") {
                    if (index > 0) {
                        id = self.currentLandmarks[index - 1].id
                        self.setLandmark(id, true)
                        self.panGooglemaps(id)
                    }
                }
            } else if (e.key == "Escape" && self.l) {
                self.setLandmark(null)
            }

        } else if (self.focus == "dialog") {

            if (document.getElementById("aboutDialog")) {
                if (e.key == ",") {
                    self.aboutDialog.close()
                    self.settingsDialog.open()
                } else if (e.key == "Escape") {
                    self.aboutDialog.close()
                    self.setFocus("list")
                }
            } else if (document.getElementById("settingsDialog")) {
                if (e.key == ".") {
                    self.settingsDialog.close()
                    self.aboutDialog.open()
                } else if (e.key == "Escape") {
                    self.settingsDialog.close()
                    self.setFocus("list")
                }
            } else if (document.getElementById("photoDialog")) {
                if (e.key == "ArrowLeft" || e.key == "ArrowRight") {
                    self.switchPhoto()
                } else if (e.key == "Escape") {
                    self.photoDialog.close()
                    self.setFocus("list")
                }
            }

            if ("0123456fghftTv".includes(e.key)) {
                self.dialogLayer.element.classList.add("clicked")
            }

        }

    }

    self.onKeyup = function(e) {
        const activeElement = document.activeElement
        if (activeElement.tagName == "INPUT") {
            return
        }
        if (self.dialogLayer) {
            self.dialogLayer.element.classList.remove("clicked")
        }
    }

    self.onPaste = function(e) {
        e.preventDefault()
        const text = (e.clipboardData || window.clipboardData).getData("text/plain")
        document.execCommand("insertText", false, text)
    }

    // Render //////////////////////////////////////////////////////////////////////////////////////

    self.renderItem = function() {

        if (self.l) {

            const landmark = self.landmarksById[self.l]

            self.editItemButton.set({
                click: self.editing ? function() {
                    self.stopEditing()
                } : function() {
                    self.startEditing()
                },
                text: self.editing ? "DONE" : "EDIT",
                title: self.editing ? "": "E"
            })

            self.itemId.innerText = landmark.id

            self.itemBody.classList[self.editing ? "add" : "remove"]("editing")
            self.itemBody.style.borderRightColor = "#" + landmark.color

            self.itemIgAddress.innerText = landmark.igAddress || "?"
            self.itemIgAddress.dataset.landmarkId = self.l
            if (!self.editing) {
                self.itemIgAddress.removeAttribute("contenteditable")
                self.itemIgAddress.removeEventListener("paste", self.onPaste)
                self.itemIgAddress.removeEventListener("blur", self.onBlur)
            } else {
                self.itemIgAddress.contentEditable = "true"
                self.itemIgAddress.addEventListener("paste", self.onPaste)
                self.itemIgAddress.addEventListener("blur", self.onBlur)
            } 

            self.itemIgCoordinates.innerHTML = ""
            self.itemIgCoordinatesLink = document.createElement("span")
            self.itemIgCoordinatesLink.innerText = self.formatCoordinates("ig", landmark.igCoordinates)
            if (landmark.igCoordinates) {
                self.itemIgCoordinatesLink.classList.add("link")
                self.itemIgCoordinatesLink.addEventListener("mousedown", function() {
                    if (self.mapMode == "googlemaps") {
                        self.setMapMode("gta")
                    }
                    self.setTarget(
                        landmark.igCoordinates[0],
                        landmark.igCoordinates[1],
                        5
                    )
                })
            }
            self.itemIgCoordinates.appendChild(self.itemIgCoordinatesLink)
            if (self.editing && (landmark.igCoordinates || self.mapMode == "gta")) {
                let button = document.createElement("span")
                button.id = "editIgCoordinatesButton"
                button.innerText = landmark.igCoordinates ? "REMOVE" : "ADD"
                button.addEventListener("click", function() {
                    self.editLandmark(self.l, "ig_coordinates", landmark.igCoordinates ? [] : [self.x, self.y])
                })
                self.itemIgCoordinates.appendChild(button)
            }

            if (!self.editing) {
                self.itemIgPhoto.innerHTML = ""
                if (landmark.igPhotoRatio) {
                    const width = 248
                    const height = width / landmark.igPhotoRatio
                    self.itemIgPhoto.style.width = width + "px"
                    self.itemIgPhoto.style.height = height + "px"
                    let img = document.createElement("img")
                    img.src = `photos/${self.v}/${landmark.id},ig.jpg?v=${landmark.edited[1]}`
                    img.classList[landmark.tags.includes("2022") ? "add" : "remove"]("auth")
                    img.style.width = width + "px"
                    img.style.height = height + "px"
                    img.addEventListener("click", function() {
                        self.openPhotoDialog(landmark, "ig")
                    })
                    self.itemIgPhoto.appendChild(img)
                } else {
                    self.itemIgPhoto.style.height = "139.5px"
                }
            } else {
                if (landmark.igPhotoRatio) {
                    let img = document.createElement("img")
                    img.src = `photos/${self.v}/${landmark.id},ig.jpg?v=${landmark.edited[1]}`
                    const width = 248
                    const height = width / landmark.igPhotoRatio
                    self.editItemIgPhoto.set({height: height, image: img, removeButton: true})
                } else {
                    self.editItemIgPhoto.set({height: 139.5, image: null, removeButton: false, value: ""})
                }
            }
            self.itemIgPhoto.style.display = !self.editing ? "block" : "none"
            self.editItemIgPhoto.element.style.display = !self.editing ? "none" : "block"

            self.itemRlAddress.innerText = landmark.rlAddress || "?"
            self.itemRlAddress.dataset.landmarkId = self.l
            if (!self.editing) {
                self.itemRlAddress.removeAttribute("contenteditable")
                self.itemRlAddress.removeEventListener("paste", self.onPaste)
                self.itemRlAddress.removeEventListener("blur", self.onBlur)
            } else {
                self.itemRlAddress.contentEditable = "true"
                self.itemRlAddress.addEventListener("paste", self.onPaste)
                self.itemRlAddress.addEventListener("blur", self.onBlur)
            } 

            self.itemRlCoordinates.innerHTML = ""
            self.itemRlCoordinatesLink = document.createElement("span")
            self.itemRlCoordinatesLink.innerText = self.formatCoordinates("rl", landmark.rlCoordinates)
            if (landmark.rlCoordinates) {
                self.itemRlCoordinatesLink.classList.add("link")
                self.itemRlCoordinatesLink.addEventListener("mousedown", function() {
                    if (self.mapMode == "gta") {
                        self.setMapMode("googlemaps")
                    }
                    self.maps.exitStreetView()
                    self.maps.zoomGooglemaps(16)
                    self.panGooglemaps(landmark.id)
                }) 
            }
            self.itemRlCoordinates.appendChild(self.itemRlCoordinatesLink)

            if (!self.editing) {
                self.itemRlPhoto.innerHTML = ""
                if (landmark.rlPhotoRatio) {
                    const width = 248
                    const height = width / landmark.rlPhotoRatio
                    self.itemRlPhoto.style.width = width + "px"
                    self.itemRlPhoto.style.height = height + "px"
                    let img = document.createElement("img")
                    img.src = `photos/${self.v}/${landmark.id},rl.jpg?v=${landmark.edited[2]}`
                    img.style.width = width + "px"
                    img.style.height = height + "px"
                    img.addEventListener("click", function() {
                        self.openPhotoDialog(landmark, "rl")
                    })
                    self.itemRlPhoto.appendChild(img)
                } else {
                    self.itemRlPhoto.style.height = "139.5px"
                }
            } else {
                if (landmark.rlPhotoRatio) {
                    let img = document.createElement("img")
                    img.src = `photos/${self.v}/${landmark.id},rl.jpg?v=${landmark.edited[2]}`
                    const width = 248
                    const height = width / landmark.rlPhotoRatio
                    self.editItemRlPhoto.set({height: height, image: img, removeButton: true})
                } else {
                    self.editItemRlPhoto.set({height: 139.5, image: null, removeButton: false, value: ""})
                }
            }
            self.itemRlPhoto.style.display = !self.editing ? "block" : "none"
            self.editItemRlPhoto.element.style.display = !self.editing ? "none" : "block"

            self.itemTags.dataset.landmarkId = self.l
            if (!self.editing) {
                if (landmark.tags.length) {
                    self.itemTags.innerText = "TAGS: "
                    landmark.tags.forEach(function(tag, i) {
                        let span = document.createElement("span")
                        span.classList.add("link")
                        span.innerText = tag
                        span.addEventListener("click", function() {
                            self.findElement.value = tag.toUpperCase()
                            self.findElement.dispatchEvent(new Event("input", {bubbles: true}))
                            self.findElement.dispatchEvent(new Event("change", {bubbles: true}))
                        })
                        self.itemTags.appendChild(span)
                        if (i < landmark.tags.length - 1) {
                            span = document.createElement("span")
                            span.innerText = ", "
                            self.itemTags.appendChild(span)
                        }
                    })
                } else {
                    self.itemTags.innerText = "TAGS: NONE"
                }
                self.itemTags.removeAttribute("contenteditable")
                self.itemTags.removeEventListener("paste", self.onPaste)
                self.itemTags.removeEventListener("blur", self.onBlur)
            } else {
                self.itemTags.innerText = landmark.tags.join(", ")
                self.itemTags.contentEditable = "true"
                self.itemTags.addEventListener("paste", self.onPaste)
                self.itemTags.addEventListener("blur", self.onBlur)
            } 

            self.itemStatusElement.innerText = "LAST EDITED: " + self.formatDate(landmark.edited[0])
            if (self.ui) {
                self.itemPanel.style.display = "block"
            }

        } else {
            self.itemPanel.style.display = "none"
        }

    }

    self.renderList = function() {
        self.listBody.innerHTML = ""
        self.currentLandmarks.forEach(function(landmark) {
            const itemElement = document.createElement("div")
            itemElement.classList.add("item")
            if (landmark.id == self.l) {
                itemElement.classList.add("selected")
            }
            itemElement.id = "item_" + landmark.id
            itemElement.style.borderLeftColor = "#" + landmark.color
            const igElement = document.createElement("div")
            igElement.className = "ig"
            igElement.innerText = self.sort.includes("Address") ? (landmark.igAddress || "?")
                    : (landmark.igAddress || "?") + " | " + (landmark.rlAddress || "?")
            itemElement.appendChild(igElement)
            const rlElement = document.createElement("div")
            rlElement.className = "rl"
            rlElement.innerText = self.sort.includes("Address") ? (landmark.rlAddress || "?")
                    : self.sort.includes("igL") ? self.formatCoordinates("ig", landmark.igCoordinates)
                    : self.sort.includes("rlL") ? self.formatCoordinates("rl", landmark.rlCoordinates)
                    : self.sort == "tags" ? (landmark.tags.join(", ").toUpperCase() || "NONE")
                    : self.sort == "id" ? landmark.id
                    : self.formatDate(landmark.edited[0])
            itemElement.appendChild(rlElement)
            self.listBody.appendChild(itemElement)
        })
    }

    self.renderStatus = function() {
        self.listStatusElement.innerText = self.currentLandmarks.length + " LANDMARK" + (
            self.currentLandmarks.length == 1 ? "" : "S"
        )
    }

    // Setters /////////////////////////////////////////////////////////////////////////////////////

    self.setFocus = function(focus) {
        self.focus = focus
        if (self.maps) {
            self.maps.set({
                focused: self.focus == "map",
            })
        }
    }

    self.setGameVersion = function(gameVersion) {
        self.v = gameVersion
        const key = "gta" + self.v
        ;["x", "y", "z", "l", "find", "filter", "sort", "tileSet"].forEach(function(key) {
            self[key] = self["gta" + self.v][key]
        })
        self.setUserSettings()
        const url = `data/${self.v}/landmarks.json`
        self.loadJSON([url]).then(function([landmarks]) {
            self.parseLandmarks(landmarks)
            document.title = "GTA " + {4: "IV", 5: "V", 6: "VI"}[self.v] + " Landmarks Map"
            self.updateGameIcon()
            self.maps.set({
                currentLandmarks: self.currentLandmarks,
                googlemaps: self.googlemaps,
                gta5: self.gta5,
                gta6: self.gta6,
                landmarks: self.landmarks,
                mapMode: self.mapMode,
                selected: self.l,
                tileOverlays: self.tileOverlays,
                tileSet: self.tileSet,
                v: self.v,
                x: self.x,
                y: self.y,
                z: self.z,
            })
            self.renderList()
            self.selectLandmark(self.l)
            self.targetX = self.x
            self.targetY = self.y
            self.targetZ = self.z
            self.setHash()
        })
    }

    self.setMapMode = function(mapMode) {
        self.mapMode = mapMode
        self.setUserSettings()
        self.maps.set({
            mapMode: self.mapMode,
            selected: self.l,
        })
        self.updateAddItemButton()
    }

    self.setMapType = function(mapType) {
        self.googlemaps.mapType = mapType
        self.setUserSettings()
        self.maps.set({
            mapType: self.googlemaps.mapType,
        })
    }

    self.setTheme = function() {
        self.themes.forEach(function(theme) {
            document.body.classList.remove(theme)
        })
        if (!["light", "dark"].includes(self.theme)) {
            document.body.classList.add("light")
        }
        document.body.classList.add(self.theme)
    }

    self.startEditing = function() {
        self.editing = true
        document.body.classList.add("editing")
        self.maps.set({editing: true})
        self.renderItem()
    }

    self.stopEditing = function() {
        self.editing = false
        document.body.classList.remove("editing")
        self.maps.set({editing: false})
        self.renderItem()
    }

    self.toggleUI = function() {
        self.ui = !self.ui
        if (!self.ui) {
            self.setFocus("map")
        }
        if (self.l) {
            self.itemPanel.style.display = self.ui ? "block" : "none"
        }
        document.body.classList[self.ui ? "remove" : "add"]("hidden")
    }

    // Updates /////////////////////////////////////////////////////////////////////////////////////

    self.updateAddItemButton = function() {
        if (!self.addItemButton) {
            return
        }
        self.addItemButton.element.style.display = (
            self.mapMode == "gta" && self.sessionId
        ) ? "block" : "none"
    }

    self.updateRemoveItemButton = function() {
        if (!self.removeItemButton) {
            return
        }
        self.removeItemButton.element.style.display = (
            self.l && self.sessionId
        ) ? "block" : "none"
    }

    self.updateSettingsPanel = function() {
        if (!self.settingsPanel) {
            return
        }
        self.changePasswordForm.setValue(0, self.username)
        self.logoutForm.setValue(0, self.username)
        self.settingsPanel.set({
            elements: self.sessionId ? {
                "Appearance": self.appearanceElement,
                "Map Tiles": self.mapSettingsElement,
                "Change Password": self.changePasswordForm.element,
                "Logout": self.logoutForm.element,
            } : {
                "Appearance": self.appearanceElement,
                "Map Tiles": self.mapSettingsElement,
                "Create Account": self.createAccountForm.element,
                "Login": self.loginForm.element,
            },
            selected: 3
        })
    }

    self.updateUserIcon = function() {
        if (!self.userIcon) {
            setTimeout(function() {
                self.updateUserIcon()
            }, 100) // FIXME!
            return
        }
        self.userIcon.style.backgroundColor = "#" + self.profileColor
        self.userIcon.innerText = self.username[0]
        self.userIcon.title = self.sessionId ? `USER: ${self.username}` : ""
    }

    self.updateGameIcon = function() {
        self.gameIcon.style.backgroundColor = self.gameColors[self.v]
        self.gameIcon.innerText = {4: "IV", 5: "V", 6: "VI"}[self.v]
    }

    // User ////////////////////////////////////////////////////////////////////////////////////////

    self.getUserSettings = function() {
        let data = localStorage.getItem("map.gtadb.org")
        let user
        if (!data) {
            user = self.defaults
        } else {
            user = self.checkUserSettings(JSON.parse(localStorage.getItem("map.gtadb.org")).user)
        }
        Object.entries(user).forEach(function([key ,value]) {
            self[key] = value
        })
        Object.entries(user["gta" + self.v]).forEach(function([key, value]) {
            self[key] = value
        })
        self.targetX = self.x
        self.targetY = self.y
        self.targetZ = self.z
    }

    self.setUserSettings = function() {
        const key = `gta${self.v}` 
        self[key] = {
            x: self.x,
            y: self.y,
            z: self.z,
            l: self.l,
            find: self.find,
            filter: self.filter,
            sort: self.sort,
            tileSet: self.tileSet
        }
        localStorage.setItem("map.gtadb.org", JSON.stringify({"user": {
            v: self.v,
            gta5: self.gta5,
            gta6: self.gta6,
            googlemaps: self.googlemaps,
            mapMode: self.mapMode,
            profileColor: self.profileColor,
            sessionId: self.sessionId,
            theme: self.theme,
            tileOverlays: self.tileOverlays,
            username: self.username
        }}))
        if (self.mapModeSelect) {
            self.mapModeSelect.value = self.mapMode
            self.mapTypeSelect.value = self.googlemaps.mapType
            self.tileSetVSelect.value = self.gta5.tileSet
            self.tileSetVISelect.value = self.gta6.tileSet
            self.tileOverlaysSelect.value = self.tileOverlays
        }
    }

    self.checkUserSettings = function(v) {
        ;["gta5", "gta6", "googlemaps"].forEach(function(key) {
            if (!(key in v)) {
                v[key] = {}
            }
        })
        let checked = {}
        checked.v = self.vs.includes(v.v) ? v.v : self.defaults.v
        ;["gta5", "gta6"].forEach(function(gta) { // fixme: loop over self.vs
            let key = gta[gta.length - 1]
            checked[gta] = {
                x: isNaN(v[gta].x) ? 0 : self.clamp(v[gta].x, self.minX, self.maxX),
                y: isNaN(v[gta].y) ? 0 : self.clamp(v[gta].y, self.minY, self.maxY),
                z: isNaN(v[gta].z) ? 0 : self.clamp(v[gta].z, self.minZ, self.maxZ),
                l: v[gta].l, // FIXME: v[gta].l in self.landmarksData[key] ? v[gta].l : self.defaults[gta].l,
                find: v[gta].find,
                filter: self.filterOptions[v[gta].filter] ? v[gta].filter : self.defaults[gta].filter,
                sort: self.sortOptions[v[gta].sort] ? v[gta].sort : self.defaults[gta].sort,
                tileSet: self.defaults[gta].tileSets.includes(v[gta].tileSet) ? v[gta].tileSet : self.defaults[gta].tileSet
            }
        })
        checked.googlemaps = {
            lat: isNaN(v.googlemaps.lat) ? self.defaults.googlemaps.lat : self.clamp(v.googlemaps.lat, -90, 90),
            lng: isNaN(v.googlemaps.lng) ? self.defaults.googlemaps.lng : self.clamp(v.googlemaps.lng, -180, 180),
            zoom: isNaN(v.googlemaps.zoom) ? self.defaults.googlemaps.zoom : self.clamp(parseInt(v.googlemaps.zoom), 0, 24),
            mapType: self.googlemaps.mapTypes.includes(v.googlemaps.mapType) ? v.googlemaps.mapType : self.defaults.googlemaps.mapType,
        }
        checked.mapMode = self.mapModes.includes(v.mapMode) ? v.mapMode : self.defaults.mapMode
        checked.profileColor = /^[0-9A-Fa-f]{6}$/.test(v.profileColor) ? v.profileColor : self.defaults.profileColor,
        checked.sessionId = v.sessionId || ""
        checked.theme = self.themes.includes(v.theme) ? v.theme : self.defaults.theme
        checked.tileOverlays = v.tileOverlays ? 1 : 0
        checked.username = v.username || ""
        return checked
    }

    self.onLogin = function(username, sessionId, profileColor) {
        document.body.classList.add("auth")
        self.username = username
        self.sessionId = sessionId
        self.profileColor = profileColor
        self.setUserSettings()
        self.updateSettingsPanel()
        self.updateUserIcon()
        // FIXME: shouldn't be necessary
        if (self.l) {
            self.removeItemButton.element.style.display = "block"
        }
    }

    self.onLogout = function() {
        document.body.classList.remove("auth")
        self.sessionId = ""
        self.setUserSettings()
        self.updateSettingsPanel()
        self.updateUserIcon()
        if (self.editing) {
            self.stopEditing()
        }
        // FIXME: shouldn't be necessary
        if (self.removeItemButton) {
            self.removeItemButton.element.style.display = "none"
        }
    }

    // Utilities ///////////////////////////////////////////////////////////////////////////////////

    self.clamp = function(n, min, max) {
        return Math.min(Math.max(n, min), max)
    }

    self.formatAddress = function(address) {
        address = address || "?"
        if (!"0123456789?".includes(address[0])) {
            const parts = address.split(", ")
            const comma = parts.length == 1 ? "" : ", "
            return `<span style="font-weight: bold">${parts[0]}</span>${comma}${parts.slice(1).join(", ")}`
        }
        return address
    }

    self.formatCoordinates = function(key, coordinates) {
        return coordinates ? coordinates.map(function(value) {
            return value.toFixed(key == "ig" ? 3 : 7)
        }).join(",") : "?"
    }

    self.formatDate = function(timestamp) {
        // return new Date(timestamp * 1000).toISOString().slice(0, -5).replace("T", " ") + " UTC"
        return new Date(timestamp * 1000).toLocaleString('sv-SE', {hour12: false})
    }

    self.getAddressSortString = function(address) {
        let parts = address.replace(/\?/g, "ZZZ").split(", ")
        parts.forEach(function(part, p) {
            let words = part.split(" ")
            words.forEach(function(word, w) {
                if (/^\d+$/.test(word)) {
                    words[w] = "0".repeat(10 - word.length) + word
                }
            })
            if (/^\d+$/.test(words[0])) {
                words = words.slice(1).concat(words[0])
            }
            parts[p] = words.join(" ")
        })
        // newline since we want "Ambrosia" before "Ambrosia County"
        return parts.reverse().join("\n")
    }

    self.getIdSortString = function(id) {
        return "0".repeat(10 - id.length) + id.slice(1)
    }

    self.getLandmarkTitle = function(landmark) {
        return (
            landmark.igAddress.split(", ")[0] || "?"
        ) + "\n" + (
            landmark.rlAddress.split(", ")[0] || "?"
        )
    }

    self.loadJSON = async function(urls) {
        const fetchURL = async function(url) {
            const req = await fetch(url, {cache: "no-cache"})
            if (!req.ok) {
                throw new Error(req.status)
            }
            return await req.json()
        }
        return await Promise.all(urls.map(fetchURL))
    }

    self.panGooglemaps = function(id) {
        if (self.landmarksById[id] && self.landmarksById[id].rlCoordinates) {
            self.maps.panGooglemaps(
                self.landmarksById[id].rlCoordinates[0],
                self.landmarksById[id].rlCoordinates[1]
            )
        }
    }

    that._debug = function() {
        return self
    }

    return self.init()

}

gtadb.map = gtadb.Map()
