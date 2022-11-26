const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const port = process.env.PORT || 5000;

const app = express();

//middle were
app.use(cors());
app.use(express.json());


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
        const bookingCollections = client.db('ogerioDotPhone').collection('bookingCollection')
        const usersCollections = client.db('ogerioDotPhone').collection('users')

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

        // app.get('/reviews',verifyJWT,  async(req, res)=>{
        //     const decoded = req.decoded;
        //     console.log('inside api', decoded);
        //     if(decoded.email !== req.query.email){
        //         res.status(403).send({message: 'forbidden access'})
        //     }
        //     let query = {};
        //     if (req.query.email) {
        //         query = {
        //             email: req.query.email
        //         }
        //     }
        //     const cursor = reviewsCollection.find(query).sort({"_id": -01});
        //     const reviews = await cursor.toArray();
        //     res.send(reviews)
        // });

        app.post('/add-product',  async(req, res)=>{
            const product = req.body;
            const result = await phoneCollections.insertOne(product);
            res.send(result)
        })

        app.get('/bookings', verifyJWT, async (req, res) => {
            const buyerEmail = req.query.buyerEmail;
            
            const decodedEmail = req.decoded.email;

            if (buyerEmail !== decodedEmail) {
                return res.status(403).send({ message: 'forbidden access' });
            }
            const query = { buyerEmail: buyerEmail };
            const bookings = await bookingCollections.find(query).toArray();
            res.send(bookings);
        })

        app.post('/bookings', async (req, res) => {
            const booking = req.body;
            // const query = {
            //     appointmentDate: booking.appointmentDate,
            //     email: booking.email,
            //     treatment: booking.treatment 
            // }

            // const alreadyBooked = await bookingCollections.find(query).toArray();

            // if (alreadyBooked.length){
            //     const message = `You already have a booking on ${booking.appointmentDate}`
            //     return res.send({acknowledged: false, message})
            // }

            const result = await bookingCollections.insertOne(booking);
            res.send(result);
        });

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

        app.put('/users/admin/:id', verifyJWT,   async (req, res) => {
            const id = req.params.id;
            const filter = { _id: ObjectId(id) }
            const options = { upsert: true };
            const updatedDoc = {
                $set: {
                    role: 'admin'
                }
            }
            const result = await usersCollections.updateOne(filter, updatedDoc, options);
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