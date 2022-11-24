const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();

const port = process.env.PORT || 5000;

const app = express();

//middle were
app.use(cors());
app.use(express.json());


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.taqpwn0.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

async function run(){
    try{
        const categoryCollections = client.db('ogerioDotPhone').collection('phoneCategory')
        const phoneCollections = client.db('ogerioDotPhone').collection('phoneCollection')
        const usersCollections = client.db('ogerioDotPhone').collection('users')

        app.get('/products', async(req, res)=>{
            const query = {};
            const cursor = categoryCollections.find(query).sort({"_id": -01});
            const products = await cursor.toArray();
            res.send(products)
        });

        app.get('/products/:id', async(req, res)=>{
            const id = req.params.id;
            const query = {_id: ObjectId(id)};
            const products = await categoryCollections.findOne(query);
            res.send(products)
        });

        app.get('/users', async (req, res) => {
            const query = {};
            const users = await usersCollections.find(query).toArray();
            res.send(users);
        });

        app.post('/users', async (req, res) => {
            const user = req.body;
            console.log(user);
            const result = await usersCollections.insertOne(user);
            res.send(result);
        });



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