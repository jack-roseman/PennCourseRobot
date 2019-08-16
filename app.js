const express = require('express');
const app = express();
const robot = require('./robot.js');
const dli = require('./data_layer_interface.js');
const PORT = process.env.PORT || 3000;

app.get('/onboardme/:pennkey/:password/:class', async (req, res) => {
    const pennkey = req.params.pennkey;
    const password = req.params.password;
    const clss = req.params.class;
    dli.initDatabase().then(async () => {
        const user = await robot.onboardUser(pennkey, password);
        await robot.addUserToClass(user, clss);
    });
    res.send(`Thanks, just put ${pennkey} in the queue for ${clss}.`);
});

app.listen(PORT, () => console.log(`Example app listening on port ${PORT}!`));