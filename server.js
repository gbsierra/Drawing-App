/*
My Note Taking App

Server Script

*/

const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const app = express();
const port = 3001; 

app.use(bodyParser.json());

// Serve static files from the current directory
app.use(express.static(path.join(__dirname)));

// Handle root URL
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Handle save endpoint
app.post('/save', (req, res) => {
    const penData = req.body.data;
    console.log('Received data:', penData);
    res.json({ message: 'Data received' });
});

app.listen(port, () => {
    console.log(`App listening at http://localhost:${port}`);
});
