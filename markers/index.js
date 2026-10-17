/* GTA Markers: collections and images stay in this browser. No account or write API. */
(() => {
    "use strict";

    const $ = id => document.getElementById(id);
    const GAMES = {4: "IV", 5: "V", 6: "VI"};
    const TILES = {
        4: {original: "Original", elevation: "Elevation"},
        5: {satellite: "Satellite", hybrid: "Hybrid", terrain: "Terrain", roadmap: "Roadmap", radar: "Radar"},
        6: {"yanis,17": "Yanis v17", "cyber,1": "Cyber", "yanis,15": "Yanis v15", "dupzor,51": "DupZor"}
    };
    const DEFAULTS = {4: {x: 0, y: 0, z: 1}, 5: {x: -4000, y: 2000, z: 1}, 6: {x: -4000, y: 2000, z: 1}};
    const nextId = records => {
        const used = new Set(records.map(record => record.id));
        let id = 1;
        while (used.has(id)) id++;
        return id;
    };
    const hasCoordinates = item => Array.isArray(item.coordinates) && item.coordinates.length === 2 && item.coordinates.every(Number.isFinite);
    const now = () => Math.floor(Date.now() / 1000);
    const imagePath = item => `images/${item.game}/M${item.id}.jpg`;
    const emptyText = value => { const text = value.trim(); return text === "?" ? "" : text; };
    const alphabetic = (a, b) => a < b ? -1 : a > b ? 1 : 0;
    const unique = values => [...new Set(values)].sort(alphabetic);
    const markerTypes = markers => unique(markers.map(item => emptyText(item.type)).filter(Boolean))
        .sort((a, b) => alphabetic(a.toLowerCase(), b.toLowerCase()) || alphabetic(a, b));
    const tagsFrom = text => [...new Set(text.split(",").map(tag => tag.trim()).filter(Boolean))];
    const hex = value => Math.floor(value * .75).toString(16).padStart(2, "0");
    const date = timestamp => new Date(timestamp * 1000).toLocaleString("sv-SE", {hour12: false});
    const bytes = size => size < 1024 * 1024 ? `${(size / 1024).toFixed(0)} KB` : `${(size / 1024 / 1024).toFixed(1)} MB`;

    async function nameColor(name) {
        const hash = await crypto.subtle.digest("SHA-1", new TextEncoder().encode(name));
        return [...new Uint8Array(hash).slice(-3)].map(hex).join("");
    }

    function typeColors(markers) {
        const types = markerTypes(markers);
        return new Map(types.map((type, i) => {
            const h = i * 6 / types.length;
            const x = 255 * (1 - Math.abs(h % 2 - 1));
            const rgb = [[255,x,0], [x,255,0], [0,255,x], [0,x,255], [x,0,255], [255,0,x]][Math.floor(h)];
            return [type, rgb.map(hex).join("")];
        }));
    }

    function element(tag, text, className) {
        const el = document.createElement(tag);
        if (text !== undefined) el.textContent = text;
        if (className) el.className = className;
        return el;
    }

    function button(text, action, className) {
        const el = element("button", text, className);
        el.type = "button";
        el.addEventListener("click", () => safely(action));
        return el;
    }

    function field(label, input) {
        const el = element("label", undefined, "field");
        el.append(element("span", label), input);
        return el;
    }

    function input(value, type = "text") {
        const el = element("input");
        el.type = type;
        el.value = value;
        return el;
    }

    class Repository {
        async open() {
            this.db = await new Promise((resolve, reject) => {
                const request = indexedDB.open("gtadb-markers", 2);
                request.onupgradeneeded = event => {
                    if (event.oldVersion === 0) {
                        request.result.createObjectStore("collections", {keyPath: "id"});
                        request.result.createObjectStore("images");
                        return;
                    }
                    // Upgrade development data atomically, retaining marker IDs and images.
                    const images = request.transaction.objectStore("images");
                    request.transaction.objectStore("collections").openCursor().onsuccess = event => {
                        const cursor = event.target.result;
                        if (!cursor) return;
                        const saved = cursor.value;
                        saved.markers = saved.markers.map(legacyMarker);
                        for (const item of saved.markers.filter(item => item.image)) {
                            const oldKey = [saved.id, item.id];
                            images.get(oldKey).onsuccess = event => {
                                if (event.target.result) images.put(event.target.result, [saved.id, item.game, item.id]);
                                images.delete(oldKey);
                            };
                        }
                        cursor.update(saved);
                        cursor.continue();
                    };
                };
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
                request.onblocked = () => notify("Close other Markers tabs to finish opening the database.", true);
            });
            this.db.onversionchange = () => {
                this.db.close();
                notify("Markers has been updated. Reload this tab to continue.", true);
            };
            const collections = await this.all();
            if (!collections.length) await this.create("My collection");
        }
        read(store, key) {
            return new Promise((resolve, reject) => {
                const tx = this.db.transaction(store);
                const request = key === undefined ? tx.objectStore(store).getAll() : tx.objectStore(store).get(key);
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
            });
        }
        all() { return this.read("collections"); }
        get(id) { return this.read("collections", id); }
        image(collectionId, game, markerId) { return this.read("images", [collectionId, game, markerId]); }
        transaction(action) {
            return new Promise((resolve, reject) => {
                const tx = this.db.transaction(["collections", "images"], "readwrite");
                let result;
                let failure;
                const finish = value => { result = value; };
                const fail = error => { failure = error; tx.abort(); };
                tx.oncomplete = () => resolve(result);
                tx.onabort = tx.onerror = () => reject(failure || tx.error || new Error("Could not save changes."));
                try { action(tx, finish, fail); } catch (error) { fail(error); }
            });
        }
        create(name, markers = [], images = new Map()) {
            return this.transaction((tx, finish) => {
                const store = tx.objectStore("collections");
                store.getAll().onsuccess = event => {
                    const collection = {id: nextId(event.target.result), name, markers};
                    store.add(collection);
                    for (const item of markers.filter(item => item.image)) {
                        const blob = images.get(imagePath(item));
                        if (blob) tx.objectStore("images").put(blob, [collection.id, item.game, item.id]);
                    }
                    finish(collection);
                };
            });
        }
        update(id, change) {
            return this.transaction((tx, finish, fail) => {
                const store = tx.objectStore("collections");
                store.get(id).onsuccess = event => {
                    try {
                        const collection = event.target.result;
                        if (!collection) throw new Error("This collection was removed in another tab.");
                        change(collection, tx.objectStore("images"));
                        store.put(collection);
                        finish(collection);
                    } catch (error) { fail(error); }
                };
            });
        }
        remove(id) {
            return this.transaction((tx, finish, fail) => {
                const store = tx.objectStore("collections");
                store.getAll().onsuccess = event => {
                    const collections = event.target.result;
                    if (collections.length <= 1) return fail(new Error("Keep at least one collection."));
                    store.delete(id);
                    const range = IDBKeyRange.bound([id, 0], [id, Number.MAX_SAFE_INTEGER]);
                    tx.objectStore("images").delete(range);
                    finish(collections.filter(collection => collection.id !== id));
                };
            });
        }
    }


    // Local equivalent of the landmarks API. The UI uses the same asynchronous
    // add/edit/remove response flow; only the transport is IndexedDB instead of fetch.
    function legacyMarker(item) {
        const clean = {id: item.id, game: item.game, name: emptyText(item.name), type: emptyText(item.type), tags: [...item.tags],
            coordinates: Number.isFinite(item.x) && Number.isFinite(item.y) ? [item.x, item.y] : null,
            modified: Math.floor(item.modifiedAt / 1000)};
        if (item.image || item.photo) clean.image = item.image || item.photo;
        return clean;
    }

    function applyMarkerEdit(target, key, value, timestamp = now()) {
        if (key === "ig_coordinates") {
            const missing = value === null || (Array.isArray(value) && value.length === 0);
            if (!missing && (!Array.isArray(value) || value.length !== 2 || value.some(n => !Number.isFinite(n) || Math.abs(n) > 16000))) {
                throw new Error("Invalid marker coordinates.");
            }
            target.coordinates = missing ? null : [...value];
        } else if (key === "image") {
            if (value === null) delete target.image;
            else {
                if (!value || !(value.blob instanceof Blob) || value.blob.type !== "image/jpeg" ||
                    !Number.isInteger(value.width) || !Number.isInteger(value.height) ||
                    value.width < 1 || value.width > 3840 || value.height < 1 || value.height > 2160) throw new Error("Invalid marker image.");
                target.image = {width: value.width, height: value.height, size: value.blob.size};
            }
        } else if (key === "tags") {
            if (!Array.isArray(value) || value.some(tag => typeof tag !== "string" || tag.includes(","))) throw new Error("Invalid marker tags.");
            target.tags = [...new Set(value)];
        } else if (key === "name" || key === "type") {
            if (typeof value !== "string") throw new Error("Invalid marker text.");
            target[key] = emptyText(value);
        } else throw new Error("Unknown marker field.");
        target.modified = timestamp;
    }

    class LocalAPI {
        constructor(repository) { this.repository = repository; }
        async getMarkers(collectionId) {
            const collection = await this.repository.get(collectionId);
            if (!collection) throw new Error("This collection no longer exists.");
            return {status: "ok", data: collection.markers, collection};
        }
        async addMarker(collectionId, game, coordinates) {
            if (![4,5,6].includes(game)) throw new Error("Unknown GTA game.");
            let id, data;
            const collection = await this.repository.update(collectionId, saved => {
                id = nextId(saved.markers.filter(item => item.game === game));
                const timestamp = now();
                data = {id, game, name: "", type: "", tags: [], modified: timestamp};
                applyMarkerEdit(data, "ig_coordinates", coordinates, timestamp);
                saved.markers.push(data);
            });
            return {status: "ok", id, data, collection};
        }
        async editMarker(collectionId, game, id, key, value) {
            let data;
            const collection = await this.repository.update(collectionId, (saved, images) => {
                data = saved.markers.find(item => item.id === id && item.game === game);
                if (!data) throw new Error("This marker was removed in another tab.");
                applyMarkerEdit(data, key, value);
                if (key === "image") {
                    if (value === null) images.delete([collectionId, game, id]);
                    else images.put(value.blob, [collectionId, game, id]);
                }
            });
            return {status: "ok", id, data, collection};
        }
        async removeMarker(collectionId, game, id) {
            const collection = await this.repository.update(collectionId, (saved, images) => {
                saved.markers = saved.markers.filter(item => item.id !== id || item.game !== game);
                images.delete([collectionId, game, id]);
            });
            return {status: "ok", id, collection};
        }
    }

    function markerByline(item, sort) {
        if (sort === "type") return item.type || "?";
        if (sort === "tags") return item.tags.join(", ").toUpperCase() || "NONE";
        if (sort === "id") return "M" + item.id;
        if (sort === "x" || sort === "y") return hasCoordinates(item) ? item.coordinates.map(n => n.toFixed(3)).join(", ") : "?";
        return date(item.modified);
    }

    // ZIP32, stored entries: JPEGs are already compressed. No ZIP dependency or base64.
    const CRC_TABLE = Uint32Array.from({length: 256}, (_, i) => {
        let c = i;
        for (let bit = 0; bit < 8; bit++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
        return c >>> 0;
    });
    function crc32(data) {
        let crc = 0xffffffff;
        for (const value of data) crc = CRC_TABLE[(crc ^ value) & 255] ^ (crc >>> 8);
        return (crc ^ 0xffffffff) >>> 0;
    }
    function header(size) {
        const data = new Uint8Array(size);
        return [data, new DataView(data.buffer)];
    }
    async function zip(entries) {
        if (entries.length > 65535) throw new Error("This collection exceeds the ZIP file-count limit.");
        const parts = [], central = [];
        let offset = 0, centralSize = 0;
        for (const [name, blob] of entries) {
            const filename = new TextEncoder().encode(name);
            const data = new Uint8Array(await blob.arrayBuffer());
            const crc = crc32(data);
            const [local, lv] = header(30);
            lv.setUint32(0, 0x04034b50, true);
            lv.setUint16(4, 20, true);
            lv.setUint16(6, 0x800, true);
            lv.setUint32(14, crc, true);
            lv.setUint32(18, data.length, true);
            lv.setUint32(22, data.length, true);
            lv.setUint16(26, filename.length, true);
            parts.push(local, filename, blob);
            const [entry, cv] = header(46);
            cv.setUint32(0, 0x02014b50, true);
            cv.setUint16(4, 20, true);
            cv.setUint16(6, 20, true);
            cv.setUint16(8, 0x800, true);
            cv.setUint32(16, crc, true);
            cv.setUint32(20, data.length, true);
            cv.setUint32(24, data.length, true);
            cv.setUint16(28, filename.length, true);
            cv.setUint32(42, offset, true);
            central.push(entry, filename);
            centralSize += entry.length + filename.length;
            offset += local.length + filename.length + data.length;
            if (offset + centralSize > 0xffffffff) throw new Error("This collection exceeds the 4 GB export limit.");
        }
        const [end, ev] = header(22);
        ev.setUint32(0, 0x06054b50, true);
        ev.setUint16(8, entries.length, true);
        ev.setUint16(10, entries.length, true);
        ev.setUint32(12, centralSize, true);
        ev.setUint32(16, offset, true);
        return new Blob([...parts, ...central, end], {type: "application/zip"});
    }

    async function unzip(file) {
        const tail = new Uint8Array(await file.slice(-65557).arrayBuffer());
        const tv = new DataView(tail.buffer);
        let end = tail.length - 22;
        while (end >= 0 && (tv.getUint32(end, true) !== 0x06054b50 || end + 22 + tv.getUint16(end + 20, true) !== tail.length)) end--;
        if (end < 0) throw new Error("This is not a valid collection archive.");
        const count = tv.getUint16(end + 10, true);
        const size = tv.getUint32(end + 12, true), offset = tv.getUint32(end + 16, true);
        if (tv.getUint16(end + 4, true) || tv.getUint16(end + 6, true) || size > 16 * 1024 * 1024 || offset + size > file.size - 22) throw new Error("Unsupported collection archive.");
        const central = new Uint8Array(await file.slice(offset, offset + size).arrayBuffer());
        const cv = new DataView(central.buffer), entries = new Map();
        let pos = 0;
        for (let i = 0; i < count; i++) {
            if (pos + 46 > central.length || cv.getUint32(pos, true) !== 0x02014b50) throw new Error("Damaged collection archive.");
            const nameLength = cv.getUint16(pos + 28, true);
            const name = new TextDecoder().decode(central.subarray(pos + 46, pos + 46 + nameLength));
            const length = cv.getUint32(pos + 24, true), compressed = cv.getUint32(pos + 20, true);
            const method = cv.getUint16(pos + 10, true), start = cv.getUint32(pos + 42, true), crc = cv.getUint32(pos + 16, true);
            if (entries.has(name) || cv.getUint16(pos + 8, true) & 1 || ![0, 8].includes(method)) throw new Error("Unsupported or duplicate archive entry.");
            if (length > 32 * 1024 * 1024 || start + 30 + compressed > offset) throw new Error("An archive entry is too large or damaged.");
            entries.set(name, async () => {
                const local = new DataView(await file.slice(start, start + 30).arrayBuffer());
                if (local.byteLength !== 30 || local.getUint32(0, true) !== 0x04034b50) throw new Error("Damaged archive entry.");
                const dataStart = start + 30 + local.getUint16(26, true) + local.getUint16(28, true);
                if (dataStart + compressed > offset) throw new Error("Damaged archive entry.");
                let blob = file.slice(dataStart, dataStart + compressed);
                if (method === 8) {
                    const reader = blob.stream().pipeThrough(new DecompressionStream("deflate-raw")).getReader();
                    const parts = [];
                    let total = 0;
                    try {
                        while (true) {
                            const {value, done} = await reader.read();
                            if (done) break;
                            total += value.length;
                            if (total > length) { await reader.cancel(); throw new Error("Damaged compressed entry."); }
                            parts.push(value);
                        }
                    } finally { reader.releaseLock(); }
                    blob = new Blob(parts);
                }
                const data = new Uint8Array(await blob.arrayBuffer());
                if (data.length !== length || crc32(data) !== crc) throw new Error("The collection file is damaged (checksum mismatch).");
                return blob;
            });
            pos += 46 + nameLength + cv.getUint16(pos + 30, true) + cv.getUint16(pos + 32, true);
        }
        return entries;
    }

    async function decodeImage(blob) {
        const url = URL.createObjectURL(blob), image = new Image();
        image.src = url;
        try { await image.decode(); return image; }
        catch { throw new Error("This image could not be opened. Choose a JPEG, PNG, WebP, or another supported image."); }
        finally { URL.revokeObjectURL(url); }
    }

    async function prepareImage(blob, keepJpeg = false) {
        const image = await decodeImage(blob);
        const scale = Math.min(1, 3840 / image.naturalWidth, 2160 / image.naturalHeight);
        const width = Math.max(1, Math.round(image.naturalWidth * scale));
        const height = Math.max(1, Math.round(image.naturalHeight * scale));
        if (keepJpeg && scale === 1 && blob.type === "image/jpeg") return {blob, width, height, size: blob.size};
        const canvas = document.createElement("canvas");
        canvas.width = width; canvas.height = height;
        const context = canvas.getContext("2d");
        context.fillStyle = "#fff";
        context.fillRect(0, 0, width, height);
        context.drawImage(image, 0, 0, width, height);
        const jpeg = await new Promise(resolve => canvas.toBlob(resolve, "image/jpeg", .85));
        canvas.width = canvas.height = 0;
        if (!jpeg) throw new Error("Could not prepare this image.");
        return {blob: jpeg, width, height, size: jpeg.size};
    }

    const repository = new Repository();
    const api = new LocalAPI(repository);
    let collection, collections = [], maps, selected = null, game = 6, view;
    let editing = false, detailImageUrl, detailSignature;
    let appliedFind = "";
    let writeQueue = Promise.resolve(), pendingWrites = 0, pendingImages = 0, writeRevision = 0;
    let markerColors = new Map();
    let dialogLayer, activeDialog = null, dialogKind = null, dialogCleanup = null;
    let aboutSection = "About This Map", settingsSection = "Map Settings", focus = "map";
    let lastCoordinates = null;
    let busy = false, applyingHash = false, renderRevision = 0, noticeTimer, channel;
    let preferences = {theme: "light", markerColors: "name", mapColors: "rgb", dimension: "2d", sort: "name", tileOverlays: 0,
        tiles: {4: "original", 5: "satellite", 6: "yanis,17"}, views: structuredClone(DEFAULTS)};
    let activeCollectionId;

    function notify(message, error = false) {
        // Routine actions stay silent; only failures need the user's attention.
        if (!error) return;
        clearTimeout(noticeTimer);
        $("notice").textContent = message;
        $("notice").classList.toggle("error", error);
        $("notice").hidden = false;
        if (!error) noticeTimer = setTimeout(() => { $("notice").hidden = true; }, 6000);
    }

    async function safely(action) {
        try { return await action(); }
        catch (error) {
            console.error(error);
            notify(error.name === "QuotaExceededError" ? "Browser storage is full. Export a backup, then remove images or collections to free space. Your last change was not saved." : error.message || "Something went wrong.", true);
        }
    }

    async function operation(action) {
        if (busy) return;
        busy = true;
        document.body.setAttribute("aria-busy", "true");
        try { return await action(); }
        finally { busy = false; document.body.removeAttribute("aria-busy"); }
    }

    function savePreferences() {
        try { localStorage.setItem("gtadb-markers-preferences", JSON.stringify({...preferences, activeCollectionId: collection.id, game})); }
        catch { /* Marker data remains in IndexedDB if preferences are unavailable. */ }
    }

    function announceChange() { channel?.postMessage({collectionId: collection.id}); }

    async function updateCollection(change) {
        await writeQueue;
        collection = await repository.update(collection.id, change);
        collections = await repository.all();
        announceChange();
        savePreferences();
        await render();
    }

    function marker() { return collection.markers.find(item => item.id === selected && item.game === game); }
    function hasDraftChanges() {
        return [...$("itemBody").querySelectorAll('[contenteditable="true"]')]
            .some(el => el.textContent.trim() !== el.dataset.savedValue);
    }
    function flushFields() {
        for (const el of $("itemBody").querySelectorAll('[contenteditable="true"]')) {
            if (el.textContent.trim() !== el.dataset.savedValue) el.dispatchEvent(new Event("blur"));
        }
    }
    function leaveEditor() { flushFields(); stopEditing(); return true; }
    function stopEditing() {
        editing = false;
        document.body.classList.remove("editing");
        maps?.set({editing: false});
        $("editButton").textContent = "Edit";
    }

    function editMarker(id, key, value, collectionId = collection.id, markerGame = game) {
        const revision = ++writeRevision;
        const current = collection.id === collectionId && collection.markers.find(item => item.id === id && item.game === markerGame);
        if (current) applyMarkerEdit(current, key, value);
        pendingWrites++;
        const result = writeQueue.then(() => api.editMarker(collectionId, markerGame, id, key, value));
        writeQueue = result.catch(() => {});
        return result.then(async ret => {
            if (collection.id !== collectionId) return;
            if (revision === writeRevision) collection = ret.collection;
            announceChange();
            savePreferences();
            await render();
            if (key === "image" && selected === id && game === markerGame) await renderDetail();
            navigator.storage?.persist?.().catch(() => {});
        }).finally(() => { pendingWrites--; });
    }

    function coordinateText(item, decimals = 3) {
        if (!hasCoordinates(item)) return "?";
        const z = maps.getElevation(...item.coordinates);
        const values = Number.isFinite(z) ? [...item.coordinates, z] : item.coordinates;
        return values.map(value => value.toFixed(decimals)).join(", ");
    }

    function updateDetailCoordinates() {
        const item = marker(), node = $("itemCoordinates");
        if (!item || !node) return;
        const located = hasCoordinates(item), link = element("span", coordinateText(item));
        node.replaceChildren(link);
        if (located) {
            link.className = "link";
            link.title = "FOCUS ON MARKER";
            link.addEventListener("click", () => maps.set({x: item.coordinates[0], y: item.coordinates[1], z: Math.max(view.z, 5)}));
        }
        if (editing) {
            const toggle = button(located ? "Remove" : "Add", async () => {
                flushFields();
                const state = maps.get();
                await editMarker(item.id, "ig_coordinates", located ? null : [state.targetX, state.targetY]);
            }, "coordinateAction");
            toggle.title = located ? "REMOVE COORDINATES" : "ADD COORDINATES AT MAP CENTER";
            toggle.addEventListener("mousedown", event => event.preventDefault());
            node.append(toggle);
        }
        if (located && maps.getElevation(...item.coordinates) === false) {
            const collectionId = collection.id, id = item.id, version = game;
            maps.getElevation().then(() => {
                if (collection.id === collectionId && game === version && selected === id) updateDetailCoordinates();
            }).catch(error => notify(error.message, true));
        }
    }

    function writeHash() {
        if (applyingHash || !collection || !view) return;
        const hash = `#C${collection.id},${GAMES[game]},${[view.x, view.y, view.z].map(value => value.toFixed(3)).join(",")}${selected ? `,M${selected}` : ""}`;
        if (location.hash !== hash) history.replaceState(null, "", hash);
        preferences.views[game] = {...view};
        savePreferences();
    }

    function parseHash() {
        const values = location.hash.slice(1).split(",");
        let id;
        if (/^C[1-9]\d*$/.test(values[0])) id = Number(values.shift().slice(1));
        const version = Number(Object.keys(GAMES).find(key => GAMES[key] === values[0]));
        if (version) values.shift();
        const coordinates = values.slice(0, 3).map(Number);
        const validView = values.length >= 3 && coordinates.every(Number.isFinite);
        const chosen = /^M[1-9]\d*$/.test(values[3] || "") ? Number(values[3].slice(1)) : null;
        return {id, game: version || game, view: validView ? {x: Math.max(-16000, Math.min(16000, coordinates[0])), y: Math.max(-16000, Math.min(16000, coordinates[1])), z: Math.max(0, Math.min(7, coordinates[2]))} : null, selected: chosen};
    }

    async function readHash(initial = false) {
        if (busy && !initial) return;
        const state = parseHash();
        const target = collections.find(item => item.id === state.id);
        if (state.id && !target) {
            notify(`Collection C${state.id} is not in this browser. Import its file or choose a collection in Manage.`, true);
            if (initial) { configureMap(); await render(); }
            writeHash();
            return;
        }
        if (!initial && !leaveEditor()) { writeHash(); return; }
        applyingHash = true;
        try {
            if (target) collection = await repository.get(target.id);
            game = state.game;
            view = state.view || preferences.views[game] || DEFAULTS[game];
            selected = state.selected;
            if (selected && !marker()) { notify(`M${selected} is not in this collection for GTA ${GAMES[game]}.`); selected = null; }
            appliedFind = $("find").value = ""; $("filter").value = "all";
            configureMap();
            await render();
        } finally { applyingHash = false; }
        writeHash();
    }

    function configureMap() {
        $("game").value = game;
        $("dimensionButton").textContent = preferences.dimension === "2d" ? "3D" : "2D";
        document.title = `${collection.name} — GTA ${GAMES[game]} Markers`;
        document.body.classList.remove("light", "dark", "michael", "amanda", "jimmy", "tracey");
        if (!["light", "dark"].includes(preferences.theme)) document.body.classList.add("light");
        document.body.classList.add(preferences.theme);
        maps.set({v: game, tileSet: preferences.tiles[game], dimension: preferences.dimension,
            colorScheme: preferences.mapColors, tileOverlays: preferences.tileOverlays, x: view.x, y: view.y, z: view.z, immediate: true});
    }

    function buildFilter() {
        const old = $("filter").value || "all";
        $("filter").replaceChildren();
        const add = (parent, label, value) => {
            const option = element("option", label);
            option.value = value; parent.append(option);
        };
        for (const [value, label] of [["all", "All"], ["coordinates", "With coordinates"], ["no-coordinates", "Without coordinates"], ["image", "With image"], ["no-image", "Without image"], ["typed", "With type"], ["untyped", "Without type"], ["tags", "With tags"], ["no-tags", "Without tags"]]) add($("filter"), `Filter: ${label}`, value);
        $("filter").value = [...$("filter").options].some(option => option.value === old) ? old : "all";
    }

    function visibleMarkers(markers) {
        const query = appliedFind.toLocaleLowerCase(), filter = $("filter").value;
        const sort = preferences.sort;
        const result = markers.filter(item => {
            if (query && ![`M${item.id}`, item.name, item.type, ...item.tags].join("\n").toLocaleLowerCase().includes(query)) return false;
            if (filter === "typed") return !!item.type;
            if (filter === "untyped") return !item.type;
            if (filter === "tags") return !!item.tags.length;
            if (filter === "image") return !!item.image;
            if (filter === "no-image") return !item.image;
            if (filter === "no-tags") return !item.tags.length;
            if (filter === "coordinates") return hasCoordinates(item);
            if (filter === "no-coordinates") return !hasCoordinates(item);
            return true;
        });
        return result.sort((a, b) => {
            if (sort === "id") return a.id - b.id;
            if (sort === "x" || sort === "y") {
                const ac = hasCoordinates(a), bc = hasCoordinates(b);
                if (ac !== bc) return ac ? -1 : 1;
                return (ac ? (sort === "x" ? a.coordinates[0] - b.coordinates[0] : b.coordinates[1] - a.coordinates[1]) : 0) || a.id - b.id;
            }
            if (sort === "modified") return b.modified - a.modified || a.id - b.id;
            const av = sort === "tags" ? a.tags.join(", ") : a[sort];
            const bv = sort === "tags" ? b.tags.join(", ") : b[sort];
            const key = value => sort === "name" || sort === "type" ? (value || "?").toLocaleLowerCase().replace(/\?/g, "\uffff") : value;
            return alphabetic(key(av), key(bv)) || a.id - b.id;
        });
    }

    async function render() {
        const revision = ++renderRevision;
        const markers = collection.markers.filter(item => item.game === game);
        // Derive colors from all types, never from a search/filter subset.
        const palette = typeColors(collection.markers);
        const colors = await Promise.all(markers.map(async item => [item.id, !item.type ? "000000" : preferences.markerColors === "type" ? palette.get(item.type) : await nameColor(item.name)]));
        const iconColor = await nameColor(collection.name);
        if (revision !== renderRevision) return;
        const colorById = new Map(colors);
        markerColors = colorById;
        $("collectionIcon").textContent = Array.from(collection.name)[0]?.toUpperCase() || "?";
        $("collectionIcon").style.backgroundColor = "#" + iconColor;
        $("collectionIcon").title = `${collection.name} (C${collection.id}) — Manage collections`;
        buildFilter(markers);
        const visible = visibleMarkers(markers);
        if (selected !== null && !visible.some(item => item.id === selected)) {
            leaveEditor();
            selected = null;
            writeHash();
        }
        $("clearFind").hidden = !$("find").value;
        $("clearFilter").hidden = $("filter").value === "all";
        $("sort").value = preferences.sort;
        $("listBody").replaceChildren();
        for (const item of visible) {
            const row = element("div", undefined, "item");
            row.tabIndex = 0;
            row.addEventListener("click", () => safely(() => selectMarker(item.id, true)));
            row.addEventListener("keydown", event => {
                if (event.key === "Enter" || event.key === " ") { event.preventDefault(); safely(() => selectMarker(item.id, true)); }
            });
            row.dataset.id = item.id;
            row.setAttribute("role", "option");
            row.setAttribute("aria-selected", item.id === selected);
            row.classList.toggle("selected", item.id === selected);
            row.style.borderLeftColor = "#" + colorById.get(item.id);
            row.append(element("div", item.name || "?", "name"), element("div", markerByline(item, preferences.sort), "byline"));
            $("listBody").append(row);
        }
        $("markerCount").textContent = `${visible.length} ${visible.length === 1 ? "marker" : "markers"}`;
        $("removeButton").disabled = !marker();
        const landmark = item => ({id: `M${item.id}`, title: item.name || "?", igAddress: item.name, igCoordinates: item.coordinates, rlCoordinates: null, tags: item.tags, color: colorById.get(item.id)});
        const landmarks = markers.map(landmark), allowed = new Set(visible.map(item => item.id));
        maps.set({landmarks, currentLandmarks: landmarks.filter(item => allowed.has(Number(item.id.slice(1)))), selected: selected ? `M${selected}` : null});
        if (!editing) await renderDetail(colorById.get(selected));
        else {
            $("itemBody").style.borderRightColor = "#" + (colorById.get(selected) || "000000");
            updateDetailCoordinates();
            if ($("itemEdited") && marker()) $("itemEdited").textContent = "LAST EDITED: " + date(marker().modified);
        }
    }

    async function selectMarker(id, pan = false) {
        if (busy || !leaveEditor()) return;
        selected = id;
        const item = marker();
        if (pan && item && hasCoordinates(item)) maps.set({x: item.coordinates[0], y: item.coordinates[1], z: Math.max(view.z, 4)});
        await render(); writeHash();
    }

    function editableText(id, text, className, property) {
        const node = element("div", text, className);
        node.id = id;
        if (!editing) return node;
        node.contentEditable = "true";
        node.setAttribute("role", "textbox");
        node.setAttribute("aria-label", property === "name" ? "Name" : property === "type" ? "Type" : "Tags");
        node.dataset.savedValue = text.trim();
        const collectionId = collection.id, markerId = selected, markerGame = game;
        node.addEventListener("blur", () => {
            const value = node.textContent.trim();
            if (value === node.dataset.savedValue) return;
            const normalized = property === "tags" ? tagsFrom(value) : emptyText(value);
            const displayed = property === "tags" ? value : normalized || "?";
            node.dataset.savedValue = displayed;
            node.textContent = displayed;
            safely(() => editMarker(markerId, property, normalized, collectionId, markerGame));
        });
        node.addEventListener("keydown", event => {
            if (event.key === "Enter") { event.preventDefault(); node.blur(); }
        });
        node.addEventListener("paste", event => {
            event.preventDefault();
            document.execCommand("insertText", false, event.clipboardData.getData("text/plain").replace(/\r?\n/g, " "));
        });
        return node;
    }

    async function renderDetail(color = markerColors.get(selected)) {
        if (editing) flushFields();
        const item = marker();
        $("itemBody").style.borderRightColor = "#" + (color || "000000");
        const signature = JSON.stringify([collection.id, editing, item || null]);
        if (!editing && signature === detailSignature) return;
        detailSignature = signature;
        $("itemPanel").hidden = !item;
        $("coordinatesPanel").classList.toggle("rounded", !item);
        $("itemBody").replaceChildren();
        if (detailImageUrl) URL.revokeObjectURL(detailImageUrl);
        detailImageUrl = null;
        if (!item) return;
        const collectionId = collection.id, markerId = item.id, markerGame = item.game;
        $("itemId").textContent = "M" + item.id;
        $("itemBody").style.borderRightColor = "#" + (color || "000000");
        $("editButton").textContent = editing ? "Done" : "Edit";
        $("itemBody").append(editableText("markerName", item.name || "?", "markerName", "name"));
        const coordinates = element("div", "", "coordinates");
        coordinates.id = "itemCoordinates";
        $("itemBody").append(coordinates);
        updateDetailCoordinates();
        const imageSlot = element("div", undefined, "image");
        imageSlot.id = "markerImageArea";
        if (item.image) imageSlot.style.height = (248 * item.image.height / item.image.width) + "px";
        $("itemBody").append(imageSlot);
        const type = editableText("markerType", editing ? item.type || "?" : "TYPE: " + (item.type || "?"), "markerType", "type");
        const tags = editableText("markerTags", editing ? item.tags.join(", ") : "TAGS: " + (item.tags.join(", ") || "NONE"), "markerTags", "tags");
        if (!editing) {
            if (item.type) type.replaceChildren(document.createTextNode("TYPE: "), findLink(item.type));
            if (item.tags.length) {
                tags.replaceChildren(document.createTextNode("TAGS: "));
                item.tags.forEach((tag, index) => {
                    if (index) tags.append(document.createTextNode(", "));
                    tags.append(findLink(tag));
                });
            }
        }
        const edited = element("div", "LAST EDITED: " + date(item.modified), "edited"); edited.id = "itemEdited";
        $("itemBody").append(type, tags, edited);
        if (editing) {
            imageSlot.setAttribute("role", "button");
            imageSlot.setAttribute("aria-label", "Image");
            imageSlot.tabIndex = 0;
            imageSlot.title = "CLICK OR DROP";
            const picker = input("", "file"); picker.id = "markerImage"; picker.hidden = true;
            picker.accept = "image/jpeg,image/png,image/webp,image/avif,image/gif,image/bmp";
            $("itemBody").append(picker);
            const receive = async file => {
                if (!file) return;
                flushFields();
                pendingImages++;
                try {
                    const prepared = await prepareImage(file);
                    await editMarker(markerId, "image", prepared, collectionId, markerGame);
                } finally { pendingImages--; }
            };
            imageSlot.addEventListener("click", event => { if (!event.target.closest(".removeImage")) picker.click(); });
            imageSlot.addEventListener("keydown", event => {
                if (event.target !== imageSlot) return;
                if (event.key === "Enter" || event.key === " ") { event.preventDefault(); picker.click(); }
            });
            picker.addEventListener("change", () => safely(() => receive(picker.files[0])));
            imageSlot.addEventListener("dragover", event => { event.preventDefault(); imageSlot.classList.add("hover"); });
            imageSlot.addEventListener("dragleave", () => imageSlot.classList.remove("hover"));
            imageSlot.addEventListener("drop", event => {
                event.preventDefault(); imageSlot.classList.remove("hover"); safely(() => receive(event.dataTransfer.files[0]));
            });
            if (item.image) imageSlot.append(button("Remove", async () => { flushFields(); await editMarker(markerId, "image", null, collectionId, markerGame); }, "removeImage"));
        } else if (item.image) {
            imageSlot.setAttribute("role", "button");
            imageSlot.setAttribute("aria-label", item.name || "?");
            imageSlot.tabIndex = 0;
        }
        if (item.image) {
            const blob = await repository.image(collectionId, markerGame, markerId);
            if (collection.id !== collectionId || game !== markerGame || selected !== markerId || !blob || !imageSlot.isConnected) return;
            detailImageUrl = URL.createObjectURL(blob);
            const img = element("img"); img.src = detailImageUrl; img.alt = item.name || "?";
            imageSlot.prepend(img);
            if (!editing) {
                const open = () => showImage(blob, item.name || "?");
                imageSlot.addEventListener("click", () => safely(open));
                imageSlot.addEventListener("keydown", event => {
                    if (event.key === "Enter" || event.key === " ") { event.preventDefault(); safely(open); }
                });
            }
        }
    }

    async function addMarker() {
        if (!leaveEditor()) return;
        await operation(async () => {
            await writeQueue;
            const state = maps.get();
            const ret = await api.addMarker(collection.id, game, [state.targetX, state.targetY]);
            collection = ret.collection;
            collections = await repository.all();
            const id = ret.id;
            announceChange();
            selected = id; appliedFind = $("find").value = ""; $("filter").value = "all";
            await render(); writeHash();
            await startEditing();
        });
    }

    async function removeMarker() {
        const item = marker();
        if (!item || !confirm(`Remove ${item.name || `M${item.id}`} and its image?`)) return;
        stopEditing();
        await operation(async () => {
            await writeQueue;
            const ret = await api.removeMarker(collection.id, item.game, item.id);
            collection = ret.collection;
            collections = await repository.all();
            announceChange();
            selected = null; await render(); writeHash();
        });
    }

    async function startEditing() {
        if (!marker() || editing) return;
        editing = true;
        document.body.classList.add("editing");
        maps.set({editing: true});
        await renderDetail();
    }

    async function saveMarker() {
        flushFields();
        stopEditing();
        await writeQueue;
        await render();
        writeHash();
    }

    async function switchCollection(id) {
        if (busy || !leaveEditor()) return;
        await writeQueue;
        const next = await repository.get(id);
        if (!next) throw new Error("This collection no longer exists.");
        collection = next; selected = null;
        appliedFind = $("find").value = ""; $("filter").value = "all";
        configureMap(); await render(); writeHash();
    }

    function setFocus(value) {
        focus = value;
        maps.set({focused: value === "map" && !activeDialog});
    }

    function closeDialog() { activeDialog?.close(); }

    function openDialog(title, options = {}) {
        closeDialog();
        const content = element("div");
        content.id = "dialogContent";
        if (options.panel) content.className = "panelDialog";
        if (options.kind === "image") content.className = "imageDialog";
        const instance = gtadb.Dialog({
            title, content, layer: dialogLayer, width: options.width || 512, height: options.height || 544,
            buttons: options.buttons || [],
            onClose: () => {
                if (activeDialog !== instance) return;
                activeDialog = null; dialogKind = null;
                const cleanup = dialogCleanup; dialogCleanup = null; cleanup?.();
                setFocus("list");
            }
        });
        activeDialog = instance;
        dialogKind = options.kind || "collections";
        instance.element.id = dialogKind + "Dialog";
        instance.element.setAttribute("role", "dialog");
        instance.element.setAttribute("aria-modal", "true");
        instance.element.setAttribute("aria-label", title);
        instance.element.tabIndex = -1;
        for (const control of instance.element.querySelectorAll(".bar .button")) {
            control.setAttribute("role", "button");
            control.tabIndex = 0;
            control.addEventListener("keydown", event => {
                if (event.key === "Enter" || event.key === " ") { event.preventDefault(); control.click(); }
            });
        }
        instance.open();
        maps.set({focused: false});
        instance.element.focus();
        return content;
    }

    function dialogPanel(sections, selected, remember) {
        const names = Object.keys(sections), index = Math.max(0, names.indexOf(selected));
        const panel = gtadb.Panel({elements: sections, selected: index, height: 512, width: 768, menuWidth: 256});
        const menu = panel.element.firstElementChild;
        menu.setAttribute("role", "tablist");
        menu.setAttribute("aria-orientation", "vertical");
        panel.element.lastElementChild.setAttribute("role", "tabpanel");
        const items = [...menu.children];
        items.forEach((node, i) => {
            node.setAttribute("role", "tab"); node.tabIndex = 0;
            node.setAttribute("aria-selected", i === index);
            node.addEventListener("click", () => {
                remember(names[i]);
                items.forEach((other, j) => other.setAttribute("aria-selected", i === j));
            });
            node.addEventListener("keydown", event => {
                if (event.key === "Enter" || event.key === " ") { event.preventDefault(); node.click(); }
            });
        });
        return panel.element;
    }

    async function manageCollections() {
        if (busy) return;
        flushFields();
        await writeQueue;
        collections = await repository.all();
        settings("Marker Collections");
    }

    function collectionSettings() {
        const content = panelPage();
        for (const stored of collections) {
            const current = stored.id === collection.id ? collection : stored;
            const row = element("div", undefined, "collectionRow" + (current.id === collection.id ? " active" : ""));
            const info = element("div", undefined, "collectionInfo");
            const name = element("span", current.name, "collectionName");
            name.contentEditable = "true";
            name.setAttribute("role", "textbox");
            name.setAttribute("aria-label", `Collection name C${current.id}`);
            name.setAttribute("aria-multiline", "false");
            name.dataset.id = current.id;
            name.addEventListener("keydown", event => {
                if (event.key === "Enter") { event.preventDefault(); name.blur(); }
            });
            name.addEventListener("paste", event => {
                event.preventDefault();
                document.execCommand("insertText", false, event.clipboardData.getData("text/plain").replace(/\r?\n/g, " "));
            });
            name.addEventListener("blur", () => safely(async () => {
                const value = name.textContent.trim() || current.name;
                name.textContent = value;
                if (value === current.name) return;
                current.name = value;
                choose.setAttribute("aria-label", `Select ${value}`);
                pendingWrites++;
                const result = writeQueue.then(() => repository.update(current.id, item => { item.name = value; }));
                writeQueue = result.catch(() => {});
                try {
                    await result;
                    if (collection.id === current.id) { collection.name = value; configureMap(); await render(); }
                    collections = await repository.all();
                    channel?.postMessage({collectionId: current.id});
                } finally { pendingWrites--; }
            }));
            info.append(name, document.createTextNode(` (${current.markers.length} ${current.markers.length === 1 ? "marker" : "markers"})`));
            const choose = input("", "radio"); choose.name = "activeCollection";
            choose.checked = current.id === collection.id;
            choose.setAttribute("aria-label", `Select ${current.name}`);
            choose.addEventListener("change", () => safely(async () => {
                await switchCollection(current.id);
                await manageCollections();
            }));
            const exportButton = button("Export", () => exportCollection(current.id));
            const remove = button("Remove", async () => {
                if (busy || !confirm(`Remove “${current.name}” and all its markers and images from this browser? Export it first if you want a backup.`)) return;
                if (current.id === collection.id && !leaveEditor()) return;
                await operation(async () => {
                    await writeQueue;
                    collections = await repository.remove(current.id);
                    channel?.postMessage({collectionId: current.id});
                    if (collection.id === current.id) {
                        collection = collections[0]; selected = null;
                        appliedFind = $("find").value = ""; $("filter").value = "all";
                        configureMap(); await render(); writeHash();
                    }
                });
                await manageCollections();
            });
            row.append(choose, info, exportButton);
            if (collections.length > 1) row.append(remove);
            content.append(row);
        }
        const actions = element("div", undefined, "collectionActions");
        actions.append(button("Add", async () => {
            if (!leaveEditor()) return;
            await writeQueue;
            let created;
            await operation(async () => { created = await repository.create("My collection"); collections = await repository.all(); });
            await switchCollection(created.id); await manageCollections();
            const name = document.querySelector(`.collectionName[data-id="${created.id}"]`);
            if (name) {
                name.focus();
                const range = document.createRange(); range.selectNodeContents(name);
                const selection = window.getSelection(); selection.removeAllRanges(); selection.addRange(range);
            }
        }), button("Import", () => $("importFile").click()));
        content.append(actions);
        return content;
    }

    async function exportCollection(collectionId = collection.id) {
        if (busy || !leaveEditor()) return;
        await writeQueue;
        await render();
        await operation(async () => {
            // One readonly transaction produces a consistent marker/image snapshot.
            const snapshot = await new Promise((resolve, reject) => {
                const tx = repository.db.transaction(["collections", "images"]);
                let current;
                const images = new Map();
                tx.objectStore("collections").get(collectionId).onsuccess = event => {
                    current = event.target.result;
                    if (!current) { tx.abort(); return; }
                    for (const item of current.markers.filter(value => value.image)) {
                        tx.objectStore("images").get([current.id, item.game, item.id]).onsuccess = event => images.set(imagePath(item), event.target.result);
                    }
                };
                tx.oncomplete = () => resolve({collection: current, images});
                tx.onabort = tx.onerror = () => reject(tx.error || new Error("Could not export this collection."));
            });
            const metadata = collectionBundle(snapshot.collection);
            const entries = [["collection.json", new Blob([JSON.stringify(metadata)], {type: "application/json"})]];
            for (const [path, blob] of snapshot.images) {
                if (!blob) throw new Error(`The image ${path} is missing. The export was stopped so it cannot silently omit your image.`);
                entries.push([path, blob]);
            }
            const archive = await zip(entries);
            const filename = (metadata.name.replace(/[<>:"/\\|?*\u0000-\u001f]/g, "-").trim() || "collection") + ".gtadbmarkers";
            const url = URL.createObjectURL(archive), link = element("a");
            link.href = url; link.download = filename;
            document.body.append(link); link.click(); link.remove();
            setTimeout(() => URL.revokeObjectURL(url), 60000);
            notify(`Exported ${metadata.name}, including ${snapshot.images.size} ${snapshot.images.size === 1 ? "image" : "images"}.`);
        });
    }

    function collectionBundle(saved) {
        const markers = Object.fromEntries(Object.keys(GAMES).map(game => [game, []]));
        for (const item of saved.markers) {
            const clean = {id: item.id, name: item.name, type: item.type, tags: [...item.tags],
                coordinates: item.coordinates ? [...item.coordinates] : null, modified: item.modified};
            if (item.image) clean.image = {...item.image};
            markers[item.game].push(clean);
        }
        for (const group of Object.values(markers)) group.sort((a, b) => a.id - b.id);
        return {format: "gtadb-markers", version: 0, name: saved.name, markers};
    }

    function validateCollection(data) {
        if (!data || data.format !== "gtadb-markers" || typeof data.name !== "string" || !data.name.trim()) throw new Error("This is not a supported GTA Markers collection.");
        let markers;
        if (data.version === 0 && data.markers && typeof data.markers === "object" && !Array.isArray(data.markers)) {
            if (Object.keys(data.markers).some(key => !Object.hasOwn(GAMES, key)) || Object.values(data.markers).some(group => !Array.isArray(group))) throw new Error("The collection contains an unsupported game or marker list.");
            markers = Object.entries(data.markers).flatMap(([game, group]) => group.map(item => ({...item, game: Number(game)})));
        } else if ([1,2].includes(data.version) && Array.isArray(data.markers)) {
            // Read earlier development exports, but never write that obsolete layout.
            markers = data.markers.map(item => {
                if (!item || typeof item.name !== "string" || typeof item.type !== "string" || !Array.isArray(item.tags) ||
                    !(item.x === null && item.y === null) && (![item.x, item.y].every(Number.isFinite) || Math.abs(item.x) > 16000 || Math.abs(item.y) > 16000) ||
                    !Number.isFinite(item.modifiedAt)) throw new Error("The collection contains an invalid marker.");
                return legacyMarker(item);
            });
        } else throw new Error("This is not a supported GTA Markers collection.");
        const ids = new Set();
        return markers.map(item => {
            const key = `${item.game}/${item.id}`;
            if (!Number.isSafeInteger(item.id) || item.id < 1 || ids.has(key) || ![4,5,6].includes(item.game) ||
                item.coordinates !== null && (!hasCoordinates(item) || item.coordinates.some(n => Math.abs(n) > 16000)) ||
                typeof item.name !== "string" || typeof item.type !== "string" || !Array.isArray(item.tags) || item.tags.some(tag => typeof tag !== "string" || tag.includes(",")) ||
                !Number.isSafeInteger(item.modified) || item.modified < 0 || !Number.isFinite(new Date(item.modified * 1000).getTime())) throw new Error("The collection contains an invalid or duplicate marker.");
            ids.add(key);
            const clean = {id: item.id, game: item.game, name: emptyText(item.name), type: emptyText(item.type), tags: [...new Set(item.tags)],
                coordinates: item.coordinates ? [...item.coordinates] : null, modified: item.modified};
            if (item.image) clean.image = {};
            return clean;
        });
    }

    async function importCollection(file) {
        if (!file || busy || !leaveEditor()) return;
        await render();
        await operation(async () => {
            notify("Opening collection…");
            const entries = await unzip(file);
            if (!entries.has("collection.json")) throw new Error("The archive is missing collection.json.");
            const metadataBlob = await entries.get("collection.json")();
            if (metadataBlob.size > 16 * 1024 * 1024) throw new Error("The collection metadata is too large.");
            let data;
            try { data = JSON.parse(await metadataBlob.text()); } catch { throw new Error("The collection metadata is not valid JSON."); }
            const markers = validateCollection(data), images = new Map();
            for (const item of markers.filter(value => value.image)) {
                const path = data.version === 0 ? imagePath(item) : `images/M${item.id}.jpg`;
                const read = entries.get(path);
                if (!read) throw new Error(`The archive is missing the image for M${item.id}.`);
                const blob = await read();
                const signature = new Uint8Array(await blob.slice(0, 3).arrayBuffer());
                if (signature[0] !== 255 || signature[1] !== 216 || signature[2] !== 255) throw new Error(`The image for M${item.id} is not a JPEG.`);
                const prepared = await prepareImage(new Blob([blob], {type: "image/jpeg"}), true);
                item.image = {width: prepared.width, height: prepared.height, size: prepared.size};
                images.set(imagePath(item), prepared.blob);
            }
            // Validation and decoding finish before any collection is written.
            collection = await repository.create(data.name, markers, images);
            collections = await repository.all(); selected = null;
            if (markers.length && !markers.some(item => item.game === game)) game = markers[0].game;
            view = preferences.views[game] || DEFAULTS[game];
            appliedFind = $("find").value = ""; $("filter").value = "all";
            configureMap(); await render(); writeHash(); announceChange();
            closeDialog();
            navigator.storage?.persist?.().catch(() => {});
            notify(`Opened ${collection.name} as C${collection.id}. Your other collections are available in Settings → Marker Collections.`);
        });
    }

    function selectSetting(label, options, value, change) {
        const select = element("select");
        select.setAttribute("aria-label", label);
        for (const [key, text] of Object.entries(options)) {
            const option = element("option", (label + ": " + text).toUpperCase()); option.value = key; select.append(option);
        }
        select.value = value;
        select.addEventListener("change", () => safely(async () => { await change(select.value); select.blur(); savePreferences(); }));
        return select;
    }

    function panelPage() { const page = element("div"); page.style.margin = "8px"; return page; }

    function settings(section = settingsSection) {
        settingsSection = section === "Map" ? "Map Settings" : section;
        const map = panelPage(), appearance = panelPage();
        map.append(selectSetting("Game version", {4: "GTA IV", 5: "GTA V", 6: "GTA VI"}, game, value => {
            $("game").value = value; $("game").dispatchEvent(new Event("change"));
        }));
        map.append(selectSetting("GTA map type", {"2d": "2D", "3d": "3D"}, preferences.dimension, value => {
            preferences.dimension = value; configureMap();
        }));
        for (const version of [4,5,6]) {
            map.append(selectSetting("GTA " + GAMES[version] + " tile set", TILES[version], preferences.tiles[version], value => {
                preferences.tiles[version] = value;
                if (game === version) configureMap();
            }));
        }
        map.append(selectSetting("GTA VI tile overlays", {0: "Off", 1: "On"}, preferences.tileOverlays, value => {
            preferences.tileOverlays = Number(value); configureMap();
        }));
        appearance.append(selectSetting("Color scheme", {rgb: "RGB", grayscale: "Grayscale"}, preferences.mapColors, value => {
            preferences.mapColors = value; configureMap();
        }));
        appearance.append(selectSetting("Theme", {light: "Light", dark: "Dark", michael: "Michael", amanda: "Amanda", jimmy: "Jimmy", tracey: "Tracey"}, preferences.theme, value => {
            preferences.theme = value; configureMap();
        }));
        appearance.append(selectSetting("Marker colors", {name: "By name", type: "By type"}, preferences.markerColors, async value => {
            flushFields(); preferences.markerColors = value; await render();
        }));
        const content = openDialog("Settings", {kind: "settings", width: 768, height: 544, panel: true,
            buttons: [gtadb.Button({text: "ABOUT", tooltip: ".", click: () => about()})]});
        content.append(dialogPanel({"Map Settings": map, "Appearance": appearance, "Marker Collections": collectionSettings()}, settingsSection, name => { settingsSection = name; }));
    }

    function keyboardShortcuts() {
        const page = panelPage(), table = element("table");
        const rows = [
            ["0 1 2 3 4 5 6 7", "Set zoom level"], ["−", "Zoom out"], ["=", "Zoom in"], ["WHEEL", "Zoom"],
            ["← → ↑ ↓", "Pan (2D)"], ["W A S D", "Pan (3D)"], ["← →", "Rotate (3D)"], ["↑ ↓", "Pitch (3D)"],
            ["DRAG", "Move (3D)"], ["CMD+DRAG", "Rotate (3D)"], ["", ""],
            ["V", "Switch game version (GTA IV/V/VI)"], ["⇧ D", "Switch map view (2D/3D)"],
            ["T", "Switch tile set"], ["⇧ T", "Toggle overlays (GTA VI)"], ["", ""],
            ["F", "Find"], ["⇧ F", "Clear find"], ["C", "Copy coordinates to clipboard"],
            ["ENTER", "Focus on selected marker"], ["↑ ↓", "Select previous / next marker"], ["← →", "Select first / last marker"],
            ["ESC", "Deselect marker / finish editing"], ["TAB", "Switch focus between map and list"], ["H", "Toggle UI"], ["", ""],
            [".", "Open About dialog / switch from Settings"], [",", "Open Settings dialog / switch from About"],
            ["SPACE", "Toggle image dialog"], ["ESC", "Close dialog"], ["", ""],
            ["A", "Add marker"], ["E", "Edit marker / done"], ["DEL", "Remove marker"]
        ];
        for (const [key, description] of rows) {
            const row = element("tr"); row.append(element("td", key || "\u00a0"), element("td", description || "\u00a0")); table.append(row);
        }
        page.append(table); return page;
    }

    function about(section = aboutSection) {
        aboutSection = section;
        const info = panelPage(), source = panelPage();
        info.append(element("p", "Your personal GTA map. Drop markers, give them names and types, add tags and an image, and exchange collections as files."));
        info.append(element("p", "Everything you add stays in this browser. There are no accounts, and your markers and images are never uploaded. Export a backup before clearing browser data or moving to another browser."));
        info.append(element("p", "Use Edit to change the name, type, and tags directly. Empty names and types appear as ?. Saving ? clears that field. Tags are comma-separated; an empty tag list is shown as NONE."));
        info.append(element("p", "Changes are saved when you leave a field; marker moves and images are saved immediately. Coordinates can be removed and added again without deleting the marker. When sorted by name, the list shows when each marker was last edited."));
        info.append(element("p", "Map rendering and map assets by GTA DB and the original map creators."));
        const content = openDialog("GTA Markers Map", {kind: "about", width: 768, height: 544, panel: true,
            buttons: [gtadb.Button({text: "SETTINGS", tooltip: ",", click: () => settings()})]});
        content.append(dialogPanel({"About This Map": info, "Source Code": source, "Keyboard Shortcuts": keyboardShortcuts()}, aboutSection, name => { aboutSection = name; }));
    }

    async function showImage(blob, title) {
        const image = element("img"), url = URL.createObjectURL(blob);
        image.src = url; image.alt = title; image.id = "imageDialogImage";
        try {
            await image.decode();
            const scale = Math.min(1, (innerWidth - 32) / image.naturalWidth, (innerHeight - 64) / image.naturalHeight);
            const width = image.naturalWidth * scale, height = image.naturalHeight * scale;
            const content = openDialog(title, {kind: "image", width, height: height + 32});
            content.append(image);
            dialogCleanup = () => URL.revokeObjectURL(url);
        } catch (error) { URL.revokeObjectURL(url); throw error; }
    }

    async function toggleImage() {
        if (dialogKind === "image") { closeDialog(); return; }
        const item = marker();
        if (!item?.image) return;
        const blob = await repository.image(collection.id, item.game, item.id);
        if (blob) await showImage(blob, item.name || "?");
    }

    function applyFind(value = $("find").value) {
        $("find").value = value;
        appliedFind = value;
        return render();
    }

    function findLink(value) {
        const link = element("a", value, "findLink");
        link.href = "#";
        link.addEventListener("click", event => {
            event.preventDefault();
            safely(() => applyFind(value));
        });
        return link;
    }

    function setupEvents() {
        const bind = (id, action) => $(id).addEventListener("click", () => { if (!busy) safely(action); });
        bind("aboutButton", () => about()); bind("settingsButton", () => settings());
        bind("collectionIcon", manageCollections);
        bind("addButton", addMarker); bind("removeButton", removeMarker);
        bind("editButton", () => editing ? saveMarker() : startEditing());
        bind("closeItem", () => selectMarker(null));
        $("clearFind").addEventListener("mousedown", event => event.preventDefault());
        bind("clearFind", () => applyFind(""));
        bind("clearFilter", () => { $("filter").value = "all"; return render(); });
        bind("dimensionButton", () => { preferences.dimension = preferences.dimension === "2d" ? "3d" : "2d"; configureMap(); savePreferences(); });
        bind("showUI", () => { document.body.classList.remove("hideUI"); $("showUI").hidden = true; });
        $("importFile").addEventListener("change", () => { const file = $("importFile").files[0]; $("importFile").value = ""; safely(() => importCollection(file)); });
        $("find").addEventListener("input", () => { $("clearFind").hidden = !$("find").value; });
        $("find").addEventListener("change", () => {
            if (appliedFind !== $("find").value) safely(() => applyFind());
        });
        $("find").addEventListener("blur", () => {
            if (appliedFind !== $("find").value) safely(() => applyFind());
        });
        $("find").addEventListener("keydown", event => {
            if (event.key === "Enter") { event.preventDefault(); safely(() => applyFind()); $("find").blur(); }
        });
        $("filter").addEventListener("change", () => safely(render));
        $("sort").addEventListener("change", () => { preferences.sort = $("sort").value; savePreferences(); safely(render); });
        $("game").addEventListener("change", () => safely(async () => {
            if (busy || !leaveEditor()) { $("game").value = game; return; }
            preferences.views[game] = {...view}; game = Number($("game").value); view = preferences.views[game] || DEFAULTS[game];
            selected = null; appliedFind = $("find").value = ""; $("filter").value = "all";
            configureMap(); await render(); writeHash();
        }));
        $("listPanel").addEventListener("mousedown", () => setFocus("list"));
        $("itemPanel").addEventListener("mousedown", () => setFocus("list"));
        maps.element.addEventListener("mousedown", () => { if (!activeDialog) setFocus("map"); });
        maps.addEventListener("select", event => safely(() => selectMarker(event.detail.id ? Number(event.detail.id.slice(1)) : null)));
        maps.addEventListener("edit", event => safely(async () => {
            const id = Number(event.detail.id.slice(1));
            const [x, y] = event.detail.igCoordinates;
            if (!Number.isFinite(x) || !Number.isFinite(y)) return;
            await editMarker(id, "ig_coordinates", [x, y]);
        }));
        maps.addEventListener("mapchangeend", () => {
            const state = maps.get();
            view = {x: state.targetX, y: state.targetY, z: state.targetZ};
            writeHash();
        });
        maps.addEventListener("mapmousemove", event => {
            const {x, y, z, plusCode} = event.detail;
            lastCoordinates = [x, y, z];
            $("coordinates").textContent = z === false ? "LOADING ELEVATION DATA"
                : ![x, y, z].every(Number.isFinite) ? ""
                : [x, y, z].map(value => value.toFixed(1)).join(", ") + (plusCode ? " \u00a0 " + plusCode : "");
        });
        window.addEventListener("hashchange", () => safely(() => readHash()));
        window.addEventListener("beforeunload", event => { if (hasDraftChanges() || busy || pendingWrites || pendingImages) { event.preventDefault(); event.returnValue = ""; } });
        document.addEventListener("keydown", event => {
            if (event.ctrlKey || event.metaKey || event.altKey) return;
            const textEntry = event.target.closest('input, textarea, select, [contenteditable="true"]');
            if (!busy && !activeDialog && event.shiftKey && event.key.toLowerCase() === "f" && (!textEntry || textEntry === $("find"))) {
                event.preventDefault(); event.stopImmediatePropagation();
                safely(() => applyFind(""));
                return;
            }
            if (textEntry) {
                if (event.key === "Escape") textEntry.blur();
                return;
            }
            if (activeDialog) {
                let action;
                if (event.key === "Escape" || (event.key === " " && dialogKind === "image")) action = closeDialog;
                if (event.key === "," && dialogKind === "about") action = () => settings();
                if (event.key === "." && dialogKind === "settings") action = () => about();
                if (action) { event.preventDefault(); event.stopImmediatePropagation(); safely(action); }
                return;
            }
            // The shared map renderer also has a Google Maps shortcut; that mode is absent here.
            if (event.key.toLowerCase() === "g") { event.stopImmediatePropagation(); return; }
            if (busy) return;
            if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key) && focus === "list") {
                const visible = visibleMarkers(collection.markers.filter(item => item.game === game));
                if (!visible.length) return;
                const index = visible.findIndex(item => item.id === selected);
                const next = event.key === "ArrowLeft" ? 0 : event.key === "ArrowRight" ? visible.length - 1 :
                    event.key === "ArrowUp" ? Math.max(0, index - 1) : Math.min(visible.length - 1, index + 1);
                event.preventDefault(); event.stopImmediatePropagation();
                safely(async () => { await selectMarker(visible[next].id, true); $("listBody").querySelector(".selected")?.scrollIntoView({block: "nearest"}); });
                return;
            }
            if (event.key.toLowerCase() === "a" && preferences.dimension === "3d") return;
            if (event.key.toLowerCase() === "d" && !event.shiftKey) return;
            const actions = {
                a: addMarker, e: () => editing ? saveMarker() : startEditing(), Delete: removeMarker,
                f: () => { $("find").focus(); $("find").select(); },
                d: () => { if (event.shiftKey) $("dimensionButton").click(); },
                v: () => { $("game").value = game === 6 ? 4 : game + 1; $("game").dispatchEvent(new Event("change")); },
                t: () => {
                    if (event.shiftKey) preferences.tileOverlays = preferences.tileOverlays ? 0 : 1;
                    else { const keys = Object.keys(TILES[game]); preferences.tiles[game] = keys[(keys.indexOf(preferences.tiles[game]) + 1) % keys.length]; }
                    configureMap(); savePreferences();
                },
                c: () => { if (lastCoordinates?.every(Number.isFinite)) return navigator.clipboard.writeText(lastCoordinates.map(n => n.toFixed(3)).join(", ")); },
                Enter: () => { const item = marker(); if (item && hasCoordinates(item)) { setFocus("map"); maps.set({x: item.coordinates[0], y: item.coordinates[1], z: Math.max(view.z, 5)}); } },
                Tab: () => { if (focus === "map" && selected) { setFocus("list"); $("listBody").querySelector(".selected")?.focus(); } else { document.activeElement.blur(); setFocus("map"); } },
                h: () => { const hidden = document.body.classList.toggle("hideUI"); $("showUI").hidden = !hidden; },
                " ": toggleImage,
                Escape: () => editing ? saveMarker() : selectMarker(null), ",": () => settings(), ".": () => about()
            };
            const action = actions[event.key] || actions[event.key.toLowerCase()];
            if (action) { event.preventDefault(); event.stopImmediatePropagation(); safely(action); }
        }, true);
        window.addEventListener("focus", () => safely(refreshFromOtherTab));
        if ("BroadcastChannel" in window) {
            channel = new BroadcastChannel("gtadb-markers");
            channel.onmessage = () => safely(refreshFromOtherTab);
        }
    }

    async function refreshFromOtherTab() {
        if (busy || editing || pendingWrites || pendingImages) return;
        const latest = await repository.all();
        const current = latest.find(item => item.id === collection.id);
        collections = latest;
        if (!current) {
            if (!latest.length) return;
            collection = latest[0]; selected = null;
            notify("The active collection was removed in another tab. Switched to an available collection.");
        } else collection = current;
        if (selected && !marker()) selected = null;
        configureMap(); await render(); writeHash();
    }

    async function init() {
        try {
            const saved = JSON.parse(localStorage.getItem("gtadb-markers-preferences") || "{}");
            for (const key of ["theme", "markerColors", "mapColors", "dimension", "sort"]) if (typeof saved[key] === "string") preferences[key] = saved[key];
            for (const version of [4,5,6]) {
                if (saved.tiles?.[version] in TILES[version]) preferences.tiles[version] = saved.tiles[version];
                const point = saved.views?.[version];
                if (point && [point.x, point.y, point.z].every(Number.isFinite)) preferences.views[version] = point;
            }
            if (preferences.sort === "modifiedAt") preferences.sort = "modified";
            if (!["name", "type", "tags", "id", "modified", "x", "y"].includes(preferences.sort)) preferences.sort = "name";
            activeCollectionId = saved.activeCollectionId;
            if ([4,5,6].includes(saved.game)) game = saved.game;
        } catch { /* Start with defaults when browser preferences cannot be read. */ }
        await repository.open();
        collections = await repository.all();
        collection = collections.find(item => item.id === activeCollectionId) || collections[0];
        const state = parseHash();
        if (state.id && collections.some(item => item.id === state.id)) collection = collections.find(item => item.id === state.id);
        game = state.game; view = state.view || preferences.views[game];
        if (!gtadb.Maps || !gtadb.Dialog || !gtadb.Panel) throw new Error("The shared GTA DB map renderer could not be loaded. Check your connection and reload.");
        // The older flat-3D renderer defaults to /tiles on the app's own host.
        // Point it at the shared map host so markers.gtadb.org needs no tile copy.
        if (gtadb.Map3DFlat) {
            const original = gtadb.Map3DFlat;
            const source = [...document.scripts].find(script => /\/maps\.js(?:\?|$)/.test(script.src));
            const tileRoot = new URL("tiles/", new URL(".", source.src)).href.replace(/\/$/, "");
            const sharedFlat = function(options) { return new original({...options, tileRoot}); };
            sharedFlat.prototype = original.prototype;
            gtadb.Map3DFlat = sharedFlat;
        }
        maps = gtadb.Maps({parentElement: document.body, focused: true, mapModes: ["gta"], mapMode: "gta", v: game, dimension: preferences.dimension,
            gta4: {...DEFAULTS[4], tileSet: preferences.tiles[4]}, gta5: {...DEFAULTS[5], tileSet: preferences.tiles[5]}, gta6: {...DEFAULTS[6], tileSet: preferences.tiles[6]},
            x: view.x, y: view.y, z: view.z, landmarks: [], currentLandmarks: []});
        dialogLayer = gtadb.DialogLayer();
        document.body.append(dialogLayer.element);
        setupEvents(); configureMap();
        if (location.hash) await readHash(true);
        else { await render(); writeHash(); }
        // Small public surface for diagnostics; all changes still go through the UI/repository.
        window.markerApp = {get collection() { return structuredClone(collection); }, get game() { return game; }, get map() { return maps; }};
    }

    safely(init);
})();
