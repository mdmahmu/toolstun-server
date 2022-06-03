import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import { MongoClient, ObjectId, ServerApiVersion } from 'mongodb';
import jwt from 'jsonwebtoken';
import Stripe from 'stripe';
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const app = express();
const port = process.env.PORT || 5000;

//middleware
app.use(express.json());
app.use(cors());

//verifying jwt
function verifyJWT(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).send({ message: 'unauthorized access' });
    }
    const token = authHeader.split(' ')[1];
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
            return res.status(403).send({ message: 'Forbidden access' });
        }
        req.decoded = decoded;
        next();
    });
}


//database connection
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.glfelds.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

async function run() {
    try {
        await client.connect();
        const reviewCollection = client.db("ManufacturerWebsiteToolsTun").collection("allReviews");


        const productCollection = client.db("ManufacturerWebsiteToolsTun").collection("allProducts");

        const ordersCollection = client.db("ManufacturerWebsiteToolsTun").collection("orders");

        const usersCollection = client.db("ManufacturerWebsiteToolsTun").collection("users");

        // get all reviews
        app.get('/reviews', async (req, res) => {
            const query = {};
            const cursor = reviewCollection.find(query);
            const reviews = await cursor.toArray();
            res.send(reviews);
        });

        // post a review
        app.post('/add_review', async (req, res) => {
            const newReview = req.body;
            const result = await reviewCollection.insertOne(newReview);
            res.send({ result });
        });

        // get all products
        app.get('/products', async (req, res) => {
            const query = {};
            const cursor = productCollection.find(query);
            const products = await cursor.toArray();
            res.send(products);
        });

        // GET single product
        app.get('/all_tools/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await productCollection.findOne(query);
            res.send(result);
        });

        // post a product
        app.post('/add_product', async (req, res) => {
            const newProduct = req.body;
            const result = await productCollection.insertOne(newProduct);
            res.send({ result });
        });

        // post an order
        app.post('/place_order', async (req, res) => {
            const newOrder = req.body;
            const result = await ordersCollection.insertOne(newOrder);
            res.send({ result });
        });

        // get my orders
        app.get('/orders/', verifyJWT, async (req, res) => {
            const emailOrUid = req.query.emailOrUid;
            const decodedEmailOrUid = req.query.emailOrUid;

            if (emailOrUid === decodedEmailOrUid) {
                const query = { emailOrUid: emailOrUid };
                const cursor = ordersCollection.find(query);
                const myOrders = await cursor.toArray();
                return res.send(myOrders);
            }
            else {
                return res.status(403).send('forbidden access');
            }
        });

        // GET single order data
        app.get('/payment/:orderId', async (req, res) => {
            const id = req.params.orderId;
            const query = { _id: ObjectId(id) };
            const result = await ordersCollection.findOne(query);
            res.send(result);
        });

        //deleting an order
        app.delete('/orders/:orderId', async (req, res) => {
            const id = req.params.orderId;
            const query = { _id: ObjectId(id) };
            const result = await ordersCollection.deleteOne(query);
            res.send(result);
        });

        //payment
        app.post('/create-payment-intent', async (req, res) => {
            const { price } = req.body;
            const amount = price * 100;

            if (amount) {
                const paymentIntent = await stripe.paymentIntents.create({
                    amount: amount,
                    currency: "usd",
                    payment_method_types: ["card"]
                });
                res.send({ clientSecret: paymentIntent.client_secret });
            }
        });

        //update data after payment
        app.put('/update_data', async (req, res) => {
            const { productId, bought, orderId, transactionId } = req.body;

            const query = { _id: ObjectId(productId) };
            const specificProduct = await productCollection.findOne(query);
            const newQuantity = parseInt(specificProduct.quantity) - parseInt(bought);

            const newSold = parseInt(specificProduct.sold) + parseInt(bought);

            const options = { upsert: true };
            const updateDoc = {
                $set: {
                    quantity: newQuantity,
                    sold: newSold
                },
            };
            const result1 = await productCollection.updateOne(query, updateDoc, options);

            const filter = { _id: ObjectId(orderId) };
            const updateDoc2 = {
                $set: {
                    transactionId: transactionId
                },
            };
            const result2 = await ordersCollection.updateOne(filter, updateDoc2, options);

            res.send({ result1, result2 });
        });

        // creating user
        app.put('/user', async (req, res) => {
            const { emailOrUid } = req.body;
            const filter = { emailOrUid: emailOrUid };
            const options = { upsert: true };

            const updateDoc = {
                $set: {
                    emailOrUid: emailOrUid
                },
            };
            const result = await usersCollection.updateOne(filter, updateDoc, options);
            const token = jwt.sign({ emailOrUid: emailOrUid }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '30d' });

            res.send({ result, token });
        });

        // get all users
        app.get('/users', async (req, res) => {
            const query = {};
            const cursor = usersCollection.find(query);
            const users = await cursor.toArray();
            res.send(users);
        });

        // get one user
        app.get('/user', async (req, res) => {
            const emailOrUid = req.query.emailOrUid;
            const query = { emailOrUid: emailOrUid };
            const result = await usersCollection.findOne(query);
            res.send(result);
        });

        // updating user
        app.put('/users/updateRole', async (req, res) => {
            const { emailOrUid } = req.body;
            const filter = { emailOrUid: emailOrUid };
            const updateDoc = {
                $set: {
                    role: 'admin'
                },
            };
            const result = await usersCollection.updateOne(filter, updateDoc);

            res.send({ result });
        });

    } finally {
        //   await client.close();
    }
}
run().catch(console.dir);

app.get('/', (req, res) => {
    res.send('Manufacturer Website');
});

app.listen(port, () => {
    console.log('app listening on port', port);
});