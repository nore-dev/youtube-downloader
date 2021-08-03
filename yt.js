const miniget = require("miniget")
const queryString = require("querystring")
const ora = require("ora")
const fs = require("fs")

const INFO_URL = "https://www.youtube.com/get_video_info"

function getId(url) {
    try {
        let uwu = new URL(url)
        let sj = uwu.pathname.split("/")

        if (uwu.hostname.endsWith("youtube.com") || uwu.hostname.endsWith("youtu.be")) {
            let v = uwu.searchParams.get("v")
            if (v) return v
            else return sj[sj.length-1]
        }
        else {
            console.log("Please enter a valid url")
            process.exit(1)
        }
    } catch (_) { return url }

}

async function getVideoInfo(url) {
    
    let id = getId(url.trim())
    let spinner = ora("Getting info").start()
    let eurl = `https://youtube.googleapis.com/v/${id}`
    let infoUrl = new URL(INFO_URL)

    infoUrl.searchParams.set("video_id", id)
    infoUrl.searchParams.set("eurl", eurl)
    infoUrl.searchParams.set("cver", "7.20210622.10.00")
    infoUrl.searchParams.set("c", "TVHTML5")
    infoUrl.searchParams.set("html5", "1")

    let res = await miniget(infoUrl.href).text()

    let info = queryString.parse(res)

    if (!getPlayerResponse(info).streamingData) {
        spinner.fail("Video not found")
        process.exit(1)
    }

    info.id = id

    spinner.succeed("Info recevied!")
    return info
}

function getTypeOfFormat(format) {
    return format.mimeType.split(" ")[0].split("/")[0]
}

function getPlayerResponse(info) {
    
    if (info.status == "fail") {
        console.log("\n" + info.reason)
        process.exit(1)
    }
    
    return JSON.parse(info.player_response)
}

function getQualities(formats, qualitySelector = "qualityLabel") {
    return [...new Set(formats.map(format => format[qualitySelector]))]
}

function getFormat(formats, quality, qualitySelector) {
    return formats.find(format => format[qualitySelector] == quality )
}

function getTypeFormats(formats, type) {
    return formats.filter(format => getTypeOfFormat(format) == type)
}

function download(info, filename = null, quality = null, downloadType = "normal") {

    
    let extension = ".mp4"
    let playerResponse = getPlayerResponse(info)

    let streamingData = playerResponse.streamingData

    let formats = streamingData.formats
    let adaptiveFormats = streamingData.adaptiveFormats

    let spinner = ora("Downloading...").start()


    let currFormats = formats
    let qualitySelector = "qualityLabel"

    let format = null

    if (downloadType == "only-video" || downloadType == "only-audio")
        currFormats = adaptiveFormats

    if (downloadType == "only-audio") {
        qualitySelector = "audioQuality"
        extension = ".mp3"
    }

    if (!quality) quality = currFormats[currFormats.length-1][qualitySelector]

    format = getFormat(currFormats, quality, qualitySelector)

    if (!format) {
        spinner.fail("Format not found")
        return
    }

    if (format.signatureCipher || playerResponse.playabilityStatus.status != "OK") {
        
        spinner.fail("yutup ne yaptin yutub :(")
        return
    }

    miniget(format.url).pipe(fs.createWriteStream(filename + extension)
    .on("finish", () => {
        spinner.succeed("Downloaded!")
    }).on("error", () => {
        spinner.fail("Sorry :(")   
    }))

}

module.exports = {getVideoInfo, getId, download, getQualities, getTypeFormats, getPlayerResponse}