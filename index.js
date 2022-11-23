const express = require('express');
const cors = require('cors');

const port = process.env.PORT || 5000;

const app = express();

//middle were
app.use(cors());
app.use(express.json());



app.get('/', (req, res)=>{
    res.send('ogerio dotPhone server api on the display')
})

app.listen(port, ()=>{
    console.log(`ogerio dotPhone server running in port ${port}`);
})