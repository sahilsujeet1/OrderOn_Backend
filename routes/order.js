const express = require("express");
const router = express.Router();
const https = require("https");
const cors = require("cors");

const firebase = require("firebase/app");
require("firebase/firestore");
require("firebase/auth");

const checksum_lib = require("../paytm/checksum/checksum");
const PaytmChecksum = require("../paytm/PaytmStatusCheck/PaytmChecksum");

const MID = "NqTKuA63797783011362";
const MKey = "6%EpAP4s5i4RxbSt";

var cart;
var mode;
var shippingAddress;
var uid;
var amount;
var custOrderID;
var sellerOrderID;

express().use(cors());

var io, socketid, now;

router.post("/cod", async (req, res) => {
  var cart = req.body.cart;
  var mode = req.body.mode;
  var shippingAddress = req.body.shipAdd;
  var uid = req.body.uid;
  amount = req.body.amount;

  custOrderID = await generateID();
  sellerOrderID = custOrderID;

  var orderDetailsCust = await orderSeller(
    cart,
    mode,
    shippingAddress,
    uid,
    ""
  );
  var custOrderId = await orderCustomer(
    orderDetailsCust,
    uid,
    mode,
    shippingAddress,
    ""
  );

  res.json(custOrderId);
});

router.post("/online", async (req, res) => {
  cart = req.body.cart;
  mode = req.body.mode;
  shippingAddress = req.body.shipAdd;
  uid = req.body.uid;
  amount = req.body.amount;

  custOrderID = await generateID();
  sellerOrderID = custOrderID;

  res.json(custOrderID);
});

router.get("/paytm", (req, res) => {
  let params = {};
  (params["MID"] = MID),
    (params["WEBSITE"] = "WEBSTAGING"),
    (params["CHANNEL_ID"] = "WEB"),
    (params["INDUSTRY_TYPE_ID"] = "Retail"),
    (params["ORDER_ID"] = custOrderID),
    (params["CUST_ID"] = uid),
    (params["CALLBACK_URL"] = "https://orderon-backend.herokuapp.com/order/status"),
    // (params["CALLBACK_URL"] = "http://localhost:3000/order/status"),
    // (params["EMAIL"] = "a@a.com"),
    // (params["MOBILE_NO"] = 7300466153),
    (params["TXN_AMOUNT"] = amount);

  checksum_lib.genchecksum(params, "6%EpAP4s5i4RxbSt", (err, checksum) => {
    var txn_url = "https://securegw-stage.paytm.in/order/process"; // for staging

    // var txn_url = "https://securegw.paytm.in/order/process";

    var form_fields = "";
    for (var x in params) {
      form_fields +=
        "<input type='hidden' name='" + x + "' value='" + params[x] + "' >";
    }
    form_fields +=
      "<input type='hidden' name='CHECKSUMHASH' value='" + checksum + "' >";

    res.writeHead(200, { "Content-Type": "text/html" });
    res.write(
      '<html><head><title>Merchant Checkout Page</title></head><body><center><h1>Please do not refresh this page...</h1></center><form method="post" action="' +
        txn_url +
        '" name="f1">' +
        form_fields +
        '</form><script type="text/javascript">document.f1.submit();</script></body></html>'
    );
    res.end();
    if (err) {
      console.log(err);
    }
  });
});

router.post("/status", async (req, res) => {
  var paytmParams = {};

  paytmParams.body = {
    /* Find your MID in your Paytm Dashboard at https://dashboard.paytm.com/next/apikeys */
    mid: MID,
    orderId: custOrderID,
  };

  /**
   * Generate checksum by parameters we have in body
   * Find your Merchant Key in your Paytm Dashboard at https://dashboard.paytm.com/next/apikeys
   */
  PaytmChecksum.generateSignature(JSON.stringify(paytmParams.body), MKey).then(
    function (checksum) {
      /* head parameters */
      paytmParams.head = {
        /* put generated checksum value here */
        signature: checksum,
      };

      /* prepare JSON string for request */
      var post_data = JSON.stringify(paytmParams);

      var options = {
        /* for Staging */
        hostname: "securegw-stage.paytm.in",

        /* for Production */
        // hostname: 'securegw.paytm.in',

        port: 443,
        path: "/v3/order/status",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": post_data.length,
        },
      };

      // Set up the request
      var response = "";
      var resStatus;
      var post_req = https.request(options, function (post_res) {
        post_res.on("data", async function (chunk) {
          response += chunk;
        });

        post_res.on("end", async function () {
          console.log("Response: ", response);
          var body = JSON.parse(response).body;
          var resultInfo = body.resultInfo;
          resStatus = resultInfo.resultStatus;
          var resultMsg = resultInfo.resultMsg;
          var resultCode = resultInfo.resultCode;
          var txnDetails = {
            transId: body.txnId,
            bankTransId: body.bankTxnId,
            transDate: body.txnDate,
          };

          if (resStatus === "TXN_SUCCESS" && resultCode === "01") {
            var orderDetailsCust = await orderSeller(
              cart,
              mode,
              shippingAddress,
              uid,
              txnDetails
            );

            var custOdId = await orderCustomer(
              orderDetailsCust,
              uid,
              mode,
              shippingAddress,
              txnDetails
            );
          }

          io.to(socketid).emit("payment-status", resStatus);
        });
      });
      res.json(
        "Done with payment. If the payment was unsuccessful, it will get refunded. You can close this window."
      );

      // post the data
      post_req.write(post_data);
      post_req.end();
    }
  );
});

async function orderSeller(cart, mode, address, uid, txnDetails) {
  var stores = cart.reduce((r, a) => {
    r[a.storeId] = [...(r[a.storeId] || []), a];
    return r;
  }, {});

  var orderDetails = [];

  for (let x in stores) {
    sellerOrderID = custOrderID + "-" + randomID();
    var storeId = x;
    var storeCart = [];
    var amount = 0;

    for (y in stores[x]) {
      storeCart.push(stores[x][y]);
      amount += stores[x][y].netPrice;
    }
    let storeType = storeCart[0].storeType;

    let content = {
      custId: uid,
      orderID: sellerOrderID,
      orderedAt: now,
      status: "new",
      mode: mode,
      txnDetails: txnDetails,
      paymentId: "",
      amount: amount,
      orderItems: storeCart,
      shippingAddress: address,
      fine: 0,
    };

    orderDetails.push(content);

    await firebase.default
      .firestore()
      .collection(storeType)
      .doc(storeId)
      .collection("orders")
      .doc(sellerOrderID)
      .set(content)
      .catch((err) => console.log(err));
  }

  console.log("Orders stored in stores order history");

  return orderDetails;
}

async function orderCustomer(details, uid, mode, address, txnDetails) {
  
  await firebase.default
    .firestore()
    .collection("users")
    .doc(uid)
    .collection("orders")
    .doc(custOrderID)
    .set({
      orders: details,
      totAmount: amount,
      mode: mode,
      txnDetails: txnDetails,
      orderedAt: now,
      shippingAddress: address,
      status: "ordered",
      fine: 0,
    })
    .then(() => {
      console.log("Orders stored in customer order history");
      console.log("Cust Order id: " + custOrderID);
    })
    .catch((err) => console.log(err));
  return custOrderID;
}

function randomID() {
  var chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXTZabcdefghiklmnopqrstuvwxyz";
  var string_length = 10;
  var randomstring = "";
  for (var i = 0; i < string_length; i++) {
    var rnum = Math.floor(Math.random() * chars.length);
    randomstring += chars.substring(rnum, rnum + 1);
  }
  return randomstring;
}

function generateID() {
  now = firebase.default.firestore.Timestamp.now().toDate();
  var dd = now.getDate().toString();
  var mm = (now.getMonth() + 1).toString();
  var yyyy = now.getFullYear().toString();
  var time = now.getTime().toString();
  var id = "OD" + dd + "-" + mm + "-" + yyyy + "-" + time;

  return id;
}

module.exports = function (socketio) {
  io = socketio;

  io.on("connection", (socket) => {
    socketid = socket.id;
    console.log("Socket connected with id: " + socketid);

    socket.on("disconnect", () => {
      console.log("Socket disconnected");
    });
  });

  return router;
};
