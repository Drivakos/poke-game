require('dotenv').config();
const express = require('express');
const { MongoClient } = require('mongodb');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017';
const DB_NAME = 'Pokehelper';

app.use(cors());
app.use(express.json());

let db;

// Connect to MongoDB
MongoClient.connect(MONGO_URI)
    .then(client => {
        console.log('Connected to MongoDB');
        db = client.db(DB_NAME);
    })
    .catch(error => console.error(error));

// --- Routes ---

// 1. Get Pokemon (Paginated List)
app.get('/api/pokemon', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;

        const pokemon = await db.collection('pokemon')
            .find({})
            .project({ id: 1, name: 1, type: 1, image: 1 }) // Lightweight list
            .sort({ id: 1 })
            .skip(skip)
            .limit(limit)
            .toArray();

        const total = await db.collection('pokemon').countDocuments();

        res.json({
            data: pokemon,
            meta: { page, limit, total, pages: Math.ceil(total / limit) }
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 2. Get Single Pokemon by ID
app.get('/api/pokemon/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const pokemon = await db.collection('pokemon').findOne({ id: id });
        if (!pokemon) return res.status(404).json({ error: 'Pokemon not found' });
        res.json(pokemon);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 3. Get Move by ID (Showdown ID or Key)
app.get('/api/moves/:key', async (req, res) => {
    try {
        const key = req.params.key;
        // Try finding by key (string) or id (number)
        const query = isNaN(key) ? { key: key } : { id: parseInt(key) };
        
        const move = await db.collection('moves').findOne(query);
        if (!move) return res.status(404).json({ error: 'Move not found' });
        res.json(move);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 4. Get Type Chart
app.get('/api/types', async (req, res) => {
    try {
        const types = await db.collection('types').find({}).toArray();
        res.json(types);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 5. Get Natures
app.get('/api/natures', async (req, res) => {
    try {
        const natures = await db.collection('natures').find({}).toArray();
        res.json(natures);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
