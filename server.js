const events = {bumps:0,warn:0,error:0,fail:0};
const actions = {};

const httpOutArray = [];
for (const f of ['log','warn','error']) {
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

        if (f!=='log') events[f]++;

        return console['_'+f](...args);
    };
}

var http = require('http');
http.createServer(function (req, res) {
    res.writeHead(200, {'Content-Type': 'text/plain'});
    res.end('Events: '+JSON.stringify(events,null,2).replace(/"/g,'')
        +'\nActions: '+JSON.stringify(actions,null,2).replace(/"/g,'')
        +'\n\n'+httpOutArray.join('\n')
    );
}).listen(80, '0.0.0.0');

const {bump} = require('./puppeteer.js');
//require('dotenv').config();

console.log('Starting bumper...');

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

setInterval(run, 1000 * 60 * 60);
run();
