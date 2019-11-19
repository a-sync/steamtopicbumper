const puppeteer = require('puppeteer');
const fetch = require('node-fetch');
const {waitForNewMail, clearInbox} = require('./restmail.js');

const LOGIN_URL = process.env.LOGIN_URL;
const LOGIN = process.env.LOGIN;
const PASSW = process.env.PASSW;
const RESTMAIL = process.env.RESTMAIL; // @restmail.net (forward steam auth code emails here)
const TOKEN = process.env.TOKEN;

function getBrowser() {
    if (TOKEN) {
        return puppeteer.connect({
            browserWSEndpoint: 'wss://chrome.browserless.io/?token='+TOKEN
            +'&--disable-dev-shm-usage=true&--user-data-dir=~/bumper-'+LOGIN,
            ignoreHTTPSErrors: true
        });
    } else {
        return puppeteer.launch({
            args:[
                '--disable-dev-shm-usage'
            ],
            userDataDir: __dirname + '/userData-'+LOGIN,
            ignoreHTTPSErrors: true,
            headless: false
        });
    }
}

let latestCommentId = '';
async function bump() {
    console.time('connection');
    const browser = await getBrowser();

    let closing = false;
    let closePromise;
    const shutDown = (reason) => {
        if (closing) return closePromise;
        closing = true;
        if (reason) console.warn(reason);
        closePromise = browser.close().then(() => {
            console.timeEnd('connection');
        }).catch(error => {
            console.timeEnd('connection');
        });
        return closePromise;
    }

    try {
        browser.on('targetdestroyed', target => {
            if (['browser', 'page', 'other'].includes(target.type())) {
                shutDown('DESTROYED! GOING DOWN!');
            }
        });

        const page = await browser.newPage();
        page.setDefaultTimeout(10000);
        await page.setUserAgent('Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/77.0.3865.90 Safari/537.36');
        const URL = LOGIN_URL + (latestCommentId ? encodeURIComponent(latestCommentId) : '%3Ftscn%3D18446744073709551615');
        //latestCommentId = '';
        await page.goto(URL, {waitUntil: 'load'});

        // Log in
        if (await page.$('#steamAccountName')) {
            console.time('login');
            try {
                await page.type('#steamAccountName', LOGIN);
                await page.type('#steamPassword', PASSW);
                page.click('#remember_login').catch(()=>{});
                await Promise.race([
                    Promise.all([
                        page.waitForNavigation({waitUntil: 'load'}).catch(()=>{}),
                        page.click('#SteamLogin')
                    ]),
                    page.waitForSelector('#authcode', {visible:true}).catch(()=>{})
                ]);
            } catch (error) {
                console.error(error.message);
                console.timeEnd('login');
                return shutDown('Login failed!');
            }
            console.timeEnd('login');
            
            // Deal with Steam Guard
            if (await page.$('#authcode')) {
                console.time('authcode');
                try {
                    const mailBody = await waitForNewMail(RESTMAIL);
                    clearInbox(RESTMAIL);
                    const authCode = mailBody.split(LOGIN+':\n\n')[1].split('\n')[0];
                    await page.type('#authcode', authCode);
                    await page.click('#auth_buttonset_entercode div[data-modalstate="submit"]');
                    await page.waitForSelector('#auth_buttonset_success a[data-modalstate="complete"]', {visible:true});
                    await Promise.all([
                        page.waitForNavigation({waitUntil: 'load'}),
                        page.click('#auth_buttonset_success a[data-modalstate="complete"]')
                    ]);
                } catch(error) {
                    console.error(error.message);
                    console.timeEnd('authcode');
                    return shutDown('Login with authcode failed!');
                }
                console.timeEnd('authcode');
            }
        }

        // Add new reply
        console.time('add_new_reply');
        try {
            await page.type('.forumtopic_reply_entry textarea', 'bump', {delay:50});
            await page.waitForSelector('.commentthread_entry_submitlink button[id*="_submit"]', {visible:true});
            await page.waitFor(500);
            await page.click('.commentthread_entry_submitlink button[id*="_submit"]', {delay:50});
            await page.waitForSelector('.commentthread_entry_submitlink', {hidden:true});
        } catch (error) {
            console.error(error.message);
            console.timeEnd('add_new_reply');
            return shutDown('Reply submission failed.');
        }
        console.timeEnd('add_new_reply');

        // Delete previous reply
        console.time('delete_prev_reply');
        try {
            const delCommand = await page.evaluate(() => {
                const links = document.querySelectorAll('a.forum_comment_action.delete');

                let lastCommentId = '';
                if (links.length > 0) {
                    try {
                        const newPermlink = links[links.length - 1].closest('div.commentthread_comment').querySelector('div.forum_comment_permlink > a');
                        lastCommentId = newPermlink.getAttribute('href');
                    } catch (error) {}
                }

                if (links.length < 2) return {del:false,lastCommentId};

                const delButton = links[links.length - 2];
                const delFunctionString = delButton.getAttribute('href').trim().substr(11);
                Function(delFunctionString)();
                return {del:true,lastCommentId};
            });

            latestCommentId = delCommand.lastCommentId;
            if (!latestCommentId) {
                console.warn('New reply not found.');
            }

            if (delCommand.del) {
                await page.waitForSelector('div.newmodal .btn_green_white_innerfade', {visible:true});
                await page.click('div.newmodal .btn_green_white_innerfade');
                await page.waitForSelector('div.newmodal', {hidden:true});
            } else {
                console.warn('Previous reply not found.');
            }
        } catch (error) {
            console.error(error.message);
            console.timeEnd('delete_prev_reply');
            return shutDown('Del command failed.');
        }
        console.timeEnd('delete_prev_reply');
    } catch (error) {
        return shutDown(error.message);
    }

    return shutDown();
}

module.exports.bump = bump;
