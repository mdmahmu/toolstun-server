import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import { MongoClient, ObjectId, ServerApiVersion } from 'mongodb';
import Stripe from 'stripe';
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const app = express();
const port = process.env.PORT || 5000;

//middleware
app.use(express.json());
app.use(cors());

//database connection
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.glfelds.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

async function run() {
    try {
        await client.connect();
        const reviewCollection = client.db("ManufacturerWebsiteToolsTun").collection("allReviews");


        const productCollection = client.db("ManufacturerWebsiteToolsTun").collection("allProducts");

        const ordersCollection = client.db("ManufacturerWebsiteToolsTun").collection("orders");

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
        app.get('/orders/', async (req, res) => {
            const emailOrUid = req.query.emailOrUid;
            const query = { emailOrUid: emailOrUid };
            const cursor = ordersCollection.find(query);
            const myOrders = await cursor.toArray();
            res.send(myOrders);
        });

        // GET single order data
        app.get('/payment/:orderId', async (req, res) => {
            const id = req.params.orderId;
            const query = { _id: ObjectId(id) };
            const result = await ordersCollection.findOne(query);
            res.send(result);
        });

        //payment
        app.post("/create-payment-intent", async (req, res) => {
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