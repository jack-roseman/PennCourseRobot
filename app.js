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
	//TODO send 'C' if class is closed, other wise send 'O'
	//console.log(req.query.course);
	res.send('C');
});

app.post('/register', async (req, res) => {
	const pennkey = req.body.pennkey;
	const password = req.body.psw;
	const clss = req.body.clss;
	const errs = await robot.registerNotificationFor(clss).catch((err) => err);
	if (errs == '') {
		//Successfully registered for a notification
		await dli.initDatabase();
		const user = await robot.onboardUser(pennkey, password).catch((err) => err);
		if (user) {
			robot.addUserToWaitlist(user, clss);
			res.send(`<h2>Thanks, just put ${pennkey} in the queue for ${clss}. I will wait for the class to open and then register you on your behalf!</h2>`);
		} else {
			res.send("<h2>Something went wrong. Please try again later.</h2>");
		}
	} else {
		//PennCourseNotify Error
		if (errs == '503') {
			res.send(`<h2>PennCourseNotify reported an error.</h2> <br> <p> PennCourseNotify is down. This usually happens at the end of the day. Please come back tomorrow morning and try again. </p>`);
		} else {
			res.send(`<h2>PennCourseNotify reported an error.</h2> <br> <p> ${errs} </p>`);
		}
	}
});


app.listen(PORT, function () {
	console.log(`DEBUG app listening on port ${PORT}!`)
	dli.initDatabase().then(robot.start());
});









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