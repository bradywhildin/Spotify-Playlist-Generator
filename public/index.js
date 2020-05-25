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

    var deviceId;

    function allowToPlayTracks(playButtonsClass, type) {
        var playButtons = document.getElementsByClassName(playButtonsClass);
        var url;

        // determines which device to play on
        if (deviceId) {
            url = 'https://api.spotify.com/v1/me/player/play?device_id=' + deviceId;
        }
        else {
            url = 'https://api.spotify.com/v1/me/player/play';
        };

        // adds event listener to each track to play track
        for (var i = 0; i < playButtons.length; i++) {
            playButtons[i].outerHTML = playButtons[i].outerHTML;
            playButtons[i].addEventListener('click', function() {
                var data;
                if (type == 'track') {
                    data = JSON.stringify({
                        'uris': ['spotify:track:' + this.getAttribute('data-trackId')]
                    });
                }
                else if (type == 'artist') {
                    data = JSON.stringify({
                        'context_uri': 'spotify:artist:' + this.getAttribute('data-trackId')
                    });
                };

                $.ajax({
                    url: url,
                    type: 'PUT',
                    headers: {
                        'Authorization': 'Bearer ' + access_token
                    },
                    dataType: "json",
                    contentType: "application/json",
                    data: data,
                    success: console.log("Playing " + type + " " + this.getAttribute("data-trackId")),
                    error: function(xhr, ajaxOptions, thrownError){
                        if (xhr.status == 403) alert('You must have Spotify Premium to play songs.');
                        else if (xhr.status == 404) alert('You must have Spotify actively playing on a device.');
                    }
                });

                return false;
            });
        };
    };

    function organizeArtistData(response) {
        var artists = [];
        for (var i = 0; i < response.items.length; i++) {
            artists.push({
                id: response.items[i].id,
                image: response.items[i].images[0].url,
                name: response.items[i].name
            });
        };

        artistsPlaceholder.innerHTML = artistsTemplate(artists);
        allowToPlayTracks('artistPlayBtn', 'artist');
    };

    function organizeTrackData(response) {
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

        allowToPlayTracks("trackPlayBtn", "track");
    }

    function addTracksToPlaylist(playlistId, genreData) {
        // prepares track ids
        var tracks = genreData.tracks
        var trackList = [];

        for (var i = 0; i < tracks.length; i++) {
            trackList.push('spotify:track:' + tracks[i].id);
        }

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
                $('#' + genreData.dashedGenre + '-added').show();
            }
        });
    }

    var currentPlaylists, userId

    function allowToAddPlaylist(genreData) {
        var genre = genreData.dashedGenre
        var addBtn = document.getElementById(genre + 'AddPlaylistBtn');

        addBtn.addEventListener('click', function() {
            // Finds a playlist name that isn't taken
            var j = 1;
            var playlistName = genreData.capitalGenre + ' ' + j.toString();
            var playlistNameTaken = true
            while (playlistNameTaken) {
                playlistNameTaken = false;
                for (var k = 0; k < currentPlaylists.length; k++) {
                    if (currentPlaylists[k].name == playlistName) {
                        playlistNameTaken = true;
                        j++;
                        playlistName = genreData.capitalGenre + ' ' + j.toString();
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
                    "description": genreData.capitalGenre + " playlist generated by https://spotifydataapp.herokuapp.com"
                }),
                success: function(response) {
                    currentPlaylists.push({
                        name: response.name
                    });

                    addTracksToPlaylist(response.id, genreData);
                }
            });
        });
    };

    function showPlaylist(genres) {
        $('#' + Object.keys(genres)[0]).show();
        $('#playlistsDropdown').value = Object.keys(genres)[0];

        $('#playlistsDropdown').on('change', function () {
            $('.playlist').hide();
            $('#' + this.value).show();
        });
    }

    function displayPlaylist(genre, genreData) {
        var playlistSource = document.getElementById('playlist-template').innerHTML,
            playlistTemplate = Handlebars.compile(playlistSource)
            playlistPlaceholder = document.getElementById(genre + 'Playlist');

        playlistPlaceholder.innerHTML = playlistTemplate(genreData);
        allowToPlayTracks(genre + 'PlayBtn', 'track');
        allowToAddPlaylist(genreData);
    }


    /*
    function makeAnotherRecommendReq(genre, capitalGenre, dashedGenre, artistIDs) {
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
                allowToPlayTracks('trackPlayBtn', 'track');
                allowToAddPlaylist();
            },
            error: console.log("Try 2 unsuccessful, giving up")
        });
    }
    */

    function organizePlaylistData(artistData) {
        var genres = {};

        // makes each genre a key and makes the value a list of artists associated with the genre
        for (var i = 0; i < artistData.items.length; i++) {
            for (var j = 0; j < artistData.items[i].genres.length; j++) {
                var genre = artistData.items[i].genres[j];

                // replaces spaces with dashes
                var dashedGenre = genre.split(' ').join('-');

                if (genres.hasOwnProperty(dashedGenre)) {
                    genres[dashedGenre].count++;

                    if (genres[dashedGenre].count < 5) {
                        genres[dashedGenre].artistIds.push(artistData.items[i].id);
                        genres[dashedGenre].artistNames.push(artistData.items[i].name);
                    };
                }
                else {
                    // capitalizes first letters
                    var genreWords = genre.split(' ');
                    for (var k = 0; k < genreWords.length; k++) {
                        genreWords[k] = capitalizeFirstLetter(genreWords[k])
                    }
                    var capitalGenre = genreWords.join(' ');

                    genres[dashedGenre] = {
                        artistIds: [artistData.items[i].id],
                        artistNames: [artistData.items[i].name],
                        capitalGenre: capitalGenre,
                        count: 1,
                        dashedGenre: dashedGenre
                    };
                };
            };
        };

        playlistsPlaceholder.innerHTML = playlistsTemplate(genres);
        showPlaylist(genres);

        var genPlaylistBtns = document.getElementsByClassName('genPlaylistBtn');

        for (var i = 0; i < genPlaylistBtns.length; i++) {
            genPlaylistBtns[i].addEventListener('click', function() {
                var genre = this.getAttribute('data-genre');
                var artistIds = genres[genre].artistIds;

                recommendReq = $.ajax({
                    url: 'https://api.spotify.com/v1/recommendations?seed_genres=' + genre + '&seed_artists=' + artistIds + '&limit=30',
                    headers: {
                        'Authorization': 'Bearer ' + access_token
                    },
                    success: function(response) {
                        genres[genre].tracks = response.tracks
                        displayPlaylist(genre, genres[genre]);
                    },
                    error : function(xhr, textStatus, errorThrown ) {
                        console.log("try 1 unsuccessful, retrying")
                        makeAnotherRecommendReq(genre, capitalGenre, dashedGenre, artistIDs);
                        return;
                    }
                });
            })
        }

        /*
        $.when(recommendReq).done(function () {
            allowToPlayTracks('trackPlayBtn', 'track');
            allowToAddPlaylist();
        });
        */
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
        $('.section').removeClass('active');
        $('.navbar-collapse').collapse('hide');
    }

    function displayStats(timeRange) {
        $('#login').hide();
        $('#loggedIn').show();

        hideAllSections();    

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
            url: 'https://api.spotify.com/v1/me/top/artists?time_range=' + timeRange + '&limit=50',
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

        var userProfReq = $.ajax({
            url: 'https://api.spotify.com/v1/me',
            headers: {
                'Authorization': 'Bearer ' + access_token
            },
            success: function(response) {
                userId = response.id;
                
                if (response.product != 'premium') {
                    $('#noPremium').show();
                }
            }
        });

        var currentPlaylistsReq = $.ajax({
            url: 'https://api.spotify.com/v1/me/playlists',
            headers: {
                'Authorization': 'Bearer ' + access_token
            },
            success: function(response) {
                currentPlaylists = response.items;
            }
        });

        $.when(artistReq, trackReq, currentPlaylistsReq, userProfReq).done(function () {
            organizeArtistData(artistData);
            organizeTrackData(trackData);
            organizePlaylistData(artistData);
        });
    }

    // refreshes page with selected time range on button click
    function readyRefreshBtn() {
        var timeRangeBtns = [$('#shortTerm'), $('#mediumTerm'), $('#longTerm')];

        for (var i = 0; i < timeRangeBtns.length; i++) {
            (function(i) {
                timeRangeBtns[i].on('click', function () {
                    artistSectionOn = document.getElementById("artistsBtn").classList.contains("active");
                    trackSectionOn = document.getElementById("tracksBtn").classList.contains("active");
                    playlistSectionOn = document.getElementById("playlistsBtn").classList.contains("active");

                    $('.timeRange').removeClass('active');

                    timeRangeBtns[i].addClass('active');

                    timeRange = this.getAttribute('data-time');
                    hideAllSections();
                    displayStats(timeRange);

                    // shows section that was up when button is clicked
                    if (artistSectionOn) {
                        $('#topArtists').show();
                        $('#artistsBtn').addClass('active');
                    }
                    else if (trackSectionOn) {
                        $('#topTracks').show();
                        $('#tracksBtn').addClass('active');
                    }
                    else if (playlistSectionOn) {
                        $('#topPlaylists').show();
                        $('#playlistsBtn').addClass('active');
                    }
                });
            })(i);
        };

        $('#topArtists').show();
        $('#artistsBtn').addClass('active');
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
                        $('#mobileDevice').show();
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
                        deviceId = device_id
                        console.log('Ready with Device ID', deviceId);
                        displayStats("long_term");
                        readyRefreshBtn();
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