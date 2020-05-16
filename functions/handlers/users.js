const {db, admin} = require('../util/admin')

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

const reduceUserDetails = (data)=>{
  let userDetails = {};

  if(!isEmpty(data.bio.trim())) userDetails.bio = data.bio;
  if(!isEmpty(data.website.trim())){
    if(data.website.trim().substring(0,4) !== 'http')
      userDetails.website = `http://${data.website.trim()}`;
    else userDetails.website = data.website;
  }
  if(!isEmpty(data.location.trim())) userDetails.location = data.location;

  return userDetails;
}

// Signup

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

  const noImg = 'no-img.png';

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
        imageUrl: `https://firebasestorage.googleapis.com/v0/b/${config.storageBucket}/o/${noImg}?alt=media`,
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
        return res.status(500).json({ general: 'Something went wrong, please try again'});
      }
    })
}

// login

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
      return res.status(403).json({general: 'Wrong credentials, please try again'});
    })
}

// To add user details

exports.addUserDetails = (req,res)=>{
  let userDetails = reduceUserDetails(req.body);

  db.doc(`/users/${req.user.handle}`).update(userDetails)
  .then(()=>{
    return res.json({message: 'Details added successfully'});
  })
  .catch(err=>{
    console.error(err);
    res.json(500).json({error: err.code});
  })
}

exports.getUserDetails = (req,res)=>{
  let userData = {};
  db.doc(`/users/${req.params.handle}`).get()
  .then(doc=>{
    if(doc.exists){
      userData.user = doc.data();
      return db.collection('screams').where('userHandle','==',req.params.handle)
      .orderBy('createdAt','desc')
      .get();
    }else{
      res.status(404).json({error: 'user not found'});
    }
  })
  .then(data=>{
    userData.screams = [];
    data.forEach(doc=>{
      userData.screams.push({
        body: doc.data().body,
        createdAt: doc.data().createdAt,
        userHandle: doc.data().body,
        imageUrl: doc.data().imageUrl,
        likeCount: doc.data().likeCount,
        commentCount: doc.data().commentCount,
        screamId: doc.id,
      });
    })
    return res.json(userData);
  })
  .catch(err=>{
    console.error(err);
    return res.status(500).json({error: err.code});
  })
}



// To get the loggedIn/Authenticated User
exports.getAuthenticatedUser = (req,res)=>{
  let userData = {};
  db.doc(`/users/${req.user.handle}`)
  .get()
  .then(doc=>{
    if(doc.exists){
      userData.credentials =  doc.data();
      return db.collection('likes').where('userHandle','==',req.user.handle).get()
    }
  })
  .then(data=>{
    userData.likes = [];
    data.forEach(doc=>{
      userData.likes.push(doc.data());
    });
    return db.collection('notifications').where('recipient', '==', req.user.handle)
    .orderBy('createdAt', 'desc').limit(10).get();
  })
  .then(data=>{
    userData.notifications = [];

    data.forEach(doc=>{
      userData.notifications.push({
        recipient: doc.data().recipient,
        sender: doc.data().sender,
        createdAt: doc.data().createdAt,
        screamId: doc.data().screamId,
        type: doc.data().type,
        read: doc.data().read,
        notificationId: doc.data().notificationId,
      })
    });
    res.json(userData);
  })
  .catch(err=>{
    console.log(console.error(err));
    return res.status(500).json({error: err.code});
  });
}

// for uploading image of user

exports.uploadImage = (req,res)=>{
  var BusBoy = require('busboy');
  var path = require('path');
  var os = require('os');
  var fs = require('fs');

  const busboy = new BusBoy({headers: req.headers});

  let imageFileName;
  let imageToBeUploaded = {};

  busboy.on('file',(fieldname, file, filename, encoding, mimetype)=>{

    if(mimetype!=='image/jpeg' && mimetype!=='image/png'){
      return res.status(400).json({ error: 'Wrong file type submitted.'})
    }

    const imageExtension = filename.split('.')[filename.split('.').length-1];
    imageFileName = `${Math.round(Math.random()*1000000000000)}.${imageExtension}`;
    const filePath = path.join(os.tmpdir(),imageFileName) 
    imageToBeUploaded = { filePath, mimetype };

    file.pipe(fs.createWriteStream(filePath));
  });

  busboy.on('finish',()=>{
    admin.storage().bucket().upload(imageToBeUploaded.filePath,{
      resumable: false,
      metadata: {
        metadata: {
          contentType: imageToBeUploaded.mimetype
        }
      }
    })
    .then(()=>{
      const imageUrl = `https://firebasestorage.googleapis.com/v0/b/${config.storageBucket}/o/${imageFileName}?alt=media`;
      return db.doc(`/users/${req.user.handle}`).update({ imageUrl });
    })
    .then(()=>{
      return res.json({message: 'Image uploaded successfully.'});
    })
    .catch(err=>{
      console.error(err);
      res.status(500).json({error: err.code});
    });
  });
  busboy.end(req.rawBody);
}

exports.markNotificationsRead = (req,res)=>{
  let batch = db.batch();
  req.body.forEach(notificationId=>{
    const notification = db.doc(`/notifications/${notificationId}`);
    batch.update(notification, { read: true});
  });
  batch.commit()
    .then(()=>{
      return res.json({ message: 'Notifications marked read'});
    })
    .catch(err=>{
      console.error(err);
      res.status(500).json({ error: err.code });
    });
}