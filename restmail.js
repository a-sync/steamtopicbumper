// load the latest message from inbox
async function loadLastFromInbox(inbox) {
    //console.debug(`Checking ${inbox}@restmail.net @ ` + String(new Date()));
    const res = await fetch('http://restmail.net/mail/'+inbox);
    const resJson = await res.json();

    try {
        const {text, date} = resJson.pop();
        const currDate = new Date();
        const mailDate = new Date(date);
        const age = Math.abs(currDate.getTime() - mailDate.getTime());
        return {text, age};
    } catch (error) {
        return new Error('No messages.');
    }
}

// wait for 30 sec for a new message (less then 30 sec old)
function waitForNewMail(inbox) {
    return new Promise((resolve, reject) => {
        let i = 0;

        const check = () => {
            loadLastFromInbox(inbox).then(res => {
                if (!(res instanceof Error) && res.age / 1000 < 30) {
                    console.log('Found new mail on try nr. ' + String(i+1));
                    return resolve(res.text);
                } else {
                    i++;
                    if (i < 12) {
                        setTimeout(check, 2000);
                    } else {
                        return reject(new Error('No new message received within the time limit.'));
                    }
                }
            });
        };

        setTimeout(check, 5000);
    });
}

function clearInbox(inbox) {
    return fetch('http://restmail.net/mail/'+inbox, {method:'DELETE'});
}

module.exports = {waitForNewMail, clearInbox};