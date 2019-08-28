const puppeteer = require('puppeteer');
const notifier = require('mail-notifier');
const dli = require('./data_layer_interface.js');
const DELAY_BETWEEN_SELECTS = 1000;
const DEBUG = false;

/**TODO - HIDE THESE CREDENTIALS */
const PCR_EMAIL_USERNAME = 'penncourserobot@gmail.com';
const PCR_EMAIL_PASSWORD = 'THEmanfrompoland33';

/** CLASSES */
class PCRCredentials {
	constructor(user, pass, ckies) {
		this.username = user;
		this.password = pass;
		this.id = Math.floor(Math.random() * 100);
		this.cookies = ckies;
	}
}

/**
 * This function signs a user into PennInTouch
 * @param {PCRCredentials} userCredentials
 */
module.exports.signInUser = async (userCredentials) => {
	const pennkey = userCredentials.username;
	const password = userCredentials.password;
	const browser = await puppeteer.launch({
		headless: !DEBUG,
		args: ['--no-sandbox', '--disable-setuid-sandbox']
	});

	const page = await browser.newPage();
	page.waitForNavigation();

	// Goto PennInTouch login screen
	const res = await page.goto('https://pennintouch.apps.upenn.edu/pennInTouch/jsp/fast.do');
	await page.setViewport({
		width: 1280,
		height: 689
	});

	//CURRENT PAGE : PennInTouch login screen

	//Set trust cookies
	await page.setCookie(userCredentials.cookies[0]);
	await page.setCookie(userCredentials.cookies[1]);

	// Type in username
	await page.click('#pennkey'); //click on pennkey input field
	await page.type('#pennkey', pennkey); //type in pennkey

	// Type in password
	await page.click('#password'); //click on password input field
	await page.type('#password', password); //type in password

	// Click login button and load next page
	await page.click('#submit1'); //click on login button
	console.log('Typed in username and password');

	await page.waitFor(1000); //wait until page loads

	if (page.url() === 'https://weblogin.pennkey.upenn.edu/login') {
		console.log('Expired Cookies');
		const ckies = await page.cookies().then((cookies) => {
			var out = [];
			for (let i = 0; i < cookies.length; i++) {
				if (cookies[i].name == 'cosign') {
					out[0] = cookies[i];
				}
				if (cookies[i].name == 'twoFactorTrustedBrowser') {
					out[1] = cookies[i];
				}
			}
			return out;
		});
		userCredentials.cookies = ckies;
		await storage.setItem('me', userCredentials); //TODO FIX THIS!!!
		await page.reload();
	} else {
		console.log('Successfully logged in as ' + pennkey);
	}
	await page.waitForNavigation();
	return page;
};

/**
 * 
 * This function registers a user for a class using their username and password provided.
 * COURSE GRADE TYPES : 
 *      NN - Normal
 *      PF - Pass Fail
 * 
 * @param {PCRCredentials} userCredentials 
 * @param {String} classTitle 
 * @param {String} gradeType 
 * 
 */
async function registerClass(userCredentials, classTitle, gradeType) {
	const parts = classTitle.split('-');
	const pennkey = userCredentials.username;
	const page = await signInUser(userCredentials);

	// Click "Register for courses" tag
	await page.evaluate(() => document.querySelectorAll('.studentRightRailTableData a')[2].click());
	await page.waitForNavigation(); //wait until new page is loaded

	//NEW PAGE : Course Registration Page

	console.log('Registering ' + pennkey + ' to ' + classTitle);
	// Enter course subject
	await page.evaluate((sub) => {
		document.querySelectorAll('select[name=subjectPrimary]')[0].value = sub;
		document.querySelectorAll('select[name=subjectPrimary]')[0].onchange();
	}, parts[0]);

	// Enter course number
	await page.waitFor(DELAY_BETWEEN_SELECTS); //wait until form is updated from previous selection
	await page.evaluate((cour) => {
		document.querySelectorAll('select[name=courseNumberPrimary]')[0].value = cour;
		document.querySelectorAll('select[name=courseNumberPrimary]')[0].onchange();
	}, parts[1]);

	// Enter course selection
	await page.waitFor(DELAY_BETWEEN_SELECTS); //wait until form is updated from previous selection
	await page.evaluate((sec) => {
		document.querySelectorAll('select[name=sectionNumberPrimary]')[0].value = sec;
		document.querySelectorAll('select[name=sectionNumberPrimary]')[0].onchange();
	}, parts[2]);

	// Enter course grade type (Normal or Pass/Fail)
	await page.waitFor(DELAY_BETWEEN_SELECTS); //wait until form is updated from previous selection
	await page.evaluate((gt) => {
		document.querySelectorAll('select[name=gradeTypePrimary]')[0].value = gt;
		document.querySelectorAll('select[name=gradeTypePrimary]')[0].onchange();
	}, gradeType);

	// Click green register button
	await page.waitFor(DELAY_BETWEEN_SELECTS / 2); //wait until form is updated from previous selection
	await page.waitForSelector('.fastGreenButton');
	await page.click('.fastGreenButton');

	// Check if registration was successful
	await page.waitForNavigation(); //wait until new page is loaded
	await page.evaluate((ct) => {
		const failMessage = document.querySelectorAll('span[id=courseRequestAreaPanelMessages')[0].innerText;
		console.log(failMessage);
		if (failMessage == '') {
			console.log(`Success! I just signed you up for ${ct}`);
		} else {
			console.log(`Failed sign user up for ${ct}, so throw error`);
		}
	}, classTitle);

	//TODO - handle case when there are 5 or more classes already registered
	//What follows assumes successful registration

	// Log off PennInTouch
	await page.evaluate(() =>
		document.querySelectorAll('a[title="End your session with this application"]')[0].click()
	);
	await page.waitForNavigation(); //wait until redirect page is loaded
	await page.waitForNavigation(); //wait until redirected to log out
	await page.evaluate(() => document.querySelectorAll('input[id="logoutBtn"]')[0].click());
	await page.waitForNavigation(); //final page after logging out
	await page.close();
	console.log('Logged off ' + pennkey);
	return;
}

/*
 * This function is an asyncronous infinite loop that is always checking for new emails TO 
 * penncourserobot@gmail.com FROM penncoursenotification@gmail.com that notifies PCR when a new
 * class opens up. On new mail, this function will decode the subject and figure out which class
 * has just opened, then will search who is next to be registered *
 */

module.exports.start = async function () {
	const imap = {
		user: PCR_EMAIL_USERNAME,
		password: PCR_EMAIL_PASSWORD,
		host: 'imap.gmail.com',
		port: 993, // imap port
		tls: true, // use secure connection
		tlsOptions: {
			rejectUnauthorized: false
		}
	};

	const n = notifier(imap);
	n.on('mail', async (mail) => {
		const addr = mail.from[0].address;
		if (addr == 'penncoursenotification@gmail.com') {
			const subj = mail.subject;
			const patt = /[A-Z]*-[0-9]*-[0-9]*/;
			var classTitle = subj.match(patt)[0];
			const usr = await dli.dequeUserFromClassWaitlist(classTitle);
			registerClass(usr, classTitle, 'NN');
		} else {
			console.log("new email");
		}
	}).on('end', function () {
		n.start();
		console.log('listening for new mail...');
	})

	n.start();
	console.log('listening for new mail...');
}

/**
 * This function allows a user to be onboarded into the database
 * @param {String} pennkey 
 * @param {String} password 
 */
module.exports.onboardUser = async function (pennkey, password) {
	const browser = await puppeteer.launch({
		headless: !DEBUG,
		args: ['--no-sandbox', '--disable-setuid-sandbox']
	});

	const page = await browser.newPage();
	page.waitForNavigation();

	// Goto PennInTouch login screen
	await page.goto('https://pennintouch.apps.upenn.edu/pennInTouch/jsp/fast.do').then((res) => {
		if (res.status() != 200) throw res.status();
	});

	await page.setViewport({
		width: 1280,
		height: 689
	});

	//CURRENT PAGE : PennInTouch login screen

	// Type in username
	await page.click('#pennkey'); //click on pennkey input field
	await page.type('#pennkey', pennkey); //type in pennkey

	// Type in password
	await page.click('#password'); //click on password input field
	await page.type('#password', password); //type in password

	// Click login button and load next page
	await page.click('#submit1'); //click on login button
	await page.waitFor(1000); //wait long enough for page to load
	console.log('Typed in username and password');
	// CURRENT PAGE : 2 factor authentication

	console.log('Waiting for two-factor authentication...');
	//check off the trust button
	await page.evaluate(() => (document.querySelectorAll('input[id="trustdevice_checkbox"]')[0].checked = true));
	//save trusted browser cookies
	const ckies = await page.cookies().then((cookies) => {
		var out = [];
		for (let i = 0; i < cookies.length; i++) {
			if (cookies[i].name == 'cosign') {
				out[0] = cookies[i];
			}
			if (cookies[i].name == 'twoFactorTrustedBrowser') {
				out[1] = cookies[i];
			}
		}
		return out;
	});

	await page.waitForNavigation().then((res) => {
		if (res.status() != 200) throw res.status();
	});; //wait for 2 factor autentication
	await page.waitForNavigation().then((res) => {
		if (res.status() != 200) throw res.status();
	});; //wait for user to accept DUO authentication (30 seconds max)

	console.log('Successfully logged in as ' + pennkey);
	//NEW PAGE : PennInTouch Homescreen
	//await page.screenshot({path: 'screenshots/Page.png'});

	// Log off PennInTouch
	await page.evaluate(() =>
		document.querySelectorAll('a[title="End your session with this application"]')[0].click()
	);
	await page.waitForNavigation().then((res) => {
		if (res.status() != 200) throw res.status();
	});; //wait until redirect page is loaded
	await page.waitForNavigation().then((res) => {
		if (res.status() != 200) throw res.status();
	});; //wait until redirected to log out
	await page.evaluate(() => document.querySelectorAll('input[id="logoutBtn"]')[0].click());
	await page.waitForNavigation(); //final page after logging out
	console.log('Logged off ' + pennkey);
	await page.close();
	return new PCRCredentials(pennkey, password, ckies);
};

/**
 * This function allows a user to be added into the class on the database
 * @param {PCRCredentials} user 
 * @param {String} clss
 */
module.exports.addUserToWaitlist = async function (user, clss) {
	await dli.enqueUserToClassWaitlist(clss, user);
};

/**
 * This function registers for a class notification for the robot
 * @param {String} clss
 */
module.exports.registerNotificationFor = async function (clss) {
	const browser = await puppeteer.launch({
		headless: !DEBUG,
		args: ['--no-sandbox', '--disable-setuid-sandbox']
	});

	const page = await browser.newPage();
	page.waitForNavigation();

	// Goto penncoursenotify
	await page.goto('http://www.penncoursenotify.com').then((res) => {
		if (res.status() != 200) throw res.status();
	});;

	await page.setViewport({
		width: 1280,
		height: 689
	});

	await page.evaluate((course) => {
		document.querySelectorAll('input[name=course]')[0].value = course;
	}, clss.replace(/-/g, ' '));

	await page.evaluate((email) => {
		document.querySelectorAll('input[name=email]')[0].value = email;
	}, 'penncourserobot@gmail.com');

	await page.waitForSelector('button[type=submit]');
	await page.click('button[type=submit]');

	const err = await page.evaluate(() => {
		return document.querySelectorAll('.error')[0].textContent;
	});
	return err;
};