var express = require('express');
const ytdl = require('ytdl-core');
const fs = require('fs')
const path = require('path')
const ID3Writer = require('browser-id3-writer');
const Song = require('../models/Song')
const axios = require('axios')
var router = express.Router();
const publicPath = path.join(__dirname,'../public')

const getImage = async(url) => {
    try{
        const buffer = await axios.get(url, {
            responseType: 'arraybuffer'
        })
        return buffer.data
    }
    catch(e){
        return e
    }
}

/* GET home page. */
router.get('/', async(req, res, next) => {
  res.render('index', { title: 'Express' });
});

//QUERY PARAMS
//1- title (optional)
//2- artist (optional)
//3- videourl (required)

router.get('/download', async(req, res)=>{

    const queries = req.query

    try{
        const videoReadableStream = ytdl(req.query.videourl,
            {
                filter: "audioonly",
                quality: "highestaudio",
            })
        let fileName = queries.artist+' - '+ queries.title
        fileName = fileName.replace(/[/\\?%*:|"<>]/g, '');
        const videoWritableStream = fs.createWriteStream(publicPath + '/audio/'+ fileName+'.mp3');

        const stream = videoReadableStream.pipe(videoWritableStream);

        stream.on('finish', async() => {
            console.log('finish')
            const songBuffer = fs.readFileSync(publicPath + '/audio/'+fileName+'.mp3');
            const writer = new ID3Writer(songBuffer);
            writer.setFrame('TIT2', queries.title).setFrame('TPE1', queries.artist)
            if(queries.album){
                writer.setFrame('TALB', queries.album)
            }
            if(queries.albumReleaseDate){
                const date = new Date(queries.albumReleaseDate)
                const day = date.getDate()
                const month = date.getMonth()
                const year = date.getFullYear()
                // writer.setFrame('TDAT')
                writer.setFrame('TYER', year)
            }
            if(queries.tracks){

            }
            if(queries.label){
                writer.setFrame('TPUB', queries.label.toString())
            }
            if(queries.genre){
                writer.setFrame('TCON', queries.genre)
            }
            if(queries.artistPicture){
                const image = await getImage(queries.artistPicture)
                writer.setFrame('APIC', {
                    type: 8,
                    data: image,
                    description: 'Artist Image'
                })
            }
            if(queries.coverArt){
                const image = await getImage(queries.coverArt)
                writer.setFrame('APIC', {
                    type: 3,
                    data: image,
                    description: 'Cover Art'
                })
            }
            writer.addTag();

            const taggedSongBuffer = Buffer.from(writer.arrayBuffer);
            fs.writeFileSync(publicPath + '/audio/'+fileName+'.mp3', taggedSongBuffer);
            res.send({fileName: fileName+'.mp3'});
        });
    }
    catch(e){
        res.send(e)
    }
})

router.get('/file', async(req, res)=>{
    const file = publicPath + '/audio/'+req.query.filename
    res.download(file, req.query.filename,(er)=>{
        if(er){
            console.log(er)
        }
        fs.unlink(file, (err) => {
            if (err) {
                console.error(err)
                return
            }
            console.log('file Removed')
        })
    })
})

//QUERY PARAMS
//1- title (optional)
//2- artist (optional)
//3- videourl (required)
//4- musicbrainz (optional)(boolean)
//5- discogs (optional)(boolean)
//6- lastfm (optional)(boolean)
router.get('/getcoverarts', async(req,res)=>{
    let songTitle = ''
    let songArtist = ''
    if(req.query.artist && req.query.title){
        songTitle = req.query.title
        songArtist = req.query.artist
    }
    else{
        try{
            const result = await ytdl.getInfo(req.query.videourl, {},)
            if (result.videoDetails.media && result.videoDetails.media.song && result.videoDetails.media.artist){
                songTitle = result.videoDetails.media.song
                songArtist = result.videoDetails.media.artist
            }
            else{
                const simpleString = result.videoDetails.title.replace(/ *\([^)]*\) */g, "");
                console.log(simpleString)
                const stringArr = simpleString.split('-')
                if(stringArr.length>1){
                    songArtist = stringArr[0].toLowerCase().trim()
                    songTitle = stringArr[1].toLowerCase().trim()
                }
                else{
                    res.send("Couldn't extract enough data about the music from the url, try adding artist and track separately")
                }
            }
        }
        catch(e){
            res.send('INVALID SONG URL, try sending title and artist name as a query')
        }
    }
    console.log(songArtist+'-'+songTitle)
    const song = new Song(songArtist,songTitle)
    try{
        let response = []
        if (req.query.musicbrainz==='true'){
            const cover1 = await song.getCoverArtsFromMusicBrainz()
            response = [...response, ...cover1]
        }
        if (req.query.discogs==='true'){
            const cover2 = await song.getCoverArtsFromDiscogs()
            response = [...response, ...cover2]
        }
        if (req.query.lastfm==='true'){
            const cover3 = await song.getCoverArtsFromLastFM()
            response = [...response, ...cover3]
        }
        if (req.query.deezer==='true'){
            const cover4 = await song.getCoverArtsFromDeezer()
            response = [...response, ...cover4]
        }
        res.send(response)
    }
    catch(e){
        res.send(e)
    }
})

router.get('/gettags', async(req,res)=>{
    let songTitle = ''
    let songArtist = ''
    if(req.query.artist && req.query.title){
        songTitle = req.query.title
        songArtist = req.query.artist
    }
    else{
        try{
            const result = await ytdl.getInfo(req.query.videourl, {},)
            if (result.videoDetails.media && result.videoDetails.media.song && result.videoDetails.media.artist){
                songTitle = result.videoDetails.media.song
                songArtist = result.videoDetails.media.artist
            }
            else{
                const simpleString = result.videoDetails.title.replace(/ *\([^)]*\) */g, "");
                console.log(simpleString)
                const stringArr = simpleString.split('-')
                if(stringArr.length>1){
                    songArtist = stringArr[0].toLowerCase().trim()
                    songTitle = stringArr[1].toLowerCase().trim()
                }
                else{
                    res.send("Couldn't extract enough data about the music from the url, try adding artist and track separately")
                }
            }
        }
        catch(e){
            res.send('INVALID SONG URL, try sending title and artist name as a query')
        }
    }
    console.log(songArtist+'-'+songTitle)
    const song = new Song(songArtist, songTitle)
    try{
        let response = []
        if (req.query.musicbrainz === 'true'){
            const cover1 = await song.tagMusicWithMusicBrainz()
            response = [...response, ...cover1]
        }
        if (req.query.discogs === 'true'){
            const cover2 = await song.tagMusicWithDiscogs()
            response = [...response, ...cover2]
        }
        if (req.query.lastfm === 'true'){
            const cover3 = await song.tagMusicWithLastFM()
            response = [...response, ...cover3]
        }
        if (req.query.deezer === 'true'){
            const cover4 = await song.tagMusicWithDeezer()
            response = [...response, ...cover4]
        }
        res.send(response)
    }
    catch(e){
        res.send(e)
    }
})


module.exports = router;
