const functions = require('firebase-functions');
const admin = require('firebase-admin');
const express = require('express');
const app = express();

const FBAuth = require('./util/FBAuth');

const {getAllScreams, postOneScream} = require('./handlers/screams');

const {signup, login, uploadImage} = require('./handlers/users');


//Scream Routes
app.get('/screams', getAllScreams)
app.post('/scream', FBAuth, postOneScream);

//User Routes
app.post('/signup', signup);
app.post('/login', login);
app.post('/user/image', FBAuth, uploadImage);

exports.api = functions.https.onRequest(app);