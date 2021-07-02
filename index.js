#!/usr/bin/env node

const { getVideoInfo, download, getQualities, getTypeFormats, getPlayerResponse } = require("./yt")
const ora = require("ora")
const inquirer = require("inquirer")

let argv = require('minimist')(process.argv.slice(2));

function downloadFromPrompt() {
    inquirer.prompt([
        {
            type: "input",
            message: "URL or ID of video",
            name: "url",
        },
        {
            type: "list",
            message: "Download Type",
            name: "downloadType",
            default: "normal",
            choices: ["normal", "onlyVideo", "onlyAudio"]
        }
    ]).then(async answers => {

        let info = await getVideoInfo(answers.url)

        let adaptiveFormats = getPlayerResponse(info).streamingData.adaptiveFormats

        let qualities = getQualities(getPlayerResponse(info).streamingData.formats)
        
        if (answers.downloadType == "onlyAudio")
            qualities = getQualities(getTypeFormats(adaptiveFormats, "audio"), "audioQuality")

        if (answers.downloadType == "onlyVideo")
            qualities = getQualities(getTypeFormats(adaptiveFormats, "video"))
    
        inquirer.prompt([
            {
                type: "list",
                choices: qualities,
                name: "quality",
                message: "Select the quality",    
            },
            {
                type: "input",
                message: "Output file",
                name: "filename",
                default: null
            },
        ]).then(q => {
            download(info, q.filename, q.quality, answers.downloadType)
        })
    })
}

async function downloadFromArgs() {
    let downloadType = argv.d || argv["download-type"] || "normal"
    let url = argv._[0]
    let info = await getVideoInfo(url)
    download(info, argv.o || argv.output, argv.quality || argv.q, downloadType)

}

// ._.
if (argv._.length == 0) downloadFromPrompt()
else downloadFromArgs()
