const miniget = require("miniget")
const queryString = require("querystring")
const ora = require("ora")
const fs = require("fs")

const INFO_URL = "https://www.youtube.com/get_video_info"

function getId(url) {
    // :(
    if (url.startsWith("https://www.youtube.com/watch")) {
        watchUrl = new URL(url)
        return watchUrl.searchParams.get("v")
    } else if (url.length == 11) {
        return url
    } else {
        console.log("Not a url or id")
        process.exit(1)
    }
}

function getEurl(id) {
    return `https://youtube.googleapis.com/v/${id}`
}

async function getVideoInfo(url) {
    
    let id = getId(url)
    let spinner = ora("Getting info").start()

    miniget(`http://gdata.youtube.com/feeds/api/videos/${id}`).text()
    .catch(_ => {
        spinner.fail("Video not found")
        process.exit(1)
    })

    let eurl = getEurl(id)
    let infoUrl = new URL(INFO_URL)

    infoUrl.searchParams.set("video_id", id)
    infoUrl.searchParams.set("eurl", eurl)
    infoUrl.searchParams.set("cver", "7.20210622.10.00")
    infoUrl.searchParams.set("c", "TVHTML5")
    infoUrl.searchParams.set("html5", "1")


    let res = await miniget(infoUrl.href).text()
    let info = queryString.parse(res)


    info.id = id

    spinner.succeed("Info recevied!")
    return info
}

function getTypeOfFormat(format) {
    return format.mimeType.split(" ")[0].split("/")[0]
}

function getPlayerResponse(info) {
    return JSON.parse(info.player_response)
}

function getQualities(formats, qualitySelector = "qualityLabel") {
    return [...new Set(formats.map(format => format[qualitySelector]))]
}

function getFormat(formats, quality, qualitySelector) {
    return formats.find(format => format[qualitySelector] == quality )
}

// uh
function getTypeFormats(formats, type) {
    return formats.filter(format => getTypeOfFormat(format) == type)
}

async function download(info, filename = null, quality = null, downloadType = "normal") {
    let extension = ".mp4"
    let playerResponse = getPlayerResponse(info)

    console.log(playerResponse)
    let streamingData = playerResponse.streamingData

    let formats = streamingData.formats
    let adaptiveFormats = streamingData.adaptiveFormats

    let spinner = ora("Downloading...").start()


    let currFormats = formats
    let qualitySelector = "qualityLabel"

    let format = null

    if (downloadType == "onlyVideo" || downloadType == "onlyAudio") {
        currFormats = adaptiveFormats
    }

    if (downloadType == "onlyAudio") {
        qualitySelector = "audioQuality"
        extension = ".mp3"
    }

    if (!filename) filename = info.id

    if (!quality) quality = currFormats[currFormats.length-1][qualitySelector]

    format = getFormat(currFormats, quality, qualitySelector)

    if (!format) {
        spinner.fail("Format not found")
        return
    }

    if (format.signatureCipher || playerResponse.playabilityStatus.status != "OK") {
        // TODO: Signature Cipher
        spinner.fail("Sorry :(")
        return
    }

    await miniget(format.url).pipe(fs.createWriteStream(filename + extension)
    .on("finish", () => {
        spinner.succeed("Downloaded!")
    }))

}

module.exports = {getVideoInfo, getId, download, getQualities, getFormat, getTypeFormats, getPlayerResponse}