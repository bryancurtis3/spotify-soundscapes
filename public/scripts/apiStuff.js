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
            console.log(response);
            
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
    const artistsGenres = {};
    const topGenres = {};
    let topArtists = []; // TODO remove?
    let colors = {};
    let songIds = '';
    let followingIds = '';
    let seedTracks = '';
    let audioFeatures = {};

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
    }

    /**
     *  Refreshes the recommendation data, optionally using new filters
     * @param {string} seeds A comma separated list of up to 5 song, artist, or genre URIs to use as seeds
     * @param {string} filters Stringified query params to be used in filtering the recommendations returned by Spotify
     * @returns {object} An object of [seeds] and [tracks] where tracks is the recommendations from Spotify
     */
    const callRecs = function callRecs(seeds, filters) {
        return $.ajax({
            url: `https://api.spotify.com/v1/recommendations?seed_tracks=${seeds}&limit=5${filters}`,
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
         * The array of the raw top artist data from Spotify
         */
        const genreData = genreRes[0].items;

        // ===== Genres =====

        // Extract data from JSON
        let genres = [];
        /**
         * An array of all artist names in order of most to least listened
         */
        let artistData = [];
        for (let i = 0; i < genreData.length; i++) {
            artistData.push(genreData[i].name);

            // Compiles array of artist's ID's to check if the user follows them
            if (i < 9) {
                followingIds += genreData[i].id + ',';
            } else if (i === 10) {
                followingIds += genreData[i].id;
            }

            for (let j = 0; j < genreData[i].genres.length; j++) {
                genres.push(genreData[i].genres[j]);
            }
        }

        
        let artistIterator = 0;
        for (const artist of artistData) {
            artistsGenres[artist] = genreData[artistIterator].genres
            artistIterator++;
        }
        // console.log(artistsGenres);
        
        // Compile simple artists: [...genres] object
        const genreStats = {};
        for (const genre of genres) {
            genreStats[genre] = genreStats[genre] ? genreStats[genre] + 1 : 1;
        }
        // console.log(genreStats);

        // Make an array of total count for each genre from highest to lowest
        let mostGenres = Object.values(genreStats)
        .sort((function(a, b) {return a - b;}))
        .reverse()
        .splice(0, 8);
        // console.log(mostGenres);

        // Make an object of genre: occurences
        for (const genre in genreStats) {
            for (let i = 0; i < mostGenres.length; i++) {
                if (genreStats[genre] === mostGenres[i]) {
                    topGenres[genre] = mostGenres[i];
                    mostGenres.splice(i, 1);
                    break; // Break here ensures genres don't canibalize other genres with same total occurences & expedites process
                };
            };
        };
        // topGenres.other = 0; // TODO remove this if I don't resurrect the bar graph
        // console.log(topGenres);


        // Compiling data for custom doughnut tooltip
        let genreArtists = {};
        for (let i = 0; i < Object.keys(artistsGenres).length; i++) {
            let artist = Object.keys(artistsGenres)[i];
            for (const genre in topGenres) {
                if (artistsGenres[artist].includes(genre)) {
                    genreArtists[genre] ? genreArtists[genre].push(artist) : genreArtists[genre] = [artist];
                }
            }
        }
        // console.log(genreArtists);

        // This uses genreArtists to construct tooltips
        const footer = (tooltipItems) => {
            tooltipItems.forEach(function(tooltipItem) {
                labelArtists = genreArtists[tooltipItem.label];
            });
            return labelArtists;
        };


        colors = {
            green: 'rgb(45, 208, 112)',
            purple: 'rgb(130, 120, 230)',
            gold: 'rgb(255, 205, 86)',
            pink: 'rgb(240, 140, 240)',
            blue: 'rgb(74, 172, 245)',
            folklore: 'rgb(255, 120, 120)',
            lightBlue: 'rgb(142, 200, 255)',
            orange: 'rgb(251, 145, 90)',
            // other: 'rgba(80, 80, 80, .7)' // TODO remove this if I don't resurrect the bar graph
        }

        const genreChart = function genreChart() {
            const ctx = document.getElementById('genreChart').getContext('2d');
        
            let pieDelay;
            const genreChart = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: Object.keys(topGenres),
                    datasets: [{
                        label: ' Artists',
                        data: Object.values(topGenres),
                        backgroundColor: Object.values(colors),
                        hoverOffset: 20,
                        hoverBorderJoinStyle: 'round',
                        borderColor: "rgb(45, 45, 45)"
                    }]
                },
                options: {
                    animation: {
                        onComplete: () => {
                            pieDelay = true;
                        },
                        delay: (context) => {
                            let delay = 0;
                            if (context.type === 'data' && context.mode === 'default' && !pieDelay) {
                            delay = context.dataIndex * 10 + context.datasetIndex * 100;
                            }
                            return delay;
                        },
                    },
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: {
                                font: {
                                    size: 16
                                },
                                color: "white",
                                usePointStyle: true,
                            }
                        },
                        tooltip: {
                            titleFont: {
                                size: 16
                            },
                            backgroundColor: 'rgba(60, 60, 60, .9)',
                            callbacks: {
                                footer: footer
                            }
                        }
                    },
                    layout: {
                        padding: {
                            top: 8
                        }
                    }
                }
            });
        }
        genreChart();

        // =======================================================================================
        
        // SECTION
        // ======== TRACK CODE =========

        const songData = songRes[0].items;
        // console.log(songData);

        let songs = [];
        let artists = [];

        // Assemble easily usable data sets
        for (let i = 0; i < songData.length; i++) {
            songs.push(songData[i].name);
            artists.push(songData[i].album.artists[0].name);
            // if (i < 10) 
            songIds += songData[i].id + ',';
            if (i < 5) seedTracks += songData[i].id + ',';
        };
        seedTracks = seedTracks.slice(0, -1);
        songIds = songIds.slice(0, -1);
        
        // console.log(songIds);
        // console.log(artists);
        // console.log(artistsGenres);
        

        // Check if artist is already there, add song to array of existing songs, calculate number of songs as 'length'
        // Also a seperate object just for song counts because that is the easiest way to pass it to Chart.js :|
        // TODO == Consider taking length back out of artistSongs if I don't end up using it
        // UPDATE == This is now capped at 15 artists (subject to change) but technically still only capped at 50 songs max
        const artistSongs = {};
        const chartSongCounts = {};
        
        for (let i = 0; i < artists.length; i++) {
            let artist = artists[i];

            if (Object.keys(chartSongCounts).length < 50 || artist in chartSongCounts) {
                if (artist in artistSongs) {
                    // If artists already exists in new object, push another song to its array of songs
                    artistSongs[artist].push(songs[i]);
                } else {
                    // If artist isn't in new objects yet, add it (and add the song that goes with it)
                    artistSongs[artist] = [songs[i]];
                    chartSongCounts[artist] = 0;
                }
                // Add one to total song count
                chartSongCounts[artist] = chartSongCounts[artist] + 1;
            } 
        }
        // console.log(chartSongCounts);
        // console.log(artistSongs); 
        // console.log(topGenres);


        // This takes a ton of objects and compares them all to find which artists from the top artists overlap with artists from the top tracks, at which point it finds the genres of those artists that do overlap, but (hopefully) only if the genre is one of the *8 top genres
        // Compiles an object with a single color, cooresponding to a top genre, for each artist. Fed to ChartJS, all just to color the bars
        const barColorData = {};
        
        // NOTE ***** this is where genre are decided, based on first genre, maybe make some system where it's based on the genre the artist covers that also has the most weight for the user IE pick the users biggest genre that the artist also represents, instead of just the first
        // console.log(artistsGenres);
        let barIterator = 0;
        for (artist in artistSongs) {
            barIterator++;
            if (artist in artistsGenres && barIterator <= Object.keys(chartSongCounts).length) {
                for (let i = 0; i < artistsGenres[artist].length; i++) {
                    for (let j = 0; j < Object.keys(topGenres).length; j++) {
                        // Ensuring the artist hasn't already been added and then adding the artist with their first genre that cooresponds to one of eight top genres
                        if (artistsGenres[artist][i] === Object.keys(topGenres)[j] && !(artist in barColorData)) {
                            barColorData[artist] = Object.values(colors)[j];
                        } 
                    }
                }
                // Exception for artists which don't share a genre with top genres
                if (!(artist in barColorData)) {
                    barColorData[artist] = 'rgb(80, 80, 80, .7)';
                };
            // Extra exception for artists which didn't make top artists list and therefor genres are unknown (lumping in with other, I don't think people will mind or notice tbh)
            } else if (!(artist in artistsGenres)) barColorData[artist] = 'rgb(80, 80, 80, .7)';
        };
        // console.log(barColorData);

        
        let barData = {};
        let barSortIterator = 0;
        for (artist in artistsGenres) {
            if (barSortIterator >= 15) break;
            artistSongs[artist] ? barData[artist] = artistSongs[artist] : barData[artist] = [];
            barSortIterator++;
        }
        // console.log(barData);

        let songCounts = {};
        for (artist in barData) {
            songCounts[artist] = barData[artist].length;
        }
        // console.log(songCounts);



        // Last little check to limit graph size to *15
        let barTotal = Object.keys(artistSongs).length;
        if (barTotal > 15) barTotal = 15;
        

        // Bar Chart

        // Custom tooltip function
        const tooltipLabels = Object.values(barData);
        let tooltipSongs = [];
        const barFooter = (tooltipItems) => {
            
            tooltipItems.forEach(function(tooltipItem) {
                labelSongs = tooltipLabels[tooltipItem.parsed.y];
            });

            return labelSongs;
        };



        // const artistSongsChart = function artistSongsChart() {
        //     const ctx = document.getElementById('artistSongsChart').getContext('2d');
            
        //     const data = {
        //         labels: Object.keys(barData),
        //         datasets: [{
        //             data: Object.values(songCounts),
        //             label: ' Songs',
        //             backgroundColor: Object.values(barColorData),
        //             borderColor: Object.values(barColorData),
        //             borderWidth: 1,
        //             borderRadius: 4
        //         }]
        //     };
        //     let delayed;
        //     const barChart = new Chart(ctx, {
        //         type: 'bar',
        //         data: data,
        //         options: {
        //             // responsive: false,
        //             maintainAspectRatio: false,
        //             indexAxis: 'y',
        //             animation: {
        //                 onComplete: () => {
        //                     delayed = true;
        //                 },
        //                 delay: (context) => {
        //                     let delay = 0;
        //                     if (context.type === 'data' && context.mode === 'default' && !delayed) {
        //                     delay = context.dataIndex * 200 + context.datasetIndex * 100;
        //                     }
        //                     return delay;
        //                 },
        //             },
        //             scales: {
        //                 x: {
        //                     beginAtZero: true,
        //                     title: {
        //                         display: true,
        //                         text: '# of songs (out of your top 50)',
        //                         font: {
        //                             size: 13
        //                         }
        //                     },
        //                     grid: {
        //                         display: false
        //                     },
        //                     ticks: {
        //                         font: {
        //                             size: 13    
        //                         },
        //                     }
        //                 },
        //                 y: {
        //                     ticks: {
        //                         autoSkip: false,
        //                         font: {
        //                             size: 16    
        //                         },
        //                         callback: function(value) {
        //                             if (this.getLabelForValue(value).length > 11) {
        //                                 return this.getLabelForValue(value).substr(0, 10) + "...";
        //                             } else return this.getLabelForValue(value);
        //                         }
        //                         // mirror: true,
        //                         // z: 1,
        //                         // color: 'black',
        //                     },
        //                 }
        //             },
        //             plugins: {
        //                 legend: {
        //                     display: false
        //                 },
        //                 tooltip: {
        //                     callbacks: {
        //                         footer: barFooter,
        //                     }
        //                 }
        //             }
        //         },
        //     });
        // }
        // artistSongsChart();
        // ==========================

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

        // Get Average Popularity
        let popularity = 0;
        for (let i = 0; i < genreData.length; i++) {
            popularity += genreData[i].popularity;
        }
        popularity = popularity / genreData.length;

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
        console.log(popularity);
        popularity = rescalePopularity(popularity);
        console.log(popularity);


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
        }


        console.log(genreData)
        console.log(songData)
        // Top lists code - compiles all the data necessary for top lists into the HTML via jQuery
        for (i = 0; i < 10; i++) {
            // console.log(songData[i].artists[0].name)
            const artist = genreData[i];
            const song = songData[i];

            // Top Artist list code below
            if (genreData.length > i) {
                $(`#artist-li-${i}`).dblclick({uri: artist.uri, uriType: "artist"}, playSpotify)
                
                $(`#artist-play-${i}`).click({uri: artist.uri, uriType: "artist"}, playSpotify);
                $(`#artist-image-${i}`).attr('src', artist.images[2].url);
                $(`#artist-name-${i}`).text(artist.name)
                    .attr('href', artist.uri);
                $(`#artist-play-tip-${i}`).text(`Play ${artist.name} on Spotify`);

                const artistPop = Math.round(rescalePopularity(artist.popularity, 30, 90));
                $(`#artist-popularity-${i} .highlighted`).text(compilePopularity(artistPop)[0]);
                $(`#artist-popularity-${i} .dimmed`).text(compilePopularity(artistPop)[1]);
            } else {
                $(`#artist-li-${i}`).attr('class', 'no-data');
            }

            // Top Songs list code below
            if (songData.length > i) {
                $(`#song-li-${i}`).dblclick({uri: song.uri, uriType: "song"}, playSpotify);

                $(`#song-image-${i}`).attr('src', song.album.images[2].url);
                $(`#song-name-${i}`).text(song.name)
                    .attr('href', song.uri);
                $(`#album-link-${i}`).attr('href', song.album.uri);
                
                
                $(`#song-artist-${i}`).text(song.artists[0].name)
                    .attr('href', song.artists[0].uri);
                $(`#song-play-${i}`).click({uri: song.uri, uriType: "song"}, playSpotify);
                $(`#song-play-tip-${i}`).text(`Play ${song.name} by ${song.artists[0].name} on Spotify`);

                const songPop = Math.round(rescalePopularity(song.popularity, 30, 90));
                $(`#song-popularity-${i} .highlighted`).text(compilePopularity(songPop)[0]);
                $(`#song-popularity-${i} .dimmed`).text(compilePopularity(songPop)[1]);

                $(`#song-duration-${i}`).text(refactorDuration(song.duration_ms));
            } else {
                $(`#song-li-${i}`).attr('class', 'no-data');
            }
        }


        // See More and Show Less logic
        let seeMore = false; 
        const seeMoreLess = function seeMoreLess(event) {
            const type = event.data.type;
            if (seeMore === false) {
                $(`.see-more-${type}`).text('SHOW LESS');
                $(`.extended-${type}`).css('display', 'grid');
                seeMore = true;
            } else if (seeMore === true) {
                $(`.see-more-${type}`).text('SEE MORE');
                $(`.extended-${type}`).css('display', 'none');
                seeMore = false;
            }
        }
        $('.see-more-artists').click({type: 'artists'}, seeMoreLess);
        $('.see-more-songs').click({type: 'songs'}, seeMoreLess);


        const callFollowing = function callFollowing() {
            return $.ajax({
                url: `https://api.spotify.com/v1/me/following/contains?type=artist&ids=${followingIds}`,
                headers: {
                'Authorization': 'Bearer ' + access_token
                },
                success: function(response) {
                    console.log(response);
                },
                error: function(error) {
                    console.log(`Error: ${error.responseJSON.error.message}`);
                    // window.location.replace(window.location.origin);   
                }
            });
        };
        callFollowing();
        

        // NOTE this runs here inside the callSongs "when" so it has access to all song ids
        const callFeatures = function callFeatures() {
            
            return $.ajax({
                url: `https://api.spotify.com/v1/audio-features?ids=${songIds}`,
                headers: {
                'Authorization': 'Bearer ' + access_token
                },
                success: function(response) {
                    // console.log(response);
                },
            });
        };


        $.when(callFeatures()).done(function(featuresRes) {

            audioFeatures = featuresRes.audio_features;

            // Provides the returned features with their name instead of just URI
            for (i = 0; i < audioFeatures.length; i++) {
                audioFeatures[i].name = songData[i].name;
            }
            console.log(audioFeatures);

            let acousticness = 0;
            let danceability = 0;
            let energy = 0;
            // let loudness = 0;
            let mode = 0;
            let valence = 0;
            let tempo = 0;

            // for (let i = 0; i < audioFeatures.length; i++) {
            //     acousticness += audioFeatures[i].acousticness;
            //     danceability += audioFeatures[i].danceability;
            //     energy += audioFeatures[i].energy;
            //     // loudness += audioFeatures[i].loudness;
            //     mode += audioFeatures[i].mode;
            //     valence += audioFeatures[i].valence;
            //     tempo += audioFeatures[i].tempo;
            // }

            const features = {
                popularity: popularity,
                danceability: 0,
                mode: 0,
                valence: 0,
                tempo: 0,
                energy: 0
            };

            for (let song of audioFeatures) {
                features.danceability += song.danceability;
                features.mode += song.mode;
                features.energy += song.energy;
                features.valence += song.valence;
                features.tempo += song.tempo;
            }


            // TODO remove "title" param if I decide to stick with variables and just rename them to what I want the titles to be
            /**
             * Asses the audio features of the User's top tracks and displays their scores with the corresponding category
             * 
             * @param {string} category The category that is being rated (ex. popularity)
             * @param {number} rating The score (from 0-100) given to the category
             * @param {string} title The text to be displayed alongisde the rating
             */
            function generateRatingCircle(category, rating, title) {
                console.log(category + ': ' + rating);

                // Tempo needs special treatment (for its weird range (40-200))
                const originalRating = rating;
                if (category == 'tempo') rating = Math.round((features.tempo - 40) * (100 / 160));
                
                
                const percent = rating * (Math.PI*2 / 100); // Create's a percentage from 0-100 out of radians

                if (category == 'tempo') rating = originalRating; // Also for tempo

                const canvas = document.getElementById(category);
                const ctx = canvas.getContext('2d');

                // Clean up the rough canvas edges
                const dpi = 2; // Hard setting 2 seems like the best solution for now
                canvas.setAttribute('height', canvas.clientHeight * dpi);
                canvas.setAttribute('width', canvas.clientWidth * dpi);

                // Progress background
                ctx.beginPath();
                ctx.arc(150, 150, 130, Math.PI*2, 0, true);
                ctx.strokeStyle = 'rgb(75, 75, 75)';
                ctx.lineWidth = 25;
                ctx.lineCap = 'round';
                ctx.stroke();

                // The progress itself (the color), don't draw if rating is 0
                if (rating > 0) {
                    ctx.beginPath();
                    ctx.arc(150, 150, 130, percent, 0, true);
                    ctx.strokeStyle = '#3A80F7';
                    // ctx.shadowOffsetX = 0;
                    // ctx.shadowOffsetY = 0;
                    // ctx.shadowBlur = 10;
                    // ctx.shadowColor = '#3A80F7';
                    ctx.lineWidth = 25;
                    ctx.stroke();
                }

                $(`#${category}-number`).text(Math.round(rating));
                $(`#${category}-title`).text(category.charAt(0).toUpperCase() + category.slice(1));
            };

            for (let feature in features) {

                features[feature] = features[feature] / audioFeatures.length * 100;

                // Tempo handling
                if (feature == 'tempo') features[feature] = features[feature] / 100; 

                // Fix (undo recalc) for popularity since it was calculated already
                if (feature == 'popularity') features[feature] = features[feature]  * audioFeatures.length / 100;

                generateRatingCircle(feature, features[feature]);
            }
            console.log(features);
        });


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
            
            let urlFilter = '';
            for (filter in filters) {
                if ($(`#${filter}-check`).is(':checked')) {
                    urlFilter += `&target_${filter}=${filters[filter]}`

                    // Fixing mode appearance to match others
                    if (filter == 'mode') {

                    }
                }
            }
            console.log(urlFilter);

            $.when(callRecs(seedTracks, urlFilter)).done(function (recs) {
                const recsData = recs.tracks;
                console.log(recsData);
                
                refreshRecs(recsData);
            });
        }

        /**
         * Handles updating of UI with new data after submitRecs runs
         * @param {array} recsData The array of tracks returned after the API call
         */
            const refreshRecs = function refreshRecs(recsData) {
            for (i = 0; i < 5; i++) {
                const songRec = recsData[i];

                if (recsData.length > i) {
                    // Unbinds added to prevent click events stacking on elements on refresh
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
        }


        $('#rec-refresh').click(submitRecs);

        // Initial recs call
        $.when(callRecs(seedTracks, '')).done(function (recs) {
            const recsData = recs.tracks;
            console.log(recsData);
            console.log(recs)

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
    }
    
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
    $('.checkbox').click(function () {
        $('.checkbox:checked').siblings('.unselected').css('display','none');
        $('.checkbox:not(:checked)').siblings('.unselected').css('display','block');
    });



} else {
    // FIXME this is deprecated and now Idk what this if statement even does
    $('#login-page').show();
    $('#home-page').hide(); // TODO this does nothing atm
};





// Original token refresher
// document.getElementById('obtain-new-token').addEventListener('click', function() {
//     $.ajax({
//     url: '/refresh_token',
//     data: {
//         'refresh_token': refresh_token
//     }
//     }).done(function(data) {
//         // ====== console.log("Token Data: " + data);
//         access_token = data.access_token;
//         oauthPlaceholder.innerHTML = oauthTemplate({
//             access_token: access_token,
//             refresh_token: refresh_token
//         });
//     });
// }, false);
