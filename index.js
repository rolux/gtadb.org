

const page = document.body.classList[0]

function updateBanner() {
    const element = page == "map" ? document.body : document.getElementById("banner")
    const now = new Date()
    const hours = now.getHours()
    const seconds =
        now.getMinutes() * 60 +
        now.getSeconds() +
        now.getMilliseconds() / 1000
    const path = page == "guess" ? "guess.gtadb.org/screenshots/G0"
        : page == "files" ? "files.gtadb.org"
        : "gtadb.org/images"
    const name = page == "gtadb" ? "Grassrivers"
        : page == "map" ? (now.getDay() < 7 ? "Paleto Bay" : "LosSantosElevationMapDetail")
        : page == "maps" ? "banner404"
        : page == "api" ? ["WashingtonBeach", "ViceBeach"][now.getDay() % 2]
        : page == "software" ? ["bannerLeonidaKeys", "bannerWatsonBay", "bannerHamletPrison"][hours % 3]
        : page == "guess" ? ["01_T1_8", "02_T1_9"][hours % 2]
        : page == "files" ? "LosSantosElevationMap"
        : page == "links" ? (hours < 6 || hours >= 18 ? "Blueprint" : "Blueprint")
        : ["bannerPortGellhorn", "bannerPortGellhorn"][hours % 2]
    const ext = page == "files" ? "png" : "jpg"
    element.style.backgroundImage = `url(https://${path}/${name}.${ext})`
    if (page == "gtadb") {
        const position = 1 - Math.abs(seconds / 3600 - 1)
        element.style.backgroundPosition = `${position * 100}% center`
    } else if (page == "map" || page == "api" || page == "files" || page == "links") {
        const position = 1 - Math.abs(seconds / 3600 - 1)
        element.style.backgroundPosition = `center ${position * 100}%`;
    }
}

updateBanner()

if (page == "gtadb" || page == "api" || page == "files") {
    window.setInterval(updateBanner, 100)
}
