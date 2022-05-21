const express = require("express");
const router = express.Router();
const https = require("https");
const cors = require("cors");

const PaytmChecksum = require("../paytm/PaytmStatusCheck/PaytmChecksum");

const MID = "EscBDe97704260989472";
// const MID = "NqTKuA63797783011362";
const MKey = "I&eamy@EF6#5HXAa";
// const MKey = "6%EpAP4s5i4RxbSt";

express().use(cors());

router.post("/genCheckSum", (req, res) => {
    var paytmParams = {};

    console.log("Cheksum", req.body);

    paytmParams.body = {
        "requestType"   : "Payment",
        "mid"           : MID,
        "websiteName"   : "DEFAULT",
        // "websiteName"   : "WEBSTAGING",
        "orderId"       : req.body.orderID,
        "callbackUrl"   : `https://securegw.paytm.in/theia/paytmCallback?ORDER_ID=${req.body.orderID}`,
        // "callbackUrl"   : `https://securegw-stage.paytm.in/theia/paytmCallback?ORDER_ID=${req.body.orderID}`,
        // "callbackUrl"   : "https://orderon-backend.herokuapp.com/paytmGateway/verifyPayment/",
        "txnAmount"     : {
            "value"     : req.body.amount,
            "currency"  : "INR",
        },
        "userInfo"      : {
            "custId"    : req.body.custId,
        },
    };

    /*
    * Generate checksum by parameters we have in body
    * Find your Merchant Key in your Paytm Dashboard at https://dashboard.paytm.com/next/apikeys 
    */
    PaytmChecksum.generateSignature(JSON.stringify(paytmParams.body), MKey).then(function(checksum){

        paytmParams.head = {
            "signature"    : checksum
        };

        var post_data = JSON.stringify(paytmParams);

        var options = {

            /* for Staging */
            // hostname: 'securegw-stage.paytm.in',

            /* for Production */
            hostname: 'securegw.paytm.in',

            port: 443,
            path: `/theia/api/v1/initiateTransaction?mid=${MID}&orderId=${req.body.orderID}`,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': post_data.length
            }
        };

        var response = "";
        var post_req = https.request(options, function(post_res) {
            post_res.on('data', function (chunk) {
                response += chunk;
            });

            post_res.on('end', function(){
                var sendRes = JSON.parse(response);
                console.log('Response: ', sendRes);
                res.send(sendRes);
            });
        });

        post_req.write(post_data);
        post_req.end();

    });






});


router.post("/verifyPayment", (req, res) => {

    var paytmParams = {};

    /* body parameters */
    paytmParams.body = {

        /* Find your MID in your Paytm Dashboard at https://dashboard.paytm.com/next/apikeys */
        "mid" : MID,

        /* Enter your order id which needs to be check status for */
        "orderId" : req.body.orderID,
    };

    /**
    * Generate checksum by parameters we have in body
    * Find your Merchant Key in your Paytm Dashboard at https://dashboard.paytm.com/next/apikeys 
    */
    PaytmChecksum.generateSignature(JSON.stringify(paytmParams.body), MID).then(function(checksum){
        /* head parameters */
        paytmParams.head = {

            /* put generated checksum value here */
            "signature"	: checksum
        };

        /* prepare JSON string for request */
        var post_data = JSON.stringify(paytmParams);

        var options = {

            /* for Staging */
            hostname: 'securegw-stage.paytm.in',

            /* for Production */
            // hostname: 'securegw.paytm.in',

            port: 443,
            path: '/v3/order/status',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': post_data.length
            }
        };

        // Set up the request
        var response = "";
        var post_req = https.request(options, function(post_res) {
            post_res.on('data', function (chunk) {
                response += chunk;
            });

            post_res.on('end', function(){
                console.log('Response: ', response);
                res.send(response);
            });
        });

        // post the data
        post_req.write(post_data);
        post_req.end();
    });


});

module.exports = router;