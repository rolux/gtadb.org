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
        },
        options: options
    }
    self.options = {...self.defaults, ...self.options}
    that.element = document.createElement("div")
    const className = self.options.border == "bottom" ? "borderBottom" : "borderTop"
    that.element.className = "bar " + className
    that.element.appendChild(self.options.element)
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
    that.setMessage = function(status, text) {
        self.message.classList.add(status)
        self.message.innerHTML = text
        setTimeout(function() {
            self.message.innerHTML = ""
            self.message.classList.remove(status)
        }, 3000)
    }
    that.setValue = function(index, value) {
        self.inputs[index].set({value: value})
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
            self.options.image = options.image
            self.upload.innerHTML = ""
            if (self.options.image) {
                // FIXME: use 100%
                self.options.image.style.width = self.upload.style.width
                self.options.image.style.height = self.upload.style.height
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
            self.options.value = options.value
            self.input.value = self.options.value
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
        v: null,
        vs: [5, 6],
        gameColors: { // FIXME: move into class
            4: "rgb(192, 64, 64)",
            5: "rgb(64, 192, 64)",
            6: "rgb(64, 64, 192)"
        },
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
        tileSetRanges: {
            "satellite": {
                0: [[ 0,  0], [ 0,  0]],
                1: [[ 0,  0], [ 1,  1]],
                2: [[ 1,  0], [ 2,  2]],
                3: [[ 2,  1], [ 5,  4]],
                4: [[ 5,  3], [11,  9]],
                5: [[10,  7], [22, 19]],
                6: [[20, 15], [45, 39]]
            },
            "hybrid": {
                0: [[ 0,  0], [ 0,  0]],
                1: [[ 0,  0], [ 1,  1]],
                2: [[ 1,  0], [ 2,  2]],
                3: [[ 2,  1], [ 5,  4]],
                4: [[ 5,  3], [11,  9]],
                5: [[10,  7], [22, 19]],
                6: [[20, 15], [45, 39]]
            },
            "terrain": {
                0: [[ 0,  0], [ 0,  0]],
                1: [[ 0,  0], [ 1,  1]],
                2: [[ 1,  0], [ 2,  2]],
                3: [[ 2,  1], [ 5,  4]],
                4: [[ 5,  3], [11,  9]],
                5: [[10,  7], [22, 19]],
                6: [[20, 15], [45, 39]]
            },
            "roadmap": {
                0: [[ 0,  0], [ 0,  0]],
                1: [[ 0,  0], [ 1,  1]],
                2: [[ 1,  0], [ 2,  2]],
                3: [[ 2,  1], [ 5,  4]],
                4: [[ 5,  3], [11,  9]],
                5: [[10,  7], [22, 19]],
                6: [[20, 15], [45, 39]]
            },
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
            "entertainment",
            "government",
            "hotel",
            "industrial",
            "landmark",
            "natural",
            "office",
            "public",
            "residential",
            "retail",
            "transportation"
        ],
        ui: true,
        themes: ["light", "dark"],
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
                    "roadmap"
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
                tileSet: "dupzor,51",
                tileSets: [
                    "dupzor,51",
                    "yanis,6",
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
        self.vs.forEach(function(v) {
            let gta = "gta" + v
            self.tiles[v] = {}
            self.tilePaths[v] = {}
            let overlays = {5: [0], 6: [0, 1]}[v]
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

        self.markersLayer.addEventListener("click", self.onClick) // FIXME: doesn't exist
        window.addEventListener("hashchange", self.onHashchange)
        document.addEventListener("keydown", self.onKeydown)
        document.addEventListener("keyup", self.onKeyup)
        self.markersLayer.addEventListener('mousedown',self.onMousedown)
        window.addEventListener("resize", self.onResize)
        self.markersLayer.addEventListener("wheel", self.onWheel, {passive: false})

        self.onResize(false)

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
                self.setMapMode(self.mapMode)
                self.initUI(self.landmarksData[self.v])
                self.initGooglemaps().then(function() {
                    self.onHashchange()
                })
            })
        })
        
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

    self.initUI = function(landmarks) {

        self.parseLandmarks(landmarks) // populates self.landmarks / ...ById / current...
        self.initMarkers()

        self.markers = {}
        self.landmarks.filter(function(landmark) {
            return landmark.igCoordinates !== null
        }).sort(function(a, b) {
            return b.igCoordinates[1] - a.igCoordinates[1]
        }).forEach(function(landmark) {
            self.addMarker(landmark)
        })

        self.uiIcon = document.createElement("div")
        self.uiIcon.classList.add("icon")
        self.uiIcon.id = "uiIcon"
        self.uiIcon.innerHTML = "UI"
        self.uiIcon.title = "H"
        self.uiIcon.addEventListener("click", function() {
            self.toggleUI()
        })
        self.element.appendChild(self.uiIcon)

        self.streetviewIcon = document.createElement("div")
        self.streetviewIcon.classList.add("icon")
        self.streetviewIcon.id = "streetviewIcon"
        self.streetviewIcon.innerHTML = "X"
        self.streetviewIcon.title = "ESC"
        self.streetviewIcon.addEventListener("click", function() {
            self.googleMap.getStreetView().setVisible(false)
        })
        self.element.appendChild(self.streetviewIcon)

        self.listPanel = document.createElement("div")
        self.listPanel.className = "mapPanel"
        self.listPanel.id = "listPanel"
        self.listPanel.addEventListener("mousedown", function(e) {
            setTimeout(function() { // allow for blur
                self.focus = "list"
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
        self.element.appendChild(self.listPanel)

        // Title Bar

        self.titleElement = document.createElement("div")
        self.titleElement.id = "titleElement"

        self.siteIcon = document.createElement("div")
        self.siteIcon.classList.add("icon")
        self.siteIcon.id = "siteIcon"
        self.siteIcon.innerHTML = "gtadb"
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
        self.gameIcon.innerHTML = self.v == 5 ? "V" : "VI"
        self.gameIcon.title = "V"
        self.gameIcon.style.backgroundColor = self.gameColors[self.v]
        self.gameIcon.addEventListener("click", function() {
            self.setGameVersion(self.v == 5 ? 6 : 5)
        })
        self.titleElement.appendChild(self.gameIcon)

        self.googlemapsIcon = document.createElement("div")
        self.googlemapsIcon.classList.add("icon")
        self.googlemapsIcon.id = "googlemapsIcon"
        self.googlemapsIcon.innerHTML = "G"
        self.googlemapsIcon.title = "G"
        self.googlemapsIcon.addEventListener("click", function() {
            self.setMapMode(self.mapMode == "gta" ? "googlemaps" : "gta")
        })
        self.titleElement.appendChild(self.googlemapsIcon)
        
        self.userIcon = document.createElement("div")
        self.userIcon.classList.add("icon")
        self.userIcon.classList.add("auth")
        self.userIcon.id = "userIcon"
        self.userIcon.title = self.username
        self.userIcon.style.backgroundColor = "#" + self.profileColor
        self.userIcon.addEventListener("click", function() {
            self.settingsPanel.set({selected: 3})
            self.settingsDialog.open()
        })
        self.titleElement.appendChild(self.userIcon)

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
        self.element.appendChild(self.itemPanel)

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
        self.element.appendChild(self.dialogLayer.element)

        // About Dialog

        self.aboutThisMapElement = document.createElement("div")
        self.aboutThisMapElement.style.margin = "8px"
        self.aboutThisMapElement.innerHTML = `<p><b>map.gtadb.org</b>
            is an interactive map of Grand Theft Auto V and VI that
            includes all landmarks that have been identified so far.</p>
            <p>The goal is to find the real-life equivalent of every
            single in-game building in GTA VI. This is going to be a
            collaborative effort, way beyond the release of the game.</p>
            <p>Huge thanks to all contributors, on the GTA VI Mapping
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
            <p>The latest versions can always be found here:</p>
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
            <tr><td>0 1 2 3 4 5 6</td><td>Set zoom level</td></tr>
            <tr><td>&ndash;</td><td>Zoom out</td></tr>
            <tr><td>=</td><td>Zoom in</td></tr>
            <tr><td>T</td><td>Switch tile set (GTA)</td></tr>
            <tr><td>⇧ T</td><td>Toggle overlays (GTA VI)</td></tr>
            <tr><td>G</td><td>Switch map mode</td></tr>
            <tr><td>⇧ G</td><td>Switch map type (Google Maps)</td></tr>
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
            photo to make it obvious what the marker is referring to.</p>
            <p class="title">Real-life addresses</p>
            <p>The standard format is "Name, Street Address, FL 12345, USA". If there is no
            name, it can be left out. Generally, the address should be chosen so that Google
            Maps can translate it to the correct coordinates. In some cases, Plus Codes
            (like in "Sombrero Key Light, JVHQ+5M, Marathon, FL, USA") are the best choice.
            </p>
            <p class="title">Real-life coordinates</p>
            <p>Currently, these are based on the real-life address and cannot be edited.
            This may change in the future.</p>
            <p class="title">Real-life photos</p>
            <p>Again, these are not needed for now. Later on, the goal is to add matching
            in-game and real-life photos that best convey the similarities.</p>
            <p class="title">Tags</p>
            <p>Tags can be anything. Add UNCONFIRMED if the real-life match is speculative.
            Tags can also be used for a taxonomy of landmark types. A good set of types
            may be AGRICULTURE, ENTERTAINMENT, GOVERNMENT, HOTEL, INDUSTRIAL, LANDMARK,
            NATURAL, OFFICE, PUBLIC, RESIDENTIAL, RESTAURANT, RETAIL, TRANSPORTATION. But
            this is not set in stone.</p>`

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
            element.textContent = "GAME VERSION: GTA " + ({5: "V", 6: "VI"}[v])
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
            }
            self.setUserSettings()
            self.renderMap()
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
            }
            self.setUserSettings()
            self.renderMap()
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
            self.renderMap()
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

    self.initGooglemaps = async function() {

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

            self.initGooglemapsMarkers = function() {
                if (self.googlemapsMarkers) {
                    self.removeGooglemapsMarkers()
                }
                self.googlemapsMarkers = {}
                self.landmarks.forEach(function(landmark) {
                    if (landmark.rlCoordinates) {
                        self.googlemapsMarkers[landmark.id] = self.renderGooglemapsMarker(landmark)
                    }
                })
            }

            self.renderGooglemapsMarker = function(landmark) {
                let customMarker = document.createElement("div")
                customMarker.className = "marker googlemaps"
                customMarker.id = "googlemapsMarker_" + landmark.id
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
                googlemapsMarker.addListener("click", function({domEvent, latLng}) {
                    const {target} = domEvent
                    const id = target.id.replace("googlemapsMarker_", "")
                    const isSelected = target.classList.contains("selected")
                    Object.values(self.googlemapsMarkers).forEach(function(gM) {
                        gM.zIndex = 10
                    })
                    googlemapsMarker.zIndex = 100
                    if (isSelected && domEvent.metaKey) {
                        self.setLandmark(null)
                    } else if (!isSelected) {
                        self.setLandmark(id)
                    }
                })
                return googlemapsMarker
            }

            self.initGooglemapsMarkers()

            google.maps.event.addListener(self.googleMap, 'idle', function() {
                const center = self.googleMap.getCenter()
                self.googlemaps.lat = center.lat()
                self.googlemaps.lng = center.lng()
                self.googlemaps.zoom = self.googleMap.getZoom()
                self.setUserSettings()
            })

        }

        await init()

        if (self.mapMode == "googlemaps") {
            self.setMapMode("googlemaps")
        }

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
                self.animate()
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

    self.renderMap = function() {

        requestAnimationFrame(function() {

            const zInt = Math.ceil(self.z)
            const mapSize = self.tileSize * Math.pow(2, self.z)
            const mppx = mapSize / self.mapW
            const cX = (self.x + self.zeroX) * mppx
            const cY = (self.zeroY - self.y) * mppx
            const offsetX = self.canvas.width / 2 - cX;
            const offsetY = self.canvas.height / 2 - cY;
            const tileSize = self.tileSize * Math.pow(2, self.z - zInt);

            const [[x0, y0], [x1, y1]] = self.tileSetRanges[self["gta" + self.v].tileSet][zInt]

            const minTx = Math.floor(-offsetX / tileSize)
            const maxTx = Math.ceil((self.canvas.width - offsetX) / tileSize)
            const minTy = Math.floor(-offsetY / tileSize)
            const maxTy = Math.ceil((self.canvas.height - offsetY) / tileSize)

            const overlays = {5: 0, 6: self.tileOverlays}[self.v]

            for (let y = minTy; y <= maxTy; y++) {
                for (let x = minTx; x <= maxTx; x++) {
                    if (x >= x0 && x <= x1 && y >= y0 && y <= y1) {
                        const img = self.tiles[self.v][self.tileSet][overlays][zInt][y][x]
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
                            const tilePath = self.tilePaths[self.v][self.tileSet][overlays][zInt][y][x]
                            img.src = `tiles/${self.v}/${tilePath}/${zInt}/${zInt},${y},${x}.jpg`;
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

        })

    }

    self.setHash = function() {
        const hash = {5: "V", 6: "VI"}[self.v] + "," + [self.targetX, self.targetY, self.targetZ].map(function (v) {
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
        self.api.addLandmark(self.v, [self.x, self.y]).then(function(ret) {
            if (ret.status == "ok") {
                self.clearFindAndFilter()
                let landmark = self.parseLandmark(ret.id, ret.data)
                self.landmarks.push(landmark)
                self.landmarksById[ret.id] = landmark
                self.currentLandmarks.push(landmark)
                self.addMarker(landmark)
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
                // FIXME: can we replace this index dance with
                // something like self.landmarkIndexById?
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
                self.renderMarkers()
                self.updateGooglemapsMarker(landmark)
                self.renderList()
                self.renderStatus()
                self.renderItem()
            } else {
                console.log(ret)
            }
        })
    }

    self.removeLandmark = function() {
        self.api.removeLandmark(self.v, self.l).then(function(ret) {
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

    // Markers /////////////////////////////////////////////////////////////////////////////////////

    self.addMarker = function(landmark) {
        if (!self.markers[landmark.id]) {
            self.markers[landmark.id] = document.createElement("div")
            self.markers[landmark.id].id = "marker_" + landmark.id
            self.markers[landmark.id].className = "marker"
            self.markers[landmark.id].style.backgroundColor = "#" + landmark.color 
            self.markers[landmark.id].title = landmark.title
            self.markersLayer.appendChild(self.markers[landmark.id])
        }
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
        if (!self.googlemapsMarkers[landmark.id] && landmark.rlCoordinates) {
            self.googlemapsMarkers[landmark.id] = self.renderGooglemapsMarker(landmark)
        }
    }

    self.removeGooglemapsMarker = function(id) {
        if (self.googlemapsMarkers[id]) {
            self.googlemapsMarkers[id].map = null
            delete self.googlemapsMarkers[id]
        }
    }

    self.removeGooglemapsMarkers = function() {
        Object.keys(self.googlemapsMarkers).forEach(function(id) {
            self.removeGooglemapsMarker(id)
        })
    }

    self.updateGooglemapsMarker = function(landmark) {
        if (landmark.rlCoordinates) {
            if (self.googlemapsMarkers[landmark.id]) {
                self.googlemapsMarkers[landmark.id].position = {
                    lat: landmark.rlCoordinates[0],
                    lng: landmark.rlCoordinates[1]
                }
                self.googlemapsMarkers[landmark.id].title = landmark.title
                self.googlemapsMarkers[landmark.id].style.backgroundColor = "#" + landmark.color
            } else {
                self.addGooglemapsMarker(landmark)
            }
            self.googlemapsMarkers[landmark.id].content.classList.add("selected")
        } else if (self.googlemapsMarkers[landmark.id]) {
            self.removeGooglemapsMarker(landmark.id)
        }
    }

    self.updateGooglemapsMarkers = function() {
        // not yet present on page load,
        // but gets invoked via onHashchange
        if (!self.googlemapsMarkers) {
            return
        }
        self.landmarks.filter(function(landmark) {
            return !self.currentLandmarks.includes(landmark)
        }).forEach(function(landmark) {
            self.removeGooglemapsMarker(landmark.id)
        })
        self.currentLandmarks.forEach(function(landmark) {
            self.addGooglemapsMarker(landmark)
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
        self.photoDialog.open()
        self.focus = "dialog"
    }

    self.switchPhoto = function() {
        const selected = self.dialogPhoto.src.includes(",ig.jpg") ? "rl" : "ig"
        const index = selected == "ig" ? 1 : 2
        self.dialogPhoto.addEventListener("load", function() {
            self.photoDialog.set({
                title: self.landmarksById[self.l][selected == "ig" ? "igAddress" : "rlAddress"]
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
        self.clearMarkers()
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
        if (["V", "VI"].includes(values[0])) {
            v = values[0]
            values = values.slice(1)
        } else {
            v = {5: "V", 6: "VI"}[self.defaults.v]
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
        v = {"V": 5, "VI": 6}[v]
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
                if (self.sessionId && self.mapMode == "gta" && self.l) {
                    self.editing ? self.stopEditing() : self.startEditing()
                }
            } else if (e.key == "Delete") {
                if (self.sessionId && self.mapMode == "gta" && self.l) {
                    self.removeLandmark(self.l)
                }
            } else if (e.key == "f") {
                e.preventDefault()
                self.findElement.focus()
                self.findElement.select()
            } else if (e.key == "F") {
                if (self.find) {
                    self.clearFindButton.element.dispatchEvent(new Event("mousedown", {bubbles: true}))
                }
            } else if (e.key == "g") {
                self.setMapMode(self.mapMode == "gta" ? "googlemaps" : "gta")
            } else if (e.key == "G") {
                const mapTypes = self.defaults.googlemaps.mapTypes
                self.setMapType(mapTypes[(mapTypes.indexOf(self.googlemaps.mapType) + 1) % mapTypes.length])
            } else if (e.key == "h") {
                self.toggleUI()
            } else if (e.key == "t") {
                const key = `gta${self.v}`
                const tileSets = self.defaults[key].tileSets
                self.tileSet = tileSets[(tileSets.indexOf(self.tileSet) + 1) % tileSets.length]
                self.setUserSettings()
                self.renderMap()
            } else if (e.key == "T") {
                self.tileOverlays = 1 - self.tileOverlays
                self.setUserSettings()
                if (self.v == 6) {
                    self.renderMap()
                }
            } else if (e.key == "v") {
                self.setGameVersion(self.v == 5 ? 6 : 5) 
            } else if (e.key == ".") {
                self.aboutDialog.open()
                self.focus = "dialog"
            } else if (e.key == ",") {
                self.settingsDialog.open()
                self.focus = "dialog"
            } else if (e.key == "Escape" && self.mapMode == "googlemaps" && self.googleMap.getStreetView().getVisible()) {
                self.googleMap.getStreetView().setVisible(false)
                return
            }
        }

        if (self.focus == "map") {

            if ("0123456".includes(e.key)) {
                self.setTarget(self.targetX, self.targetY, parseInt(e.key))
            } else if ([
                "-", "=", "ArrowDown", "ArrowLeft", "ArrowRight", "ArrowUp"
            ].includes(e.key)) {
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
                if (e.key == ",") {
                    self.aboutDialog.close()
                    self.settingsDialog.open()
                } else if (e.key == "Escape") {
                    self.aboutDialog.close()
                    self.focus = "list"
                }
            } else if (document.getElementById("settingsDialog")) {
                if (e.key == ".") {
                    self.settingsDialog.close()
                    self.aboutDialog.open()
                } else if (e.key == "Escape") {
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
        self.dialogLayer.element.classList.remove("clicked")
        if (self.keydownTimeout) {
            clearTimeout(self.keydownTimeout)
            self.keydownTimeout = null
        }
    }

    self.onMousedown = function(e) {
        self.focus = "map"
        if (e.target.classList.contains("marker")) {
            const id = e.target.id.replace("marker_", "")
            const isSelected = e.target.classList.contains("selected")
            if (isSelected && e.metaKey) {
                setTimeout(function() { // allow for blur
                    self.setLandmark(null)
                })
            } else if (!isSelected) {
                setTimeout(function() { // allow for blur
                    self.setLandmark(id)
                })
            } else if (isSelected && self.editing) {
                e.stopPropagation()
                self.isDraggingMarker = true
                let marker = e.target.closest(".marker");
                const startCoordinates = self.landmarksById[id].igCoordinates
                let coordinates = startCoordinates
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
                        startCoordinates[0] + dx * mppx,
                        startCoordinates[1] - dy * mppx
                    ]
                    // make sure we can zoom while dragging
                    self.landmarksById[id].igCoordinates = coordinates
                    self.itemIgCoordinatesLink.innerHTML = self.formatCoordinates("ig", coordinates)
                }
                function onMouseup(e) {
                    self.isDraggingMarker = false
                    document.removeEventListener("mousemove", onMousemove)
                    document.removeEventListener("mouseup", onMouseup)
                    self.editLandmark(self.l, "ig_coordinates", coordinates)
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
                // FIXME: change this to right-click only
                // navigator.clipboard.writeText(Math.round(x) + "," + Math.round(y))
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
        self.canvas.width = window.innerWidth
        self.canvas.height = window.innerHeight
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
                    self.stopEditing()
                } : function() {
                    self.startEditing()
                },
                text: self.editing ? "DONE" : "EDIT",
                title: self.editing ? "": "E"
            })

            self.itemId.innerHTML = landmark.id

            self.itemBody.classList[self.editing ? "add" : "remove"]("editing")
            self.itemBody.style.borderRightColor = "#" + landmark.color

            self.itemIgAddress.innerHTML = landmark.igAddress || "?"
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
            self.itemIgCoordinatesLink.innerHTML = self.formatCoordinates("ig", landmark.igCoordinates)
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
                button.id = "editIgCoordinatesButton"
                button.innerHTML = landmark.igCoordinates ? "REMOVE" : "ADD"
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

            self.itemRlAddress.innerHTML = landmark.rlAddress || "?"
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
            self.itemRlCoordinatesLink.innerHTML = self.formatCoordinates("rl", landmark.rlCoordinates)
            if (landmark.rlCoordinates) {
                self.itemRlCoordinatesLink.classList.add("link")
                self.itemRlCoordinatesLink.addEventListener("mousedown", function() {
                    if (self.mapMode == "gta") {
                        self.setMapMode("googlemaps")
                    }
                    const panorama = self.googleMap.getStreetView()
                    if (panorama.getVisible()) {
                        panorama.setVisible(false)
                    }
                    self.googleMap.setZoom(16)
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
                    self.itemTags.innerHTML = "TAGS: "
                    landmark.tags.forEach(function(tag, i) {
                        let span = document.createElement("span")
                        span.classList.add("link")
                        span.innerHTML = tag
                        span.addEventListener("click", function() {
                            self.findElement.value = tag.toUpperCase()
                            self.findElement.dispatchEvent(new Event("input", {bubbles: true}))
                            self.findElement.dispatchEvent(new Event("change", {bubbles: true}))
                        })
                        self.itemTags.appendChild(span)
                        if (i < landmark.tags.length - 1) {
                            span = document.createElement("span")
                            span.innerHTML = ", "
                            self.itemTags.appendChild(span)
                        }
                    })
                } else {
                    self.itemTags.innerHTML = "TAGS: NONE"
                }
                self.itemTags.removeAttribute("contenteditable")
                self.itemTags.removeEventListener("paste", self.onPaste)
                self.itemTags.removeEventListener("blur", self.onBlur)
            } else {
                self.itemTags.innerHTML = landmark.tags.join(", ")
                self.itemTags.contentEditable = "true"
                self.itemTags.addEventListener("paste", self.onPaste)
                self.itemTags.addEventListener("blur", self.onBlur)
            } 

            self.itemStatusElement.innerHTML = "LAST EDITED: " + self.formatDate(landmark.edited[0])
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
            igElement.innerHTML = self.sort.includes("Address") ? (landmark.igAddress || "?")
                    : (landmark.igAddress || "?") + " &nbsp;|&nbsp; " + (landmark.rlAddress || "?")
            itemElement.appendChild(igElement)
            const rlElement = document.createElement("div")
            rlElement.className = "rl"
            rlElement.innerHTML = self.sort.includes("Address") ? (landmark.rlAddress || "?")
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
        self.listStatusElement.innerHTML = self.currentLandmarks.length + " LANDMARK" + (
            self.currentLandmarks.length == 1 ? "" : "S"
        )
    }

    // Setters /////////////////////////////////////////////////////////////////////////////////////

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
            document.title = "GTA " + {5: "V", 6: "VI"}[self.v] + " Landmarks Map"
            self.updateGameIcon()
            self.initMarkers()
            self.renderMarkers()
            self.initGooglemapsMarkers()
            self.renderMap()
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
            if (self.editing) {
                self.stopEditing()
            }
        }
        self.updateRemoveItemButton()
    }

    self.setMapType = function(mapType) {
        self.googlemaps.mapType = mapType
        self.setUserSettings()
        self.googleMap.setOptions({
            mapTypeId: google.maps.MapTypeId[self.googlemaps.mapType.toUpperCase()]
        })
    }

    self.setTheme = function() {
        document.body.classList.remove(self.theme == "light" ? "dark" : "light")
        document.body.classList.add(self.theme)
    }

    self.startEditing = function() {
        self.editing = true
        document.body.classList.add("editing")
        self.renderItem()
    }

    self.stopEditing = function() {
        self.editing = false
        document.body.classList.remove("editing")
        self.renderItem()
    }

    self.toggleUI = function() {
        self.ui = !self.ui
        if (!self.ui) {
            self.focus = "map"
        }
        if (self.l) {
            self.itemPanel.style.display = self.ui ? "block" : "none"
        }
        document.body.classList[self.ui ? "remove" : "add"]("hidden")
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
        self.userIcon.innerHTML = self.username[0]
        self.userIcon.title = self.sessionId ? self.username : ""
    }

    self.updateGameIcon = function() {
        self.gameIcon.style.backgroundColor = self.gameColors[self.v]
        self.gameIcon.innerHTML = {5: "V", 6: "VI"}[self.v]
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
        self.canvas.className = self.tileSet.split(",")[0]
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
        checked = {}
        checked.v = self.vs.includes(v.v) ? v.v : self.defaults.v
        ;["gta5", "gta6"].forEach(function(gta) { // fixme: loop over self.vs
            let key = gta[gta.length - 1]
            checked[gta] = {
                x: isNaN(v[gta].x) ? 0 : self.clamp(v[gta].x, self.minX, self.maxX),
                y: isNaN(v[gta].y) ? 0 : self.clamp(v[gta].y, self.minY, self.maxY),
                z: isNaN(v[gta].z) ? 0 : self.clamp(v[gta].z, self.minZ, self.maxZ),
                l: v.l, // FIXME: v[gta].l in self.landmarksData[key] ? v[gta].l : self.defaults[gta].l,
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
            mapType: self.googlemaps.mapTypes.includes(v.mapType) ? v.googlemaps.mapType : self.defaults.googlemaps.mapType,
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

    self.getMppx = function(z=self.z) {
        return self.mapW / (1024 * Math.pow(2, z))
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
        if (self.landmarksById[id].rlCoordinates) {
            const [lat, lng] = self.landmarksById[id].rlCoordinates
            self.googleMap.panTo({lat: lat, lng: lng})
        }
    }

    that._debug = function() {
        return self
    }

    return self.init()

}

gtadb.map = gtadb.Map()