var gtadb = window.gtadb || {}
window.gtadb = gtadb

gtadb.Guess = function() {

    if (!(this instanceof gtadb.Guess)) {
        return new gtadb.Guess()
    }

    let that = this
    let self = {
        game: "G0",
        v: 6,
        minX: -16000,
        maxX: 4000,
        minY: -8000,
        maxY: 12000,
        minZ: 0,
        maxZ: 6,
        x: null,
        y: null,
        z: null,
        screenshotId: null,
        targetX: 0,
        targetY: 0,
        targetZ: 0,
        isAnimating: false,
        screenshots: [],
        screenshotsById: {},
        screenshotsIndexById: {},
        currentScreenshots: [],
        currentScreenshotsIndexById: {},
        editing: false,
        focus: "map",
        defaults: {
            gta6: {
                x: -4000,
                y: 2000,
                z: 1,
                screenshotId: null,
                tileSet: "yanis,11",
            },
            guesses: {},
        },
    }
    Object.entries(self.defaults).forEach(function([key, value]) {
        self[key] = value
    })

    // Init ////////////////////////////////////////////////////////////////////////////////////////

    self.init = function() {

        self.getUserSettings()

        self.maps = gtadb.Maps({
            editing: self.editing,
            focused: self.focus == "map",
            gta6: self.gta6,
            mapMode: "gta",
            parentElement: document.body,
            selected: self.screenshotId,
            v: self.v,
            x: self.targetX,
            y: self.targetY,
            z: self.targetZ,
        })

        self.maps.addEventListener("select", function(e) {
            const id = e.detail.id
            self.screenshotId = id
            self.selectScreenshot(id)
            self.setHash()
        })
        self.maps.addEventListener("edit", function(e) {
            self.updateScreenshot(e.detail.id, e.detail.igCoordinates)
        })
        self.maps.addEventListener("mapchange", function() {
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
            self.setUserSettings()
            self.setHash()
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

        self.tileSet = self.defaults.gta6.tileSet
        self.loadJSON([`data/${self.game}/screenshots.json`]).then(function([screenshots]) {
            self.screenshotsData = screenshots
            document.body.classList.add("light")
            self.initUI(self.screenshotsData)
            self.maps.set({
                currentLandmarks: self.currentScreenshots,
                focused: self.focus == "map",
                gta6: self.gta6,
                landmarks: self.screenshots,
                selected: self.screenshotId,
                tileSet: self.tileSet,
                v: self.v,
                x: self.targetX,
                y: self.targetY,
                z: self.targetZ,
            })
            self.onHashchange()
        })

        return that

    }

    self.initMarkers = function() {
        self.maps.set({
            landmarks: self.screenshots,
            currentLandmarks: self.currentScreenshots,
            selected: self.screenshotId,
        })
    }

    self.initUI = function(screenshots) {

        self.parseScreenshots(screenshots)
        self.initMarkers()

        self.listPanel = document.createElement("div")
        self.listPanel.className = "mapPanel"
        self.listPanel.id = "listPanel"
        self.listPanel.addEventListener("mousedown", function(e) {
            setTimeout(function() {
                self.setFocus("list")
                const element = e.target.closest(".item")
                if (element) {
                    const id = element.dataset.id
                    if (e.metaKey && element.classList.contains("selected")) {
                        self.setScreenshot(null)
                    } else {
                        self.setScreenshot(id, true)
                    }
                }
            })
        })
        self.maps.element.appendChild(self.listPanel)

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

        self.aboutButton = gtadb.Button({
            click: function() {
                self.aboutDialog.open()
                self.setFocus("dialog")
            },
            text: "ABOUT",
            tooltip: "."
        })

        self.titleBar = gtadb.Bar({
            buttons: [self.aboutButton],
            element: self.titleElement,
        })
        self.titleBar.element.id = "titleBar"
        self.listPanel.appendChild(self.titleBar.element)

        self.listBody = document.createElement("div")
        self.listBody.id = "listBody"
        self.listPanel.appendChild(self.listBody)

        self.listStatusElement = document.createElement("div")

        self.submitButton = gtadb.Button({
            click: function() {
                self.openSubmitDialog()
                self.setFocus("dialog")
            },
            disabled: true,
            text: "SUBMIT",
        })

        self.listStatusBar = gtadb.Bar({
            border: "top",
            buttons: [self.submitButton],
            element: self.listStatusElement
        })
        self.listStatusBar.element.id = "listStatusBar"
        self.listPanel.appendChild(self.listStatusBar.element)

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

        self.closeItemButton = gtadb.Button({
            click: function() {
                self.setScreenshot(null)
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

        self.itemImage = document.createElement("div")
        self.itemImage.id = "itemImage"
        self.itemImage.className = "photo"
        self.itemBody.appendChild(self.itemImage)

        self.itemCoordinates = document.createElement("div")
        self.itemCoordinates.id = "itemCoordinates"
        self.itemCoordinates.className = "coordinates"
        self.itemBody.appendChild(self.itemCoordinates)

        self.itemStatusElement = document.createElement("div")
        self.itemStatusElement.id = "itemStatusElement"

        self.itemStatusBar = gtadb.Bar({
            border: "top",
            element: self.itemStatusElement
        })
        self.itemStatusBar.element.id = "itemStatusBar"
        self.itemPanel.appendChild(self.itemStatusBar.element)

        self.dialogLayer = gtadb.DialogLayer()
        self.dialogLayer.element.id = "dialogLayer"
        self.maps.element.appendChild(self.dialogLayer.element)

        self.aboutElement = document.createElement("div")
        self.aboutElement.style.margin = "8px"
        self.aboutElement.innerHTML = `<p><b>gta6guessr preview</b></p>
            <p>The goal of this game is to guess the correct camera coordinates of 25 GTA VI screenshots.
            <p>You don't need to make an account &mdash; your guesses are stored locally in your web browser.
            Once you have placed all 25 markers, click submit, head over to the GTA VI Mapping Discord, and paste your guesses in the gta6guessr thread.
            You can still edit them later.</p>
            <p>The game runs until the release of Trailer 3, and the winner will be determined a week after the launch of the game.
            The player with the lowest total distance wins.</p>`

        self.keyboardShortcutsElement = document.createElement("div")
        self.keyboardShortcutsElement.style.margin = "8px"
        self.keyboardShortcutsElement.innerHTML = `<table>
            <tr><td>← → ↑ ↓</td><td>Pan map</td></tr>
            <tr><td>&ndash;</td><td>Zoom out</td></tr>
            <tr><td>=</td><td>Zoom in</td></tr>
            <tr><td>0 1 2 3 4 5 6</td><td>Set zoom level</td></tr>
            <tr><td>↑ ↓</td><td>Select previous / next list item</td></tr>
            <tr><td>← →</td><td>Select first / last list item</td></tr>
            <tr><td>.</td><td>Open About dialog</td></tr>
            <tr><td>E</td><td>Edit screenshot</td></tr>
            <tr><td>ESC</td><td>Deselect screenshot / close dialog</td></tr>
            <tr><td>CMD+CLICK</td><td>Deselect selected marker / list item</td></tr>
            </table>`

        self.aboutPanel = gtadb.Panel({
            height: 384,
            elements: {
                "About": self.aboutElement,
                "Keyboard Shortcuts": self.keyboardShortcutsElement,
            },
            width: 640
        })

        self.aboutDialog = gtadb.Dialog({
            onClose: function() {
                self.setFocus("list")
            },
            content: self.aboutPanel.element,
            height: 416,
            layer: self.dialogLayer,
            title: "gta6guessr",
            width: 640
        })
        self.aboutDialog.element.id = "aboutDialog"

        self.submitDialogContent = document.createElement("div")
        self.submitDialogContent.id = "submitDialogContent"

        self.submitDialog = gtadb.Dialog({
            onClose: function() {
                self.setFocus("list")
            },
            content: self.submitDialogContent,
            height: 416,
            layer: self.dialogLayer,
            title: "Submit",
            width: 640
        })
        self.submitDialog.element.id = "submitDialog"

        self.dialogPhoto = document.createElement("img")
        self.dialogPhoto.id = "dialogPhoto"
        self.photoDialog = gtadb.Dialog({
            onClose: function() {
                self.setFocus("list")
            },
            content: self.dialogPhoto,
            layer: self.dialogLayer,
            title: ""
        })
        self.photoDialog.element.id = "photoDialog"

        self.renderList()
        self.renderStatus()

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
            currentLandmarks: self.currentScreenshots,
            selected: self.screenshotId,
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
        const hash = "VI," + [self.targetX, self.targetY, self.targetZ].map(function(value) {
            return value.toFixed(3)
        }).join(",") + (
            self.screenshotId
                ? "," + self.screenshotId
                : ""
        )
        if (window.location.hash.slice(1) != hash) {
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

    // Screenshots /////////////////////////////////////////////////////////////////////////////////

    self.parseScreenshot = function(item) {
        const [idx, id, color] = item
        const guess = self.guesses[id] || self.guesses[idx] || {}
        const image = `screenshots/${self.game}/${idx}_${id.replace("/", "_")}.jpg`
        return {
            idx: idx,
            id: id,
            color: color,
            title: id,
            image: image,
            igCoordinates: Array.isArray(guess.igCoordinates) && guess.igCoordinates.length ? guess.igCoordinates.map(function(value) {
                return Math.round(value)
            }) : null,
            edited: guess.edited || null,
        }
    }

    self.parseScreenshots = function(screenshots) {
        self.screenshots = screenshots.map(function(item) {
            return self.parseScreenshot(item)
        })
        self.screenshotsById = {}
        self.screenshotsIndexById = {}
        self.screenshots.forEach(function(screenshot, index) {
            self.screenshotsById[screenshot.id] = screenshot
            self.screenshotsIndexById[screenshot.id] = index
        })
        self.currentScreenshots = self.screenshots.slice()
        self.currentScreenshotsIndexById = self.currentScreenshots.reduce(function(a, screenshot, index) {
            a[screenshot.id] = index
            return a
        }, {})
    }

    self.updateScreenshot = function(id, igCoordinates) {
        const index = self.screenshotsIndexById[id]
        if (index === void 0) {
            return
        }
        if (igCoordinates) {
            igCoordinates = igCoordinates.map(function(value) {
                return Math.round(value)
            })
        }
        const screenshot = self.screenshots[index]
        const edited = Math.floor(Date.now() / 1000)
        const updated = {
            ...screenshot,
            igCoordinates: igCoordinates,
            edited: edited,
        }
        self.screenshots[index] = updated
        self.screenshotsById[updated.id] = updated
        const currentIndex = self.currentScreenshotsIndexById[id]
        if (currentIndex !== void 0) {
            self.currentScreenshots[currentIndex] = updated
        }
        if (igCoordinates) {
            self.guesses[id] = {
                igCoordinates: igCoordinates,
                edited: edited,
            }
        } else {
            self.guesses[id] = {
                edited: edited,
            }
        }
        self.setUserSettings()
        self.maps.set({
            landmarks: self.screenshots,
            currentLandmarks: self.currentScreenshots,
            selected: self.screenshotId,
        })
        self.renderList()
        self.renderStatus()
        self.renderItem()
    }

    self.getItemDomId = function(id) {
        return "item_" + id.replace(/\//g, "-")
    }

    self.selectScreenshot = function(id) {
        self.screenshotId = id
        self.setUserSettings()
        document.querySelectorAll(".marker.selected").forEach(function(element) {
            element.classList.remove("selected")
        })
        let element = document.querySelector(".item.selected")
        if (element) {
            element.classList.remove("selected")
        }
        if (self.screenshotId) {
            element = document.querySelector("#" + self.getItemDomId(self.screenshotId))
            if (element) {
                element.classList.add("selected")
                const top = 64
                const bottom = window.innerHeight - 64
                const y = element.getBoundingClientRect().y
                if (y < top) {
                    self.listBody.scrollTo(0, self.listBody.scrollTop + y - top)
                } else if (y > bottom) {
                    self.listBody.scrollTo(0, self.listBody.scrollTop + y - bottom)
                }
            }
        }
        self.renderItem()
        self.maps.set({
            editing: self.editing,
            selected: self.screenshotId,
        })
    }

    self.setScreenshot = function(id, pan) {
        if (id != self.screenshotId && self.editing) {
            self.stopEditing()
        }
        self.screenshotId = id
        if (pan && id) {
            const screenshot = self.screenshotsById[id]
            if (screenshot && screenshot.igCoordinates) {
                self.targetX = screenshot.igCoordinates[0]
                self.targetY = screenshot.igCoordinates[1]
                self.targetZ = self.z
            }
        }
        self.setHash()
        self.selectScreenshot(id)
    }

    // Photo Dialog ////////////////////////////////////////////////////////////////////////////////

    self.openPhotoDialog = function(screenshot) {
        self.dialogPhoto.src = screenshot.image
        self.dialogPhoto.addEventListener("load", function onLoad() {
            self.dialogPhoto.removeEventListener("load", onLoad)
            self.resizePhotoDialog()
        })
        self.photoDialog.set({
            title: screenshot.id
        })
        self.photoDialog.open()
        self.setFocus("dialog")
    }

    self.resizePhotoDialog = function() {
        if (!self.dialogPhoto.naturalWidth || !self.dialogPhoto.naturalHeight) {
            return
        }
        const margin = 64
        const maxWidth = window.innerWidth - margin
        const maxHeight = window.innerHeight - margin - 32
        const ratio = self.dialogPhoto.naturalWidth / self.dialogPhoto.naturalHeight
        let width = maxWidth
        let height = width / ratio
        if (height > maxHeight) {
            height = maxHeight
            width = height * ratio
        }
        self.photoDialog.set({
            height: height + 32,
            width: width
        })
        self.dialogPhoto.style.width = width + "px"
        self.dialogPhoto.style.height = height + "px"
    }

    // Submit Dialog ///////////////////////////////////////////////////////////////////////////////

    self.getSubmissionData = function() {
        let guesses = {}
        self.screenshots.forEach(function(screenshot) {
            if (screenshot.igCoordinates) {
                guesses[screenshot.id] = screenshot.igCoordinates.map(function(value) {
                    return parseInt(value)
                })
            }
        })
        return guesses
    }

    self.formatSubmissionData = function(data) {
        const entries = Object.entries(data)
        if (!entries.length) {
            return "{}"
        }
        return "```{\n" + entries.map(function([id, coordinates]) {
            return "    " + JSON.stringify(id) + ": " + JSON.stringify(coordinates)
        }).join(",\n") + "\n}```"
    }

    self.openSubmitDialog = function() {
        self.submitDialogContent.innerHTML = ""
        const textarea = document.createElement("textarea")
        textarea.id = "submitTextarea"
        textarea.value = self.formatSubmissionData(self.getSubmissionData())
        self.submitDialogContent.appendChild(textarea)
        setTimeout(function() {
            textarea.focus()
            textarea.select()
        })
        self.submitDialog.open()
    }

    // Event Handlers //////////////////////////////////////////////////////////////////////////////

    self.onHashchange = function() {
        const previousScreenshotId = self.screenshotId
        let values = window.location.hash.slice(1).split(",")
        if (values[0] == "VI") {
            values = values.slice(1)
        }
        let screenshotId = null
        let hadInvalidScreenshotId = false
        if (values.length && isNaN(values[values.length - 1])) {
            const last = values[values.length - 1]
            if (self.screenshotsById[last]) {
                screenshotId = last
                values = values.slice(0, -1)
            } else {
                hadInvalidScreenshotId = true
                values = values.slice(0, -1)
            }
        }
        values = values.map(parseFloat)
        if (values.length == 0) {
            values = [self.x, self.y, self.z]
        } else if (values.length == 1) {
            values = [self.x, self.y, values[0]]
        } else if (values.length == 2) {
            values = [values[0], values[1], self.z]
        }
        const hash = "VI," + values.map(function(value, i) {
            const current = [self.x, self.y, self.z][i]
            const minValue = [self.minX, self.minY, self.minZ][i]
            const maxValue = [self.maxX, self.maxY, self.maxZ][i]
            value = isNaN(value) ? current : self.clamp(value, minValue, maxValue)
            return value.toFixed(3)
        }).join(",") + (
            screenshotId
                ? "," + screenshotId
                : ""
        )
        if (hash != window.location.hash.substr(1)) {
            if (hadInvalidScreenshotId && self.screenshotId !== null) {
                self.screenshotId = null
                self.selectScreenshot(null)
            }
            window.location.hash = hash
            return
        }
        ;[self.targetX, self.targetY, self.targetZ] = values
        self.screenshotId = screenshotId
        if (self.screenshotId != previousScreenshotId) {
            self.selectScreenshot(self.screenshotId)
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
        if (activeElement.matches("input, textarea, [contenteditable]")) {
            return
        }

        if (self.focus != "dialog") {
            if (e.key == "e") {
                if (self.screenshotId) {
                    self.editing ? self.stopEditing() : self.startEditing()
                }
            } else if (e.key == ".") {
                self.aboutDialog.open()
                self.setFocus("dialog")
            }
        }

        if (self.focus == "list") {
            if (self.screenshotId === null) {
                return
            }
            if (["ArrowDown", "ArrowLeft", "ArrowRight", "ArrowUp"].includes(e.key)) {
                e.preventDefault()
                const index = self.currentScreenshotsIndexById[self.screenshotId]
                let id = self.screenshotId
                if (e.key == "ArrowDown") {
                    if (index < self.currentScreenshots.length - 1) {
                        id = self.currentScreenshots[index + 1].id
                        self.setScreenshot(id, true)
                    }
                } else if (e.key == "ArrowLeft") {
                    if (index > 0) {
                        id = self.currentScreenshots[0].id
                        self.setScreenshot(id, true)
                    }
                } else if (e.key == "ArrowRight") {
                    if (index < self.currentScreenshots.length - 1) {
                        id = self.currentScreenshots[self.currentScreenshots.length - 1].id
                        self.setScreenshot(id, true)
                    }
                } else if (e.key == "ArrowUp") {
                    if (index > 0) {
                        id = self.currentScreenshots[index - 1].id
                        self.setScreenshot(id, true)
                    }
                }
            } else if (e.key == "Escape" && self.screenshotId) {
                self.setScreenshot(null)
            }
        } else if (self.focus == "dialog") {
            if (document.getElementById("aboutDialog")) {
                if (e.key == "Escape") {
                    self.aboutDialog.close()
                    self.setFocus("list")
                }
            } else if (document.getElementById("submitDialog")) {
                if (e.key == "Escape") {
                    self.submitDialog.close()
                    self.setFocus("list")
                }
            } else if (document.getElementById("photoDialog")) {
                if (e.key == "Escape") {
                    self.photoDialog.close()
                    self.setFocus("list")
                }
            }

            if ("0123456.".includes(e.key)) {
                self.dialogLayer.element.classList.add("clicked")
            }
        }
    }

    self.onKeyup = function() {
        if (self.dialogLayer) {
            self.dialogLayer.element.classList.remove("clicked")
        }
    }

    // Render //////////////////////////////////////////////////////////////////////////////////////

    self.renderItem = function() {

        if (!self.screenshotId) {
            self.itemPanel.style.display = "none"
            return
        }

        const screenshot = self.screenshotsById[self.screenshotId]

        self.editItemButton.set({
            click: self.editing ? function() {
                self.stopEditing()
            } : function() {
                self.startEditing()
            },
            text: self.editing ? "DONE" : "EDIT",
            tooltip: self.editing ? "" : "E"
        })

        self.itemId.innerText = screenshot.id
        self.itemBody.classList[self.editing ? "add" : "remove"]("editing")
        self.itemBody.style.borderRightColor = "#" + screenshot.color

        self.itemImage.innerHTML = ""
        const img = document.createElement("img")
        img.src = screenshot.image
        img.alt = screenshot.id
        img.addEventListener("click", function() {
            self.openPhotoDialog(screenshot)
        })
        self.itemImage.appendChild(img)

        self.itemCoordinates.innerHTML = ""
        const coordinatesLink = document.createElement("span")
        coordinatesLink.innerText = self.formatCoordinates("ig", screenshot.igCoordinates)
        if (screenshot.igCoordinates) {
            coordinatesLink.classList.add("link")
            coordinatesLink.addEventListener("mousedown", function() {
                self.setTarget(
                    screenshot.igCoordinates[0],
                    screenshot.igCoordinates[1],
                    5
                )
            })
        }
        self.itemCoordinates.appendChild(coordinatesLink)
        if (self.editing) {
            let button = document.createElement("span")
            button.id = "editIgCoordinatesButton"
            button.innerText = screenshot.igCoordinates ? "REMOVE" : "ADD"
            button.addEventListener("click", function() {
                self.updateScreenshot(self.screenshotId, screenshot.igCoordinates ? null : [self.x, self.y])
            })
            self.itemCoordinates.appendChild(button)
        }

        self.itemStatusElement.innerText = screenshot.edited
            ? "LAST EDITED: " + self.formatDate(screenshot.edited)
            : "NOT EDITED"
        self.itemPanel.style.display = "block"

    }

    self.renderList = function() {
        self.listBody.innerHTML = ""
        self.currentScreenshots.forEach(function(screenshot) {
            const itemElement = document.createElement("div")
            itemElement.classList.add("item")
            if (screenshot.id == self.screenshotId) {
                itemElement.classList.add("selected")
            }
            itemElement.dataset.id = screenshot.id
            itemElement.id = self.getItemDomId(screenshot.id)
            itemElement.style.borderLeftColor = "#" + screenshot.color

            const titleElement = document.createElement("div")
            titleElement.className = "ig"
            titleElement.innerText = screenshot.id
            itemElement.appendChild(titleElement)

            const bylineElement = document.createElement("div")
            bylineElement.className = "rl"
            bylineElement.innerText = self.formatCoordinates("ig", screenshot.igCoordinates)
            itemElement.appendChild(bylineElement)

            self.listBody.appendChild(itemElement)
        })
    }

    self.renderStatus = function() {
        const guessed = self.screenshots.filter(function(screenshot) {
            return !!screenshot.igCoordinates
        }).length
        self.listStatusElement.innerText = guessed + "/" + self.screenshots.length + " SCREENSHOTS"
        self.submitButton.set({
            disabled: guessed < self.screenshots.length
        })
    }

    self.setFocus = function(focus) {
        self.focus = focus
        if (self.maps) {
            self.maps.set({
                editing: self.editing,
                focused: self.focus == "map",
            })
        }
    }

    self.startEditing = function() {
        self.editing = true
        document.body.classList.add("editing")
        self.maps.set({
            editing: true,
        })
        self.renderItem()
    }

    self.stopEditing = function() {
        self.editing = false
        document.body.classList.remove("editing")
        self.maps.set({
            editing: false,
        })
        self.renderItem()
    }

    // User ////////////////////////////////////////////////////////////////////////////////////////

    self.getUserSettings = function() {
        const data = localStorage.getItem("guess.gtadb.org")
        const user = data ? self.checkUserSettings(JSON.parse(data).user) : self.defaults
        Object.entries(user).forEach(function([key, value]) {
            self[key] = value
        })
        Object.entries(user.gta6).forEach(function([key, value]) {
            self[key] = value
        })
        self.targetX = self.x
        self.targetY = self.y
        self.targetZ = self.z
    }

    self.setUserSettings = function() {
        self.gta6 = {
            x: self.x,
            y: self.y,
            z: self.z,
            screenshotId: self.screenshotId
        }
        localStorage.setItem("guess.gtadb.org", JSON.stringify({
            user: {
                gta6: self.gta6,
                guesses: {
                    [self.game]: self.guesses,
                },
            }
        }))
    }

    self.checkUserSettings = function(v) {
        if (!("gta6" in v)) {
            v.gta6 = {}
        }
        if (!("guesses" in v) || typeof v.guesses != "object" || v.guesses === null) {
            v.guesses = {}
        }
        const guesses = self.getGuesses(v.guesses)
        return {
            gta6: {
                x: isNaN(v.gta6.x) ? self.defaults.gta6.x : self.clamp(v.gta6.x, self.minX, self.maxX),
                y: isNaN(v.gta6.y) ? self.defaults.gta6.y : self.clamp(v.gta6.y, self.minY, self.maxY),
                z: isNaN(v.gta6.z) ? self.defaults.gta6.z : self.clamp(v.gta6.z, self.minZ, self.maxZ),
                screenshotId: v.gta6.screenshotId || null,
                tileSet: self.defaults.gta6.tileSet
            },
            guesses: guesses,
        }
    }

    // Utilities ///////////////////////////////////////////////////////////////////////////////////

    self.clamp = function(n, min, max) {
        return Math.min(Math.max(n, min), max)
    }

    self.getGuesses = function(guesses) {
        if (!guesses || typeof guesses != "object") {
            return {}
        }
        if (typeof guesses[self.game] == "object" && guesses[self.game] !== null) {
            return guesses[self.game]
        }
        return guesses
    }

    self.formatCoordinates = function(key, coordinates) {
        return coordinates ? coordinates.map(function(value) {
            return value.toFixed(key == "ig" ? 0 : 7)
        }).join(",") : "?"
    }

    self.formatDate = function(timestamp) {
        return new Date(timestamp * 1000).toLocaleString("sv-SE", {hour12: false})
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

    that._debug = function() {
        return self
    }

    return self.init()

}

gtadb.guess = gtadb.Guess()
