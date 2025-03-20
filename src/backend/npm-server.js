const express = require('express');
const path = require('path');
const http = require('http'); // Use the built-in http module for HTTP requests *MAY NOT NEED
const app = express();
const port = 2999;

app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));
// Catch-all route (ensure this is added **after** static middleware)

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/canvas.html'));
});

app.post('/save', (req, res) => {
    const penData = req.body.data;
    console.log('Received data:', penData);
    res.json({ message: 'Data received' });
});

app.listen(port, () => {
    console.log(`App listening at http://localhost:${port}`);
});
