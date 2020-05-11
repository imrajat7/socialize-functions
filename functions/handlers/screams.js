const {db} = require('../util/admin');

exports.getAllScreams = (req,res)=>{
  db
    .collection('screams')
    .orderBy('createdAt','desc')
    .get()
    .then(data=>{
      let screams = [];
      data.forEach(doc=>{
        screams.push({
          screamId: doc.id,
          body: doc.data().body,
          userHandle: doc.data().userHandle,
          createdAt: doc.data().createdAt,
        });
      })
      return res.status(200).json(screams);
    })
    .catch(err=>{
      console.error(err);
    });
}

exports.postOneScream = (req,res)=>{

  if(req.body.body.trim()===''){
    return res.status(400).json({body: 'Body must not be empty'});
  }

  const newScream = {
    userHandle: req.user.handle,
    body: req.body.body,
    createdAt: new Date().toISOString(),
  }

  db
    .collection('screams')
    .add(newScream)
    .then(doc=>{
      res.json({'message': `document ${doc.id} created.`})
    })
    .catch(err=>{
      res.status(500).json({error: 'Something went wrong.'});
      console.error(err);
    });
}