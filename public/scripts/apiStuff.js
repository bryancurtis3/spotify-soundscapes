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

// var userProfileSource = document.getElementById('user-profile-template').innerHTML,
//     userProfileTemplate = Handlebars.compile(userProfileSource),
//     userProfilePlaceholder = document.getElementById('user-profile');

// var oauthSource = document.getElementById('oauth-template').innerHTML,
//     oauthTemplate = Handlebars.compile(oauthSource),
//     oauthPlaceholder = document.getElementById('oauth');

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
        url: 'https://api.spotify.com/v1/me/top/artists',
        headers: {
        'Authorization': 'Bearer ' + access_token
        },
        success: function(response) {
            console.log(response);

            // Get Average Popularity
            let popularity = 0;
            console.log(response.item);
            for (let i = 0; i < 20; i++) {
                popularity += response.items[i].popularity;
            }
            popularity = popularity / 20;
            console.log(popularity);

            // Genres
            let genres = [];
            for (let i = 0; i < 20; i++) {
                for (let j = 0; j < response.items[i].genres.length; j++) {
                    genres.push(response.items[i].genres[j]);
                }
            }

            const genreStats = {};
            for (const genre of genres) {
                genreStats[genre] = genreStats[genre] ? genreStats[genre] + 1 : 1;
            }

            let mostGenres = Object.values(genreStats).sort().reverse().splice(0, 5);


            const topGenres = {}
            for (const genre in genreStats) {
                for (let i = 0; i < 5; i++) {
                    if (genreStats[genre] === mostGenres[i]) {
                        topGenres[genre] = mostGenres[i];
                    }
                }
            }
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
                                'rgb(255, 99, 132)',
                                'rgb(54, 162, 235)',
                                'rgb(255, 205, 86)',
                                'rgb(15, 208, 102)',
                                'rgb(130, 110, 230)'
                            ],
                            hoverOffset: 4
                        }]
                    },
                });
            }
            genreChart();
        }
    });

    // ======== TOP CODE =========
    $.ajax({
        url: 'https://api.spotify.com/v1/me/top/tracks',
        headers: {
        'Authorization': 'Bearer ' + access_token
        },
        success: function(response) {
            console.log(response);
            $("#test").text(response.items[0].name);
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