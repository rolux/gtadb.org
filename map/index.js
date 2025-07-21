let gtadb = {}

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
    that.createAccount = function(inviteCode, username, password) {
        return self.sendRequest({
            action: "create_account",
            invite_code: inviteCode,
            username: username,
            password: password
        }).then(function(ret) {
            if (ret.status == "ok") {
                return ret.session_id
            } else {
                throw new Error(ret.message)
            }
        })
    }
    that.login = function(username, password) {
        return self.sendRequest({
            action: "login",
            username: username,
            password: password
        }).then(function(ret) {
            if (ret.status == "ok") {
                return ret.session_id
            } else {
                throw new Error(ret.message)
            }
        })
    }
    that.changePassword = function(oldPassword, newPassword, repeatNewPassword) {
        return self.sendRequest({
            action: "change_password",
            oldPassword: oldPassword,
            newPassword: newPassword,
            repeatNewPassword: repeatNewPassword,
        }).then(function(ret) {
            
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
            id: id,
            key: key,
            value: value
        }).then(function(ret) {
            
        })
    }
    that.addLandmark = function(igCoordinates) {
        return self.sendRequest({
            action: "add_landmark",
            key: "ig_coordinates",
            value: igCoordinates
        })
    }
    that.editLandmark = function(id, key, value) {
        return self.sendRequest({
            action: "edit_landmark",
            id: id,
            key: key,
            value: value
        })
    }
    that.removeLandmark = function(id) {
        return self.sendRequest({
            action: "remove_landmark",
            id: id,
        })
    }
    self.sendRequest = function(data) {
        const isFile = data.value instanceof File
        if (isFile) {
            const form = new FormData()
            form.append("action", data.action)
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
        return fetch(self.options.url, requestData).then(function(r) {
            return r.json()
        })
    }
    return that
}

gtadb.Bar = function(options) {
    if (!(this instanceof gtadb.Bar)) {
        return new gtadb.Bar(options)
    }
    let that = this
    let self = {
        defaults: {
            border: "bottom",
            buttons: [],
            element: null,
            extras: [],
        },
        options: options
    }
    self.options = {...self.defaults, ...self.options}
    that.element = document.createElement("div")
    const className = self.options.border == "bottom" ? "borderBottom" : "borderTop"
    that.element.className = "bar " + className
    that.element.appendChild(self.options.element)
    self.options.extras.reverse().forEach(function(extra) {
        extra.classList.add("extra")
        that.element.appendChild(extra)
    })
    self.options.buttons.reverse().forEach(function(button) {
        that.element.appendChild(button.element)
    })
    that.set = function(options) {
        if ("element" in options) {
            that.element.removeChild(self.options.element)
            that.element.prepend(options.element)
            self.options.element = options.element
        }
    }
    return that
}

gtadb.Button = function(options) {
    if (!(this instanceof gtadb.Button)) {
        return new gtadb.Button(options)
    }
    let that = this
    let self = {
        defaults: {
            click: null,
            mousedown: null,
            text: "",
            tooltip: ""
        },
        options: options
    }
    self.options = {...self.defaults, ...self.options}
    that.element = document.createElement("div")
    that.element.className = "button"
    that.element.title = self.options.tooltip
    that.element.innerHTML = self.options.text
    if (self.options.click) {
        that.element.addEventListener("click", self.options.click)
    }
    if (self.options.mousedown) {
        that.element.addEventListener("mousedown", self.options.mousedown)
    }
    that.set = function(options) {
        if ("click" in options) {
            that.element.removeEventListener("click", self.options.click)
            self.options.click = options.click
            that.element.addEventListener("click", self.options.click)
        }
        if ("mousedown" in options) {
            that.element.removeEventListener("mousedown", self.options.mousedown)
            self.options.mousedown = options.mousedown
            that.element.addEventListener("mousedown", self.options.mousedown)
        }
        if ("text" in options) {
            that.element.innerHTML = options.text
        }
        if ("tooltip" in options) {
            that.element.title = options.tooltip
        }
    }
    return that
}

gtadb.Dialog = function(options) {
    if (!(this instanceof gtadb.Dialog)) {
        return new gtadb.Dialog(options)
    }
    let that = this
    let self = {
        defaults: {
            buttons: [],
            content: null,
            height: 0,
            layer: null,
            resize: function() {},
            title: "",
            width: 0,
        },
        options: options
    }
    self.options = {...self.defaults, ...self.options}
    that.element = document.createElement("div")
    that.element.className = "dialog"
    that.element.style.width = self.options.width + "px"
    that.element.style.height = self.options.height + "px"
    self.titleElement = document.createElement("div")
    self.titleElement.innerHTML = self.options.title
    self.closeButton = gtadb.Button({
        click: function() {
            that.close()
        },
        text: "CLOSE",
        tooltip: "ESC"
    })
    self.bar = gtadb.Bar({
        borderBottom: "1px",
        borderTopRadius: "8px",
        buttons: self.options.buttons.concat(self.closeButton),
        element: self.titleElement,
    })
    self.bar.element.style.width = self.options.width - 8 + "px"
    that.element.appendChild(self.bar.element)
    self.content = document.createElement("div")
    self.content.className = "content"
    self.content.style.width = self.options.width + "px"
    self.content.style.height = self.options.height - 32 + "px"
    self.content.appendChild(self.options.content)
    that.element.appendChild(self.content)
    that.open = function() {
        self.options.layer.element.appendChild(that.element)
        self.options.layer.element.style.display = "flex"
    }
    that.close = function() {
        that.element.remove()
        self.options.layer.element.style.display = "none"
    }
    that.set = function(options) {
        if ("content" in options) {
            self.content.innerHTML = ""
            self.content.appendChild(options.content)
        }
        if ("title" in options) {
            self.titleElement.innerHTML = options.title
            self.bar.set({
                element: self.titleElement
            })
        }
        if ("width" in options) {
            that.element.style.width = options.width + "px"
            self.bar.element.style.width = options.width - 8 + "px"
            self.content.style.width = options.width + "px"
        }
        if ("height" in options) {
            that.element.style.height = options.height + "px"
            self.content.style.height = options.height - 32 + "px"
        }
    }
    return that
}

gtadb.DialogLayer = function() {
    if (!(this instanceof gtadb.DialogLayer)) {
        return new gtadb.DialogLayer()
    }
    let that = this
    that.element = document.createElement("div")
    that.element.id = "dialogLayer"
    that.element.addEventListener("mousedown", function(e) {
        if (e.target == that.element) {
            that.element.classList.add("clicked")
        }
    })
    that.element.addEventListener("mouseup", function() {
        that.element.classList.remove("clicked")
    })
    that.show = function() {
        that.element.style.display = "flex"
    }
    that.hide = function() {
        that.element.style.display = "none"
    }
    that.blink = function() {
        that.element.classList.add("clicked")
        setTimeout(function() {
            that.element.classList.remove("clicked")
        }, 150)
    }
    return that
}

gtadb.Form = function(options) {
    if (!(this instanceof gtadb.Form)) {
        return new gtadb.Form(options)
    }
    let that = this
    let self = {
        defaults: {
            buttonText: "",
            click: null,
            inputs: {},
            width: 512
        },
        options: options
    }
    self.options = {...self.defaults, ...self.options}
    that.element = document.createElement("div")
    that.element.className = "form"
    self.inputs = []
    Object.entries(self.options.inputs).forEach(function([id, [label, type, value]]) {
        let input = gtadb.Input({
            height: 48,
            label: label,
            readonly: self.options._readonly && self.options._readonly.includes(id),
            type: type,
            value: value,
            width: self.options.width
        })
        self.inputs.push(input)
        that.element.appendChild(input.element)
    })
    self.button = document.createElement("div")
    self.button.className = "formButton"
    self.button.innerHTML = self.options.buttonText
    self.button.addEventListener("click", function() {
        const entries = self.inputs.map(function(input, i) {
            return [
                Object.keys(self.options.inputs)[i],
                input.value()
            ]
        })
        const values = Object.fromEntries(entries)
        self.options.click(values)
    })
    that.element.appendChild(self.button)
    self.message = document.createElement("div")
    self.message.className = "formMessage"
    that.element.appendChild(self.message)
    that.setMessage = function(text) {
        self.message.innerHTML = text
    }
    return that
}

gtadb.Input = function(options) {
    if (!(this instanceof gtadb.Input)) {
        return new gtadb.Input(options)
    }
    let that = this
    let self = {
        defaults: {
            change: null,
            height: 32,
            image: null,
            label: "",
            readonly: false,
            removeButton: null,
            type: "text",
            value: "",
            width: 232
        },
        options: options
    }
    self.options = {...self.defaults, ...self.options}
    that.element = document.createElement("div")
    that.element.className = "input"
    that.element.style.width = self.options.width + "px"
    that.element.style.height = self.options.height + "px"
    self.label = document.createElement("div")
    self.label.className = "label"
    self.label.style.height = self.options.label ? "16px" : 0
    self.label.innerHTML = self.options.label
    that.element.appendChild(self.label)
    self.input = document.createElement(
        self.options.type == "textarea" ? "textarea" : "input"
    )
    if (self.options.type != "textarea") {
        self.input.type = self.options.type
    }
    if (self.options.type == "file") {
        self.input.accept = "image/*"
        self.input.hidden = true
    }
    if (self.options.readonly) {
        self.input.readOnly = true
        self.input.style.backgroundColor = "transparent"
        self.input.style.borderWidth = 0
        self.input.style.margin = 0
        self.input.style.marginLeft = "3px"
        self.input.style.outline = 0
        self.input.style.paddding = 0
    }
    self.input.value = self.options.value
    self.input.style.width = self.options.width - 8 + "px" // 2 * 3 padding + 2 * 1 border
    self.input.style.height = self.options.height - 8 - 16 * !!self.options.label + "px"
    if (self.options.change && self.options.type != "file") {
        self.input.addEventListener("change", function() {
            self.options.change(self.input.value)
        })
    }
    that.element.appendChild(self.input)
    if (self.options.type == "file") {
        self.upload = document.createElement("div")
        self.upload.className = "upload"
        self.upload.title = "CLICK OR DROP"
        self.upload.style.width = self.options.width + "px"
        self.upload.style.height = self.options.height - 16 * !!self.options.label + "px"
        if (self.options.image) {
            // FIXME: use 100%
            self.options.image.style.width = self.upload.style.width
            self.options.image.style.height = self.upload.style.height
            self.upload.appendChild(self.options.image)
        }
        if (self.options.removeButton) {
            self.removeButton = document.createElement("div")
            self.removeButton.classList.add("removeButton")
            self.removeButton.innerHTML = "remove"
            //self.removeButton.style.zIndex = 100
            self.upload.appendChild(self.options.button)
        }
        self.upload.addEventListener("click", function(e) {
            if (e.target.classList.contains("removeButton")) {
                self.options.change(null)
            } else {
                self.input.click()
            }
        })
        self.upload.addEventListener("dragover", function(e) {
            e.preventDefault()
            self.upload.classList.add("hover")
        })
        self.upload.addEventListener("dragleave", function(e) {
            self.upload.classList.remove("hover")
        })
        self.upload.addEventListener("drop", function(e) {
            e.preventDefault()
            self.upload.classList.remove("hover")
            self.uploadFile(e.dataTransfer.files[0])
        })
        self.input.addEventListener('change', function(e) {
            self.uploadFile(self.input.files[0])
        })
        that.element.appendChild(self.upload)
    }
    that.set = function(options) {
        if ("height" in options) {
            self.options.height = options.height
            that.element.style.height = self.options.height + "px"
            self.input.style.height = self.options.height - 8 - 16 * !!self.options.label + "px"
            if (self.options.type == "file") {
                self.upload.style.height = self.options.height - 16 * !!self.options.label + "px"
                if (self.options.image) {
                    self.options.image.style.height = self.upload.style.height
                }
            }
        }
        if ("image" in options) {
            if (!options.image && self.options.image) {
                self.options.image.remove()
            }
            self.options.image = options.image
            if (self.options.image) {
                // FIXME: use 100%
                self.options.image.style.width = self.upload.style.width
                self.options.image.style.height = self.upload.style.height
                self.upload.innerHTML = ""
                self.upload.appendChild(self.options.image)
            }
        }
        if ("label" in options) {
            self.label.innerHTML = options.label
        }
        if ("removeButton" in options) {
            if (options.removeButton) {
                self.removeButton = document.createElement("div")
                self.removeButton.classList.add("removeButton")
                self.removeButton.innerHTML = "REMOVE"
                self.upload.appendChild(self.removeButton)
            } else {
                if (self.removeButton) {
                    self.removeButton.remove()
                }
            }
        }
        if ("value" in options) {
            self.input.value = options.value
        }
        if ("width" in options) {
            self.options.width = options.width
            that.element.style.width = self.options.height + "px"
            self.input.style.width = self.options.width + "px"
            if (self.options.type == "file") {
                self.upload.style.width = self.options.width + "px"
                if (self.options.image) {
                    self.options.image.style.width = self.options.width + "px"
                }
            }
        }
    }
    that.value = function() {
        return self.input.value
    }
    self.uploadFile = function(file) {
        if (!file || !file.type.startsWith('image/')) {
            return
        }
        const img = document.createElement("img")
        img.onload = function() {
            const imgRatio = img.naturalHeight / img.naturalWidth
            const imgHeight = self.options.width * imgRatio
            that.element.style.height = imgHeight + 16 * !!self.options.label + "px"
            self.upload.style.height = imgHeight + "px"
            img.style.width = "100%"
            img.style.height = "100%"
            img.style.objectFit = "contain"
            self.upload.innerHTML = ""
            self.upload.appendChild(img)
        }
        img.src = URL.createObjectURL(file)
        self.options.change(file)
    }
    return that
}

gtadb.Panel = function(options) {
    if (!(this instanceof gtadb.Panel)) {
        return new gtadb.Panel(options)
    }
    let that = this
    let self = {
        defaults: {
            elements: {},
            height: 512,
            menuWidth: 256,
            selected: 0,
            width: 768,
        },
        options: options
    }
    self.options = {...self.defaults, ...self.options}
    that.element = document.createElement("div")
    that.element.className = "panel"
    that.element.style.width = self.options.width + "px"
    that.element.style.height = self.options.height + "px"
    self.menu = document.createElement("div")
    self.menu.style.width = self.options.menuWidth + "px"
    self.menu.style.height = self.options.height + "px"
    that.element.appendChild(self.menu)
    self.content = document.createElement("div")
    self.content.style.width = self.options.width - self.options.menuWidth + "px"
    self.content.style.height = self.options.height + "px"
    that.element.appendChild(self.content)
    that.set = function(options) {
        if ("elements" in options) {
            self.options.elements = options.elements
            self.renderElements()
            that.set({selected: self.options.selected})
        }
        if ("selected" in options) {
            self.menuItems[self.options.selected].classList.remove("selected")
            self.options.selected = options.selected
            self.menuItems[self.options.selected].classList.add("selected")
            self.content.innerHTML = ""
            const title = Object.keys(self.options.elements)[self.options.selected]
            self.content.appendChild(self.options.elements[title])
        }
    }
    self.renderElements = function() {
        self.menu.innerHTML = ""
        self.menuItems = []
        Object.keys(self.options.elements).forEach(function(title) {
            let menuItem = document.createElement("div")
            menuItem.className = "menuItem"
            menuItem.innerHTML = title
            ;(function(i) {
                menuItem.addEventListener("click", function() {
                    that.set({"selected": i})
                })
            }(self.menuItems.length))
            self.menuItems.push(menuItem)
            self.menu.appendChild(menuItem)
        })
    }
    self.renderElements()
    that.set({selected: self.options.selected})
    return that
}

gtadb.Map = function() {

    if (!(this instanceof gtadb.Map)) {
        return new gtadb.Map()
    }
    
    // Settings ////////////////////////////////////////////////////////////////////////////////////

    let that = this
    let self = {
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
        tileSize: 1024,
        tileSets: [
            "dupzor,51",
            "yanis,6",
        ],
        tileSetRanges: {
            "dupzor,51": {
                0: [[ 0,  0], [ 0,  0]],
                1: [[ 0,  0], [ 1,  1]],
                2: [[ 0,  0], [ 2,  2]],
                3: [[ 0,  1], [ 4,  5]],
                4: [[ 0,  2], [ 9, 11]],
                5: [[ 0,  4], [19, 23]],
                6: [[ 0,  8], [38, 47]]
            },
            "yanis,6": {
                0: [[ 0,  0], [ 0,  0]],
                1: [[ 0,  0], [ 1,  1]],
                2: [[ 0,  0], [ 2,  2]],
                3: [[ 0,  1], [ 4,  5]],
                4: [[ 0,  2], [ 9, 11]],
                5: [[ 0,  4], [19, 23]],
                6: [[ 0,  8], [38, 47]]
            },
        },
        tileOverlayRanges: {
            "aiwe,1": {
                0: [[ 0,  0], [ 0,  0]],
                1: [[ 0,  0], [ 0,  0]],
                2: [[ 1,  1], [ 1,  1]],
                3: [[ 2,  3], [ 2,  3]],
                4: [[ 4,  6], [ 5,  6]],
                5: [[ 9, 12], [10, 13]],
                6: [[18, 25], [20, 27]]
            },
            "martipk,5": {
                0: [[ 0,  0], [ 0,  0]],
                1: [[ 0,  1], [ 0,  1]],
                2: [[ 1,  2], [ 1,  2]],
                3: [[ 3,  4], [ 3,  5]],
                4: [[ 6,  9], [ 7, 11]],
                5: [[12, 19], [15, 23]],
                6: [[24, 39], [31, 46]]
            },
            "rickrick,2": {
                0: [[ 0,  0], [ 0,  0]],
                1: [[ 0,  0], [ 1,  1]],
                2: [[ 1,  1], [ 2,  2]],
                3: [[ 3,  3], [ 4,  4]],
                4: [[ 7,  6], [ 9,  9]],
                5: [[14, 13], [18, 18]],
                6: [[28, 26], [36, 36]]
            },
            "vlad,1": {
                0: [[ 0,  0], [ 0,  0]],
                1: [[ 0,  1], [ 0,  1]],
                2: [[ 1,  2], [ 1,  2]],
                3: [[ 3,  4], [ 3,  4]],
                4: [[ 6,  9], [ 7,  9]],
                5: [[13, 18], [14, 19]],
                6: [[26, 37], [28, 39]]
            }
        },
        currentTileSet: "dupzor,51",
        currentTileOverlays: 0,
        x: null,
        y: null,
        z: null,
        l: null,
        targetX: 0,
        targetY: 0,
        targetZ: 0,
        isAnimating: false,
        isDragging: false,
        key: null,
        panAmount: 0.025,
        wheelAmount: 0.005,
        zoomAmount: 0.025,
        easeAmount: 0.2,
        landmarks: [],
        landmarksById: {},
        currentLandmarks: [],
        currentLandmarksIndexById: {},
        landmarkTypes: [
            "agriculture",
            "commercial",
            "entertainment",
            "government",
            "hotel",
            "industry",
            "monument",
            "public",
            "natural",
            "residential",
            "transportation"
        ],
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
            "irlLandmarkConfirmed": "IRL landmark confirmed",
            "irlLandmarkUnconfirmed": "IRL landmark unconfirmed",
            "irlLandmarkUnknown": "IRL landmark unknown",
            "irlLatLngMissing": "IRL latlng missing",
            "irlWithPhoto": "with IRL photo",
            "irlWithoutPhoto": "without IRL photo",
            "mapIncluded": "included on the map",
            "mapNotIncluded": "not included on the map"
        },
        sort: "igAddress",
        sortOptions: {
            igAddress: "in-game address",
            igLatitude: "in-game latitude",
            igLongitude: "in-game longitude",
            irlAddress: "real-life address",
            irlLatitude: "real-life latitude",
            irlLongitude: "real-life longitude",
            tags: "tags",
            id: "id",
            edited: "last edited"
        },
        themes: ["light", "dark"],
        markers: {},
        focus: "map",
        mapType: "satellite",
        mapTypes: ["satellite", "hybrid"],
        api: gtadb.API("api"),
        username: "",
        sessionId: "",
        defaults: {
            x: -4000,
            y: 2000,
            z: 1,
            l: null,
            find: "",
            filter: "all",
            mapMode: "gta",
            mapType: "satellite",
            profileColor: "3f7703",
            sort: "igAddress",
            theme: "light",
            tileSet: "dupzor,51",
            tileOverlays: 0
        },
    }

    // Init ////////////////////////////////////////////////////////////////////////////////////////

    self.init = function() {

        self.element = document.createElement("div")
        self.element.id = "map"
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
        document.body.appendChild(self.element)

        const zInt = Math.ceil(self.z)

        const overlayString = Object.keys(self.tileOverlayRanges).join(",")
        self.tiles = {}
        self.tilePaths = {}
        self.tileSets.forEach(function(tileSet, i) {
            self.tiles[tileSet] = {}
            self.tilePaths[tileSet] = {}
            ;[0, 1].forEach(function(overlay) {
                self.tiles[tileSet][overlay] = {}
                self.tilePaths[tileSet][overlay] = {}
                for (let z = self.minZ; z <= self.maxZ; z++) {
                    self.tiles[tileSet][overlay][z] = {}
                    self.tilePaths[tileSet][overlay][z] = {}
                    const [[x0, y0], [x1, y1]] = self.tileSetRanges[tileSet][z]
                    for (let y = y0; y <= y1; y++) {
                        self.tiles[tileSet][overlay][z][y] = {}
                        self.tilePaths[tileSet][overlay][z][y] = {}
                        for (let x = x0; x <= x1; x++) {
                            self.tiles[tileSet][overlay][z][y][x] = new Image()
                            self.tilePaths[tileSet][overlay][z][y][x] = tileSet
                            if (overlay == 1) {
                                Object.entries(self.tileOverlayRanges).forEach(function([name, ranges]) {
                                    if (
                                        x >= ranges[z][0][0] && x <= ranges[z][1][0] &&
                                        y >= ranges[z][0][1] && y <= ranges[z][1][1] && (
                                            [ranges[z][0][0], ranges[z][1][0]].includes(x) ||
                                            [ranges[z][0][1], ranges[z][1][1]].includes(y)
                                        )
                                    ) {
                                        self.tilePaths[tileSet][overlay][z][y][x] = `${tileSet},${overlayString}`
                                    } else if (
                                        x > ranges[z][0][0] && x < ranges[z][1][0] &&
                                        y > ranges[z][0][1] && y < ranges[z][1][1] &&
                                        self.tilePaths[tileSet][overlay][z][y][x] == tileSet
                                    ) {
                                        self.tilePaths[tileSet][overlay][z][y][x] = name
                                    }
                                })
                            }
                        }
                    }
                }
            })
        })

        self.markersLayer.addEventListener("click", self.onClick)
        window.addEventListener("hashchange", self.onHashchange)
        document.addEventListener("keydown", self.onKeydown)
        document.addEventListener("keyup", self.onKeyup)
        self.markersLayer.addEventListener('mousedown',self.onMousedown)
        window.addEventListener("resize", self.onResize)
        self.markersLayer.addEventListener("wheel", self.onWheel, {passive: false})

        self.onResize(false)

        self.getUserSettings()
        self.setTheme()
        self.setMapMode(self.mapMode)

        self.api.getUser().then(function([username, sessionId, profileColor]) {
            if (username) {
                self.onLogin(username, sessionId, profileColor)
            }
            self.loadJSON("data/landmarks.json").then(function(landmarks) {
                self.initUI(landmarks)
                self.onHashchange()
                self.initGooglemaps()
            })
        }).catch(function(error) {
            console.log(error)
            self.loadJSON("data/landmarks.json").then(self.initUI)
        })
        
        return that

    }

    self.initUI = function(landmarks) {

        self.parseLandmarks(landmarks)

        self.markers = {}
        self.landmarks.filter(function(landmark) {
            return landmark.igCoordinates !== null
        }).sort(function(a, b) {
            return b.igCoordinates[1] - a.igCoordinates[1]
        }).forEach(function(landmark) {
            self.addMarker(landmark)
        })

        self.listPanel = document.createElement("div")
        self.listPanel.className = "mapPanel"
        self.listPanel.id = "listPanel"
        self.listPanel.addEventListener("mousedown", function(e) {
            self.focus = "list"
            if (e.target.parentElement.classList.contains("item")) {
                const id = e.target.parentElement.id.replace("item_", "")
                if (e.metaKey && e.target.parentElement.classList.contains("selected")) {
                    self.setLandmark(null)
                } else {
                    self.setLandmark(id, true)
                    self.panGooglemaps(id)
                }
            }
        })
        self.element.appendChild(self.listPanel)

        // Title Bar

        self.titleElement = document.createElement("div")
        self.titleElement.innerHTML = "MAP.GTADB.ORG"
        self.titleElement.id = "titleElement"

        self.aboutButton = gtadb.Button({
            click: function() {
                self.aboutDialog.open()
                self.focus = "dialog"
            },
            text: "ABOUT",
            tooltip: "."
        })

        self.settingsButton = gtadb.Button({
            click: function() {
                self.settingsDialog.open()
                self.focus = "dialog"
            },
            text: "SETTINGS",
            tooltip: ","
        })

        self.userIcon = document.createElement("div")
        self.userIcon.classList.add("auth")
        self.userIcon.id = "userIcon"
        self.userIcon.title = self.username
        self.userIcon.style.backgroundColor = "#" + self.profileColor
       
        self.titleBar = gtadb.Bar({
            buttons: [self.aboutButton, self.settingsButton],
            element: self.titleElement,
            extras: [self.userIcon],
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
            text: "CLEAR"
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
                self.setLandmark(self.l)
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
        self.element.appendChild(self.itemPanel)

        self.itemId = document.createElement("div")
        self.itemId.id = "itemId"

        self.editItemButton = gtadb.Button({
            click: function() {
                self.editing = true
                self.renderItem()
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
                self.editLandmark("ig_photo", value)
            },
            height: 139.5,
            type: "file",
            value: "",
            width: 248
        })
        self.editItemIgPhoto.element.id = "editItemIgPhoto"
        self.editItemIgPhoto.element.classList.add("auth")
        self.itemBody.appendChild(self.editItemIgPhoto.element)

        self.itemIrlAddress = document.createElement("div")
        self.itemIrlAddress.id = "itemIrlAddress"
        self.itemIrlAddress.className = "address"
        self.itemBody.appendChild(self.itemIrlAddress)

        self.itemIrlCoordinates = document.createElement("div")
        self.itemIrlCoordinates.className = "coordinates"
        self.itemBody.appendChild(self.itemIrlCoordinates)

        self.itemIrlPhoto = document.createElement("div")
        self.itemIrlPhoto.className = "photo"
        self.itemBody.appendChild(self.itemIrlPhoto)

        self.editItemIrlPhoto = gtadb.Input({
            change: function(value) {
                console.log("IRL PHOTO CHANGE", value)
                self.editLandmark("rl_photo", value)
            },
            height: 139.5,
            type: "file",
            value: "",
            width: 248
        })
        self.editItemIrlPhoto.element.id = "editItemIrlPhoto"
        self.editItemIrlPhoto.element.classList.add("auth")
        self.itemBody.appendChild(self.editItemIrlPhoto.element)

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
        self.element.appendChild(self.dialogLayer.element)

        // About Dialog

        self.aboutThisMapElement = document.createElement("div")
        self.aboutThisMapElement.style.margin = "8px"
        self.aboutThisMapElement.innerHTML = `<p><b>map.gtadb.org</b>
            is an interactive map of Grand Theft Auto VI that includes
            every single landmark that has been identified so far.</p>
            <p>Finding the real-life equivalent of every single in-game
            building is going to be a collaborative effort, way beyond
            the release of the game.</p>
            <p>Huge thanks to all the contributors, on the GTA VI Mapping
            Discord and elsewhere!</p>`

        self.sourceCodeElement = document.createElement("div")
        self.sourceCodeElement.style.margin = "8px"
        self.sourceCodeElement.innerHTML = `<p>This website, including
            the GTA VI map application, is free Open Source software,
            written in JavaScript and Python.</p>
            <p>You can get the source code on GitHub. That's also the
            best place to request features or report bugs.</p>
            <p><a href="https://github.com/rolux/gtadb.org"
            target="_blank">https://github.com/rolux/gtadb.org</a>
            </p>`

        self.landmarkDataElement = document.createElement("div")
        self.landmarkDataElement.style.margin = "8px"
        self.landmarkDataElement.innerHTML = `<p>You are welcome
            to use the landmark data for your own purposes.</p>
            <p>The latest version can always be found here:</p>
            <p><a href="https://map.gtadb.org/data/landmarks.json"
            target="_blank">https://map.gtadb.org/data/landmarks.json</a>
            </p>`

        self.keyboardShortcutsElement = document.createElement("div")
        self.keyboardShortcutsElement.style.margin = "8px"
        self.keyboardShortcutsElement.innerHTML = `<table>
            <tr><td>← → ↑ ↓</td><td>Pan</td></tr>
            <tr><td>0 1 2 3 4 5 6</td><td>Set zoom level</td></tr>
            <tr><td>&ndash;</td><td>Zoom out</td></tr>
            <tr><td>=</td><td>Zoom in</td></tr>
            <tr><td>G</td><td>Switch map mode</td></tr>
            <tr><td>⇧ G</td><td>Toggle labels</td></tr>
            <tr><td>T</td><td>Switch tile set</td></tr>
            <tr><td>⇧ T</td><td>Toggle overlays</td></tr>
            <tr><td>ESC</td><td>Deselect landmark</td></tr>
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
        self.editingGuidelinesElement.innerHTML = `<p>Coming soon...</p>`

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

        self.aboutDialog = gtadb.Dialog({
            buttons: [],
            content: self.aboutPanel.element,
            height: 544,
            layer: self.dialogLayer,
            title: "GTA VI Landmarks Map",
            width: 768
        })
        self.aboutDialog.element.id = "aboutDialog"

        // Settings Dialog

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

        self.mapSettingsElement = document.createElement("div")
        self.mapSettingsElement.style.margin = "8px"

        self.mapModeSelect = document.createElement("select")
        self.mapModes.forEach(function(mapMode) {
            const element = document.createElement("option")
            element.value = mapMode
            element.textContent = ("MAP MODE: " + mapMode).toUpperCase()
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
        self.mapTypes.forEach(function(mapType) {
            const element = document.createElement("option")
            element.value = mapType
            element.textContent = ("MAP TYPE: " + mapType).toUpperCase()
            element.selected = mapType == self.mapType
            self.mapTypeSelect.appendChild(element)
        })
        self.mapTypeSelect.value = self.mapType
        self.mapTypeSelect.addEventListener("change", function() {
            this.blur()
            self.setMapType(this.value)
        })
        self.mapSettingsElement.appendChild(self.mapTypeSelect)

        self.tileSetSelect = document.createElement("select")
        self.tileSets.forEach(function(tileSet) {
            const element = document.createElement("option")
            element.value = tileSet
            element.textContent = ("TILE SET: " + tileSet.replace(",", " V")).toUpperCase()
            element.selected = tileSet == self.tileSet
            self.tileSetSelect.appendChild(element)
        })
        self.tileSetSelect.value = self.tileSet
        self.tileSetSelect.addEventListener("change", function() {
            this.blur()
            self.tileSet = this.value
            self.setUserSettings()
            self.renderMap()
        })
        self.mapSettingsElement.appendChild(self.tileSetSelect)

        self.tileOverlaysSelect = document.createElement("select")
        ;["off", "on"].forEach(function(value, i) {
            const element = document.createElement("option")
            element.value = i
            element.textContent = ("TILE OVERLAYS: " + value).toUpperCase()
            element.selected = value == self.tileOverlays
            self.tileOverlaysSelect.appendChild(element)
        })
        self.tileOverlaysSelect.value = self.tileOverlays
        self.tileOverlaysSelect.addEventListener("change", function() {
            this.blur()
            self.tileOverlays = this.value
            self.setUserSettings()
            self.renderMap()
        })
        self.mapSettingsElement.appendChild(self.tileOverlaysSelect)

        self.createAccountForm = gtadb.Form({
            buttonText: "CREATE ACCOUNT",
            click: function(data) {
                self.api.createAccount(
                    data.inviteCode,
                    data.username,
                    data.password,
                    data.repeatPassword
                ).then(function(sessionId) {
                    console.log(sessionId)
                }).catch(function(error) {
                    self.createAccountForm.setMessage(error.message)
                    setTimeout(function() {
                        self.createAccountForm.setMessage("")
                    }, 2500)
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

        self.manageAccountForm = gtadb.Form({
            buttonText: "CHANGE PASSWORD",
            click: function(data) {
                self.api.changePassword(
                    data.oldPassword,
                    data.newPassword,
                    data.repeatNewPassword
                ).then(function() {

                })
            },
            inputs: {
                "username": ["USERNAME", "username", self.username],
                "oldPassword": ["OLD PASSWORD", "password", ""],
                "newPassword": ["NEW PASSWORD", "password", ""],
                "repeatNewPassword": ["REPEAT NEW PASSWORD", "password", ""]                
            },
            width: 496,
            _readonly: ["username"] // only present to prevent find input autofill
        })
        self.manageAccountForm.element.style.margin = "8px"

        self.loginForm = gtadb.Form({
            buttonText: "LOGIN",
            click: function(data) {
                self.api.login(
                    data.username,
                    data.password
                ).then(function(sessionId) {
                    self.onLogin(data.username, sessionId)
                }).catch(function(error) {
                    self.loginForm.setMessage(error.message)
                    setTimeout(function() {
                        self.loginForm.setMessage("")
                    }, 2500)
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
            buttonText: "CLICK HERE TO LOGOUT",
            click: function() {
                self.api.logout().then(function() {
                    self.onLogout()
                }).catch(function(error) {

                })
            },
            inputs: {},
            width: 496
        })
        self.logoutForm.element.style.margin = "8px"

        self.settingsPanel = gtadb.Panel({
            height: 512,
            elements: self.sessionId ? {
                "Appearance": self.appearanceElement,
                "Map Settings": self.mapSettingsElement,
                "Manage Account": self.manageAccountForm.element,
                "Logout": self.logoutForm.element,
            } : {
                "Appearance": self.appearanceElement,
                "Map Settings": self.mapSettingsElement,
                "Create Account": self.createAccountForm.element,
                "Login": self.loginForm.element,
            },
            width: 768
        })

        self.settingsDialog = gtadb.Dialog({
            buttons: [],
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
            content: document.createElement("div"),
            layer: self.dialogLayer,
            title: ""
        })
        self.photoDialog.element.id = "photoDialog"

    }

    self.initGooglemaps = function() {
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
        });
        async function init() {
            const { Map } = await google.maps.importLibrary("maps")
            const { AdvancedMarkerElement } = await google.maps.importLibrary("marker")
            self.googleMap = new Map(document.getElementById("googlemapsLayer"), {
                mapId: "b7ed25226b73d4cc3e56b039",
                center: {lat: 27, lng: -81},
                mapTypeId: self.mapType,
                zoom: 8,
                zoomControl: false,
                cameraControl: false,
                mapTypeControl: false,
                scaleControl: false,
                streetViewControl: false,
                rotateControl: false,
                fullscreenControl: false,
            })
            self.googleMarkers = {}
            self.landmarks.forEach(function(landmark) {
                if (landmark.irlCoordinates) {
                    let customMarker = document.createElement("div")
                    customMarker.className = "marker googlemaps"
                    customMarker.id = "googlemapsMarker_" + landmark.id
                    customMarker.style.backgroundColor = "#" + landmark.color
                    customMarker.style.display = "block"
                    const googleMarker = new AdvancedMarkerElement({
                        map: self.googleMap,
                        content: customMarker,
                        position: {
                            lat: landmark.irlCoordinates[0],
                            lng: landmark.irlCoordinates[1]
                        },
                        title: landmark.title,
                        gmpClickable: true,
                        zIndex: 1
                    })
                    googleMarker.addListener("click", function({domEvent, latLng}) {
                        const {target} = domEvent
                        const id = target.id.replace("googlemapsMarker_", "")
                        const isSelected = target.classList.contains("selected")
                        Object.values(self.googleMarkers).forEach(function(gM) {
                            gM.zIndex = 1
                        })
                        googleMarker.zIndex = 10
                        if (isSelected && domEvent.metaKey) {
                            self.setLandmark(null)
                        } else if (!isSelected) {
                            self.setLandmark(id)
                        }
                    })
                    self.googleMarkers[landmark.id] = googleMarker
                }
            })
        }
        init().then(function() {
            if (self.mapMode == "googlemaps") {
                self.setMapMode("googlemaps")
            }
        })
    }

    // Map /////////////////////////////////////////////////////////////////////////////////////////

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
        self.renderMap()
        if (!immediate) {
            if (Math.abs(dx) > 0.1 || Math.abs(dy) > 0.1 || Math.abs(dz) > 0.01) {
                requestAnimationFrame(function() {
                    self.animate()
                })
            } else {
                self.x = self.targetX
                self.y = self.targetY
                self.z = self.targetZ
                self.isAnimating = false
                self.renderMap() // FIXME
                self.setHash()
            }
        }
    }

    self.renderMap = function() {

        const zInt = Math.ceil(self.z)
        const mapSize = self.tileSize * Math.pow(2, self.z)
        const mppx = mapSize / self.mapW
        const cX = (self.x + self.zeroX) * mppx
        const cY = (self.zeroY - self.y) * mppx
        const offsetX = self.canvas.width / 2 - cX;
        const offsetY = self.canvas.height / 2 - cY;
        const tileSize = self.tileSize * Math.pow(2, self.z - zInt);

        const [[x0, y0], [x1, y1]] = self.tileSetRanges[self.tileSet][zInt]

        const minTx = Math.floor(-offsetX / tileSize)
        const maxTx = Math.ceil((self.canvas.width - offsetX) / tileSize)
        const minTy = Math.floor(-offsetY / tileSize)
        const maxTy = Math.ceil((self.canvas.height - offsetY) / tileSize)

        for (let y = minTy; y <= maxTy; y++) {
            for (let x = minTx; x <= maxTx; x++) {
                if (x >= x0 && x <= x1 && y >= y0 && y <= y1) {
                    const img = self.tiles[self.tileSet][self.tileOverlays][zInt][y][x]
                    if (!img.src) {
                        (function(originalX, originalY, originalZ) {
                            img.addEventListener("load", function() {
                                if (
                                    originalX.toFixed(3) == self.x &&
                                    originalY.toFixed(3) == self.y &&
                                    originalZ.toFixed(3) == self.z
                                ) {
                                    self.context.drawImage(
                                        img,
                                        offsetX + x * tileSize,
                                        offsetY + y * tileSize,
                                        tileSize,
                                        tileSize
                                    )
                                }
                            })
                        })(self.x, self.y, self.z)
                        const tilePath = self.tilePaths[self.tileSet][self.tileOverlays][zInt][y][x]
                        img.src = `tiles/${tilePath}/${zInt}/${zInt},${y},${x}.jpg`;
                    } else {
                        self.context.drawImage(
                            img,
                            offsetX + x * tileSize,
                            offsetY + y * tileSize,
                            tileSize,
                            tileSize
                        )
                    }
                } else {
                    self.context.clearRect(
                        offsetX + x * tileSize,
                        offsetY + y * tileSize,
                        tileSize,
                        tileSize
                    )
                }
            }
        }
        self.renderMarkers()

    }

    self.setHash = function() {
        const hash = [self.targetX, self.targetY, self.targetZ].map(function (v) {
            return v.toFixed(3)
        }).join(",") + (self.l ? "," + self.l : "")
        if (window.location.hash.slice(1) != hash) {
            // history.replaceState(null, "", "#" + hash)
            window.location.hash = hash
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

    // Landmarks ///////////////////////////////////////////////////////////////////////////////////

    self.addLandmark = function() {
        const igCoordinates = [Math.round(self.x), Math.round(self.y)]
        self.api.addLandmark(igCoordinates).then(function(ret) {
            if (ret.status == "ok") {
                self.clearFindAndFilter()
                let landmark = self.parseLandmark(ret.id, ret.data)
                console.log("LANDMARK", landmark)
                self.landmarks.push(landmark)
                self.landmarksById[ret.id] = landmark
                self.currentLandmarks.push(landmark)
                self.addMarker(landmark)
                self.setLandmark(ret.id)
                self.renderMarkers()
                self.renderList()
                self.renderStatus()
            } else {
                console.log(ret)
            }
        })
    }

    self.editLandmark = function(key, value) {
        const id = self.l
        self.api.editLandmark(id, key, value).then(function(ret) {
            if (ret.status == "ok") {
                console.log(ret)
                let landmark = self.parseLandmark(id, ret.data)
                let index = self.landmarks.findIndex(function(landmark) {
                    return landmark.id == id
                })
                if (index > -1) {
                    self.landmarks[index] = landmark
                }
                self.landmarksById[id] = landmark
                index = self.currentLandmarks.findIndex(function(item) {
                    return item.id == id
                })
                if (index > -1) {
                    self.currentLandmarks[index] = landmark
                }
                self.updateMarker(landmark)
                self.renderList()
                self.renderStatus()
                self.renderItem()
            } else {
                console.log(ret)
            }
        })
    }

    self.removeLandmark = function() {
        self.api.removeLandmark(self.l).then(function(ret) {
            if (ret.status == "ok") {
                let index = self.landmarks.findIndex(function(landmark) {
                    return landmark.id == self.l
                })
                if (index > -1) {
                    self.landmarks.splice(index, 1)
                }
                delete self.landmarksById[self.l]
                index = self.currentLandmarks.findIndex(function(item) {
                    return item.id == self.l
                })
                if (index > -1) {
                    self.currentLandmarks.splice(index, 1)
                }
                self.removeMarker(self.l)
                self.l = null
                self.setLandmark(null)
                self.renderList()
                self.renderStatus()
            } else {
                console.log(ret)
            }
        })
    }

    self.parseLandmark = function(id, item) {
        landmark = {
            "id": id,
            "idSortString": self.getIdSortString(id),
            "igAddress": item[0],
            "igAddressSortString": self.getAddressSortString(item[0]),
            "igCoordinates": item[1].length ? item[1] : null,
            "igPhotoSize": item[2].length ? item[2] : null,
            "igPhotoRatio": item[2].length ? [item[2][0] / item[2][1]] : 0,
            "irlAddress": item[3].replace(/(?<=.)\?$/, ""),
            "irlAddressSortString": self.getAddressSortString(item[3].replace(/(?<=.)\?$/, "")),
            "irlCoordinates": item[4].length ? item[4] : null,
            "irlStatus": item[3] == "?" ? "unknown" : item[6].includes("unconfirmed") ? "unconfirmed" : "confirmed",
            "irlPhotoSize": item[5].length ? item[5] : null,
            "irlPhotoRatio": item[5].length ? [item[5][0] / item[5][1]] : 0,
            "tags": item[6],
            "color": item[7],
            "borderColor": [0, 1, 2].map(function(i) {
                const dec = Number("0x" + item[7].slice(i * 2, (i + 1) * 2))
                return (dec + 64).toString(16)
            }).join(""),
            "edited": item[8],
            "findString": id + "\n" + item[0].toLowerCase() + "\n" + item[3].toLowerCase()
        }
        landmark.igNameAndAddress = self.getLandmarkNameAndAddress(landmark.igAddress)
        landmark.irlNameAndAddress = self.getLandmarkNameAndAddress(landmark.irlAddress)
        landmark.title = self.getLandmarkTitle(landmark)
        return landmark
    }

    self.parseLandmarks = function(landmarks) {
        //console.log("PL", landmarks)
        self.landmarks = Object.entries(landmarks).map(function([id, item]) {
            return self.parseLandmark(id, item)
        })
        self.landmarksById = self.landmarks.reduce(function(a, v) {
            a[v.id] = v
            return a
        }, {})
        self.currentLandmarks = self.landmarks.slice()
    }

    self.selectLandmark = function(id) {
        self.l = id
        self.setUserSettings()
        /*
        let element = document.querySelector(".marker.selected")
        if (element) {
            element.classList.remove("selected")
        }
        if (self.l) {
            let element = document.querySelector("#marker_" + self.l)
            if (element) {
                element.classList.add("selected")
            }
        }
        */
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
        element = document.querySelector(".item.selected")
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
        if (self.mapMode == "GTA") {
            self.panGooglemaps(id)
        }
    }

    self.setLandmark = function(id, pan) {
        if (id == self.l && !pan) {
            return
        }
        console.log("setLandmark", id)
        if (id != self.id && self.editing) {
            self.editing = false
            self.renderItem()
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
        /*
        if (!self.isAnimating) {
            self.setHash()
        } else {
            let interval = setInterval(function() {
                if (!self.isAnimating) {
                    clearInterval(interval)
                    self.setHash()
                }
            }, 25)
        }
        */
    }

    self.sortLandmarks = function(option) {
        self.sort = option
        self.setUserSettings()
        self.currentLandmarks.sort(function(a, b) {
            let sortValues = [a, b].map(function(v) {
                if (self.sort == "igAddress") {
                    return v.igAddressSortString + "\n" + v.irlAddressSortString
                } else if (self.sort == "igLatitude") {
                    return v.igCoordinates ? -v.igCoordinates[1] : 1e6
                } else if (self.sort == "igLongitude") {
                    return v.igCoordinates ? v.igCoordinates[0] : 1e6
                } else if (self.sort == "irlAddress") {
                    return v.irlAddressSortString + "\n" + v.igAddressSortString
                } else if (self.sort == "irlLatitude") {
                    return v.irlCoordinates ? -v.irlCoordinates[0] : 1e6
                } else if (self.sort == "irlLongitude") {
                    return v.irlCoordinates ? v.irlCoordinates[1] : 1e6
                } else if (self.sort == "tags") {
                    return [v.tags.join(", ")].concat(v.igAddress.split(", ").reverse()).join(", ")
                } else if (self.sort == "id") {
                    return v.idSortString
                } else if (self.sort == "edited") {
                    return -v.edited
                }
            })
            return sortValues[0] < sortValues[1] ? -1 : sortValues[0] > sortValues[1] ? 1 : 0
        })
        self.currentLandmarksIndexById = self.currentLandmarks.reduce(function(a, v, i) {
            a[v.id] = i
            return a
        }, {})
    }

    // Markers

    self.addMarker = function(landmark) {
        self.markers[landmark.id] = document.createElement("div")
        self.markers[landmark.id].id = "marker_" + landmark.id
        self.markers[landmark.id].className = "marker"
        self.markers[landmark.id].style.backgroundColor = "#" + landmark.color 
        self.markers[landmark.id].title = landmark.title
        self.markersLayer.appendChild(self.markers[landmark.id])
    }

    self.clearMarkers = function() {
        self.landmarks.filter(function(landmark) {
            return landmark.igCoordinates !== null
        }).forEach(function(landmark) {
            if (!self.currentLandmarks.includes(landmark)) {
                let marker = self.markers[landmark.id]
                marker.classList.remove("selected")
                marker.style.display = "none"
            }
        })
    }

    self.removeMarker = function(id) {
        self.markers[id].remove()
        delete self.markers[id]
    }

    self.renderMarkers = function() {
        const left = -16
        const right = self.canvas.width + 16
        const top = -24
        const bottom = self.canvas.height + 24
        const mppx = self.getMppx()
        const minX = self.x - mppx * self.canvas.width / 2
        const maxY = self.y + mppx * self.canvas.height / 2
        self.currentLandmarks.filter(function(landmark) {
            return landmark.igCoordinates !== null
        }).forEach(function(landmark) {
            let markerElement = self.markers[landmark.id]
            const [x, y] = landmark.igCoordinates
            const screenX = (x - minX) / mppx
            const screenY = (maxY - y) / mppx
            if (screenX >= left && screenX <= right && screenY >= top && screenY <= bottom) {
                markerElement.style.left = screenX + "px"
                markerElement.style.top = screenY + "px"
                markerElement.style.display = "block"
            } else {
                markerElement.style.display = "none"
            }
        })
    }

    self.updateMarker = function(landmark) {
        self.markers[landmark.id].style.backgroundColor = "#" + landmark.color 
        self.markers[landmark.id].title = landmark.title
    }

    // Photo Dialog ////////////////////////////////////////////////////////////////////////////////

    self.openPhotoDialog = function(landmark, selected) {
        self.dialogPhoto = document.createElement("img")
        self.dialogPhoto.src = `photos/${landmark.id},${selected}.jpg?v=${landmark.edited}`
        self.dialogPhoto.id = "dialogPhoto"
        self.photoDialog.set({
            content: self.dialogPhoto,
            title: selected == "ig" ? landmark.igAddress : landmark.irlAddress
        })
        self.resizePhotoDialog()
        self.photoDialog.open()
        self.focus = "dialog"
    }

    self.switchPhoto = function() {
        const selected = self.dialogPhoto.src.includes(",ig.jpg") ? "rl" : "ig"
        self.dialogPhoto.src = `photos/${self.l},${selected}.jpg?v=${landmark.edited}`
        self.resizePhotoDialog()
    }

    self.resizePhotoDialog = function() {
        const margin = 64
        const windowRatio = (window.innerWidth - margin) / (window.innerHeight - margin)
        const dialogRatio = self.dialogPhoto.naturalWidth / (self.dialogPhoto.naturalHeight + 32)
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
        self.focus = "list"
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
                self.filter == "irlLandmarkConfirmed" && landmark.irlStatus == "confirmed" ||
                self.filter == "irlLandmarkUnconfirmed" && landmark.irlStatus == "unconfirmed" ||
                self.filter == "irlLandmarkUnknown" && landmark.irlStatus == "unknown" ||
                self.filter == "irlLatLngMissing" && landmark.irlAddress[0] != "?" && landmark.irlCoordinates === null ||
                self.filter == "irlWithPhoto" && landmark.irlPhotoRatio ||
                self.filter == "irlWithoutPhoto" && !landmark.irlPhotoRatio ||
                self.filter == "mapIncluded" && landmark.id[0] == "b" ||
                self.filter == "mapNotIncluded" && landmark.id[0] == "x"
            )
        })
        // FIXME: duplicated
        self.currentLandmarksIndexById = self.currentLandmarks.reduce(function(a, v, i) {
            a[v.id] = i
            return a
        }, {})
        if (self.l && self.currentLandmarksIndexById[self.l] == void 0) {
            self.l = null
        }
        self.clearMarkers()
        self.renderMarkers()
        self.sortLandmarks(self.sort) // update indexById 
        self.renderList()
        self.renderStatus()
        self.setLandmark(self.l) // scroll into view. calls renderItem
    }

    // Event Handlers

    self.onBlur = function(e) {
        const key = {
            "itemIgAddress": "ig_address",
            "itemIrlAddress": "rl_address",
            "itemTags": "tags"
        }[this.id]
        let value = this.innerText.trim()
        if (key == "tags") {
            value = value.replace("^TAGS:", "")
            value = value.split(",").map(function(tag) {
                return tag.trim().replace(" ", "").toLowerCase()
            })
        }
        self.editLandmark(key, value)
    }

    self.onHashchange = function() {
        let values = window.location.hash.slice(1).split(",")
        if (values.length > 4) {
            values[3] = values.slice(3).join(",")
        }
        let last = values[values.length - 1]
        let l, lx, ly, lz, f
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
                last = last.toLowerCase()
                const landmarks = self.landmarks.filter(function(landmark) {
                    return landmark.findString.includes(last)
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
                    f = last
                    if (f != self.find) {
                        // last part of hash is find query
                        self.findElement.value = f
                        self.clearFindButton.element.style.display = "block"
                        self.filterElement.value = "all"
                        self.clearFilterButton.element.style.display = "none"
                        self.findAndFilterLandmarks(last, "all") // this calls setLandmark, which calls setHash
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
        const hash = values.map(function(v, i) {
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
        ;[self.targetX, self.targetY, self.targetZ] = values
        self.l = l
        self.findAndFilterLandmarks(self.find, self.filter)
        self.selectLandmark(l) // this calls setHash!
        if (!self.isAnimating) {
            self.animate()
        }
    }

    self.onKeydown = function(e) {

        const activeElement = document.activeElement
        if (activeElement.matches("[contenteditable]") && e.key == "Enter") {
            activeElement.blur()
        }
        if (activeElement.matches("input, textarea, [contenteditable]")) {
            return
        }

        if (self.focus != "dialog" && !e.metaKey) {
            if (e.key == "e") {
                if (self.l && self.sessionId && self.mapMode == "gta") {
                    self.editing = !self.editing
                    self.renderItem()
                }
            } else if (e.key == "g") {
                self.setMapMode(self.mapMode == "gta" ? "googlemaps" : "gta")
            } else if (e.key == "G") {
                self.setMapType(self.mapType == "satellite" ? "hybrid" : "satellite")
            } else if ("tT".includes(e.key)) {
                if (e.key == "t") {
                    self.tileSet = self.tileSet == self.tileSets[0] ? self.tileSets[1] : self.tileSets[0]
                    self.tileSetSelect.value = self.tileSet
                } else {
                    self.tileOverlays = 1 - self.tileOverlays
                    self.tileOverlaysSelect.value = self.tileOverlays
                }
                self.setUserSettings()
                self.renderMap()
            } else if (e.key == ".") {
                self.aboutDialog.open()
                self.focus = "dialog"
            } else if (e.key == ",") {
                self.settingsDialog.open()
                self.focus = "dialog"
            }
        }

        if (self.focus == "map") {

            if ("0123456".includes(e.key) && !e.metaKey) {
                self.setTarget(self.targetX, self.targetY, parseInt(e.key))
            } else if ([
                "-", "=", "ArrowDown", "ArrowLeft", "ArrowRight", "ArrowUp"
            ].includes(e.key) && !e.metaKey) {
                if (self.keydownTimeout) {
                    clearTimeout(self.keydownTimeout)
                    self.keydownTimeout = null
                }
                (function keydownFn() {
                    if (e.key == "-") {
                        self.setTarget(self.targetX, self.targetY, self.targetZ - self.zoomAmount)
                    } else if (e.key == "=") {
                        self.setTarget(self.targetX, self.targetY, self.targetZ + self.zoomAmount)
                    } else if (e.key == "ArrowDown") {
                        self.setTarget(self.targetX, self.targetY - self.getMppx() * self.canvas.height * self.panAmount, self.targetZ)
                    } else if (e.key == "ArrowLeft") {
                        self.setTarget(self.targetX - self.getMppx() * self.canvas.height * self.panAmount, self.targetY, self.targetZ)
                    } else if (e.key == "ArrowRight") {
                        self.setTarget(self.targetX + self.getMppx() * self.canvas.height * self.panAmount, self.targetY, self.targetZ)
                    } else if (e.key == "ArrowUp") {
                        self.setTarget(self.targetX, self.targetY + self.getMppx() * self.canvas.height * self.panAmount, self.targetZ)
                    }
                    self.keydownTimeout = setTimeout(keydownFn)
                }())
            } else if (e.key == "Escape") {
                if (self.l) {
                    self.setLandmark(null)
                }
            }

        } else if (self.focus == "list") {

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
            } else if (e.key == "Escape") {
                if (self.l) {
                    self.setLandmark(null)
                }
            }

        } else if (self.focus == "dialog") {

            if (document.getElementById("aboutDialog")) {
               if (e.key == "Escape") {
                    self.aboutDialog.close()
                    self.focus = "list"
                }
            } else if (document.getElementById("settingsDialog")) {
               if (e.key == "Escape") {
                    self.settingsDialog.close()
                    self.focus = "list"
                }
            } else if (document.getElementById("photoDialog")) {
                if (e.key == "ArrowLeft" || e.key == "ArrowRight") {
                    self.switchPhoto()
                } else if (e.key == "Escape") {
                    self.photoDialog.close()
                    self.focus = "list"
                }
            } 

            if ("0123456tT".includes(e.key) && !e.metaKey) {
                self.dialogLayer.blink()
            }

        }

    }

    self.onKeyup = function(e) {
        const activeElement = document.activeElement
        if (activeElement.tagName == "INPUT") {
            return
        }
        if (self.keydownTimeout) {
            clearTimeout(self.keydownTimeout)
            self.keydownTimeout = null
        }
    }

    self.onMousedown = function(e) {
        e.preventDefault()
        self.focus = "map"
        if (e.target.classList.contains("marker")) {
            const id = e.target.id.replace("marker_", "")
            const isSelected = e.target.classList.contains("selected")
            if (isSelected && e.metaKey) {
                self.setLandmark(null)
            } else if (!isSelected) {
                self.setLandmark(id)
            } else if (isSelected && self.editing) {
                e.stopPropagation()
                self.isDraggingMarker = true
                let marker = e.target.closest(".marker");
                const startCoordinates = self.landmarksById[id].igCoordinates
                let coordinates
                let startX = e.clientX 
                let startY = e.clientY
                let markerX = parseInt(marker.style.left)
                let markerY = parseInt(marker.style.top)
                function onMousemove(e) {
                    const dx = e.clientX - startX
                    const dy = e.clientY - startY
                    marker.style.left = (markerX + dx) + 'px'
                    marker.style.top  = (markerY + dy) + 'px'
                    const mppx = self.getMppx()
                    coordinates = [
                        Math.round(startCoordinates[0] + dx * mppx),
                        Math.round(startCoordinates[1] - dy * mppx)
                    ]
                    // make sure we can zoom while dragging
                    self.landmarksById[id].igCoordinates = coordinates
                    self.itemIgCoordinatesLink.innerHTML = coordinates.join(",")
                }
                function onMouseup(e) {
                    self.isDraggingMarker = false
                    document.removeEventListener("mousemove", onMousemove)
                    document.removeEventListener("mouseup", onMouseup)
                    console.log("coo", coordinates)
                    self.editLandmark("ig_coordinates", coordinates)
                }
                document.addEventListener("mousemove", onMousemove)
                document.addEventListener("mouseup", onMouseup)
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
        function onMouseup(e) {
            if (self.mouseTimeout) {
                clearTimeout(self.mouseTimeout)
                self.mouseTimeout = null
                const x = originalX + mppx * (clientX - self.canvas.width / 2)
                const y = originalY - mppx * (clientY - self.canvas.height / 2)
                self.setTarget(x, y, originalZ)
                navigator.clipboard.writeText(Math.round(x) + "," + Math.round(y))
            } else if (self.isDragging) {
                self.isDragging = false
                self.element.classList.remove("dragging")
                self.setHash()
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

    self.onPaste = function(e) {
        e.preventDefault()
        const text = (e.clipboardData || window.clipboardData).getData("text/plain")
        document.execCommand("insertText", false, text)
    }
 
    self.onResize = function(render=true) {
        console.log("WTF", canvas, self.canvas, window)
        self.canvas.width = window.innerWidth
        self.canvas.height = window.innerHeight
        self.canvas.style.width = window.innerWidth + "px"
        self.canvas.style.height = window.innerHeight + "px"
        if (render) {
            self.renderMap()
        }
        if (self.focus == "dialog") {
            self.resizePhotoDialog()
        }
    }

    self.onWheel = function(e) {
        e.preventDefault()
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
            self.setHash()
        }, 100)
    }

    // Render //////////////////////////////////////////////////////////////////////////////////////

    self.renderItem = function() {

        if (self.l) {

            const landmark = self.landmarksById[self.l]

            self.editItemButton.set({
                click: self.editing ? function() {
                    self.editing = false
                    self.renderItem()
                } : function() {
                    self.editing = true
                    self.renderItem()
                },
                text: self.editing ? "DONE" : "EDIT",
                title: self.editing ? "": "E"
            })
            self.itemBody.classList[self.editing ? "add" : "remove"]("editing")

            self.itemId.innerHTML = ""
            let link = document.createElement("a")
            link.href = "#" + landmark.id
            link.innerHTML = landmark.id.toUpperCase()
            self.itemId.appendChild(link)
            self.itemBody.style.borderRightColor = "#" + landmark.color

            self.itemIgAddress.innerHTML = landmark.igAddress
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
            self.itemIgCoordinatesLink.innerHTML = landmark.igCoordinates ? landmark.igCoordinates.join(",") : "?"
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
            if (self.editing) {
                let button = document.createElement("span")
                button.id = "removeIgCoordinatesButton"
                button.innerHTML = "REMOVE"
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
                    img.src = `photos/${landmark.id},ig.jpg?v=${landmark.edited}`
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
                    img.src = `photos/${landmark.id},ig.jpg?v=${landmark.edited}`
                    const width = 248
                    const height = width / landmark.igPhotoRatio
                    self.editItemIgPhoto.set({height: height, image: img, removeButton: true})
                } else {
                    self.editItemIgPhoto.set({height: 139.5, image: null, removeButton: false})
                }
            }
            self.itemIgPhoto.style.display = !self.editing ? "block" : "none"
            self.editItemIgPhoto.element.style.display = !self.editing ? "none" : "block"

            self.itemIrlAddress.innerHTML = landmark.irlAddress
            if (!self.editing) {
                self.itemIrlAddress.removeAttribute("contenteditable")
                self.itemIrlAddress.removeEventListener("paste", self.onPaste)
                self.itemIrlAddress.removeEventListener("blur", self.onBlur)
            } else {
                self.itemIrlAddress.contentEditable = "true"
                self.itemIrlAddress.addEventListener("paste", self.onPaste)
                self.itemIrlAddress.addEventListener("blur", self.onBlur)
            } 

            self.itemIrlCoordinates.innerHTML = ""
            self.itemIrlCoordinatesLink = document.createElement("span")
            self.itemIrlCoordinatesLink.innerHTML = landmark.irlCoordinates ? landmark.irlCoordinates.join(",") : "?"
            if (landmark.irlCoordinates) {
                self.itemIrlCoordinatesLink.classList.add("link")
                self.itemIrlCoordinatesLink.addEventListener("mousedown", function() {
                    if (self.mapMode == "gta") {
                        self.setMapMode("googlemaps")
                    }
                    self.googleMap.setZoom(16)
                    self.panGooglemaps(landmark.id)
                }) 
            }
            self.itemIrlCoordinates.appendChild(self.itemIrlCoordinatesLink)

            if (!self.editing) {
                self.itemIrlPhoto.innerHTML = ""
                if (landmark.irlPhotoRatio) {
                    const width = 248
                    const height = width / landmark.irlPhotoRatio
                    self.itemIrlPhoto.style.width = width + "px"
                    self.itemIrlPhoto.style.height = height + "px"
                    let img = document.createElement("img")
                    img.src = `photos/${landmark.id},rl.jpg?v=${landmark.edited}`
                    img.style.width = width + "px"
                    img.style.height = height + "px"
                    img.addEventListener("click", function() {
                        self.openPhotoDialog(landmark, "rl")
                    })
                    self.itemIrlPhoto.appendChild(img)
                } else {
                    self.itemIrlPhoto.style.height = "139.5px"
                }
            } else {
                if (landmark.irlPhotoRatio) {
                    let img = document.createElement("img")
                    img.src = `photos/${landmark.id},rl.jpg?v=${landmark.edited}`
                    const width = 248
                    const height = width / landmark.irlPhotoRatio
                    self.editItemIrlPhoto.set({height: height, image: img, removeButton: true})
                } else {
                    self.editItemIrlPhoto.set({height: 139.5, image: null, removeButton: false})
                }
            }
            self.itemIrlPhoto.style.display = !self.editing ? "block" : "none"
            self.editItemIrlPhoto.element.style.display = !self.editing ? "none" : "block"

            if (!self.editing) {
                self.itemTags.innerHTML = "TAGS: " + (
                    landmark.tags.length ? landmark.tags.join(", ") : "none"
                )
                self.itemTags.removeAttribute("contenteditable")
                self.itemTags.removeEventListener("paste", self.onPaste)
                self.itemTags.removeEventListener("blur", self.onBlur)
            } else {
                console.log(landmark, "??")
                self.itemTags.innerHTML = landmark.tags.join(", ")
                self.itemTags.contentEditable = "true"
                self.itemTags.addEventListener("paste", self.onPaste)
                self.itemTags.addEventListener("blur", self.onBlur)
            } 

            //self.itemStatus.innerHTML = `STATUS: ${landmark.irlStatus}`
            self.itemStatusElement.innerHTML = "LAST EDITED: " + self.formatDate(landmark.edited)
            //self.editItemPanel.style.display = "none"
            self.itemPanel.style.display = "block"

        } else {
            self.itemPanel.style.display = "none"
            //self.editItemPanel.style.display = "none"
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
            igElement.innerHTML = self.sort.includes("Address") ? landmark.igAddress
                    : landmark.igAddress + " &nbsp;|&nbsp; " + landmark.irlAddress
            itemElement.appendChild(igElement)
            const irlElement = document.createElement("div")
            irlElement.className = "irl"
            irlElement.innerHTML = self.sort.includes("Address") ? landmark.irlAddress
                    : self.sort.includes("igL") ? self.formatCoordinates(landmark.igCoordinates)
                    : self.sort.includes("irlL") ? self.formatCoordinates(landmark.irlCoordinates)
                    : self.sort == "tags" ? landmark.tags.join(", ").toUpperCase()
                    : self.formatDate(landmark.edited)
            itemElement.appendChild(irlElement)
            self.listBody.appendChild(itemElement)
        })
    }

    self.renderStatus = function() {
        self.listStatusElement.innerHTML = self.currentLandmarks.length + " LANDMARK" + (
            self.currentLandmarks.length == 1 ? "" : "S"
        )
    }

    // Setters /////////////////////////////////////////////////////////////////////////////////////

    self.setMapMode = function(mapMode) {
        self.mapMode = mapMode
        self.setUserSettings()
        if (self.mapMode == "gta") {
            document.body.classList.add("gta")
            document.body.classList.remove("googlemaps")
            self.canvas.style.display = "block"
            self.markersLayer.style.display = "block"
            self.googlemapsLayer.style.display = "none"
            if (self.l) {
                self.setLandmark(self.l, true)
            }
        } else {
            document.body.classList.add("googlemaps")
            document.body.classList.remove("gta")
            self.canvas.style.display = "none"
            self.markersLayer.style.display = "none"
            self.googlemapsLayer.style.display = "block"
        }
        self.updateRemoveItemButton()
    }

    self.setMapType = function(mapType) {
        self.mapType = mapType
        self.setUserSettings()
        self.googleMap.setOptions({mapTypeId: self.mapType})
    }

    self.setTheme = function() {
        document.body.classList.remove(self.theme == "light" ? "dark" : "light")
        document.body.classList.add(self.theme)
    }

    // Updates /////////////////////////////////////////////////////////////////////////////////////

    self.updateRemoveItemButton = function() {
        if (!self.removeItemButton) {
            return
        }
        self.removeItemButton.element.style.display = (
            self.l && self.sessionId && self.mapMode == "gta"
        ) ? "block" : "none"
    }

    self.updateSettingsPanel = function() {
        if (!self.settingsPanel) {
            return
        }
        self.settingsPanel.set({
            elements: self.sessionId ? {
                "Appearance": self.appearanceElement,
                "Map Tiles": self.mapSettingsElement,
                "Manage Account": self.manageAccountForm.element,
                "Logout": self.logoutForm.element,
            } : {
                "Appearance": self.appearanceElement,
                "Map Tiles": self.mapSettingsElement,
                "Create Account": self.createAccountForm.element,
                "Login": self.loginForm.element,
            }
        })
    }

    self.updateUserIcon = function() {
        if (!self.userIcon) {
            return
        }
        self.userIcon.style.backgroundColor = "#" + self.profileColor
        self.userIcon.title = self.sessionId ? self.username : ""
    }

    // User ////////////////////////////////////////////////////////////////////////////////////////

    self.getUserSettings = function() {
        let data = localStorage.getItem("map.gtadb.org")
        console.log("DATA", data)
        let user
        if (!data) {
            console.log("NO DATA")
            user = self.defaults
        } else {
            user = self.checkUserSettings(JSON.parse(localStorage.getItem("map.gtadb.org")).user)
        }
        for (const [key, value] of Object.entries(user)) {
            self[key] = value
        }
    }

    self.setUserSettings = function() {
        localStorage.setItem("map.gtadb.org", JSON.stringify({"user": {
            x: self.x,
            y: self.y,
            z: self.z,
            l: self.l,
            find: self.find,
            filter: self.filter,
            mapMode: self.mapMode,
            mapType: self.mapType,
            profileColor: self.profileColor,
            sessionId: self.sessionId,
            sort: self.sort,
            theme: self.theme,
            tileSet: self.tileSet,
            tileOverlays: self.tileOverlays,
            username: self.username
        }}))
    }

    self.checkUserSettings = function(v) {
        checked = {}
        checked.x = isNaN(v.x) ? 0 : self.clamp(v.x, self.minX, self.maxX)
        checked.y = isNaN(v.y) ? 0 : self.clamp(v.y, self.minY, self.maxY)
        checked.z = isNaN(v.z) ? 0 : self.clamp(v.z, self.minZ, self.maxZ)
        checked.l = self.landmarksById[v.l] ? v.l : self.defaults.l
        checked.find = v.find
        checked.filter = self.filterOptions[v.filter] ? v.filter : self.defaults.filter
        checked.mapMode = self.mapModes.includes(v.mapMode) ? v.mapMode : self.defaults.mapMode
        checked.mapType = self.mapTypes.includes(v.mapType) ? v.mapType : self.defaults.mapType
        checked.profileColor = /^[0-9A-Fa-f]{6}$/.test(v.profileColor) ? v.profileColor : self.defaults.profileColor,
        checked.sessionId = v.sessionId || ""
        checked.sort = self.sortOptions[v.sort] ? v.sort : self.defaults.sort
        checked.theme = self.themes.includes(v.theme) ? v.theme : self.defaults.theme
        checked.tileSet = self.tileSets.includes(v.tileSet) ? v.tileSet : self.defaults.tileSet
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
    }

    self.onLogout = function() {
        document.body.classList.remove("auth")
        self.sessionId = ""
        self.setUserSettings()
        self.updateSettingsPanel()
        self.updateUserIcon()
        if (self.editing) {
            self.editing = false
            self.renderItem()
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

    self.formatCoordinates = function(coordinates) {
        return coordinates ? coordinates.join(",") : "?"
    }

    self.formatDate = function(timestamp) {
        // return new Date(timestamp * 1000).toISOString().slice(0, -5).replace("T", " ") + " UTC"
        return new Date(timestamp * 1000).toLocaleString('sv-SE', {hour12: false});
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
        return parts.reverse().join("\n") // newline since we want "Ambrosia" before "Ambrosia County"
    }

    self.getIdSortString = function(id) {
        return id[0] + "0".repeat(10 - id.length) + id.slice(1)
    }

    self.getLandmarkNameAndAddress = function(address) {
        const parts = address.split(", ")
        /*
        if ("0123456789".includes(address[0])) {
            return [parts[0], address]
        }
        */
        return [parts[0], parts.slice(1).join(", ")]
    }

    self.getLandmarkTitle = function(landmark) {
        return landmark.igAddress.split(", ")[0] + "\n" + landmark.irlAddress.split(", ")[0]
    }

    self.getMppx = function(z=self.z) {
        return self.mapW / (1024 * Math.pow(2, z))
    }

    self.loadJSON = async function(url) {
        try {
            const req = await fetch(url, {cache: "no-cache"})
            if (!req.ok) {
                throw new Error(req.status)
            }
            return await req.json()
        } catch (error) {
            throw error
        }
    }

    self.panGooglemaps = function(id) {
        if (self.landmarksById[id].irlCoordinates) {
            const [lat, lng] = self.landmarksById[id].irlCoordinates
            self.googleMap.panTo({lat: lat, lng: lng})
        }
    }

    self._debug = function() {
        return self
    }

    return self.init()

}

gtadb.map = gtadb.Map()