import express from 'express';
import cors from 'cors';
const app = express();
const port = process.env.PORT || 5000;

//middleware
app.use(express.json());
app.use(cors());


app.get('/', (req, res) => {
    res.send('Manufacturer Website');
});

app.listen(port, () => {
    console.log('app listening on port', port);
});