const {bump, clearInbox} = require('./puppeteer.js');

console.log('Starting bumper...');

async function run() {
    console.log('Attempting bump @ ' + String(new Date()));
    await bump();
    clearInbox();
    setTimeout(run, 1000 * 60 * 60);
}

run();
