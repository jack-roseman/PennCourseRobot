const express = require('express');
const app = express();
const robot = require('./robot.js');
const dli = require('./data_layer_interface.js');
const PORT = process.env.PORT || 3000;

app.get('/onboardme/:pennkey/:password', async (req, res) => {
    const pennkey = req.params.pennkey;
    const password = req.params.password;
    dli.initDatabase().then(() => robot.onboardUser(pennkey, password));
    res.send(`Thanks, just saved ${pennkey} to the database.`);
});

app.listen(PORT, () => console.log(`Example app listening on port ${PORT}!`));