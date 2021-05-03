const express = require("express");
const router = express.Router();
const firebase = require("firebase/app");
require("firebase/firestore");
require("firebase/auth");

router.post("/save", (req, res) => {
  var addr = req.body.data;
  addr.addedOn = firebase.default.firestore.Timestamp.now().toDate();
  var uid = req.body.uid;
  firebase.default
    .firestore()
    .collection("users")
    .doc(uid)
    .collection("addresses")
    .add(addr)
    .then(() => {
      console.log("Address Saved!");
    })
    .catch((err) => console.log(err));
});

router.post("/", (req, res) => {
  var savedAddress = [];
  var uid = req.body.uid;
  firebase.default
    .firestore()
    .collection("users")
    .doc(uid)
    .collection("addresses")
    .get()
    .then((query) => {
      query.docs.forEach((addr) => {
        address = addr.data();
        address.id = addr.id;
        savedAddress.push(address);
      });
      res.json(savedAddress);
    }).catch(err => {
      console.log(err)
      res.json({error: err})
    })
});

router.post("/del", async (req, res) => {
  id = req.body.id;
  uid = req.body.uid;
  console.log(req.body.id);
  await firebase.default
    .firestore()
    .collection("users")
    .doc(uid)
    .collection("addresses")
    .doc(id)
    .delete()
    .then(() => {
      console.log("Address deleted!");
      res.json("Address deleted");
    })
    .catch((err) => {
      console.log(err);
      res.json({ error: err });
    });
});

module.exports = router;
