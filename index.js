const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');
const e = require('express');
require('dotenv').config();

const port = process.env.PORT || 5000;

const app = express();

//middle were
app.use(cors());
app.use(express.json());

const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.taqpwn0.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

function verifyJWT(req, res, next) {

    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).send('unauthorized access');
    }

    const token = authHeader.split(' ')[1];

    jwt.verify(token, process.env.ACCESS_TOKEN, function (err, decoded) {
        if (err) {
            return res.status(403).send({ message: 'forbidden access' })
        }
        req.decoded = decoded;
        next();
    })

}

async function run(){
    try{
        const categoryCollections = client.db('ogerioDotPhone').collection('phoneCategory')
        const phoneCollections = client.db('ogerioDotPhone').collection('phoneCollection')
        const myProductCollections = client.db('ogerioDotPhone').collection('myProduct')
        const bookingCollections = client.db('ogerioDotPhone').collection('bookingCollection')
        const usersCollections = client.db('ogerioDotPhone').collection('users')
        const paymentsCollection = client.db('ogerioDotPhone').collection('payments');
        const reportCollections = client.db('ogerioDotPhone').collection('report');

        const verifyAdmin = async (req, res, next) =>{
            const decodedEmail = req.decoded.email;
            const query = { email: decodedEmail };
            const user = await usersCollections.findOne(query);

            if (user?.role !== 'admin') {
                return res.status(403).send({ message: 'forbidden access' })
            }
            next();
        }
        const verifySeller = async (req, res, next) =>{
            const decodedAccountType = req.decoded.account_type;
            const query = { account_type: decodedAccountType };
            const user = await usersCollections.findOne(query);

            if (user?.account_type !== 'Seller Account') {
                return res.status(403).send({ message: 'forbidden access' })
            }
            next();
        }

        app.get('/products-category', async(req, res)=>{
            const query = {};
            const cursor = categoryCollections.find(query).sort({"_id": -01});
            const products = await cursor.toArray();
            res.send(products)
        });

        app.get('/products-category/:id', async(req, res)=>{
            const id = req.params.id;
            const query = {category_name: id};
            const products = await categoryCollections.findOne(query);
            res.send(products)
        });

        app.get('/available-product/:id', async(req, res)=>{
            
            const cursor =  phoneCollections.find({category_name: req.params.id}).sort({"_id": -01});
            const product = await cursor.toArray()
            res.send(product)
        });

        app.get('/my-products',verifyJWT,  async(req, res)=>{

            const sellerEmail = req.query.sellerEmail;
            
            const decodedEmail = req.decoded.email;

            if (sellerEmail !== decodedEmail) {
                return res.status(403).send({ message: 'forbidden access' });
            }
            const query = { sellerEmail: sellerEmail };
            // const results = await phoneCollections.find(query).toArray();
            const results2 = await myProductCollections.find(query).sort({"_id": -01}).toArray();
            res.send(results2);
        });
       
        // app.get('/my-products',verifyJWT,  async(req, res)=>{

        //     const sellerEmail = req.query.sellerEmail;
            
        //     const decodedEmail = req.decoded.email;

        //     if (sellerEmail !== decodedEmail) {
        //         return res.status(403).send({ message: 'forbidden access' });
        //     }
        //     const query = { sellerEmail: sellerEmail };
        //     const results = await phoneCollections.find(query).toArray();
        //     res.send(results);
        // });
        app.get('/all-products',  async(req, res)=>{
            const query = {};
            const products = await phoneCollections.find(query).sort({"_id": -01}).toArray();
            res.send(products);
        });

        app.post('/add-product', verifyJWT,  async(req, res)=>{
            const product = req.body;
            const result = await phoneCollections.insertOne(product);
            const result2 = await myProductCollections.insertOne(product);
            res.send(result)
        })


        app.patch("/my-products/:id", async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const status = req.body.status;
            const updatedDoc = {
              $set: {
                inStore: status,
              },
            };
            const result2 = await myProductCollections.updateOne(query, updatedDoc);
            const result = await phoneCollections.updateOne(query, updatedDoc);
      
            res.send(result);
          });

        app.delete('/my-products/:id', verifyJWT, async (req, res) => {
            const id = req.params.id;
            const filter = { _id: ObjectId(id) };
            const result = await phoneCollections.deleteOne(filter);
            const result2 = await myProductCollections.deleteOne(filter);
            res.send(result);
        })
        app.delete('/all-product/:id', verifyJWT, async (req, res) => {
            const id = req.params.id;
            const filter = { _id: ObjectId(id) };
            const result = await phoneCollections.deleteOne(filter);
            const result2 = await myProductCollections.deleteOne(filter);
            res.send(result);
        })
        

        app.get('/bookings', verifyJWT, async (req, res) => {
            const buyerEmail = req.query.buyerEmail;
            
            const decodedEmail = req.decoded.email;

            if (buyerEmail !== decodedEmail) {
                return res.status(403).send({ message: 'forbidden access' });
            }
            const query = { buyerEmail: buyerEmail };
            const bookings = await bookingCollections.find(query).sort({"_id": -01}).toArray();
            res.send(bookings);
        })
        app.get('/req-order',  async (req, res) => {
            const sellerEmail = req.query.sellerEmail;
            
            // const decodedEmail = req.decoded.email;

            // if (sellerEmail !== decodedEmail) {
            //     return res.status(403).send({ message: 'forbidden access' });
            // }
            const query = { sellerEmail: sellerEmail };
            const orders = await bookingCollections.find(query).sort({"_id": -01}).toArray();
            res.send(orders);
        })
        
        app.get('/advertised', async (req,res)=> {
            const query = { inStore:true}
            const result = await phoneCollections.find(query).toArray();
            res.send(result);
      
          })

        app.delete('/bookings/:id', verifyJWT, async (req, res) => {
            const id = req.params.id;
            const filter = { _id: ObjectId(id) };
            const result = await bookingCollections.deleteOne(filter);
            res.send(result);
        })
        
        app.get('/bookings/:id', async (req,res)=>{
            const id = req.params.id;
            const query = { _id: ObjectId(id)};
            const booking = await bookingCollections.findOne(query);
            res.send(booking)
        })

        app.post('/bookings', async (req, res) => {
            const booking = req.body;
            // const query = {
            //     appointmentDate: booking.appointmentDate,
            //     email: booking.email,
            //     treatment: booking.treatment 
            // }

            // const alreadyBooked = await bookingCollections.find(query).toArray();

            const query = {
                collectionId : booking.collectionId,
                buyerEmail: booking.buyerEmail,
            }

            const alreadyBooked = await bookingCollections.find(query).toArray();

            if (alreadyBooked.length){
                const message = `You already have a booking on ${booking.productName}`
                return res.send({acknowledged: false, message})
            }

            // if (alreadyBooked.length){
            //     const message = `You already have a booking on ${booking.appointmentDate}`
            //     return res.send({acknowledged: false, message})
            // }
            // const id = req.params.id;
            // if(id === booking._id){
            //     const message = `You already have a booking on ${booking.productName}`
            //     return res.send({acknowledged: false, message})
            // }
            

            // const query = {
            //     email: booking.buyerEmail
            // }
            // const alreadyBooked = await bookingCollections.find(query).toArray();

            // if (alreadyBooked === booking.collectionId){
            //     const message = `You already have a booking on ${booking.productName}`
            //     return res.send({acknowledged: false, message})
            // }

            const result = await bookingCollections.insertOne(booking);
            res.send(result);
        });

        app.post('/report-to-admin/:id', async (req, res) => {
            const report = req.body;
            const query = {
                collectionId : report.collectionId,
                reporterEmail: report.reporterEmail,
            }

            const alreadyReported = await reportCollections.find(query).toArray();

            if (alreadyReported.length){
                const message = `You already have a report on ${report.productName}`
                return res.send({acknowledged: false, message})
            }

            const result = await reportCollections.insertOne(report);
            res.send(result);
        });

        app.get('/report-to-admin', async (req, res) => {
            const query = {};
            const users = await reportCollections.find(query).toArray();
            res.send(users);
        });

        app.delete('/report-to-admin/:id', verifyJWT, async (req, res) => {
            const id = req.params.id;
            const filter = { _id: ObjectId(id) };
            const result = await reportCollections.deleteOne(filter);
            res.send(result);
        })

        app.post('/create-payment-intent', async (req,res)=>{
            const booking = req.body;
            const price =  booking.resellPrice;
            const amount = price * 100;

            const paymentIntent = await stripe.paymentIntents.create({
                // amount: calculateOrderAmount(booking),
                currency: "usd",
                amount : amount,

                "payment_method_types": [
                    "card"
                  ],
              });
              res.send({
                clientSecret: paymentIntent.client_secret,
              });
        });

        app.post('/payments', async (req, res) =>{
            const payment = req.body;
            const result = await paymentsCollection.insertOne(payment);
            const id = payment.bookingId
            const collectionId = payment.collectionId
            const filter2 = {collectionId: collectionId}
            const filter3 = {_id: ObjectId(collectionId)}
            const filter4 = {_id: ObjectId(collectionId)}
            const filter = {_id: ObjectId(id)}
            const updatedDoc = {
                $set: {
                    paid: true,
                    transactionId: payment.transactionId
                }
            }
            const deleteResult = await phoneCollections.deleteOne(filter3)
            const updatedResult2 = await bookingCollections.updateMany(filter2, updatedDoc)
            const updatedResult = await bookingCollections.updateOne(filter, updatedDoc)
            const updatedResult3 = await myProductCollections.updateOne(filter4, updatedDoc)
            res.send(result);
        })

        app.get('/jwt', async (req, res) => {
            const email = req.query.email;
            const query = { email: email };
            const user = await usersCollections.findOne(query);
            if (user) {
                const token = jwt.sign({ email }, process.env.ACCESS_TOKEN, { expiresIn: '1h' })
                return res.send({ accessToken: token });
            }
            res.status(403).send({ accessToken: '' })
        });

        app.get('/users', async (req, res) => {
            const query = {};
            const users = await usersCollections.find(query).toArray();
            res.send(users);
        });

        app.get('/users-seller', async (req,res)=> {
            const query = { account_type: "Seller Account"}
            const result = await usersCollections.find(query).toArray();
            res.send(result);
      
          })

        app.get('/users/admin/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email }
            const user = await usersCollections.findOne(query);
            res.send({ isAdmin: user?.role === 'admin' });
        })

        app.get('/users/seller/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email }
            const user = await usersCollections.findOne(query);
            res.send({ isSeller: user?.account_type === 'Seller Account' });
        })

        app.post('/users', async (req, res) => {
            const user = req.body;
            console.log(user);
            const result = await usersCollections.insertOne(user);
            res.send(result);
        });
        app.put('/users', async (req, res) => {
            const user = req.body;
            const options = { upsert: true };
            const updatedDoc = {
                $set: {
                    account_type: 'Buyer Account'
                }
            }
            const result = await usersCollections.updateOne(user, updatedDoc, options);
            res.send(result);
        })

        app.delete('/admin/users/:id', verifyJWT, async (req, res) => {
            const id = req.params.id;
            const filter = { _id: ObjectId(id) };
            const result = await usersCollections.deleteOne(filter);
            res.send(result);
        })

        app.put('/users/admin/:id', verifyJWT, verifyAdmin,   async (req, res) => {
            const id = req.params.id;
            // const sellerEmail = req.params.sellerEmail;
            // const email = req.query.email
            // const query = { sellerEmail : email }
            const filter = { _id: ObjectId(id) }
            const options = { upsert: true };
            const updatedDoc = {
                $set: {
                    verify: true
                }
            }
            const result = await usersCollections.updateOne(filter, updatedDoc, options);
            // const result1 = await phoneCollections.updateMany(query, updatedDoc, options);
            res.send(result);
        })



    }
    finally{

    }
}
run().catch(err => console.error(err))

app.get('/', (req, res)=>{
    res.send('ogerio dotPhone server api on the display')
})

app.listen(port, ()=>{
    console.log(`ogerio dotPhone server running in port ${port}`);
})