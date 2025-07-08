const express = require('express');
const fs = require('fs');
const app = express();
app.use(express.json());

app.get('/page_content.json', (req, res) => {
    res.sendFile(__dirname + '/page_content.json');
});

app.post('/page_content.json', (req, res) => {
    fs.writeFileSync('./page_content.json', JSON.stringify(req.body, null, 2));
    res.json({status: 'ok'});
});

app.listen(3000, () => console.log('Worker listening on port 3000'));
