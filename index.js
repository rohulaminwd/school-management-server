const express = require('express')
const cors = require('cors');
const { MongoClient, ServerApiVersion } = require('mongodb');
const objectId = require('mongodb').ObjectId;
const jwt = require('jsonwebtoken');
require('dotenv').config()
const app = express();
const port = process.env.PORT || 5000

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.send('Hello world!! server is running')
})
// ======= middleware jwt ========
function verifyJWT(req, res, next){
  const authorization = req.headers.authorization;
  if(!authorization){
    return res.status(401).send({message: 'Unauthorized access'})
  }
  const token = authorization.split(' ')[1];
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function(err, decoded) {
    if(err){
      return res.status(403).send({message: 'Forbidden access'})
    } 
    req.decoded = decoded;
    next();
  });
}


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.xwe6b.mongodb.net/?retryWrites=true&w=majority`;


const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

async function run(){
  try{
    await client.connect();
    const userCollection = client.db("manufacturer").collection("users");
    const productCollection = client.db("manufacturer").collection("products");
    const orderCollection = client.db("manufacturer").collection("orders");
    const reviewCollection = client.db("manufacturer").collection("reviews");

    //  ======= middleware verify Admin ========
    const verifyAdmin = async (req, res, next) => {
      const requester = req.decoded.email;
      const requesterAccount = await userCollection.findOne({email: requester});
      // console.log(requesterAccount);
      if(requesterAccount.role === "admin"){
        next();
      }else{
        return res.status(403).send({message: 'Forbidden access'})
      }
    }

    // =====get method====
    app.get('/user', verifyJWT, verifyAdmin, async (req, res) => {
      const users = await userCollection.find().toArray();
      res.send(users);
    })

    app.get('/admin/:email', async (req, res) => {
      const email = req.params.email;
      const user = await userCollection.findOne({email: email});
      const isAdmin = user.role === "admin"
      res.send({admin: isAdmin});
    })

    app.get('/product', async (req, res) => {
      const result = await productCollection.find().toArray();
      res.send(result);
    });

    app.get('/order', async (req, res) => {
      const result = await orderCollection.find().toArray();
      res.send(result);
    });

    app.get('/myOrder', async (req, res) => {
      const email = req.query.email
      const query = { email: email };
      const result = await orderCollection.find(query).toArray();
      res.send(result);
    });

    app.get('/review', async (req, res) => {
      const result = await reviewCollection.find().toArray();
      res.send(result);
    });

    app.get('/product/:id', async (req, res) => {
      const id = req.params.id;
      const query = {_id: objectId(id)}
      const product = await productCollection.findOne(query);
      res.send(product);
    })

    app.get('/payProduct/:id', async (req, res) => {
      const id = req.params.id;
      const query = {_id: objectId(id)}
      const product = await orderCollection.findOne(query);
      res.send(product);
    })

    // ===== Post method =======
    app.post('/product', verifyJWT, verifyAdmin, async (req, res) => {
      const product = req.body;
      const result = await productCollection.insertOne(product);
      res.send(result);
    })
    app.post('/review', verifyJWT, async (req, res) => {
      const review = req.body;
      const result = await reviewCollection.insertOne(review);
      res.send(result);
    })

    app.post('/order', async (req, res) => {
      const product = req.body;
      const result = await orderCollection.insertOne(product);
      res.send(result);
    })

    // ===== Delete method ======
    app.delete('/product/:id',  async (req, res) => {
      const id = req.params.id;
      const query = {_id: objectId(id)}
      console.log(query)
      const result = await productCollection.deleteOne(query);
      res.send(result);
    })

    app.delete('/myOrder/:id',  async (req, res) => {
      const id = req.params.id;
      const query = {_id: objectId(id)}
      console.log(query)
      const result = await orderCollection.deleteOne(query);
      res.send(result);
    })

    // ====== put method ======
    app.put('/user/admin/:email', verifyJWT, verifyAdmin, async (req, res) => {
      const email = req.params.email;
        const filter = {email: email};
        const updateDoc = {
          $set: {role: "admin"}
        };
        const result = await userCollection.updateOne(filter, updateDoc);
        res.send(result)
    })

    app.put('/user/:email', async (req, res) => {
      const email = req.params.email;
      const user = req.body;
      const filter = {email: email};
      const options = { upsert: true };
      const updateDoc = {
        $set: user,
      };
      const result = await userCollection.updateOne(filter, updateDoc, options);
      const token = jwt.sign({ email: email }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' });
      res.send({result, token})
    })


  }finally{

  }
}
run().catch(console.dir);


app.listen(port, () => {
  console.log(`Server is running at port ${port}`)
})