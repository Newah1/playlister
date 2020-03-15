# Playlister for Spotify

A command line tool for downloading all of the songs in your playlist from YouTube.

## Getting Started

You'll need a developer account with Spotify, which is free and easy to sign up for. https://www.spotify.com/us/account/apps/

You'll also need a copy of [ffmpeg](https://www.ffmpeg.org/), and will need to point to it from the config file.


### Configuring

After installing ffmpeg and creating your application, your config file will need the following.

1. Your Spotify client ID
2. Your Spotify client secret
3. The file path to your ffmpeg install
4. Optionally, configure the path you want your music downloaded to.

```
{
  "port": "8080",
  "spotify": {
    "clientID" : "YOUR_CLIENT_ID",
    "clientSecret" : "YOUR_CLIENT_SECRET",
    "redirectUri" : "http://localhost:8080/callback"
  },
  "youtube": {
    "download_path": "mp3/",
    "ffmpeg_path": "/usr/bin/ffmpeg"
  }
}

```

Once configured properly, you'll be ready to go!


Run:
```
npm install
```

and:
```
node index.js
```

You will be prompted to follow a link. Follow it, and after authorizing your app, you will be redirected to an express JS application that stores the code returned by Spotify. It will automatically store this and use it in the following steps.

Return to the command line, and you will see a list of the playlists connected to your account. Use the arrow keys to choose one, and press enter.

````
? Which playlist do you want to download? (Use arrow keys)
❯ Coldplay Albums 
  Beatles Greatest Hits 
  Songs that scratch that itch 
  Retro Electro / Electro Pop / Synth Pop 
  Workout Motivation Epic Music  
  Feeling Accomplished 
````

From here it will find all of the tracks and confirm your download. 
## Authors

* **Noah Doughton**  - [website](https://noahdoughton.com)

## License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details
