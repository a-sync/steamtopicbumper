const {bump, clearInbox} = require('./puppeteer.js');

console.log('Starting bumper...');

async function run() {
    console.log('Starting @ ' + String(new Date()));
    try {
        await bump();
        clearInbox();
    } catch (error) {
        console.error(error.message);
    }
    console.log('Finished @ ' + String(new Date()) + '\n');

    setTimeout(run, 1000 * 60 * 60);
}

run();
