const express = require('express');
const app = express();
var bodyParser = require('body-parser');
app.use(bodyParser.json()); // support json encoded bodies
app.use(bodyParser.urlencoded({
	extended: true
})); // support encoded bodies
const robot = require('./robot.js');
const Path = require('path');
const dli = require('./data_layer_interface.js');
const Axios = require('axios');
const Fs = require('fs');
const PORT = process.env.PORT || 3000;

app.use(express.static('public'));

app.get('/check', async (req, res) => {
	//todo send 'C' if class is closed, other wise send 'O'
	res.send('C');
});

app.post('/', async (req, res) => {
	const pennkey = req.body.pennkey;
	const password = req.body.psw;
	const clss = req.body.clss;
	const errs = await robot.registerNotificationFor(clss);
	if (errs == '') {
		//Successfully registered for a notification
		await dli.initDatabase();
		const user = await robot.onboardUser(pennkey, password);
		await robot.addUserToWaitlist(user, clss);
		res.send(`Thanks, just put ${pennkey} in the queue for ${clss}. I will wait for the class to open and then register you on your behalf!`);
	} else {
		//PennCourseNotify Error
		res.send(`PennCourseNotify reported an error.You will have to try again at another time: <b> ${errs} </b>`);
	}
});

app.listen(PORT, () => console.log(`Example app listening on port ${PORT}!`));

async function downloadStaticFile(url, filename) {
	const path = Path.resolve(__dirname, 'public', filename);
	const writer = Fs.createWriteStream(path);
	const response = await Axios({
		method: 'GET',
		url,
		responseType: 'stream'
	});

	response.data.pipe(writer);

	return new Promise((resolve, reject) => {
		writer.on('data', (data) => {
			console.log(data);
		});
		writer.on('end', () => {
			console.log('Resource Downloaded');
			resolve();
		});

		writer.on('error', (err) => {
			console.log(err);
			reject(err);
		});
	});
}

//downloadStaticFile('http://www.penncoursenotify.com/course_list', 'courselist.txt');