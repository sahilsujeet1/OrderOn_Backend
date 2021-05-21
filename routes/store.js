const express = require("express");
const router = express.Router();

const firebase = require("firebase/app");
require("firebase/firestore");

var items = [];
var input;

router.post("/input", (req, res) => {
  input = req.body;
  res.status(200).json('Input taken')
});

router.get("/menu", (req, res) => {
  firebase.default
    .firestore()
    .collection(`${input.category}`)
    .doc(`${input.doc_id}`)
    .collection("menu")
    .orderBy("item")
    .get()
    .then((data) => {
      data.docs.forEach((item) => {
        items.push(item.data());
      });
      res.json(items);
      items = [];
    });
});

router.get("/details", (req, res) => {
  firebase.default
    .firestore()
    .collection(`${input.category}`)
    .doc(`${input.doc_id}`)
    .get()
    .then((data) => {
      res.json(data.data());
    });
});

router.post("/new-product", (req, res) => {
  var content = req.body;

  firebase.default
    .firestore()
    .collection(content.storeType)
    .doc(content.storeId)
    .collection("menu")
    .add(content)
    .then((snapshot) => {
        firebase.default.firestore().collection(content.storeType).doc(content.storeId).collection("menu").doc(snapshot.id).update({
            id: snapshot.id
        })
      console.log(snapshot.id);
      res.json({ itemId: snapshot.id });
    })
    .catch((err) => {
      console.log(err);
      res.json({ error: err });
    });
});

router.post("/updateImgURL", (req, res) => {
  var content = req.body;
  console.log(content)

  firebase.default
    .firestore()
    .collection(content.storeType)
    .doc(content.storeId)
    .collection("menu")
    .doc(content.itemId)
    .update({
      imgURL: content.url,
    }).then((snapshot) => {
        res.json("Image URL Added!")
    }).catch(err => {
        console.log(err)
        res.json({error: err})
    })
});

router.post('/get-seller-products', (req,res) => {
    var products = []

    firebase.default.firestore().collection(req.body.cat).doc(req.body.id).collection('menu').orderBy('item').get()
    .then((query) => {
        query.docs.forEach((doc) => {
            products.push(doc.data())
        })
    }).then(() => {
        console.log("Products Sent")
        res.json(products)
    }).catch(err => {
        console.log(err)
        res.json({error: err})
    })
})

router.post('/delete-product', (req,res) => {
    firebase.default.firestore().collection(req.body.cat).doc(req.body.id).collection('menu').doc(req.body.itemId).delete()
    .then(() => {
        res.json("Item deleted")
    }).catch(err => {
        console.log(err)
        res.json({error: err})
    })
})

router.post('/update-product', (req,res) => {
    var item = req.body
    var id = item.storeId
    var cat = item.storeType
    var itemId = item.id

    firebase.default.firestore().collection(cat).doc(id).collection('menu').doc(itemId).update(item)
    .then(() => {
        res.json("Item updated")
    }).catch(err => {
        console.log(err)
        res.json({error: err})
    })
})

module.exports = router;