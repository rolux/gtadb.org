var gtadb = window.gtadb || {}
window.gtadb = gtadb

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
            disabled: false,
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
    that.element.innerText = self.options.text
    self.onClick = function(e) {
        if (self.options.disabled || !self.options.click) {
            return
        }
        self.options.click(e)
    }
    self.onMousedown = function(e) {
        if (self.options.disabled || !self.options.mousedown) {
            return
        }
        self.options.mousedown(e)
    }
    that.element.addEventListener("click", self.onClick)
    that.element.addEventListener("mousedown", self.onMousedown)
    that.element.classList.toggle("disabled", self.options.disabled)
    that.set = function(options) {
        if ("click" in options) {
            self.options.click = options.click
        }
        if ("mousedown" in options) {
            self.options.mousedown = options.mousedown
        }
        if ("disabled" in options) {
            self.options.disabled = options.disabled
            that.element.classList.toggle("disabled", self.options.disabled)
        }
        if ("text" in options) {
            that.element.innerText = options.text
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
            onClose: function() {},
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
    self.titleElement.innerText = self.options.title
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
        self.options.onClose()
    }
    that.set = function(options) {
        if ("content" in options) {
            self.content.innerHTML = ""
            self.content.appendChild(options.content)
        }
        if ("title" in options) {
            self.titleElement.innerText = options.title
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
    self.button.innerText = self.options.buttonText
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
        self.message.innerText = text
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
    self.input.style.width = self.options.width - 8 + "px"
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
            self.options.image.style.width = self.upload.style.width
            self.options.image.style.height = self.upload.style.height
            self.upload.appendChild(self.options.image)
        }
        if (self.options.removeButton) {
            self.removeButton = document.createElement("div")
            self.removeButton.classList.add("removeButton")
            self.removeButton.innerText = "remove"
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
        self.input.addEventListener("change", function() {
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
                self.removeButton.innerText = "REMOVE"
                self.upload.appendChild(self.removeButton)
            } else if (self.removeButton) {
                self.removeButton.remove()
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
        if (!file || !file.type.startsWith("image/")) {
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
            menuItem.innerText = title
            ;(function(i) {
                menuItem.addEventListener("click", function() {
                    that.set({selected: i})
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
