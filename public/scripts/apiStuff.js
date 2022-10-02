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
        const topGenres = {}


        $.ajax({
            url: 'https://api.spotify.com/v1/me/top/artists?limit=50',
            headers: {
            'Authorization': 'Bearer ' + access_token
            },
            success: function(response) {
                console.log(response);

                // Get Average Popularity
                let popularity = 0;
                console.log(response.item);
                for (let i = 0; i < 50; i++) {
                    popularity += response.items[i].popularity;
                }
                popularity = popularity / 20;
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
                .splice(0, 5);
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

                

                const genreChart = function genreChart() {
                    const ctx = document.getElementById('genreChart').getContext('2d');
                
                    const genreChart = new Chart(ctx, {
                        type: 'doughnut',
                        data: {
                            labels: Object.keys(topGenres),
                            datasets: [{
                                label: 'My First Dataset',
                                data: Object.values(topGenres),
                                backgroundColor: [
                                    'rgb(130, 110, 230)',
                                    'rgb(15, 208, 102)',
                                    'rgb(255, 205, 86)',
                                    'rgb(54, 162, 235)',
                                    'rgb(255, 99, 132)'
                                ],
                                hoverOffset: 20,
                                hoverBorderJoinStyle: 'round',
                            }]
                        },
                        options: {
                            layout: {
                                padding: 10
                            },
                            plugins: {
                                title: {
                                    display: true,
                                    text: 'Your Favorite Genres'
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
                let artists = []
                for (let i = 0; i < 50; i++) {
                    songs.push(response.items[i].name);
                    artists.push(response.items[i].album.artists[0].name);

                };
                console.log(songs);
                console.log(artists);
                console.log(artistsGenres);


                

                // Check if artist is already there, add song to array of existing songs, calculate number of songs as 'length'
                // Also a seperate object just for song counts because that is the easiest way to pass it to Chart.js :|
                // NOTE == Consider taking length back out of artistSongs if I don't end up using it
                const artistSongs = {}
                const chartSongCounts = {};
                for (let i = 0; i < artists.length; i++) {

                    let artist = artists[i];

                    if (artist in artistSongs) {
                        artistSongs[artist].songs.push(songs[i])
                        chartSongCounts[artist] = artistSongs[artist].songs.length;

                    } else {
                        artistSongs[artist] = {'songs': [songs[i]], 'length': 0};
                        chartSongCounts[artist] = artistSongs[artist].songs.length;
                    }
                    artistSongs[artist].length = artistSongs[artist].songs.length;
                }
                console.log(artistSongs); 

                console.log(topGenres)

                // NOTE - What have I done
                // This takes a ton of objects and compares them all to find which artists from the top artists overlap with artists from the top tracks, at which point it finds the genres of those artists that do overlap, but (hopefully) only if the genre is one of the 5 top genres
                // Compiles an object of with a single genre for each object to be fed to ChartJS, all just to color the bars
                const barChartGenreData = {};
                for (artist in artistsGenres) {
                    if (artist in artistSongs) {
                        for (let i = 0; i < artistsGenres[artist].length; i++) {
                            for (let j = 0; j < 5; j++) {
                                if (artistsGenres[artist][i] == Object.keys(topGenres)[j]) {
                                    barChartGenreData[artist] = barChartGenreData[artist] ? barChartGenreData[artist] : artistsGenres[artist][i];
                                    // console.log(artistsGenres[artist][i]);
                                }
                            }
                        }
                    }
                }
                console.log(barChartGenreData);

                // Seperating this rather than adding it to the rat's nest
                let genreColors = [];
                for (artist in artistSongs) {
                    
                    // if (artist in barChartGenreData) {
                        // console.log(barChartGenreData[artist]);
                        // console.log(Object.keys(topGenres)[0]);
                        if (barChartGenreData[artist] == Object.keys(topGenres)[0]) {
                            barChartGenreData[artist] = 'rgb(130, 110, 230, .7)';
                        } else if (barChartGenreData[artist] == Object.keys(topGenres)[1]) { 
                            barChartGenreData[artist] = 'rgb(15, 208, 102, .7)';
                        } else if (barChartGenreData[artist] == Object.keys(topGenres)[2]) { 
                            barChartGenreData[artist] = 'rgb(255, 205, 86, .7)';
                        } else if (barChartGenreData[artist] == Object.keys(topGenres)[3]) { 
                            barChartGenreData[artist] = 'rgb(54, 162, 235, .7)';
                        } else if (barChartGenreData[artist] == Object.keys(topGenres)[4]) { 
                            barChartGenreData[artist] = 'rgb(255, 99, 132, .7)';
                        } else {
                            barChartGenreData[artist] = 'rgb(80, 80, 80, .7)'
                        }
                    // }

                    // for (let i = 0; i < 5; i++) {
                    //     if (barChartGenreData.artist == Object.keys(topGenres)[i]) {
                    //         genreColors[i] = 'rgb(130, 110, 230)'
                    //     }
                    // }
                }
                console.log(barChartGenreData);



                // Bar Chart
                const artistSongsChart = function artistSongsChart() {
                    const ctx = document.getElementById('artistSongsChart').getContext('2d');

                    const data = {
                        labels: Object.keys(artistSongs),
                        datasets: [{
                            data: Object.values(chartSongCounts),
                            backgroundColor: Object.values(barChartGenreData),
                            borderColor: Object.values(barChartGenreData),
                            borderWidth: 1
                        }]
                    };
                    const genreChart = new Chart(ctx, {
                        type: 'bar',
                        data: data,
                        options: {
                            scales: {
                                y: {
                                    beginAtZero: true,
                                    title: {
                                        display: true,
                                        text: '# of songs'
                                    }
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
    }





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