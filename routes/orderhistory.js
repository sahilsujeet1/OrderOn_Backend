const express = require('express')
const router = express.Router()
var auth = require('../auth.js');
const firebase = require('firebase/app');
require('firebase/firestore');
require('firebase/auth');

router.post('/customer', (req,res) => {
var orders = []
    firebase.default.firestore().collection('users').doc(req.body.uid).collection('orders').orderBy('orderedAt','desc')
    .get().then((query) => {
        query.docs.forEach((doc) => {
            var order = doc.data()
            order.orderedAt = order.orderedAt.toDate()
            orders.push({order: order, id: doc.id})
        })

        res.json(orders)
    }).catch(err => console.log(err))
})

router.post('/seller', (req,res) => {
    var cat = req.body.cat
    var id = req.body.id
    var orders = []

    firebase.default.firestore().collection(cat).doc(id).collection('orders').orderBy('orderedAt','desc')
    .get().then((query) => {
        query.docs.forEach((doc) => {
            var order = doc.data()
            order.orderedAt = order.orderedAt.toDate()
            orders.push({order: order, id: doc.id})
        })

        res.json(orders)
    }).catch(err => console.log(err))
})

router.post('/status-update', (req,res) => {
    var cat = req.body.cat
    var id = req.body.id
    var item = req.body.item
    var itemId = item.id
    var status = item.order.status

    firebase.default.firestore().collection(cat).doc(id).collection('orders').doc(itemId).update({
        status: status
    }).then(() => {
        res.json("Status updated")
    }).catch(err => {
        console.log(err)
        res.json({error: err})
    })
})

module.exports =  router;