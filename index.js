const express = require("express");
const app = express();
const PORT = process.env.PORT || 3000;
var cors = require("cors");
const socket = require("socket.io");

const server = app.listen(PORT, () =>
  console.log(`Server running at : http//localhost:${PORT}`)
);

const bodyParser = require("body-parser");
const firebase = require("firebase/app");
require("firebase/firestore");

const firebaseConfig = {
  apiKey: "AIzaSyCg_9Jrdu_GBP-Qj47qKoWS2HgyzKODdWY",
  authDomain: "order-on-f896e.firebaseapp.com",
  projectId: "order-on-f896e",
  storageBucket: "order-on-f896e.appspot.com",
  messagingSenderId: "701255776387",
  appId: "1:701255776387:web:e09e371498e1709c9203b6",
  measurementId: "G-FXRKEHHTSR",
};

firebase.default.initializeApp(firebaseConfig);

app.use(cors());
app.use(bodyParser.json());

const io = socket(server, {
  cors: true,
  origin: [
    "https://order-on-f896e.firebaseapp.com",
    "https://order-on-f896e.web.app",
    "*",
  ],
  methods: ["GET", "POST"],
});

const store = require("./routes/store.js");
const stores = require("./routes/stores.js");
const auth = require("./auth.js");
const address = require("./routes/address.js");
const order = require("./routes/order.js");
const orderhistory = require("./routes/orderhistory.js");

app.use("/auth", auth);
app.use("/store", store);
app.use("/stores", stores);
app.use("/address", address);
app.use("/order", order(io));
app.use("/orderhistory", orderhistory);

app.get("/", (req, res) => {
  res.send("Welcome to Order On backend server");
});
