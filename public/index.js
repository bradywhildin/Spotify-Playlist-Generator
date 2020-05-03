Handlebars.registerHelper('needNewRow', function (index, options) {
    if ((index % 4 == 0) && (index != 0)) {
       return options.fn(this);
    } else {
       return options.inverse(this);
    }
 });

Handlebars.registerHelper("inc", function(index, options) {
    return parseInt(index) + 1;
});

var browserPlayerID;
(function() {
    /**
     * Obtains parameters from the hash of the URL
     * @return Object
     */
    function getHashParams() {
        var hashParams = {};
        var e, r = /([^&;=]+)=?([^&;]*)/g,
            q = window.location.hash.substring(1);
        while ( e = r.exec(q)) {
            hashParams[e[1]] = decodeURIComponent(e[2]);
        }
        return hashParams;
    }

    function getRandomInt(max) {
        return Math.floor(Math.random() * Math.floor(max));
    }

    var params = getHashParams();

    var access_token = params.access_token,
        refresh_token = params.refresh_token,
        error = params.error;

    window.onSpotifyWebPlaybackSDKReady = () => {
        const token = access_token;
        const player = new Spotify.Player({
        name: 'Web Playback SDK Quick Start Player',
        getOAuthToken: cb => { cb(token); },
        volume: 0.1
    });
    


    // Error handling
    player.addListener('initialization_error', ({ message }) => { console.error(message); });
    player.addListener('authentication_error', ({ message }) => { console.error(message); });
    player.addListener('account_error', ({ message }) => { console.error(message); });
    player.addListener('playback_error', ({ message }) => { console.error(message); });
    
    // Playback status updates
    player.addListener('player_state_changed', state => { console.log(state); });
    

    // Ready
    player.addListener('ready', ({ device_id }) => {
        console.log('Ready with Device ID', device_id);
        browserPlayerID = device_id;
    });
    
    // Not Ready
    player.addListener('not_ready', ({ device_id }) => {
        console.log('Device ID has gone offline', device_id);
    });
    
    // Connect to the player!
    player.connect();
    };

    function selectTrack(artistID, callback) {
        $.ajax({
        url: 'https://api.spotify.com/v1/artists/' + artistID + '/top-tracks?country=US',
        headers: {
            'Authorization': 'Bearer ' + access_token
        },
        success: function(response) {
            callback(response);
        }
        });
    }

    function allowToPlayArtistTracks() {
        var artistPlayButtons = document.getElementsByClassName("artistPlayBtn");

        for (i = 0; i < artistPlayButtons.length; i++) {
            artistPlayButtons[i].addEventListener('click', function() {
                $.ajax({
                    url: 'https://api.spotify.com/v1/me/player/play?device_id=' + browserPlayerID,
                    type: 'PUT',
                    headers: {
                        'Authorization': 'Bearer ' + access_token
                    },
                    dataType: "json",
                    contentType: "application/json",
                    data: JSON.stringify({
                        "uris": [`spotify:track:${this.getAttribute("data-track")}`],
                    }),
                    success: console.log("Playing track " + this.getAttribute("data-track"))
                });
            });
        };
    };

    function organizeArtistData(response) {
        var artists = [];
        for (i = 0; i < 20; i++) {
            artists.push({})
        }

        for (i = 0; i < 20; i++) {
            (function(i) {
                artistID = response.items[i].id;
                trackData = selectTrack(artistID, function(response2) {
                    track = {
                        name: response2.tracks[0].name,
                        id: response2.tracks[0].id
                    };
                    artist = {
                        name: response.items[i].name,
                        image: response.items[i].images[0].url,
                        track: track
                    }
                    artists[i] = artist;
                });
            })(i)
        }

        $(document).ajaxStop(function () {
            artistsPlaceholder.innerHTML = artistsTemplate(artists);
            allowToPlayArtistTracks();
        });
    }
/*
    function allowToPlayTopTracks() {
        var artistPlayButtons = document.getElementsByClassName("artistPlayBtn");

        for (i = 0; i < artistPlayButtons.length; i++) {
            artistPlayButtons[i].addEventListener('click', function() {
                $.ajax({
                    url: 'https://api.spotify.com/v1/me/player/play?device_id=' + browserPlayerID,
                    type: 'PUT',
                    headers: {
                        'Authorization': 'Bearer ' + access_token
                    },
                    dataType: "json",
                    contentType: "application/json",
                    data: JSON.stringify({
                        "uris": [`spotify:track:${this.getAttribute("data-track")}`],
                    }),
                    success: console.log("Playing track " + this.getAttribute("data-track"))
                });
            });
        };
    };
*/

    function organizeTrackData(response) {
        var tracks = [];
        for (i = 0; i < 50; i++) {
            tracks.push({})
        }

        for (i = 0; i < 50; i++) {
            (function(i) {
                track = {
                    artists: response.items[i].artists,
                    id: response.items[i].id,
                    image: response.items[i].album.images[0].url,
                    name: response.items[i].name
                }
                tracks[i] = track;
            })(i)
        }

        $(document).ajaxStop(function () {
            tracksPlaceholder.innerHTML = tracksTemplate(tracks);
            //allowToPlayTopTracks();
        });
    }

    var artistsSource = document.getElementById('artists-template').innerHTML,
        artistsTemplate = Handlebars.compile(artistsSource),
        artistsPlaceholder = document.getElementById('artists');

    var tracksSource = document.getElementById('tracks-template').innerHTML,
        tracksTemplate = Handlebars.compile(tracksSource),
        tracksPlaceholder = document.getElementById('tracks');

    if (error) {
        alert('There was an error during the authentication');
    } else {
        if (access_token) {
            $('#login').hide();
            $('#loggedIn').show();

            function hideAllSections() {
                $('#topArtists').hide();
                $('#topTracks').hide();
                $('.nav-item').removeClass('active');
            }

            hideAllSections()    
            $('#topArtists').show();
            $('#artistsBtn').addClass('active');

            document.getElementById("artistsBtn").addEventListener('click', function() {
                hideAllSections();
                $('#topArtists').show();
                $('#artistsBtn').addClass('active');
            });

            document.getElementById("tracksBtn").addEventListener('click', function() {
                hideAllSections();
                $('#topTracks').show();
                $('#tracksBtn').addClass('active');
            });

            $.ajax({
                url: 'https://api.spotify.com/v1/me/top/artists?limit=20',
                headers: {
                    'Authorization': 'Bearer ' + access_token
                },
                success: function(response) {
                    organizeArtistData(response);
                }
            });

            $.ajax({
                url: 'https://api.spotify.com/v1/me/top/tracks?limit=50',
                headers: {
                    'Authorization': 'Bearer ' + access_token
                },
                success: function(response) {
                    organizeTrackData(response);
                }   
            });
        
        } else {
            // render initial screen
            $('#login').show();
            $('#loggedIn').hide();
        }
    }
})();