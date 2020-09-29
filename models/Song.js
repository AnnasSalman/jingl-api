const axios = require('axios')


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
            return (
                [
                    {
                        source:"LastFM",
                        id: track.url,
                        title: track.name,
                        artist: track.artist.name.split(", "),
                        album: track.album.title,
                        genre: track.toptags.tag.map((genre)=>genre.name)
                    }
                ]
            )
        }
        catch(e){
            console.log('Problem Fetching tags with LASTFM')
            console.log(e)
            return []
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
            const response = info.data.results.map((result)=>{
                return(
                    {
                        id: result.id.toString(),
                        source: "Discogs",
                        title: this.title,
                        artist: [this.artist],
                        genre: result.genre,
                        label: result.label
                    }
                )
            })
            return response
        }
        catch(e){
            console.log('Problem Fetching tags with DISCOGS')
            return[]
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
            console.log(info.data.recordings.length)
            const response = info.data.recordings.map((recording)=>{
                return({
                    id: recording.id.toString(),
                    source: "MusicBrainz",
                    title: recording.title,
                    artist: recording["artist-credit"].map((artist)=>artist.name),
                    album: recording.releases?recording.releases[0].title:null,
                    albumReleaseDate: recording.releases?recording.releases[0].date:null,
                    tracks: recording.releases?recording.releases[0]["track-count"]:null
                })
            })
            return response
        }
        catch(e){
            console.log('Problem Fetching tags with MUSICBRAINZ')
            return []
        }
    }

    async tagMusicWithDeezer(){
        try{
            const info =
                await axios.request({
                    url: 'https://api.deezer.com/search?q=artist:%22ollie%22%20track:%22feelings%22',
                    method: "get",
                    params: {
                        q: 'artist:'+'"'+this.artist+'"'+" "+"track:"+'"'+this.title+'"',
                    }
                })
            const response = info.data.data.map((result, index)=>{
                return(
                    {
                        id: result.id.toString(),
                        source: "Deezer",
                        title: result.title,
                        artist: [result.artist.name],
                        artistPicture1: result.artist.picture,
                        artistPicture2: result.artist.picture_medium,
                        album: result.album.title
                    }
                )
            })
            return response
        }
        catch(e){
            console.log('Problem Fetching tags with DEEZER')
            return[]
        }
    }

    async getCoverArtsFromMusicBrainz(){
        try{
            const releases =
            await axios.request({
                url: 'https://musicbrainz.org/ws/2/release',
                method: "get",
                params: {
                    query: this.title.toLowerCase()+' AND '+'artist='+this.artist
                }
            })
            let images = []
            if(releases.data.releases){
                const songids = releases.data.releases.map((release)=>{
                    return release.id
                })
                for(const songid of songids){
                    try{
                        const arts = await axios.request({
                            url: 'https://coverartarchive.org/release/'+songid,
                            method: "get",
                        })
                        images.push({source: "MusicBrainz", ...arts.data.images[0]})
                    }
                    catch{
                    }
                }
            }
            return images
        }
        catch(e){
            console.log('Problem Fetching covers with MUSICBRAINZ')
            return []
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
                        source: "Discogs",
                        image: result.cover_image,
                        thumbnails: {}
                    })
                }
            })
            return images
        }
        catch(e){
            console.log('Problem Fetching covers with DISCOGS')
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
                let images = {source: "LastFM"}
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
            console.log('Problem Fetching covers with LASTFM')
            return []

        }
        catch(e){
            console.log('Problem Fetching covers with LASTFM')
            console.log(e)
            return e
        }
    }

    async getCoverArtsFromDeezer(){
        try{
            const info =
                await axios.request({
                    url: 'https://api.deezer.com/search?q=artist:%22ollie%22%20track:%22feelings%22',
                    method: "get",
                    params: {
                        q: 'artist:'+'"'+this.artist+'"'+" "+"track:"+'"'+this.title+'"',
                    }
                })
            const response = info.data.data.map((result, index)=>{
                return(
                    {
                        source: "Deezer",
                        image: result.album.cover_big,
                        thumbnails: {
                            "0": result.album.cover_small,
                            "1": result.album.cover_medium,
                            "2": result.album.cover_xl,

                        }
                    }
                )
            })
            return(response)
        }
        catch(e){
            console.log('Problem Fetching covers with DEEZER')
            return[]
        }
    }
}

module.exports = Song
