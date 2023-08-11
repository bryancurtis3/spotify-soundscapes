// Local session stuff for API
sessionStorage.getItem('timeRange') ? timeRange = sessionStorage.getItem('timeRange') : timeRange = ''; // Acts as timeRange declaration

// Recent Data
const recentData = function recentData() {
    sessionStorage.setItem('timeRange', 'time_range=short_term&');
}

// Default Data
const defaultData = function defaultData() {
    sessionStorage.removeItem('timeRange');
}

// Long-term data
const longTermData = function longTermData() {
    sessionStorage.setItem('timeRange', 'time_range=long_term&');
}

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

// Legacy error handling, shouldn't ever really be needed
if (error) alert('There was an error during the authentication');

// Main code body below
if (access_token && !error) {

    // Highlights current time range and disables refresh of current time
    if (sessionStorage.getItem('timeRange') === 'time_range=short_term&') {
        $('#recent').prop("onclick", null).off("click");
        $('#recent').attr('id', 'active-time');
    } else if (sessionStorage.getItem('timeRange') === 'time_range=long_term&') {
        $('#long-term').prop("onclick", null).off("click");
        $('#long-term').attr('id', 'active-time');
    } else {
        $('#default').prop("onclick", null).off("click");
        $('#default').attr('id', 'active-time');
    }

    // TODO this is temp, decide if I want to use this
    $.ajax({
        url: 'https://api.spotify.com/v1/me/player/recently-played',
        headers: {
        'Authorization': 'Bearer ' + access_token
        },
        success: function(response) {
            // console.log(response);
            
            for (let i = 0; i < response.items.length; i++) {
                // console.log(response.items[i].track.name);
            }
        },
        error: function(error) {
            console.log(`Error: ${error.responseJSON.error.message}`);
            window.location.replace(window.location.origin);
        }
    });




    // Scope widened to share data between API calls
    let seedTracks = '';
    let userSeeds = '';
    let searched = false; // Little variable to let .search-results know when to display

    // Ajax calls built into functions to be fed to .when() functions
    const callArtists = function callArtists() {
        return $.ajax({
            url: `https://api.spotify.com/v1/me/top/artists?${timeRange}limit=50`,
            headers: {
            'Authorization': 'Bearer ' + access_token
            },
            success: function(response) {
                // console.log(response);
            },
            error: function(error) {
                console.log(`Error: ${error.responseJSON.error.message}`);
                window.location.replace(window.location.origin);  
            }
        });
    }

    const callSongs = function callSongs() {
        return $.ajax({
            url: `https://api.spotify.com/v1/me/top/tracks?${timeRange}limit=50`,
            headers: {
            'Authorization': 'Bearer ' + access_token
            },
            success: function(response) {
                // console.log(response);
            },
            error: function(error) {
                console.log(`Error: ${error.responseJSON.error.message}`);
                window.location.replace(window.location.origin);   
            }
        });
    };

    /**
     *  Refreshes the recommendation data, optionally using new filters
     * @param {string} seeds A comma separated list of up to 5 song, artist, or genre URIs to use as seeds
     * @param {string} filters Stringified query params to be used in filtering the recommendations returned by Spotify
     * @returns {object} An object of [seeds] and [tracks] where tracks is the recommendations from Spotify
     */
    const callRecs = function callRecs(seeds, filters) {
        if (userSeeds != '') seeds = userSeeds;

        return $.ajax({
            url: `https://api.spotify.com/v1/recommendations?seed_tracks=${seeds}&limit=10${filters}`,
            headers: {
            'Authorization': 'Bearer ' + access_token
            },
            success: function(response) {
                // console.log(response);
            },
            error: function(error) {
                console.log(`Error: ${error.responseJSON.error.message}`);
                // window.location.replace(window.location.origin);   
            }
        });
    }

    const callSearch = function callSearch(keywords) {
        return $.ajax({
            url: `https://api.spotify.com/v1/search?q=${keywords}&type=track`,
            headers: {
            'Authorization': 'Bearer ' + access_token
            },
            success: function(response) {
                // console.log(response);
            },
            error: function(error) {
                console.log(`Error: ${error.responseJSON.error.message}`);
                window.location.replace(window.location.origin);   
            }
        });
    }


    $.when(callArtists(), callSongs()).done(function(genreRes, songRes){

        /**
         * Tells Spotify which song to play based on the element clicked
         * 
         * @param {string} event Holds the song URI that needs to be played in event.data.uri
         */
        const playSpotify = function playSpotify(event) {
            if (event.data.uriType == "song") {
                ajaxData = {uris: [event.data.uri]};
            } else if (event.data.uriType == "artist") {
                ajaxData = {context_uri: event.data.uri};
            }
            $.ajax({
                url: `https://api.spotify.com/v1/me/player/play`,
                type: 'PUT',
                headers: {
                'Authorization': 'Bearer ' + access_token
                },
                data: JSON.stringify(ajaxData),
                error: function(error) {
                    console.log(`Error: ${error.responseJSON.error.message}`);
                    if (error.responseJSON.error.message == "Player command failed: No active device found") {
                        alert(`Spotify must already be playing. You can go to Spotify by clicking on the name of the song or artist to initiate playback.`)
                    } else if (error.responseJSON.error.message === "The access token expired") {
                        window.location.replace(window.location.origin);
                    }
                }
            })
        }

        /**
         * Refactors numbers in miliseconds to minutes:seconds
         * 
         * @param {number} duration A number in ms
         * @returns {string} A time formatted in minutes:seconds
         */
        const refactorDuration = function refactorDuration(duration) {
            const minutes = Math.floor(duration / 60000);
            const seconds = ((duration % 60000) / 1000).toFixed(0);
            return (seconds == 60 ? (minutes+1) + ":00" : minutes + ":" + (seconds < 10 ? "0" : "") + seconds);
        }

        /**
         * A function to increase distribution of popularity to better visualize differences
         * 
         * @param {number} popularity A Song or Artist's popularity rating according to Spotify
         * @param {number} low The low bound of the new scale that will == 0 when rescaled
         * @param {number} high The high bound of the new scale that will == 100 when rescaled
         * @returns {number} The new popularity value according to the modified scale
         */
        const rescalePopularity = function rescalePopularity(popularity, low, high) {
            if (!low) low = 50;
            if (!high) high = 90;

            if (popularity < low) {
                popularity = 0;
            } else if (popularity > high) {
                popularity = 100;
            } else {
                popularity = Math.round((popularity - low) * 100 / (high - low));
            }
            return popularity;
        }


        /**
         * Takes popularity from 0-100, scales it down to 0-10, and returns highlighted and dimmed line values for display to the user
         * 
         * @param {number} songPop A 0-10 value for song popularity
         * @return {array} An array that contains the number of highlighted bars and dimmed bars in [0] and [1] respectively
         */
        const compilePopularity = function compilePopularity(songPop) {
            songPop = songPop / 10;
            let highlighted = '';
            let dimmed = '';
            for (let j = 0; j < 10; j++) {
                j < songPop ? highlighted = highlighted + '|' : dimmed = dimmed + '|'
            }
            return [highlighted, dimmed]
        };


        // // See More and Show Less logic
        // let seeMore = false; 
        // const seeMoreLess = function seeMoreLess(event) {
        //     const type = event.data.type;
        //     if (seeMore === false) {
        //         $(`.see-more-${type}`).text('SHOW LESS');
        //         $(`.extended-${type}`).css('display', 'grid');
        //         seeMore = true;
        //     } else if (seeMore === true) {
        //         $(`.see-more-${type}`).text('SEE MORE');
        //         $(`.extended-${type}`).css('display', 'none');
        //         seeMore = false;
        //     }
        // }
        // $('.see-more-artists').click({type: 'artists'}, seeMoreLess);
        // $('.see-more-songs').click({type: 'songs'}, seeMoreLess);

        /**
         * Adds new seed ID to the list of up to 5 IDs
         * @param {array} event jQuery event variable holds the seed, specified in click function of element
         */
        const addSeed = function addSeed(event) {
            if (userSeeds.split(',').length < 6) {
                userSeeds += event.data.seed + ',';

                updateSeeds(event.data);

                console.log(event.data);
            };
        };

        const removeSeed = function removeSeed(event) {
            const seed = event.data.seed + ',';
            userSeeds = userSeeds.replace(seed, '');
        };

        let j = 0;

        let seedArray = [];
        const updateSeeds = function updateSeeds(seedData) {

            // If (a track is set to be removed), take away the removed seed object, place a new, blank object on the end to overwrite what was there
            // Else write the seed data into the array
            console.log ('j = ' + j)
            if (seedData.data) {
                seedArray.splice(seedData.data.index, 1);

                seedArray[seedArray.length] = {
                    seed: '', image: '', artist: '', name: '', uri: ''
                }        

                // Manually iteratae j and stop displaying the last seed on the list
                j--;
                $(`#seed-li-${j}`).css('display', 'none');

            } else {
                seedArray [j] = seedData;
                $(`#seed-li-${j}`).css('display', 'grid');

            };
            console.log(seedArray);


            // For loop used to overwrite when any changes are made, simplifying addition and removal
            for (i = 0; i < seedArray.length; i++) {
                
                let { seed, image, artist, name, uri} = seedArray[i];
                console.log("here " + i)
                console.log(seedArray[i])
                
                // Unbinding here prevents click events stacking on elements when refreshed
                $(`#seed-li-${i}`).unbind();
                $(`#seed-play-${i}`).unbind();
                $(`#remove-seed-${i}`).unbind();
    
                $(`#seed-li-${i}`).dblclick({uri: uri, uriType: "song"}, playSpotify);
                $(`#seed-play-${i}`).click({uri: uri, uriType: "song"}, playSpotify);
    
                $(`#seed-image-${i}`).attr('src', image);
                $(`#seed-name-${i}`).text(name)
                    .attr('href', uri);
    
                $(`#seed-artist-${i}`).text(artist)
                    .attr('href', artist);
                $(`#seed-play-tip-${i}`).text(`Play ${name} on Spotify`);
    
                $(`#remove-seed-${i}`).click({seed: seed}, removeSeed);
                $(`#remove-seed-${i}`).click({index: i}, updateSeeds);

            }

            if (!seedData.data) j++;
        };

        

        // ========= TESTING TRACK SEARCH =========

        /**
         * 
         * @param {boolean} enter Checks if enter was pressed to force search
         * @returns Fetches search results for user query from Spotify API and displays them
         */
        const search = function search(enter) {
            const keywords = $("#track-search").val();

            if (!enter && keywords.length < 3) return; //wasn't enter, not > 3 char

            $.when(callSearch(keywords)).done(function (searchResults) {
                const searchData = searchResults.tracks.items;
                // console.log(searchData);
                
                refreshSearch(searchData);

                $('.search-results').css("display", "block");
                searched = true;
            });
        };

        // This is just for enter, which I guess doesn't work with on.input
        $('#track-search').on('keyup', function(key) {
            if (key.which == 13) search(true);
        });
        
        $('#track-search').on('input', function(key) {

            if ($('#track-search').val() == '') searched = false; // Resets searchResults display variable
            
            // Hides results and 'x' when 'x' is clicked, code is here to make it feel more responsive as opposed to in 
            if ($("#track-search").val().length == 0) {
                $('.search-results').css("display", "none");
                $('.fa-x').css("display", "none");
            } else if ($("#track-search").val().length == 1) {
                $('.fa-x').css("display", "block");
            }
            
            clearTimeout($.data(this, 'timer'));
            $(this).data('timer', setTimeout(search, 500));
        });


        // Handles custom 'x' clearing search bar and results
        $('.fa-x').on('click', function() {
            $('#track-search').val('');
            $('.search-results').css("display", "none");
            $('.fa-x').css("display", "none");
            searched = false; // Resets searchResults display variable
        });

        // This code block exists to extract seed data for initial callRecs
        const songData = songRes[0].items;
        for (let i = 0; i < songData.length; i++) {
            if (i < 5) seedTracks += songData[i].id + ',';
        };
        seedTracks = seedTracks.slice(0, -1);

        /**
         * Handles updating of search UI with new data after submitSearch runs
         * @param {array} searchData The array of track objects returned after the API call
         */
        const refreshSearch = function refreshSearch(searchData) {
            console.log(searchData)
            for (i = 0; i < 5; i++) {
                const trackResult = searchData[i];
                console.log(trackResult)

                if (searchData.length > i) {
                    // Unbinding here prevents click events stacking on elements when refreshed
                    $(`#res-li-${i}`).unbind();
                    $(`#res-play-${i}`).unbind();
                    $(`#add-seed-${i}`).unbind();

                    $(`#res-li-${i}`).dblclick({uri: trackResult.uri, uriType: "song"}, playSpotify);
                    $(`#res-play-${i}`).click({uri: trackResult.uri, uriType: "song"}, playSpotify);

                    $(`#res-image-${i}`).attr('src', trackResult.album.images[2].url);
                    $(`#res-name-${i}`).text(trackResult.name)
                        .attr('href', trackResult.uri);

                    $(`#res-artist-${i}`).text(trackResult.artists[0].name)
                        .attr('href', trackResult.artists[0].uri);
                    $(`#res-play-tip-${i}`).text(`Play ${trackResult.name} on Spotify`);

                    $(`#add-seed-${i}`).click({
                        seed: trackResult.id, 
                        image: trackResult.album.images[2].url, 
                        artist: trackResult.artists[0].name,
                        name: trackResult.name,
                        uri: trackResult.uri,
                        index: i
                    }, addSeed);

                } else {
                    $(`#res-li-${i}`).attr('class', 'no-data');
                }
            }
        };


        /**
         * Compiles user specified filters into query params and then passes them to Spotify API to get filter recommendations, runs on user click
         */
        const submitRecs = function submitRecs() {

            // Compiles updated filter values at time of click event
            const filters = {
                danceability: $('#danceability-slider').val(),
                mode: $('#mode-slider').val(),
                popularity: $('#popularity-slider').val(),
                valence: $('#valence-slider').val() / 100,
                tempo: $('#tempo-slider').val(),
                energy: $('#energy-slider').val() / 100
            };

            // Working on allowing user submitted seed data for Recs
            // const userSeeds = $('#user-seeds').val();
            // #FIXME this is unfished and being used for testing. NOT PRODUCTION READY
            // if (userSeeds) seedTracks = userSeeds; // Overwrites seedTracks from user data with custom, user input list of seed track IDs.
            
            let urlFilter = '';
            for (filter in filters) {
                if ($(`#${filter}-check`).is(':checked')) {
                    urlFilter += `&target_${filter}=${filters[filter]}`

                    // Fixing mode appearance to match others
                    if (filter == 'mode') {

                    }
                }
            }
            // console.log(urlFilter);

            console.log('submitRecs')


            $.when(callRecs(seedTracks, urlFilter)).done(function (recs) {
                const recsData = recs.tracks;
                console.log(recsData);
                
                refreshRecs(recsData);
            });
        };

        /**
         * Handles updating of UI with new data after submitRecs runs
         * @param {array} recsData The array of tracks returned after the API call
         */
            const refreshRecs = function refreshRecs(recsData) {
            for (i = 0; i < 10; i++) {
                const songRec = recsData[i];

                if (recsData.length > i) {
                    // Unbinding here prevents click events stacking on elements when refreshed
                    $(`#rec-li-${i}`).unbind();
                    $(`#rec-play-${i}`).unbind();

                    $(`#rec-li-${i}`).dblclick({uri: songRec.uri, uriType: "song"}, playSpotify);
                    $(`#rec-play-${i}`).click({uri: songRec.uri, uriType: "song"}, playSpotify);

                    $(`#rec-image-${i}`).attr('src', songRec.album.images[2].url);
                    $(`#rec-name-${i}`).text(songRec.name)
                        .attr('href', songRec.uri);

                    $(`#rec-artist-${i}`).text(songRec.artists[0].name)
                        .attr('href', songRec.artists[0].uri);
                    $(`#rec-play-tip-${i}`).text(`Play ${songRec.name} on Spotify`);

                    const recPop = Math.round(rescalePopularity(songRec.popularity, 30, 90));
                    $(`#rec-popularity-${i} .highlighted`).text(compilePopularity(recPop)[0]);
                    $(`#rec-popularity-${i} .dimmed`).text(compilePopularity(recPop)[1]);

                    $(`#rec-duration-${i}`).text(refactorDuration(songRec.duration_ms));
                } else {
                    $(`#rec-li-${i}`).attr('class', 'no-data');
                }
            }
        };


        $('#rec-refresh').click(submitRecs);


        // Initial recs call
        $.when(callRecs(seedTracks, '')).done(function (recs) {
            const recsData = recs.tracks;
            console.log(recsData);

            refreshRecs(recsData);
        });
    });

    // NOTE Feature testing in progress below
    const adjustSlider = function adjustSlider(event) {
        let element;
        let value;
        let displayValue;

        // Allows the function to handle calls directly from the slider as well as inderectly from the input box while still adjusting the slider appropriately
        if (!event.bubbles) {
            element = Object.values(event)[0];
            value = +event.context.value;
            displayValue = value;
        } else {
            element = this;
            value = this.value;
            displayValue = $(this).val();
        }

        // Tempo custom range fix
        if (element.id.includes('tempo')) {
            range = 200 - 40;
            value = Math.round((value - 40) * (100 / range));
        }

        // Mode binary fix
        if (element.id.includes('mode')) value = Math.round(value * 100);
        
        // Renders gradient for current value
        element.style.background = `linear-gradient(to right, #3A80F7, 0%, #3A80F7, ${value}%, #4B4B4B ${value}%, #4B4B4B 100%)`;

        // Sets the value indictor
        $(element).siblings('.slider-value').val(displayValue);
        // Sets the slider value (fixes backspace resulting in starting value at 0, might be circular / broken)
        $(element).val(displayValue);
    };
    
    // Changes the slider when the user is moving the slider
    $('#popularity-slider').on('input', adjustSlider);
    $('#danceability-slider').on('input', adjustSlider);
    $('#valence-slider').on('input', adjustSlider);
    $('#tempo-slider').on('input', {min: 40, max: 200}, adjustSlider);
    $('#energy-slider').on('input', adjustSlider);
    $('#mode-slider').on('input', {min: 0, max: 1}, adjustSlider);

    // Handles user input via text input box and the resulting slider adjustment interactions
    $('.slider-value').on('input', (function() {
        let slider = $(this).siblings('.slider');

        if (Object.values(slider)[0].id.includes('tempo')) {
            if ($(this).val() < 0) $(this).val(0);
            if ($(this).val() > 200) $(this).val(200);
        } else if (Object.values(slider)[0].id.includes('mode')) {
            if ($(this).val() < 0) $(this).val(0);
            if ($(this).val() > 1) $(this).val(1);
        } else {
            if ($(this).val() < 0) $(this).val(0);
            if ($(this).val() > 100) $(this).val(100);
        }

        // $(this).siblings('.slider').val($(this).val()); // TODO deprecated, remove if it works later
        slider.val($(this).val());
        
        $(this).on('input', adjustSlider(slider));
    }));

    // This exists only to allow users to properly input values for tempo, might be ineffecient (but barely at this limited scale)
    $('.slider-value').change(function() {
        if (Object.values($(this).siblings('.slider'))[0].id.includes('tempo')) {
            if ($(this).val() < 40) $(this).val(40);
            if ($(this).val() > 200) $(this).val(200);
        }
    })



    // Add or take away dimming overlay on checkbox active/inactive
    $('.checkbox').on('click', function () {
        $('.checkbox:checked').siblings('.unselected').css('display','none');
        $('.checkbox:not(:checked)').siblings('.unselected').css('display','block');
    });

    $(document).on('click', function() {
        if (!$('#track-search').is(':hover') && !$('.search-results').is(':hover')) {
            $('.search-results').css('display', 'none')
        };
    });

    $('#track-search').on('click', function() {
        if (searched == true) $('.search-results').css('display', 'block');
    });

    $('#swap').on('click', function() {
        const url = window.location.href
        .replace('/search', '/soundscape');

        location.href = url;
    });

} else {
    // FIXME this is deprecated and now Idk what this if statement even does
    // LATER EDIT: The if statement ensures the user has a token and there were no errors, and only runs basically all of the JS if that is the case. This was originally to redirect the user back home if those criterion were not met, now it does nothing because the home page is no longer a different part of the same html file. With that said, see bellow
    // TODO either rework this to function for new setup AND/OR decide if I even need to keep the if statement. Either way, I should probably not leave the whole file inside the if, and instead just say if the user doesnt have a token or there is an error, do whatever

    $('#login-page').show();
    $('#home-page').hide(); // TODO this does nothing atm
};
