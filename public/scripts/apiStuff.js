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

                const artists = {};
                let artistIterator = 0;
                for (const artist of artistData) {
                    artists[artist] = response.items[artistIterator].genres
                    artistIterator++;
                }
                console.log(artists);
                
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

                
                const topGenres = {}
                for (const genre in genreStats) {
                    for (let i = 0; i < mostGenres.length; i++) {
                        if (genreStats[genre] === mostGenres[i]) {
                            topGenres[genre] = mostGenres[i];
                            mostGenres.splice(i, 1);
                        };
                    };
                };
                console.log(topGenres);




                // console.log(genreStats);
                // for (const genre in genreStats) {
                //     console.log(genreStats[genre]);
                //     if (genreStats[genre] < 3) delete genreStats[genre];
                // }
                


                // console.log(genreStats);
                // console.log(genres);
                // console.log(Object.keys(genreStats));

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
                
                const artistSongs = {}
                const chartSongCounts = {};
                for (let i = 0; i < artists.length; i++) {
                    // Check if artist is already there, add song to array of existing songs, calculate number of songs as 'length'

                    // Also a seperate object just for song counts because that is the easiest way to pass it to Chart.js :|

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
                console.log(chartSongCounts);   



                const artistSongsChart = function artistSongsChart() {
                    const ctx = document.getElementById('artistSongsChart').getContext('2d');

                    const data = {
                        labels: Object.keys(artistSongs),
                        datasets: [{
                            label: 'My First Dataset',
                            data: Object.values(chartSongCounts),
                            backgroundColor: [
                            'rgba(255, 99, 132, 0.2)',
                            'rgba(255, 159, 64, 0.2)',
                            'rgba(255, 205, 86, 0.2)',
                            'rgba(75, 192, 192, 0.2)',
                            'rgba(54, 162, 235, 0.2)',
                            'rgba(153, 102, 255, 0.2)',
                            'rgba(201, 203, 207, 0.2)'
                            ],
                            borderColor: [
                            'rgb(255, 99, 132)',
                            'rgb(255, 159, 64)',
                            'rgb(255, 205, 86)',
                            'rgb(75, 192, 192)',
                            'rgb(54, 162, 235)',
                            'rgb(153, 102, 255)',
                            'rgb(201, 203, 207)'
                            ],
                            borderWidth: 1
                        }]
                    };
                    const genreChart = new Chart(ctx, {
                        type: 'bar',
                        data: data,
                        options: {
                        scales: {
                            y: {
                            beginAtZero: true
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