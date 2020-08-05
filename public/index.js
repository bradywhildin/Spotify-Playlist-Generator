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

    $('#logoutBtn').on('click', function() {
        window.location.href = 'https://accounts.spotify.com/logout';
    })

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

        // adds event listener to each track/artist to play track/artist
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

                // attempts to play song
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

    // cleans data and fills in HTML
    function organizeArtistData(response) {
        var artists = [];
        for (var i = 0; i < response.items.length; i++) {
            const artistData = response.items[i]
            var imageUrl = '';
            if (artistData.images.length > 0) { // only use artist image if there is one
                imageUrl = artistData.images[0].url;
            };
            artists.push({
                id: artistData.id,
                image: imageUrl,
                name: artistData.name
            });
        };

        artistsPlaceholder.innerHTML = artistsTemplate(artists);

        // allows artist to be played
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
                const trackData = response.items[i]
                var imageUrl = ''
                if (trackData.album.images.length > 0) { // only use image if there is one
                    imageUrl = trackData.album.images[0].url
                }
                const track = {
                    artists: trackData.artists,
                    id: trackData.id,
                    image: imageUrl,
                    name: trackData.name
                };
                tracks[i] = track;
            })(i);
        };

        // fills out HTML with track data
        tracksPlaceholder.innerHTML = tracksTemplate(tracks);

        allowToPlayTracks("trackPlayBtn", "track");
    };

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
        });;
    }

    var currentPlaylists, userId;

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
                    "description": genreData.capitalGenre + " playlist generated by https://playlistgeneratorapp.herokuapp.com"
                }),
                success: function(response) {
                    // ensures there won't be a repeat of this playlist's name
                    currentPlaylists.push({
                        name: response.name
                    });

                    // calls function to fill playlist
                    addTracksToPlaylist(response.id, genreData);
                }
            });
        });
    };

    // changes playlist shown when selected genre is changed
    function showPlaylist(genres) {
        $('#' + Object.keys(genres)[0]).show();
        $('#playlistsDropdown').value = Object.keys(genres)[0];

        $('#playlistsDropdown').on('change', function () {
            $('.playlist').hide();
            $('#' + this.value).show();
        });
    }

    // displays individual playlist under appropriate genre
    function displayPlaylist(genre, genreData) {
        var playlistSource = document.getElementById('playlist-template').innerHTML,
            playlistTemplate = Handlebars.compile(playlistSource)
            playlistPlaceholder = document.getElementById(genre + 'Playlist');

        playlistPlaceholder.innerHTML = playlistTemplate(genreData);
        allowToPlayTracks(genre + 'PlayBtn', 'track');
        allowToAddPlaylist(genreData);
    }

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

                    // won't add more than 4 artists due to API endpoint restriction
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

        // fills HTML
        playlistsPlaceholder.innerHTML = playlistsTemplate(genres);
        showPlaylist(genres);

        var genPlaylistBtns = document.getElementsByClassName('genPlaylistBtn');

        // readys playlists to be generated
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

                        // calls function to display playlist of recommended songs given in response
                        displayPlaylist(genre, genres[genre]);
                    },
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

    // readys Handlebar templates found in index.html

    var artistsSource = document.getElementById('artists-template').innerHTML,
        artistsTemplate = Handlebars.compile(artistsSource),
        artistsPlaceholder = document.getElementById('artists');

    var tracksSource = document.getElementById('tracks-template').innerHTML,
        tracksTemplate = Handlebars.compile(tracksSource),
        tracksPlaceholder = document.getElementById('tracks');

    var playlistsSource = document.getElementById('playlists-template').innerHTML,
        playlistsTemplate = Handlebars.compile(playlistsSource),
        playlistsPlaceholder = document.getElementById('playlists');


    // hides sections and removes active class from all nav bar items
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

        // gets user's top artists
        var artistReq = $.ajax({
            url: 'https://api.spotify.com/v1/me/top/artists?time_range=' + timeRange + '&limit=50',
            headers: {
                'Authorization': 'Bearer ' + access_token
            },
            success: function(response) {
                artistData = response;
            }
        });

        // gets user's top tracks
        var trackReq = $.ajax({
            url: 'https://api.spotify.com/v1/me/top/tracks?time_range=' + timeRange + '&limit=50',
            headers: {
                'Authorization': 'Bearer ' + access_token
            },
            success: function(response) {
                trackData = response;
            }   
        });

        // gets user account info
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

        // gets user's playlists
        var currentPlaylistsReq = $.ajax({
            url: 'https://api.spotify.com/v1/me/playlists',
            headers: {
                'Authorization': 'Bearer ' + access_token
            },
            success: function(response) {
                currentPlaylists = response.items;
            }
        });

        // starts using data once all requests are finished
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
            // removes access token from browser url
            if (window.history.replaceState) {
                window.history.replaceState(null, '', '#');
             }

            // checks if user is on mobile device
            if( /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ) {
                $('#mobileDevice').show()
                displayStats("long_term");
                readyRefreshBtn();
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
                        displayStats("long_term");
                        readyRefreshBtn();
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
                    
                    // Connect to the player
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