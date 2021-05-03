const express = require("express");
const router = express.Router();

const firebase = require("firebase/app");
require("firebase/auth");

router.post("/login", (req, res) => {
  firebase.default
    .auth()
    .signInWithEmailAndPassword(req.body.email, req.body.password)
    .then((user) => {
      uid = user.user.uid;
      console.log("Logged in with Email and Password successfully!");
      res.json({
        user: user.user,
      });
    })
    .catch((err) => console.log(err));
});

router.get("/signout", (req, res) => {
  firebase.default
    .auth()
    .signOut()
    .then(() => {
      console.log("Logged out successfully!");
    })
    .catch((err) => console.log(err));
});

router.post("/login/google", (req, res) => {
  var accountType = req.body.type;
  var cred = firebase.default.auth.GoogleAuthProvider.credential(
    req.body.credential.oauthIdToken
  );
  firebase.default
    .auth()
    .signInWithCredential(cred)
    .then(async (user) => {
      uid = user.user.uid;
      console.log("Logged in with Google successfully!");
      setUserData(user.user, accountType);
      res.json({
        user: user.user,
      });
    })
    .catch((err) => console.log(err));
});

router.post("/login/fb", (req, res) => {
  var accountType = req.body.accountType;
  var cred = firebase.default.auth.FacebookAuthProvider.credential(
    req.body.credential
  );
  firebase.default
    .auth()
    .signInWithCredential(cred)
    .then(async (user) => {
      uid = user.user.uid;
      console.log("Logged in with Facebook successfully!");
      setUserData(user.user, accountType);

      res.json({
        user: user.user,
      });
    })
    .catch((err) => console.log(err));
});

router.post("/getInfo", (req, res) => {
  firebase.default
    .firestore()
    .collection("users")
    .doc(req.body.uid)
    .get()
    .then((query) => {
      var data = query.data();
      data.createdOn = data.createdOn.toDate();
      res.json({ data: data });
    });
});

function setUserData(user, accountType) {
  var db = firebase.firestore().collection("users").doc(user.uid);

  db.get()
    .then((docs) => {
      if (docs.exists) {
        console.log("User already exists");
      } else {
        var photoURL = user.photoURL.split("=")[0] + "=s500-c";
        db.set({
          name: user.displayName,
          email: user.email,
          accountType: accountType,
          photoUrl: photoURL,
          phoneNumber: user.phoneNumber,
          createdOn: firebase.default.firestore.FieldValue.serverTimestamp(),
        });
      }
    })
    .catch((err) => console.log(err));
}

module.exports = router;
