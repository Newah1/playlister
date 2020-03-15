const express = require('express');
const spotify = require('spotify-web-api-node');
const download = require('youtube-mp3-downloader');
const config = require('./config/config');
const slugify = require('slugify');
const sanitize = require('sanitize-filename');

const Question = require('./src/Question');

const app = express();
const YD = new download({
    "ffmpegPath": config.youtube.ffmpeg_path,        // Where is the FFmpeg binary located?
    "outputPath": config.youtube.download_path,    // Where should the downloaded and encoded files be stored?
    "youtubeVideoQuality": "highest",       // What video quality should be used?
    "queueParallelism": 10,                  // How many parallel downloads/encodes should be started?
    "progressTimeout": 5000,                 // How long should be the interval of the progress reports
    "outputOptions" : ["-af", "silenceremove=1:0:-50dB"]
});
const yts = require('yt-search');

YD.on("finished", function (err, data) {
    console.log("finished downloading ", data.title);
});
YD.on("progress", function (progress) {
    console.log("downloading...", progress.videoId, progress.progress.percentage);
});
YD.on("error", function (error, data) {
    console.log("Error! ", error, data);
});



let downloading = {};


let scopes = ['user-read-private', 'user-read-email', 'playlist-read-private', 'user-library-read'];


let spotifyApi = new spotify({
    clientId: config.spotify.clientID,
    clientSecret: config.spotify.clientSecret,
    redirectUri: config.spotify.redirectUri
});

let authorizeURL = spotifyApi.createAuthorizeURL(scopes, "state");

console.log("Use the following link to authorize your app: ", authorizeURL);

const server = app.listen(config.port, _ => console.log("_"));
let code = "";
let promises = [];

let callback;
app.get('/callback', (req, res) => {
    code = req.query.code;
    console.log("Your code is " + code);
    res.send("This is your code : " + req.query.code + "<script>window.close();</script>");
    callback();
    server.close();
});


let access_token = "";
let refresh_token = "";
let playlists = [];
let raw_playlist_data = [];
let tracks = [];
callback = function () {
    spotifyApi.authorizationCodeGrant(code).then((data) => {
        access_token = data.body['access_token'];
        refresh_token = data.body['refresh_token'];
        spotifyApi.setAccessToken(access_token);
        spotifyApi.setRefreshToken(refresh_token);
        return true;
    }).catch(err => {
        console.log(err);
    }).then(() => {
        return spotifyApi.getMe().then(me => {
            return me.body.id;
        }).catch(err => {
            throw err;
        });
    }).then(user_id => {
        return spotifyApi.getUserPlaylists(user_id).then(playlists => {
            raw_playlist_data = playlists.body;
            return playlists.body.items;
        }).catch(err => {
            throw err;
        });
    }).then(raw_playlists => {
        raw_playlists.forEach(playlist => {
            playlists.push(playlist.name);
        });
        playlists.push("My Saved Tracks");
        let q = new Question();
        return q.prompt("list", "Which playlist do you want to download?", playlists, "playlist").then(answer => {
            return answer;
        });
    }).then(chosen => {
        if (chosen.playlist == "My Saved Tracks") {
            console.log("My Saved Tracks chosen");
            let total = 0;

            return spotifyApi.getMySavedTracks({
                limit: 50,
                offset: 0
            }).then(data => {
                tracks = data.body.items;
                total = data.body.total;
                return total;
            }).catch(err => {
                throw err;
            }).then(total => {
                if (total > 50) {
                    let loops = Math.floor(total / 50) - 1;
                    let i = 0;

                    function append(tracks_to_append) {
                        tracks = tracks.concat(tracks_to_append);
                    }

                    async function track_loop() {
                        let trc = await spotifyApi.getMySavedTracks({
                            limit: 50,
                            offset: 50 * (i + 1)
                        });
                        try {
                            append(trc.body.items);
                        } catch (err) {
                            return err;
                        }
                        i++;
                        if (i <= loops) {
                            await track_loop();
                        } else {
                            return tracks;
                        }
                    }

                    return track_loop().then(data => {
                        return data;
                    }).catch(err => {
                        throw err;
                    });

                } else {
                    return tracks;
                }
            }).then(trc => {
                return tracks;
            });
        } else {
            let playlist_id = "";
            raw_playlist_data.items.forEach(pl => {
                if (pl.name == chosen.playlist) {
                    return playlist_id = pl.id;
                }
            });
            let loops = 0;
            let offset = 0;
            let i = 0;
            console.log(playlist_id);
            function append_tracks(trc){
                tracks = tracks.concat(trc);
            }
            async function loop_get_tracks() {
                try {
                    let data = await spotifyApi.getPlaylistTracks(playlist_id, {limit: 100, offset: (100 * i)});
                    append_tracks(data.body.items);
                    if(data.body.total > 100 && ((loops == 0 || loops > 0) && i <= loops)){
                        i++;
                        loops = Math.floor(data.body.total / 100);
                        try {
                            await loop_get_tracks();
                            return tracks;
                        }catch (err){
                            console.log(err);
                            return err;
                        }
                    } else {
                        return tracks;
                    }
                }catch(err) {
                    console.log(err);
                    return err;
                }
            }

            return loop_get_tracks();
        }
    }).then(tracks => {
        return new Question().prompt("confirm", `Download ${tracks.length} tracks.`, [], "confirm");
    }).then(should_continue => {
        if (should_continue.confirm) {
            async function loop_download() {
                for (let track of tracks) {
                    yts(track.track.name + " " + track.track.artists[0].name, function (err, results) {
                        if(err) return;
                        if (results) {

                            try {
                                const videos = results.videos;
                                if(videos.length) {
                                    let id = videos[0].videoId;
                                    let title = videos[0].title;
                                    if (title.length === 0) {
                                        title = new Date().getTime();
                                    }
                                    YD.download(id, sanitize((title + '.mp3')));
                                }
                            } catch (err) {

                            }
                        }
                    });
                }
            }

            return loop_download();
        } else {
            console.log("Done.");
        }
    });
};
