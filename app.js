const express = require('express');
const app = express();
const robot = require('./robot.js');
const Path = require('path');
const dli = require('./data_layer_interface.js');
const PORT = process.env.PORT || 3000;

app.get('/', async (req, res) => {
    res.sendFile(Path.resolve(__dirname, 'public', 'registeruser.html'));
});

app.get('/onboardme/:pennkey/:password/:class', async (req, res) => {
    const pennkey = req.params.pennkey;
    const password = req.params.password;
    const clss = req.params.class;
    const errs = await robot.registerNotificationFor(clss);
    if (errs == '') {
        //Successfully registered for a notification
        await dli.initDatabase();
        const user = await robot.onboardUser(pennkey, password);
        await robot.addUserToWaitlist(user, clss);
        res.send(`Thanks, just put ${pennkey} in the queue for ${clss}. I will wait for the class to open and then register you on your behalf!`);
    } else {
        //PennCourseNotify Error
        res.send(`PennCourseNotify reported an error. You will have to try again at another time: <b>${errs}</b>`);
    }
});

app.listen(PORT, () => console.log(`Example app listening on port ${PORT}!`));