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

const genreChart = function genreChart() {
    const ctx = document.getElementById('genreChart').getContext('2d');

    const genreChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: [
              'Red',
              'Blue',
              'Yellow'
            ],
            datasets: [{
              label: 'My First Dataset',
              data: [300, 50, 100],
              backgroundColor: [
                'rgb(255, 99, 132)',
                'rgb(54, 162, 235)',
                'rgb(255, 205, 86)'
              ],
              hoverOffset: 4
            }]
          },
      });
}
genreChart();



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