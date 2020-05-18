(function() {
    // starts new Bootstrap row at every multiple of 4
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

    function capitalizeFirstLetter(string) {
        return string.charAt(0).toUpperCase() + string.slice(1);
    }

    function allowToPlayArtistTracks(deviceID) {
        var artistPlayButtons = document.getElementsByClassName("artistPlayBtn");
        var trackIDs = [];
        var url;

        if (deviceID) {
            url = 'https://api.spotify.com/v1/me/player/play?device_id=' + deviceID
        }
        else {
            url = 'https://api.spotify.com/v1/me/player/play'
        }

        for (var i = 0; i < artistPlayButtons.length; i++) {
            trackIDs.push("");
        }

        // adds event listener to each button to play selected song
        for (var i = 0; i < artistPlayButtons.length; i++) {
            (function(i) {
                artistPlayButtons[i].outerHTML = artistPlayButtons[i].outerHTML;
                artistPlayButtons[i].addEventListener('click', function() {
                    trackIDs[i] = artistPlayButtons[i].nextSibling.nextSibling.value;
                    $.ajax({
                        url: url,
                        type: 'PUT',
                        headers: {
                            'Authorization': 'Bearer ' + access_token
                        },
                        dataType: "json",
                        contentType: "application/json",
                        data: JSON.stringify({
                            "uris": ["spotify:track:" + trackIDs[i]],
                        }),
                        success: console.log("Playing track " + trackIDs[i])
                    });
                });
            })(i);
        };
    };

    var artistTopTracksReq;

    function getArtistTopTracks(artistID, callback) {
        artistTopTracksReq = $.ajax({
            url: 'https://api.spotify.com/v1/artists/' + artistID + '/top-tracks?country=US',
            headers: {
                'Authorization': 'Bearer ' + access_token
            },
            success: function(response) {
                callback(response);
            }
        });
    }

    function organizeArtistData(response, deviceID) {
        var artists = [];
        for (var i = 0; i < response.items.length; i++) {
            artists.push({})
        }

        // combines each artist with their top tracks
        for (var i = 0; i < response.items.length; i++) {
            (function(i) {
                const artistID = response.items[i].id;
                getArtistTopTracks(artistID, function(response2) {
                    const artist = {
                        name: response.items[i].name,
                        image: response.items[i].images[0].url,
                        tracks: response2.tracks
                    }
                    artists[i] = artist;
                });
            })(i)
        }

        // waits to fill out HTML until requests to get artists' top songs are done
        $.when(artistTopTracksReq).done(function () {
            artistsPlaceholder.innerHTML = artistsTemplate(artists);
            allowToPlayArtistTracks(deviceID);
        });
    }

    function allowToPlayTracks(playButtonsClass, deviceID) {
        var playButtons = document.getElementsByClassName(playButtonsClass);
        var url;

        // determines which device to play on
        if (deviceID) {
            url = 'https://api.spotify.com/v1/me/player/play?device_id=' + deviceID;
        }
        else {
            url = 'https://api.spotify.com/v1/me/player/play';
        };

        // adds event listener to each track to play track
        for (var i = 0; i < playButtons.length; i++) {
            playButtons[i].outerHTML = playButtons[i].outerHTML;
            playButtons[i].addEventListener('click', function() {
                $.ajax({
                    url: url,
                    type: 'PUT',
                    headers: {
                        'Authorization': 'Bearer ' + access_token
                    },
                    dataType: "json",
                    contentType: "application/json",
                    data: JSON.stringify({
                        'uris': ['spotify:track:' + this.getAttribute('data-track')]
                    }),
                    success: console.log("Playing track " + this.getAttribute("data-track"))
                });

                return false;
            });
        };
    };

    function organizeTrackData(response, deviceID) {
        var tracks = [];
        for (var i = 0; i < response.items.length; i++) {
            tracks.push({});
        };

        // organizes track data
        for (var i = 0; i < response.items.length; i++) {
            (function(i) {
                const track = {
                    artists: response.items[i].artists,
                    id: response.items[i].id,
                    image: response.items[i].album.images[0].url,
                    name: response.items[i].name
                };
                tracks[i] = track;
            })(i);
        };

        // fills out HTML with track data
        tracksPlaceholder.innerHTML = tracksTemplate(tracks);

        allowToPlayTracks("trackPlayBtn", deviceID);
    }

    var recommendedSongs = [];

    function addToPlaylist(playlistId, index) {
        // prepares track ids
        var trackList = [];

        for (var i = 0; i < recommendedSongs[index].tracks.length; i++) {
            trackList.push('spotify:track:' + recommendedSongs[index].tracks[i].id);
        }

        console.log(trackList);

        $.ajax({
            url: 'https://api.spotify.com/v1/playlists/' + playlistId + '/tracks',
            type: 'POST',
            headers: {
                'Authorization': 'Bearer ' + access_token
            },
            dataType: "json",
            contentType: "application/json",
            data: JSON.stringify({
                'uris': trackList
            }),
            success: function() {
                console.log("Added songs to playlist")
                $('#' + recommendedSongs[index].dashedGenre + '-added').show();
            }
        });
    }

    function allowToAddPlaylist() {
        addButtons = document.getElementsByClassName('addPlaylist');
        
        var userId;

        var userProfReq = $.ajax({
            url: 'https://api.spotify.com/v1/me',
            headers: {
                'Authorization': 'Bearer ' + access_token
            },
            success: function(response) {
                userId = response.id;
            }
        });   

        var currentPlaylists;

        currentPlaylistsReq = $.ajax({
            url: 'https://api.spotify.com/v1/me/playlists',
            headers: {
                'Authorization': 'Bearer ' + access_token
            },
            success: function(response) {
                currentPlaylists = response.items;
            }
        });

        $.when(userProfReq, currentPlaylistsReq).done(function () {
            for (var i = 0; i < addButtons.length; i++) {
                (function (i) {
                    addButtons[i].outerHTML = addButtons[i].outerHTML; // removes all event listeners
                    addButtons[i].addEventListener('click', function() {
                        // Finds a playlist name that isn't taken
                        var j = 1;
                        var playlistName = recommendedSongs[i].capitalGenre + ' ' + j.toString();
                        var playlistNameTaken = true
                        while (playlistNameTaken) {
                            playlistNameTaken = false;
                            for (var k = 0; k < currentPlaylists.length; k++) {
                                if (currentPlaylists[k].name == playlistName) {
                                    playlistNameTaken = true;
                                    j++;
                                    playlistName = recommendedSongs[i].capitalGenre + ' ' + j.toString();
                                    k = currentPlaylists.length;
                                };
                            };
                        };

                        // creates empty playlist
                        $.ajax({
                            url: 'https://api.spotify.com/v1/users/' + userId + '/playlists',
                            type: 'POST',
                            headers: {
                                'Authorization': 'Bearer ' + access_token
                            },
                            dataType: "json",
                            contentType: "application/json",
                            data: JSON.stringify({
                                "name": playlistName,
                                "description": recommendedSongs[i].capitalGenre + " playlist generated by https://spotifydataapp.herokuapp.com"
                            }),
                            success: function(response) {
                                currentPlaylists.push({
                                    name: response.name
                                });

                                addToPlaylist(response.id, i);
                            }
                        });
                    });
                })(i);
            };
        });
    };

    function showPlaylist() {
        $('#' + recommendedSongs[0].dashedGenre).show();
        $('#playlistsDropdown').value = recommendedSongs[0].dashedGenre;

        $('#playlistsDropdown').on('change', function () {
            $('.playlist').hide();
            $('#' + this.value).show();
        });
    }

    function makeAnotherRecommendReq(genre, capitalGenre, dashedGenre, artistIDs, deviceID) {
        $.ajax({
            url: 'https://api.spotify.com/v1/recommendations?seed_genres=' + dashedGenre + '&seed_artists=' + artistIDs + '&limit=30',
            headers: {
                'Authorization': 'Bearer ' + access_token
            },
            retryCount: 1,
            retryLimit: 4,
            success: function(response) {
                console.log("Sucessful on try " + (this.retryCount + 1).toString())
                recommendedSongs.push({
                    genre: genre,
                    capitalGenre: capitalGenre,
                    dashedGenre: dashedGenre,
                    tracks: response.tracks
                });
                playlistsPlaceholder.innerHTML = playlistsTemplate(recommendedSongs);
                showPlaylist();
                allowToPlayTracks('trackPlayBtn', deviceID);
                allowToAddPlaylist();

            },
            error: function() {
                this.retryCount++;
                if (this.retryCount <= this.retryLimit) {
                    console.log("try " + this.retryCount.toString() + " unsuccessful, trying again")
                    makeAnotherRecommendReq(genre, dashedGenre, artistIDs)
                }
                else {
                    console.log("Request failed 3 times, giving up")
                }
            }
        });
    }

    function organizePlaylistData(artistData, deviceID) {
        var genres = {};

        // makes each genre a key and makes the value a list of artists associated with the genre
        for (var i = 0; i < artistData.items.length; i++) {
            for (var j = 0; j < artistData.items[i].genres.length; j++) {
                var genre = artistData.items[i].genres[j];
                if (genres.hasOwnProperty(genre)) {
                    if (genres[genre].length < 4) {
                        genres[genre].push(artistData.items[i].id);
                    };
                }
                else {
                    genres[genre] = [artistData.items[i].id];
                };
            }
        };

        var genresList = Object.keys(genres);
        var recommendReq;
        recommendedSongs = [];

        for (var i = 0; i < genresList.length; i++) {
            (function(i) {
                var genre = genresList[i];

                // capitalizes first letters
                var genreWords = genre.split(' ');
                for (var j = 0; j < genreWords.length; j++) {
                    genreWords[j] = capitalizeFirstLetter(genreWords[j])
                }
                var capitalGenre = genreWords.join(' ');

                // replaces spaces with dashes
                var dashedGenre = genre.split(' ').join('-');

                var artistIDs = genres[genre].join();
                recommendReq = $.ajax({
                    url: 'https://api.spotify.com/v1/recommendations?seed_genres=' + dashedGenre + '&seed_artists=' + artistIDs + '&limit=30',
                    headers: {
                        'Authorization': 'Bearer ' + access_token
                    },
                    success: function(response) {
                        recommendedSongs.push({
                            genre: genre,
                            capitalGenre: capitalGenre,
                            dashedGenre: dashedGenre,
                            tracks: response.tracks
                        });
                    },
                    error : function(xhr, textStatus, errorThrown ) {
                        console.log("try 1 unsuccessful, retrying")
                        makeAnotherRecommendReq(genre, capitalGenre, dashedGenre, artistIDs, deviceID);
                        return;
                    }
                });
            })(i);
        };

        $.when(recommendReq).done(function () {
            playlistsPlaceholder.innerHTML = playlistsTemplate(recommendedSongs);
            showPlaylist();
            allowToPlayTracks('trackPlayBtn', deviceID);
            allowToAddPlaylist();
        });
    };


    var artistsSource = document.getElementById('artists-template').innerHTML,
        artistsTemplate = Handlebars.compile(artistsSource),
        artistsPlaceholder = document.getElementById('artists');

    var tracksSource = document.getElementById('tracks-template').innerHTML,
        tracksTemplate = Handlebars.compile(tracksSource),
        tracksPlaceholder = document.getElementById('tracks');

    var playlistsSource = document.getElementById('playlists-template').innerHTML,
        playlistsTemplate = Handlebars.compile(playlistsSource),
        playlistsPlaceholder = document.getElementById('playlists');

    function hideAllSections() {
        $('#topArtists').hide();
        $('#topTracks').hide();
        $('#topPlaylists').hide();
        $('.nav-item').removeClass('active');
    }

    function displayStats(timeRange, deviceID) {
        $('#login').hide();
        $('#loggedIn').show();

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

        document.getElementById("playlistsBtn").addEventListener('click', function() {
            hideAllSections();
            $('#topPlaylists').show();
            $('#playlistsBtn').addClass('active');
        });

        var artistData, trackData;

        var artistReq = $.ajax({
            url: 'https://api.spotify.com/v1/me/top/artists?time_range=' + timeRange + '&limit=20',
            headers: {
                'Authorization': 'Bearer ' + access_token
            },
            success: function(response) {
                artistData = response;
            }
        });

        var trackReq = $.ajax({
            url: 'https://api.spotify.com/v1/me/top/tracks?time_range=' + timeRange + '&limit=50',
            headers: {
                'Authorization': 'Bearer ' + access_token
            },
            success: function(response) {
                trackData = response;
            }   
        });

        $.when(artistReq, trackReq).done(function () {
            organizeArtistData(artistData, deviceID);
            organizeTrackData(trackData, deviceID);
            organizePlaylistData(artistData, deviceID);
        });
    }

    // refreshes page with selected time range on button click
    function readyRefreshBtn(deviceID) {
        document.getElementById("refreshBtn").addEventListener("click", function()  {
            artistSectionOn = document.getElementById("artistsBtn").classList.contains("active");
            trackSectionOn = document.getElementById("tracksBtn").classList.contains("active");

            timeRange = document.getElementById("timeRangeDropdown").value;
            displayStats(timeRange, deviceID);
            hideAllSections();

            // shows section that was up when button is clicked
            if (artistSectionOn) {
                $('#topArtists').show();
                $('#artistsBtn').addClass('active');
            }
            else if (trackSectionOn) {
                $('#topTracks').show();
                $('#tracksBtn').addClass('active');
            }
            else {
                $('#topPlaylists').show();
                $('#playlistsBtn').addClass('active');
            }
        });
    };

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
            if( /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ) {
                $('#mobileDevice').show()
                displayStats("long_term", null);
                readyRefreshBtn(null);
            }
            else {
                window.onSpotifyWebPlaybackSDKReady = () => {
                    const token = access_token;
                    const player = new Spotify.Player({
                        name: 'Spotify Web App Player',
                        getOAuthToken: cb => { cb(token); },
                        volume: 0.1
                    });
                
                    // Error handling
                    player.addListener('initialization_error', ({ message }) => { 
                        console.error(message);
                        $('#mobileDevice').show()
                        displayStats("long_term", null);
                        readyRefreshBtn(null);
                    });

                    player.addListener('authentication_error', ({ message }) => { console.error(message); });
                    player.addListener('account_error', ({ message }) => { console.error(message); });
                    player.addListener('playback_error', ({ message }) => { console.error(message); });
                    
                    // Playback status updates
                    // player.addListener('player_state_changed', state => { console.log(state); });
                
                    // Ready
                    player.addListener('ready', ({ device_id }) => {
                        console.log('Ready with Device ID', device_id);
                        displayStats("long_term", device_id);
                        readyRefreshBtn(device_id);
                    });
                    
                    // Not Ready
                    player.addListener('not_ready', ({ device_id }) => {
                        console.log('Device ID has gone offline', device_id);
                    });
                    
                    // Connect to the player!
                    player.connect();
                };
            }
        } else {
            // render initial screen
            $('#login').show();
            $('#loggedIn').hide();
        }
    }
})();