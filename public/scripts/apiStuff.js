// require("dotenv").config();

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
        // render oauth info
        // oauthPlaceholder.innerHTML = oauthTemplate({
        // access_token: access_token,
        // refresh_token: refresh_token
        // });

        // Scope widened to share data between API calls
        const artistsGenres = {};
        const topGenres = {};
        let colors = {};

        // 0V18Ybdh9dNcNEZTnrFliH

        $.ajax({
            url: 'https://api.spotify.com/v1/artists/1moxjboGR7GNWYIMWsRjgG',
            headers: {
            'Authorization': 'Bearer ' + access_token
            },
            success: function(response) {
                console.log(response);
            }
        }),
        $.ajax({
            url: 'https://api.spotify.com/v1/me/top/artists?limit=50',
            headers: {
            'Authorization': 'Bearer ' + access_token
            },
            success: function(response) {
                console.log(response);

                // Get Average Popularity
                let popularity = 0;
                for (let i = 0; i < 50; i++) {
                    popularity += response.items[i].popularity;
                }
                popularity = popularity / 50;
                console.log(popularity);

                // ===== Genres =====

                // Extract data from JSON
                let genres = [];
                let artistData = [];
                for (let i = 0; i < 50; i++) {

                    artistData.push(response.items[i].name);

                    for (let j = 0; j < response.items[i].genres.length; j++) {
                        genres.push(response.items[i].genres[j]);
                    }
                }

                let artistIterator = 0;
                for (const artist of artistData) {
                    artistsGenres[artist] = response.items[artistIterator].genres
                    artistIterator++;
                }
                console.log(artistsGenres);
                
                const genreStats = {};
                for (const genre of genres) {
                    genreStats[genre] = genreStats[genre] ? genreStats[genre] + 1 : 1;
                }
                console.log(genreStats);

                let mostGenres = Object.values(genreStats)
                .sort((function(a, b) {return a - b;}))
                .reverse()
                .splice(0, 8);
                console.log(mostGenres);

                
                for (const genre in genreStats) {
                    for (let i = 0; i < mostGenres.length; i++) {
                        if (genreStats[genre] === mostGenres[i]) {
                            topGenres[genre] = mostGenres[i];
                            mostGenres.splice(i, 1);
                        };
                    };
                };
                console.log(topGenres);


                colors = {
                    green: 'rgb(45, 208, 112)',
                    purple: 'rgb(130, 120, 230)',
                    gold: 'rgb(255, 205, 86)',
                    pink: 'rgb(240, 140, 240)',
                    blue: 'rgb(74, 172, 245)',
                    folklore: 'rgb(255, 120, 120)',
                    lightBlue: 'rgb(142, 200, 255)',
                    orange: 'rgb(251, 145, 90)'
                }

                const genreChart = function genreChart() {
                    const ctx = document.getElementById('genreChart').getContext('2d');
                
                    const genreChart = new Chart(ctx, {
                        type: 'doughnut',
                        data: {
                            labels: Object.keys(topGenres),
                            datasets: [{
                                label: 'Top Artist Genres',
                                data: Object.values(topGenres),
                                backgroundColor: Object.values(colors),
                                hoverOffset: 20,
                                hoverBorderJoinStyle: 'round',
                            }]
                        },
                        options: {
                            maintainAspectRation: false,
                            plugins: {
                                // TODO Take this out XXXXX
                                // title: {
                                //     display: true,
                                //     text: 'Your Favorite Genres'
                                // },
                                legend: {
                                    position: 'bottom',
                                    labels: {
                                        font: {
                                            size: 16
                                        },
                                        usePointStyle: true,
                                    }
                                }
                            }
                        }
                    });
                }
                genreChart();



            }
        });

        // ======== TRACK CODE =========
        $.ajax({
            url: 'https://api.spotify.com/v1/me/top/tracks?limit=50',
            headers: {
            'Authorization': 'Bearer ' + access_token
            },
            success: function(response) {
                console.log(response);
                $("#test").text(response.items[0].name);


                let songs = [];
                let artists = [];
                for (let i = 0; i < 50; i++) {
                    songs.push(response.items[i].name);
                    artists.push(response.items[i].album.artists[0].name);

                };
                // console.log(songs);
                console.log(artists);
                console.log(artistsGenres);


                

                // Check if artist is already there, add song to array of existing songs, calculate number of songs as 'length'
                // Also a seperate object just for song counts because that is the easiest way to pass it to Chart.js :|
                // NOTE == Consider taking length back out of artistSongs if I don't end up using it
                // UPDATE == This is now capped at 15 artists (subject to change) but technically still only capped at 50 songs max
                const artistSongs = {};
                const chartSongCounts = {};
                
                for (let i = 0; i < artists.length; i++) {
                    let artist = artists[i];

                    if (Object.keys(chartSongCounts).length < 50 || artist in chartSongCounts) {
                        if (artist in artistSongs) {
                            artistSongs[artist].songs.push(songs[i])
                        } else {
                            artistSongs[artist] = {'songs': [songs[i]], 'length': 0};
                        }
                        // Find total songs count (and add it to the object)
                        chartSongCounts[artist] = artistSongs[artist].songs.length;
                        artistSongs[artist].length = artistSongs[artist].songs.length;
                    } 
                }
                console.log(chartSongCounts);
                console.log(artistSongs); 
                console.log(topGenres);


                // This takes a ton of objects and compares them all to find which artists from the top artists overlap with artists from the top tracks, at which point it finds the genres of those artists that do overlap, but (hopefully) only if the genre is one of the *8 top genres
                // Compiles an object with a single color, cooresponding to a top genre, for each artist. Fed to ChartJS, all just to color the bars
                const barData = {};
                
                // NOTE ***** this is where genre are decided, based on first genre, maybe make some system where it's based on the genre the artist covers that also has the most weight for the user IE pick the users biggest genre that the artist also represents, instead of just the first
                console.log(artistsGenres);
                let barIterator = 0;
                for (artist in artistSongs) {
                    barIterator++;
                    if (artist in artistsGenres && barIterator <= Object.keys(chartSongCounts).length) {
                        for (let i = 0; i < artistsGenres[artist].length; i++) {
                            for (let j = 0; j < Object.keys(topGenres).length; j++) {
                                // Ensuring the artist hasn't already been added and then adding the artist with their first genre that cooresponds to one of eight top genres
                                if (artistsGenres[artist][i] === Object.keys(topGenres)[j] && !(artist in barData)) {
                                    barData[artist] = Object.values(colors)[j];
                                } 
                            }
                        }
                        // Exception for artists which don't share a genre with top genres
                        if (!(artist in barData)) {
                            barData[artist] = 'rgb(80, 80, 80, .7)';
                        };
                    // Extra exception for artists which didn't make top artists list and therefor genres are unknown (lumping in with other, I don't think people will mind or notice tbh)
                    } else if (!(artist in artistsGenres)) barData[artist] = 'rgb(80, 80, 80, .7)';
                };
                console.log(barData);


                // ===== OLD CODE DELETE IF NOTHING BREAKS IN THE NEAR FUTURE =====

                // Seperating this rather than adding it to the rat's nest
                // let barColors = Object.values(colors).map(color => color.slice(0, -1)  + ', .7)');
                // for (artist in chartSongCounts) {
                //     for (let i = 0; i < barColors.length; i++) {
                //         if (barData[artist] == Object.keys(topGenres)[i]) {
                //             barData[artist] = barColors[i]; 
                //         } 
                //     }
                //     // Checks for uncolored genres and assigns them the 'other' color
                //     if (barData[artist] !== undefined && barData[artist].slice(0, 4) !== 'rgb(') {
                //         barData[artist] = 'rgb(80, 80, 80, .7)';
                //     }
                // }
                // console.log(Object.values(barData));
                // console.log(chartSongCounts);

                // Last little check to limit graph size to *15
                let barTotal = Object.keys(artistSongs).length;
                if (barTotal > 15) barTotal = 15;
                
                // Custom shortened labels for better UX on mobile
                let barLabels = Object.keys(artistSongs).slice(0, barTotal);
                
                for (let i = 0; i < barLabels.length; i++) {
                    if (barLabels[i].length > 11) {
                        barLabels[i] = barLabels[i].substring(0, 10) + "...";
                    }
                }
                console.log(barLabels);

                // Bar Chart
                console.log(artistSongs)
                const artistSongsChart = function artistSongsChart() {
                    const ctx = document.getElementById('artistSongsChart').getContext('2d');

                    
                    const data = {
                        labels: barLabels,
                        datasets: [{
                            data: Object.values(chartSongCounts).slice(0, barTotal),
                            backgroundColor: Object.values(barData),
                            borderColor: Object.values(barData),
                            borderWidth: 1,
                            borderRadius: 4
                        }]
                    };
                    let delayed;
                    const barChart = new Chart(ctx, {
                        type: 'bar',
                        data: data,
                        options: {
                            responsive: false,
                            // maintainAspectRation: false,
                            indexAxis: 'y',
                            animation: {
                                onComplete: () => {
                                  delayed = true;
                                },
                                delay: (context) => {
                                  let delay = 0;
                                  if (context.type === 'data' && context.mode === 'default' && !delayed) {
                                    delay = context.dataIndex * 200 + context.datasetIndex * 100;
                                  }
                                  return delay;
                                },
                            },
                            scales: {
                                x: {
                                    beginAtZero: true,
                                    title: {
                                        display: true,
                                        text: '# of songs'
                                    }
                                },
                                y: {
                                    ticks: {
                                        autoSkip: false,
                                        font: {
                                            size: 16    
                                        }
                                    },
                                }
                            },
                            plugins: {
                                legend: {
                                    display: false
                                }
                            }
                        },
                    });
                }
                artistSongsChart();


            }
        });
        // ==========================

        $('#login').hide();

    } else {
        // render initial screen
        $('#login').show();
        $('#loggedin').hide();
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