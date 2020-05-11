const {db} = require('../util/admin')

const config = require('../util/config');

const firebase = require('firebase');
firebase.initializeApp(config);

const isEmail = (email)=>{
  var regEx = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  if(email.match(regEx)) return true;
  else return false;
}

const isEmpty = (string)=>{
  if(string.trim()==='') return true;
  else return false;
}

exports.signup = (req,res)=>{

  const newUser = {
    email: req.body.email,
    password: req.body.password,
    confirmPassword: req.body.confirmPassword,
    handle: req.body.handle,
  };

  let errors = {};

  if(isEmpty(newUser.email)){
    errors.email = 'Must not be empty'
  }else if(!isEmail(newUser.email)){
    errors.email = 'Must be a valid email address';
  }

  if(isEmpty(newUser.password)) errors.password = 'Must not be empty';
  if(newUser.password !== newUser.confirmPassword) errors.confirmPassword = 'Passwords must match';

  if(isEmpty(newUser.handle)) errors.handle = 'Must not be empty'

  if(Object.keys(errors).length>0) return res.status(400).json(errors);

  let token,userId;
  db.doc(`/users/${newUser.handle}`)
    .get()
    .then(doc=>{
      if(doc.exists){
        return res.status(400).json({handle: 'this handle is already taken'});
      }else{
        return firebase.auth().createUserWithEmailAndPassword(newUser.email,newUser.password);
      }
    })
    .then(data=>{
      userId = data.user.uid;
      return data.user.getIdToken();
    })
    .then(idToken=>{
      token = idToken;
      const userCredentials = {
        handle: newUser.handle,
        email: newUser.email,
        createdAt: new Date().toISOString(),
        userId
      }
      db.doc(`/users/${newUser.handle}`).set(userCredentials)
    })
    .then(data=>{
      return res.status(201).json({token});
    })
    .catch(err=>{
      console.error(err);
      if(err.code === 'auth/email-already-in-use'){
        return res.status(400).json({email: 'Email is already in use.'})
      }else{
        return res.status(500).json({error: err.code});
      }
    })
}

exports.login = (req,res)=>{
  const user = {
    email: req.body.email,
    password: req.body.password,
  }

  let errors = {};

  if(isEmpty(user.email)) errors.email = 'Must not be empty'
  if(isEmpty(user.password)) errors.password = 'Must not be empty'

  if(Object.keys(errors).length>0) return res.status(400).json(errors);

  firebase.auth().signInWithEmailAndPassword(user.email,user.password)
    .then(data=>{
      return data.user.getIdToken();
    })
    .then(idToken=>{
      return res.json({token: idToken})
    })
    .catch(err=>{
      console.error(err);
      if(err.code === "auth/wrong-password")
        return res.status(403).json({general: 'Wrong credentials, please try again'});
      else
        return res.status(500).json({error: err.code});
    })
}