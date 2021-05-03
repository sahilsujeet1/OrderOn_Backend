const express = require("express");
const geofire = require("geofire-common");
const router = express.Router();

const firebase = require("firebase/app");
require("firebase/firestore");

var matchingDocs;

router.post("/", async (req, res) => {
  matchingDocs = [];

  var lt = parseFloat(req.body.location.latitude);
  var ln = parseFloat(req.body.location.longitude);

  const center = [lt, ln];
  const radiusInM = 20 * 1000;
  // Each item in 'bounds' represents a startAt/endAt pair. We have to issue
  // a separate query for each pair. There can be up to 9 pairs of bounds
  // depending on overlap, but in most cases there are 4.

  const bounds = await geofire.geohashQueryBounds(center, radiusInM);
  const promises = [];
  for (const b of bounds) {
    const q = firebase.default
      .firestore()
      .collection(`${req.body.category}`)
      .orderBy("geohash")
      .startAt(b[0])
      .endAt(b[1]);
    promises.push(q.get());
  }

  // Collect all the query results together into a single list
  await Promise.all(promises)
    .then(async (snapshots) => {
      for (const snap of snapshots) {
        for (const doc of snap.docs) {
          var result = doc.data();
          const lat = result.location._lat;
          const lng = result.location._long;
          // We have to filter out a few false positives due to GeoHash
          // accuracy, but most will match
          const distanceInKm = geofire.distanceBetween([lat, lng], center);
          const distanceInM = distanceInKm * 1000;
          if (distanceInM <= radiusInM) {
            var store_list = doc.data();
            store_list.id = doc.id;
            matchingDocs.push(store_list);
          }
        }
      }
    })
    .then(() => {
      res.send(matchingDocs);
    })
    .catch((err) => console.log(err));
});

router.get("/get", async (req, res) => {
  matchingDocs = await matchingDocs.filter((c, index) => {
    return matchingDocs.indexOf(c) === index;
  });
  res.json(matchingDocs);
});

router.post("/add", async (req, res) => {
  var content = req.body;
  content.geohash = await geofire.geohashForLocation([
    content.lat,
    content.lon,
  ]);
  content.location = new firebase.default.firestore.GeoPoint(
    content.lat,
    content.lon
  );
  delete content.lon;
  delete content.lat;

  firebase.default
    .firestore()
    .collection(content.category)
    .add(content)
    .then((snapshot) => {
      var storeId = snapshot.id;
      firebase.default
        .firestore()
        .collection("users")
        .doc(content.ownedBy)
        .update({
          stores: firebase.default.firestore.FieldValue.arrayUnion({
            storeId: storeId,
            category: content.category,
            name: content.name,
          }),
        });
      res.json({ storeId: storeId });
    })
    .catch((err) => {
      console.log(err);
      res.json({ error: err });
    });
});

router.post("/update", (req, res) => {
  var url = req.body.url;
  var category = req.body.category;
  var storeId = req.body.storeId;

  firebase.default
    .firestore()
    .collection(category)
    .doc(storeId)
    .update({
      imgURL: url,
    })
    .then(() => res.json("URL Added"))
    .catch((err) => {
      console.log(err);
      res.json({ error: err });
    });
});

router.post("/sellerinfo", (req, res) => {
  var uid = req.body;
  firebase.default
    .firestore()
    .collection("users")
    .doc(uid)
    .get()
    .then((query) => {
      var data = query.data();
      res.json(data);
    });
});

module.exports = router;
