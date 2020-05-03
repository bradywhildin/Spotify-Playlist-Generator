(function() {
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
        var trackIDs = [];

        for (i = 0; i < artistPlayButtons.length; i++) {
            trackIDs.push("");
        }

        for (i = 0; i < artistPlayButtons.length; i++) {
            (function(i) {
                artistPlayButtons[i].addEventListener('click', function(event) {
                    trackIDs[i] = artistPlayButtons[i].nextSibling.nextSibling.value;
                    console.log(this.nextSibling.value);
                    $.ajax({
                        url: 'https://api.spotify.com/v1/me/player/play?device_id=' + browserPlayerID,
                        type: 'PUT',
                        headers: {
                            'Authorization': 'Bearer ' + access_token
                        },
                        dataType: "json",
                        contentType: "application/json",
                        data: JSON.stringify({
                            "uris": [`spotify:track:${trackIDs[i]}`],
                        }),
                        success: console.log("Playing track " + trackIDs[i])
                    });
                    return false;
                });
            })(i);
        };
    };

    function organizeArtistData(response) {
        var artists = [];
        for (i = 0; i < 20; i++) {
            artists.push({})
        }

        for (i = 0; i < 20; i++) {
            (function(i) {
                const artistID = response.items[i].id;
                selectTrack(artistID, function(response2) {
                    const artist = {
                        name: response.items[i].name,
                        image: response.items[i].images[0].url,
                        tracks: response2.tracks
                    }
                    artists[i] = artist;
                });
            })(i)
        }

        console.log(artists);

        $(document).ajaxStop(function () {
            artistsPlaceholder.innerHTML = artistsTemplate(artists);
            allowToPlayArtistTracks();
        });
    }

    function allowToPlayTopTracks() {
        var trackPlayButtons = document.getElementsByClassName("trackPlayBtn");

        for (i = 0; i < trackPlayButtons.length; i++) {
            trackPlayButtons[i].addEventListener('click', function(event) {
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

                return false;
            });
        };
    };

    function organizeTrackData(response) {
        var tracks = [];
        for (i = 0; i < 50; i++) {
            tracks.push({})
        }

        for (i = 0; i < 50; i++) {
            (function(i) {
                const track = {
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
            allowToPlayTopTracks();
        });
    }

    var artistsSource = document.getElementById('artists-template').innerHTML,
        artistsTemplate = Handlebars.compile(artistsSource),
        artistsPlaceholder = document.getElementById('artists');

    var tracksSource = document.getElementById('tracks-template').innerHTML,
        tracksTemplate = Handlebars.compile(tracksSource),
        tracksPlaceholder = document.getElementById('tracks');
    
    function displayStats(timeRange) {
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
            url: 'https://api.spotify.com/v1/me/top/artists?time_range=' + timeRange + '&limit=20',
            headers: {
                'Authorization': 'Bearer ' + access_token
            },
            success: function(response) {
                organizeArtistData(response);
            }
        });

        $.ajax({
            url: 'https://api.spotify.com/v1/me/top/tracks?time_range=' + timeRange + '&limit=50',
            headers: {
                'Authorization': 'Bearer ' + access_token
            },
            success: function(response) {
                organizeTrackData(response);
            }   
        });
    }

    document.getElementById("refreshBtn").addEventListener("click", function()  {
        timeRange = document.getElementById("timeRangeDropdown").value;
        displayStats(timeRange);
    })

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

    var params = getHashParams();

    var access_token = params.access_token,
        refresh_token = params.refresh_token,
        error = params.error;

    if (error) {
        alert('There was an error during the authentication');
    } else {
        if (access_token) {
           displayStats("long_term");
        } else {
            // render initial screen
            $('#login').show();
            $('#loggedIn').hide();
        }
    }
    
    window.onSpotifyWebPlaybackSDKReady = () => {
        const token = access_token;
        const player = new Spotify.Player({
        name: 'Spotify Web App Player',
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
})();