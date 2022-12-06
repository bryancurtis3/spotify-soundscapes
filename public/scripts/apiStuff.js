// Local session stuff for API
sessionStorage.getItem("timeRange") ? timeRange = sessionStorage.getItem("timeRange") : timeRange = ''; // Acts as timeRange declaration

// Recent Data
const recentData = function recentData() {
    sessionStorage.setItem("timeRange", "time_range=short_term&");
}

// Default Data
const defaultData = function defaultData() {
    sessionStorage.removeItem("timeRange");
}

// Long-term data
const longTermData = function longTermData() {
    sessionStorage.setItem("timeRange", "time_range=long_term&");
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

if (error) {
    alert('There was an error during the authentication');

} else {
    if (access_token) {

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

        
        $.ajax({
            url: 'https://api.spotify.com/v1/me/player/recently-played',
            headers: {
            'Authorization': 'Bearer ' + access_token
            },
            success: function(response) {
                console.log(response);
                
                for (let i = 0; i < response.items.length; i++) {
                    console.log(response.items[i].track.name)
                }
            },
            error: function(error) {
                console.log(`Error: ${error.responseJSON.error.message}`);
                $('#login-page').show();
                $('#home-page').hide();
                window.location.replace("https://spotify-soundscapes.cyclic.app/") // FIXME change this to a base URL and include other ajax calls, remove old show/hide code
            }
        });

        // TODO remove this
        // render oauth info
        // oauthPlaceholder.innerHTML = oauthTemplate({
        // access_token: access_token,
        // refresh_token: refresh_token
        // });

        // Scope widened to share data between API calls
        const artistsGenres = {};
        const topGenres = {};
        let topArtists = []; // TODO remove?
        let colors = {};
        let songIds = '';
        let audioFeatures = {}

        // 0V18Ybdh9dNcNEZTnrFliH

        $.ajax({
            url: 'https://api.spotify.com/v1/artists/1moxjboGR7GNWYIMWsRjgG',
            headers: {
            'Authorization': 'Bearer ' + access_token
            },
            success: function(response) {
                console.log(response);
            },
            error: function(error) {
                console.log(`Error: ${error.responseJSON.error.message}`);
                $('#login-page').show();
                $('#home-page').hide();
            }
        });

        const callArtists = function callArtists() {
    
            return $.ajax({
                url: `https://api.spotify.com/v1/me/top/artists?${timeRange}limit=50`,
                headers: {
                'Authorization': 'Bearer ' + access_token
                },
                success: function(response) {
                    console.log(response);
                },
                error: function(error) {
                    console.log(`Error: ${error.responseJSON.error.message}`);
                    $('#login-page').show();
                    $('#home-page').hide();   
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
                    console.log(response);
                },
                error: function(error) {
                    console.log(`Error: ${error.responseJSON.error.message}`);
                    $('#login-page').show();
                    $('#home-page').hide();   
                }
            });
        }
        

        $.when(callArtists(), callSongs()).done(function(genreRes, songRes){

            const genreData = genreRes[0];
    
            // ===== Genres =====
    
            // Extract data from JSON
            let genres = [];
            let artistData = [];
            for (let i = 0; i < genreData.items.length; i++) {
                artistData.push(genreData.items[i].name);
    
                for (let j = 0; j < genreData.items[i].genres.length; j++) {
                    genres.push(genreData.items[i].genres[j]);
                }
            }

            
            let artistIterator = 0;
            for (const artist of artistData) {
                artistsGenres[artist] = genreData.items[artistIterator].genres
                artistIterator++;
            }
            console.log(artistsGenres);
            
            // Compile simple artists: [...genres] object
            const genreStats = {};
            for (const genre of genres) {
                genreStats[genre] = genreStats[genre] ? genreStats[genre] + 1 : 1;
            }
            console.log(genreStats);
    
            // Make an array of total count for each genre from highest to lowest
            let mostGenres = Object.values(genreStats)
            .sort((function(a, b) {return a - b;}))
            .reverse()
            .splice(0, 8);
            console.log(mostGenres);
    
            // Make an object of genre: occurences
            for (const genre in genreStats) {
                for (let i = 0; i < mostGenres.length; i++) {
                    if (genreStats[genre] === mostGenres[i]) {
                        topGenres[genre] = mostGenres[i];
                        mostGenres.splice(i, 1);
                        break; // Break here ensures genres don't canibalize other genres with same total occurences
                    };
                };
            };
            // topGenres.other = 0; // TODO remove this if I don't resurrect the bar graph
            console.log(topGenres);


            // Compiling data for custom doughnut tooltip
            let genreArtists = {};
            for (let i = 0; i < Object.keys(artistsGenres).length; i++) {
                let artist = Object.keys(artistsGenres)[i];
                // console.log(artist);
                for (const genre in topGenres) {
                    if (artistsGenres[artist].includes(genre)) {
                        // console.log(genre);
                        genreArtists[genre] ? genreArtists[genre].push(artist) : genreArtists[genre] = [artist];
                    }
                }
            }
            console.log(genreArtists);

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
    
            const songData = songRes[0];
            console.log(songData);
    
            let songs = [];
            let artists = [];

            // Assemble easily usable data sets
            for (let i = 0; i < 50; i++) {
                songs.push(songData.items[i].name);
                artists.push(songData.items[i].album.artists[0].name);
                // if (i < 10) 
                songIds += songData.items[i].id + ',';
            };
            songIds = songIds.slice(0, -1);
            
            // console.log(songIds);
            console.log(artists);
            console.log(artistsGenres);
            
    
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
            console.log(chartSongCounts);
            console.log(artistSongs); 
            console.log(topGenres);


            // This takes a ton of objects and compares them all to find which artists from the top artists overlap with artists from the top tracks, at which point it finds the genres of those artists that do overlap, but (hopefully) only if the genre is one of the *8 top genres
            // Compiles an object with a single color, cooresponding to a top genre, for each artist. Fed to ChartJS, all just to color the bars
            const barColorData = {};
            
            // NOTE ***** this is where genre are decided, based on first genre, maybe make some system where it's based on the genre the artist covers that also has the most weight for the user IE pick the users biggest genre that the artist also represents, instead of just the first
            console.log(artistsGenres);
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
            console.log(barColorData);

            
            let barData = {};
            let barSortIterator = 0;
            for (artist in artistsGenres) {
                if (barSortIterator >= 15) break;
                
                artistSongs[artist] ? barData[artist] = artistSongs[artist] : barData[artist] = [];

                barSortIterator++;
            }
            console.log(barData);

            let songCounts = {};
            for (artist in barData) {
                songCounts[artist] = barData[artist].length;
            }
            console.log(songCounts);
    
    
    
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
             * @param {string} event Holds the song URI that needs to be played
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
            for (let i = 0; i < genreData.items.length; i++) {
                popularity += genreData.items[i].popularity;
            }
            popularity = popularity / genreData.items.length;

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
            popularity = rescalePopularity(popularity);

            const popularityArray = [];

            for (let i = 0; i < 10; i++) {
                const songPop = Math.round(rescalePopularity(songData.items[i].popularity, 30, 85) / 10);

                let highlighted = '';
                let dimmed = '';
                for (let j = 0; j < 10; j++) {
                    j < songPop ? highlighted = highlighted + '|' : dimmed = dimmed + '|'
                }
                // console.log(highlighted + " + " + dimmed);
                popularityArray[i] = [highlighted, dimmed]
            }
            console.log(popularityArray);

            for (let i = 0; i < 10; i++) {

            }

            // Top Artists list code below
            console.log(genreData)
            console.log(songData)
            for (i = 0; i < 10; i++) {
                // console.log(songData.items[i].artists[0].name)
                $(`#artist-image-${i}`).attr('src', genreData.items[i].images[2].url);
                $(`#artist-name-${i}`).text(genreData.items[i].name);

                $(`#song-image-${i}`).attr('src', songData.items[i].album.images[2].url);
                $(`#song-name-${i}`).text(songData.items[i].name);

                $(`#album-link-${i}`).attr('href', songData.items[i].album.external_urls.spotify);

                $(`#artist-name-${i}`).attr('href', genreData.items[i].external_urls.spotify)
                $(`#song-name-${i}`).attr('href', songData.items[i].external_urls.spotify)
                
                $(`#song-artist-${i}`).text(songData.items[i].artists[0].name)
                    .attr('href', songData.items[i].artists[0].external_urls.spotify);
                $(`#song-play-${i}`).click({uri: songData.items[i].uri, uriType: "song"}, playSpotify);
                $(`#artist-play-${i}`).click({uri: genreData.items[i].uri, uriType: "artist"}, playSpotify);

                $(`#song-popularity-${i} .highlighted`).text(popularityArray[i][0]);
                $(`#song-popularity-${i} .dimmed`).text(popularityArray[i][1]);

                $(`#song-duration-${i}`).text(refactorDuration(songData.items[i].duration_ms));
            }

            // See More and Show Less logic
            let moreOrLess = 'less';
            const seeMoreLess = function seeMoreLess(event) {
                const type = event.data.type;
                if (moreOrLess === 'less') {
                    $(`.see-more-${type}`).text('SHOW LESS');
                    $(`.extended-${type}`).css('display', 'grid');
                    moreOrLess = 'more'
                } else if (moreOrLess === 'more') {
                    $(`.see-more-${type}`).text('SEE MORE');
                    $(`.extended-${type}`).css('display', 'none');
                    moreOrLess = 'less'
                }
            }
            $('.see-more-artists').click({type: 'artists'}, seeMoreLess);
            $('.see-more-songs').click({type: 'songs'}, seeMoreLess);


    
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
                })
            }

            $.when(callFeatures()).done(function(featuresRes) {

                audioFeatures = featuresRes.audio_features;

                for (i = 0; i < audioFeatures.length; i++) {
                    audioFeatures[i].name = songData.items[i].name;
                }
                console.log(audioFeatures);

                let acousticness = 0;
                let danceability = 0;
                let energy = 0;
                let loudness = 0;
                let mode = 0;
                let valence = 0;

                for (song of audioFeatures) {
                    acousticness += song.acousticness;
                    danceability += song.danceability;
                    energy += song.energy;
                    loudness += song.loudness;
                    mode += song.mode;
                    valence += song.valence;
                }
                acousticness = acousticness / audioFeatures.length * 100;
                danceability = danceability / audioFeatures.length * 100;
                energy = energy / audioFeatures.length * 100;
                // loudness = loudness / audioFeatures.length * 100; Loudness is a weird negative value
                mode = mode / audioFeatures.length * 100;
                valence = valence / audioFeatures.length * 100;

                console.log(acousticness);
                console.log(danceability);
                console.log(energy);
                console.log(loudness);
                console.log(mode);
                console.log(valence);

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
                    
                    const percent = rating * (Math.PI*2 / 100); // Create's a percent from 0-100 in radians

                    const canvas = document.getElementById(category);
                    const ctx = canvas.getContext('2d');

                    // Clean up the rough canvas edges
                    const dpi = 2; //FIXME this needs to be tested on mobile to see if 2 works and/or if the original (window.devicePixelRatio) actually destroys itself
                    canvas.setAttribute('height', canvas.clientHeight * dpi);
                    canvas.setAttribute('width', canvas.clientWidth * dpi);

                    // Progress background
                    ctx.beginPath();
                    ctx.arc(150, 150, 130, Math.PI*2, 0, true);
                    ctx.strokeStyle = 'rgb(75, 75, 75)';
                    ctx.lineWidth = 25;
                    ctx.lineCap = 'round';
                    ctx.stroke();

                    // Progress itself (color), don't draw if rating is 0
                    if (rating > 0) {
                        ctx.beginPath();
                        ctx.arc(150, 150, 130, percent, 0, true);
                        ctx.strokeStyle = 'rgb(74, 172, 245)';
                        // ctx.shadowOffsetX = 0;
                        // ctx.shadowOffsetY = 0;
                        // ctx.shadowBlur = 10;
                        // ctx.shadowColor = 'rgb(74, 172, 245)';
                        ctx.lineWidth = 25;
                        ctx.stroke();
                    }

                    $(`#${category}-number`).text(Math.round(rating));
                    $(`#${category}-title`).text(category.charAt(0).toUpperCase() + category.slice(1));
                };

                generateRatingCircle('danceability', danceability, 'Partyness');
                generateRatingCircle('mode', mode);
                generateRatingCircle('popularity', popularity)
            });

        
            
        })



        // $.when(callFeatures()).done(function(featuresRes)) {
        //     audioFeatures = featuresRes;
        // }
        

    } else {
        // TODO this is deprecated and now Idk what this if statement even does
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
}