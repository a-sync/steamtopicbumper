const events = {bumps:0,warn:0,error:0,fail:0};

const httpOutArray = [];
for (const f of ['log','warn','error']) {
    console['_'+f] = console[f];
    console[f] = (...args) => {
        while (httpOutArray.length >= 200) httpOutArray.shift();
        httpOutArray.push(args.map(i => String(i)).join(' '));
        if (f!=='log') events[f]++;
        return console['_'+f](...args);
    };
}

var http = require('http');
http.createServer(function (req, res) {
    res.writeHead(200, {'Content-Type': 'text/plain'});
    res.end('Events: '
        +JSON.stringify(events,null,2).replace('"','')
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
