const {bump} = require('./puppeteer.js');

console.log('Starting bumper...');
let counter = 0;

async function run() {
    const c = ++counter;
    console.log('Starting bump #' + c + ' @ ' + String(new Date()));
    try {
        await bump();
    } catch (error) {
        console.error(error);
    }
    console.log('Finished bump #' + c + ' @ ' + String(new Date()) + '\n');
}

setInterval(run, 1000 * 60 * 60);
run();
