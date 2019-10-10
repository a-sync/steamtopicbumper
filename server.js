const {bump} = require('./puppeteer.js');

console.log('Starting bumper...');

async function run() {
    console.log('Attempting bump @ ' + String(new Date()));
    await bump();
    setTimeout(run, 1000 * 60 * 60);
}

run();
