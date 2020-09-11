var express = require('express');
const ytdl = require('ytdl-core');
const fs = require('fs')
const path = require('path')
const ID3Writer = require('browser-id3-writer');
const Song = require('../models/Song')
var router = express.Router();
const publicPath = path.join(__dirname,'../public')

/* GET home page. */
router.get('/', async(req, res, next) => {
  res.render('index', { title: 'Express' });
});

//QUERY PARAMS
//1- title (optional)
//2- artist (optional)
//3- videourl (required)

router.get('/download', async(req, res)=>{
    let songTitle = ''
    let songArtist = ''
    if(req.query.artist && req.query.title){
        songTitle = req.query.title
        songArtist = req.query.artist
    }
    else{
        try{
            const result = await ytdl.getInfo(req.query.videourl, {},)
            songTitle = result.videoDetails.media.song
            songArtist = result.videoDetails.media.artist
        }
        catch(e){
            res.send('INVALID SONG URL, try sending title and artist name as a query')
        }
    }
    const song = new Song(songArtist, songTitle)
    try{
        const songInfo = await song.tagMusicWithDiscogs()
        const videoReadableStream = ytdl(req.query.videourl,
            {
                filter: "audioonly",
                quality: "highestaudio",
            })

        const videoWritableStream = fs.createWriteStream(publicPath + '/audio/video.mp3');
        const stream = videoReadableStream.pipe(videoWritableStream);

        stream.on('finish', async() => {

            const songBuffer = fs.readFileSync(publicPath + '/audio/video.mp3');

            const writer = new ID3Writer(songBuffer);
            const tags = songInfo[0]
            writer.setFrame('TIT2', songTitle)
                .setFrame('TPE1', songArtist.split(', '))
                .setFrame('TALB', 'Friday Night Lights')
                .setFrame('TYER', 2004)
                .setFrame('APIC', {
                    type: 3,
                    data: songInfo.image,
                    description: 'Super picture'
                });
            writer.addTag();

            const taggedSongBuffer = Buffer.from(writer.arrayBuffer);
            fs.writeFileSync(publicPath + '/audio/newvideo.mp3', taggedSongBuffer);
            const file = publicPath + '/audio/newvideo.mp3'
            res.download(file, 'shaaba.mp3');
        });
    }
    catch(e){
        res.send(e)
    }
})

router.get('/gettagsonly', async(req,res)=>{
    const song = new Song('Twenty One pilots', 'heathens')
    try{
        let response = []
        if (req.query.musicbrainz){
            const cover1 = await song.getCoverArtsFromMusicBrainz()
            response = [...response, ...cover1]
        }
        if (req.query.discogs){
            const cover2 = await song.getCoverArtsFromDiscogs()
            response = [...response, ...cover2]
        }
        if (req.query.lastfm){
            console.log('yos')
            const cover3 = await song.getCoverArtsFromLastFM()
            response = [...response, ...cover3]
        }
        res.send(response)
    }
    catch(e){
        res.send(e)
    }
})

router.get('/downloadonly', (req,res)=>{

})

module.exports = router;
