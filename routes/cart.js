const express = require('express')
const router = express.Router()

const firebase = require('firebase/app');
require('firebase/firestore');
require('firebase/auth');

var uid;

router.post('/add', (req,res) => {
    uid = firebase.default.auth().currentUser.uid
    console.log(uid)

    // firebase.default.firestore().collection('customers').doc(uid).collection('cart').
    //     doc('cartItems').set({
    //     cart: req.body.cart
    //     }).then(() => {
    //         console.log("Cart updated")
    //     })
})
    
module.exports = router;