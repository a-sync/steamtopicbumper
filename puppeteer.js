const puppeteer = require('puppeteer');
const fetch = require('node-fetch');

const LOGIN_URL = process.env.LOGIN_URL;
const LOGIN = process.env.LOGIN;
const PASSW = process.env.PASSW;
const IDURL = process.env.IDURL;
const RESTMAIL = process.env.RESTMAIL; // @restmail.net (forward steam auth code emails here)
const TOKEN = process.env.TOKEN;

async function bump() {
    console.time('connection');
    const browser = await puppeteer.connect({
        browserWSEndpoint: 'wss://chrome.browserless.io/?token='+TOKEN
        +'&--disable-dev-shm-usage=true&--user-data-dir=~/bumper-'+LOGIN,
        ignoreHTTPSErrors: true
    });
    /*const browser = await puppeteer.launch({
        args:[
            //'--window-size=600,800',
            '--disable-dev-shm-usage'
        ],
        userDataDir: __dirname + '/userData-'+LOGIN,
        ignoreHTTPSErrors: true,
        headless: true
    });*/

    let closing = false;
    let closePromise;
    const shutDown = (reason) => {
        if (closing) return closePromise;
        closing = true;
        console.warn(reason + ' @ ' + String(new Date()));
        closePromise = browser.close().then(() => {
            console.timeEnd('connection');
        });
        return closePromise;
    }

    browser.on('targetdestroyed', target => {
        if (['browser', 'page', 'other'].includes(target.type())) {
            shutDown('DESTROYED! GOING DOWN!');
        }
    });

    console.time('login');
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/77.0.3865.90 Safari/537.36');
    //await page.setViewport({width: 600, height: 800});

    // Log in
    try {
        await page.goto(LOGIN_URL, {waitUntil: 'load'});
        await page.type('#steamAccountName', LOGIN);
        await page.type('#steamPassword', PASSW);
        await Promise.race([
            Promise.all([
                page.waitForNavigation({waitUntil: 'load'}).catch(()=>{}),
                page.click('#SteamLogin')
            ]),
            page.waitForSelector('#authcode', {visible:true}).catch(()=>{})
        ]);
    } catch (error) {
        console.error(error.message);
        return shutDown('Login failed!');
    }
    console.timeEnd('login');

    // Deal with Steam Guard
    if (await page.$('#authcode')) {
        console.time('authcode');
        try {
            const mailBody = await waitForNewMail();
            const authCode = mailBody.split(LOGIN+':\n\n')[1].split('\n')[0];

            await page.type('#authcode', authCode);

            await Promise.all([
                page.waitForSelector('#auth_buttonset_success a[data-modalstate="complete"]', {visible:true}),
                page.click('#auth_buttonset_entercode div[data-modalstate="submit"]')
            ]);

            await Promise.all([
                page.waitForNavigation({waitUntil: 'load'}).catch(()=>{}),
                page.click('#auth_buttonset_success a[data-modalstate="complete"]')
            ]);
        } catch(error) {
            console.error(error.message);
            return shutDown('Login with authcode failed!');
        }
        console.timeEnd('authcode');
    }

    // Delete previous comment
    console.time('delete_reply');
    try {
        const delCommand = await page.$$eval(`.commentthread_comment_avatar a[href="${IDURL}"]`, links => {
            if (links.length < 1) return null;
            const lastLink = links.pop();
            const delButton = lastLink.parentNode.parentNode.querySelector('a.forum_comment_action.delete');
            return delButton.getAttribute('href');
        });

        //console.debug(delCommand);
        if (delCommand) {
            await page.evaluate(String(delCommand.trim().substr(11)));
            await page.waitForSelector('div.newmodal', {visible:true});
            await page.click('div.newmodal .btn_green_white_innerfade');
            await page.waitForSelector('div.newmodal', {hidden:true});
        }
    } catch (error) {
        console.warn('Del command failed.', error.message);
    }
    console.timeEnd('delete_reply');

    // Add new reply
    console.time('add_reply');
    try {
        await page.type('.forumtopic_reply_entry textarea', 'bump', {delay:50});
        await page.waitForSelector('.commentthread_entry_submitlink', {visible:true});
        await page.waitFor(500);
        await page.click('button[id*="_submit"]', {delay:50});
        await page.waitForSelector('.commentthread_entry_submitlink', {hidden:true});
    } catch(error) {
        console.warn('Text submission failed.', error.message);
    }
    console.timeEnd('add_reply');

    return shutDown('Done.');
}

async function loadLastFromInbox() {
    //console.debug(`Checking ${RESTMAIL}@restmail.net @ ` + String(new Date()));
    const res = await fetch('http://restmail.net/mail/'+RESTMAIL);
    const resJson = await res.json();

    let re;
    try {
        const {text, date} = resJson.pop();
        const currDate = new Date();
        const mailDate = new Date(date);
        const age = Math.abs(currDate.getTime() - mailDate.getTime());
        re = {text, age};
    } catch(error) {
        re = new Error('No messages.');
    }

    return re;
}

function waitForNewMail() {
    return new Promise((resolve, reject) => {
        let i = 0;

        const check = () => {
            loadLastFromInbox().then(res => {
                if (!(res instanceof Error) && res.age / 1000 < 30) {
                    return resolve(res.text);
                } else {
                    i++;
                    if (i < 10) {
                        setTimeout(check, 3000);
                    } else {
                        return reject(new Error('No new message received within the time limit.'));
                    }
                }
            });
        };

        setTimeout(check, 3000);
    });
}

function clearInbox() {
    return fetch('http://restmail.net/mail/'+RESTMAIL, {method:'DELETE'});
}

module.exports.bump = bump;
module.exports.clearInbox = clearInbox;
