const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const http = require('http'); // Use the built-in http module for HTTP requests
const app = express();
const port = 2999;

app.use(bodyParser.json());
app.use(express.static(path.join(__dirname)));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'canvas.html'));
});

app.post('/save', (req, res) => {
    const penData = req.body.data;
    console.log('Received data:', penData);
    res.json({ message: 'Data received' });
});

app.listen(port, () => {
    console.log(`App listening at http://localhost:${port}`);
});
