// Capture outputs & count events and actions
const events = {bumps:0,warn:0,error:0,fail:0};
const actions = {};
const httpOutArray = [];
for (const f of ['log', 'warn', 'error']) {
    console['_'+f] = console[f];
    console[f] = (...args) => {
        httpOutArray.push(
            args
            .filter((e,i,a) => {
                // timeEnd call
                if (i === 0 && e === '%s: %sms' && a.length === 3) {
                    if (actions[a[1]]) actions[a[1]]++;
                    else actions[a[1]] = 1;
                    return false;
                }
                return true;
            })
            .map(e => String(e))
            .join(' ')
        );
        while (httpOutArray.length > 200) httpOutArray.shift();

        if (f !== 'log') events[f]++;

        return console['_'+f](...args);
    };
}

// Serve captured data & parse command requests
const http = require('http');
http.createServer(function (req, res) {
    const url = req.url.substr(1).split('/');
    let cmdError = '';
    if (url[0] === 'cmd') {
        if (url[1] === 'start') {
            let min = 60;
            if (url[2] && Number(url[2]) > min) min = Number(url[2]);
            cmdError = start(min);
        }
        else if (url[1] === 'stop') cmdError = stop();
    }

    res.writeHead(200, {'Content-Type': 'text/plain'});
    res.end(cmdError+'Events: '+JSON.stringify(events,null,2).replace(/"/g,'')
        +'\nActions: '+JSON.stringify(actions,null,2).replace(/"/g,'')
        +'\n\n ========== LOGS TAIL =========='
        +'\n'+httpOutArray.join('\n')
    );
}).listen(80, '0.0.0.0');

// Run bot
//require('dotenv').config();
const {bump} = require('./puppeteer.js');
async function run() {
    const c = ++events.bumps;
    console.log('Starting bump #' + c + ' @ ' + String(new Date()));
    try {
        await bump();
    } catch (error) {
        events.fail++;
        console.error(error);
    }
    console.log('Finished bump #' + c + ' @ ' + String(new Date()) + '\n');
}

let loop = null;
function start(min) {
    if (loop) return 'Loop already started!\n\n';
    console.log('Start loop with '+min+' minute intervals @ ' + String(new Date()) + '\n');
    loop = setInterval(run, 1000 * 60 * min);
    run();
    return '';
}

function stop() {
    if (!loop) return 'Loop already stopped!\n\n';
    console.log('Stop loop @ ' + String(new Date()) + '\n');
    clearInterval(loop);
    loop = null;
    return '';
}
