/**
 * This is an example of a basic node.js script that performs
 * the Authorization Code oAuth2 flow to authenticate against
 * the Spotify Accounts.
 *
 * For more information, read
 * https://developer.spotify.com/web-api/authorization-guide/#authorization_code_flow
 */

require("dotenv").config();
const express = require('express'); // Express web server framework
const request = require('request'); // "Request" library
const cors = require('cors');
const querystring = require('querystring');
const cookieParser = require('cookie-parser');
const path = require('path');

const app = express();

const CLIENT_ID = process.env.CLIENT_ID; // Your client id
const CLIENT_SECRET = process.env.CLIENT_SECRET; // Your secret
const redirect_uri = process.env.BASE_URL + "/callback"; // Your redirect uri

/**
 * Generates a random string containing numbers and letters
 * @param  {number} length The length of the string
 * @return {string} The generated string
 */
let generateRandomString = function(length) {
    let text = '';
    let possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

    for (let i = 0; i < length; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
};

let stateKey = 'spotify_auth_state';

// === System Configuration
app.use(express.static(__dirname + '/public'))
   .use(cors())
   .use(cookieParser());
app.set("view engine", "ejs");

app.get('/login', function(req, res) {

    let state = generateRandomString(16);
    res.cookie(stateKey, state);

    // your application requests authorization
    const scope = 'user-read-private user-read-email user-top-read user-follow-read user-read-recently-played app-remote-control streaming user-modify-playback-state user-follow-read';

    res.redirect('https://accounts.spotify.com/authorize?' +
        querystring.stringify({
        response_type: 'code',
        client_id: CLIENT_ID,
        scope: scope,
        redirect_uri: redirect_uri,
        state: state,
        // show_dialog: true // TODO remove
        }));
});

app.get('/callback', function(req, res) {

    // your application requests refresh and access tokens
    // after checking the state parameter

    let code = req.query.code || null;
    let state = req.query.state || null;
    let storedState = req.cookies ? req.cookies[stateKey] : null;

    // TODO take this out if state mismatch error doesnt resurface
    // console.log(`State: ${state}`);
    // console.log(`Stored State: ${storedState}`);

    if (state === null || state !== storedState) {
        res.redirect('/#' +
            querystring.stringify({
                error: 'state_mismatch' //FIXME deployments (and maybe localhost under the right circumstances?) have an initial state_mismatch problem
            })
        );

    } else {
        res.clearCookie(stateKey);
        let authOptions = {
            url: 'https://accounts.spotify.com/api/token',
            form: {
                code: code,
                redirect_uri: redirect_uri,
                grant_type: 'authorization_code'
            },
            headers: {
                'Authorization': 'Basic ' + (new Buffer.from(CLIENT_ID + ':' + CLIENT_SECRET).toString('base64'))
            },
            json: true
        };

        request.post(authOptions, function(error, response, body) {
            if (!error && response.statusCode === 200) {

                let access_token = body.access_token,
                    refresh_token = body.refresh_token;

                let options = {
                    url: 'https://api.spotify.com/v1/me',
                    headers: { 'Authorization': 'Bearer ' + access_token },
                    json: true
                };

                // use the access token to access the Spotify Web API
                request.get(options, function(error, response, body) {
                    console.log(body); // NOTE This logs user account info to server logs
                });

                // NOTE This is essential currently (?)
                // we can also pass the token to the browser to make requests from there
                res.redirect('/search/#' +
                    querystring.stringify({
                        access_token: access_token,
                        refresh_token: refresh_token
                    })
                );
                
            } else {
                res.redirect('/#' +
                querystring.stringify({
                    error: 'invalid_token'
                }));
            };
        });
    };
});

app.get('/', function(req, res) {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/soundscape', function(req, res) {
    res.render(path.join(__dirname, 'soundscape.ejs'));
});

app.get('/search', function(req, res) {
    res.render(path.join(__dirname, 'search.ejs'));
});

// NOTE Not in use while token_refresher is commented out in apiStuff ***
app.get('/refresh_token', function(req, res) {

    // requesting access token from refresh token
    let refresh_token = req.query.refresh_token;
    let authOptions = {
        url: 'https://accounts.spotify.com/api/token',
        headers: { 'Authorization': 'Basic ' + (new Buffer.from(CLIENT_ID + ':' + CLIENT_SECRET).toString('base64')) },
        form: {
            grant_type: 'refresh_token',
            refresh_token: refresh_token
        },
        json: true
    };

    request.post(authOptions, function(error, response, body) {
        if (!error && response.statusCode === 200) {
            let access_token = body.access_token;
            res.send({
                'access_token': access_token
            });
        }
    });
});

console.log('Listening on 8888');
app.listen(8888);
