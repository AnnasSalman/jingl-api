const axios = require('axios')

const getImage = (url) => {
    try{
        const buffer = axios.get(url, {
            responseType: 'arraybuffer'
        })
        return buffer
    }
    catch(e){
        return e
    }
}

class Song {
    // constructor(rawName) {
    //     const values = "Artist - Title".split('-').map(i=>i.trim());
    //     // creates : values = ["Artist","Title"]
    //     var artist = values[0];
    //     var title = values[1];
    // }
    constructor(artist, title) {
        this.artist = artist
        this.title = title
    }

    async tagMusicWithLastFM(){
        try{
            const info =
                await axios.request({
                url: 'http://ws.audioscrobbler.com/2.0/',
                method: "get",
                params: {
                    method: 'track.getInfo',
                    api_key: process.env.APIkey,
                    artist: this.artist,
                    track: this.title,
                    format: 'json'
                }
            })
            const track = info.data.track
            const albumArt = await getImage(track.album.image[track.album.image.length-1]["#text"])
            console.log(track.artist.name.split(", "))
            return (
                {
                    title: track.name,
                    artist: track.artist.name.split(", "),
                    album: track.album.title,
                    image: albumArt.data
                }
            )
        }
        catch(e){
            return e
        }
    }

    async tagMusicWithDiscogs(){
        try{
            const info =
                await axios.request({
                    url: 'https://api.discogs.com/database/search',
                    method: "get",
                    params: {
                        track: this.title.toLowerCase(),
                        artist: this.artist.toLowerCase(),
                        key: process.env.ConsumerKeyDiscogs,
                        secret: process.env.ConsumerSecretDiscogs
                    }
                })
            const results = info.data.results
            return results
        }
        catch(e){
            return(e)
        }
    }

    async tagMusicWithMusicBrainz(){
        try{
            const info =
                await axios.request({
                    url: 'https://musicbrainz.org/ws/2/recording',
                    method: "get",
                    params: {
                        query: '"'+this.title.toLowerCase()+'" AND '+'artist='+this.artist
                    }
                })
            return info.data
        }
        catch(e){
            return e
        }
    }

    async getCoverArtsFromMusicBrainz(){
        try{
            const releases =
            await axios.request({
                url: 'https://musicbrainz.org/ws/2/release',
                method: "get",
                params: {
                    query: '"'+this.title.toLowerCase()+'" AND '+'artist='+this.artist
                }
            })
            let images = []
            if(releases.data.releases){
                const songids = releases.data.releases.map((release)=>{
                    return release.id
                })
                for(const songid of songids){
                    console.log(songid)
                    try{
                        const arts = await axios.request({
                            url: 'https://coverartarchive.org/release/'+songid,
                            method: "get",
                        })
                        images.push(arts.data.images[0])
                    }
                    catch{
                    }
                }
            }
            return images
        }
        catch(e){
            return e
        }
    }

    async getCoverArtsFromDiscogs(){
        try{
            const info =
                await axios.request({
                    url: 'https://api.discogs.com/database/search',
                    method: "get",
                    params: {
                        track: this.title.toLowerCase(),
                        artist: this.artist.toLowerCase(),
                        key: process.env.ConsumerKeyDiscogs,
                        secret: process.env.ConsumerSecretDiscogs
                    }
                })
            const results = info.data.results
            const images = results.map((result)=>{
                if(result.cover_image){
                    return ({
                        image: result.cover_image
                    })
                }
            })
            return images
        }
        catch(e){
            return []
        }
    }

    async getCoverArtsFromLastFM(){
        try{
            const info =
                await axios.request({
                    url: 'http://ws.audioscrobbler.com/2.0/',
                    method: "get",
                    params: {
                        method: 'track.getInfo',
                        api_key: process.env.APIkey,
                        artist: this.artist,
                        track: this.title,
                        format: 'json'
                    }
                })
            if(info.data.track && info.data.track.album && info.data.track.album.image){
                let images = {}
                let thumbnails = {}
                info.data.track.album.image.forEach((imag, index)=>{
                    if (index === info.data.track.album.image.length-1){
                        images={...images, image: imag["#text"], thumbnails}
                    }
                    else{
                        thumbnails[index] = imag["#text"]
                    }
                })
                return [images]
            }
            return []

        }
        catch(e){
            return e
        }
    }
}

module.exports = Song
