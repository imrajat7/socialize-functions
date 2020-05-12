const functions = require('firebase-functions');
const admin = require('firebase-admin');
const express = require('express');
const app = express();

const FBAuth = require('./util/FBAuth');

const {getAllScreams, postOneScream, getScream} = require('./handlers/screams');

const {signup, login, uploadImage, addUserDetails, getAuthenticatedUser} = require('./handlers/users');


//Scream Routes
app.get('/screams', getAllScreams)
app.post('/scream', FBAuth, postOneScream);
app.get('/scream/:screamId', getScream);

//User Routes
app.post('/signup', signup);
app.post('/login', login);
app.post('/user/image', FBAuth, uploadImage);
app.post('/user', FBAuth, addUserDetails);
app.get('/user', FBAuth, getAuthenticatedUser);

exports.api = functions.https.onRequest(app);