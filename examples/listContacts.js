const nforce = require('../');
const auth={};


async function authenticate(){
    const sfuser = process.env.SFUSER;
    const sfpass = process.env.SFPASS;
    const clientID = process.env.CLIENTID;
    const clientSecret = process.env.CLIENTSECRET;
    if(!auth.org){
        console.log("authenticating");
        auth.org = nforce.createConnection({
            clientId: clientID,
            clientSecret: clientSecret,
            redirectUri: 'http://localhost:3000/oauth/_callback'
        });
        auth.oauth = await auth.org.authenticate({ username: sfuser, password: sfpass});
        console.log(JSON.stringify(auth.oauth));
    }
}
async function getList(){

    await authenticate();
    
    var query = 'SELECT FirstName, LastName FROM Contact';

    console.log("Authenticated");

    if(!auth.oauth) return [];

    console.log(JSON.stringify(auth.oauth));
    console.log("Querying");
    resp = await auth.org.query({ query: query, oauth: auth.oauth });
    console.log("Queried");

    console.log('Query returned: ' + resp.records.length + ' records');
    if(resp.records && resp.records.length) {
        resp.records.forEach(function(rec) {
          console.log('Contact: ' + rec.get('FirstName') + ' ' + rec.get('LastName'));
        });
    }

    return (resp.records);
}

async function waitForList(){
    var start = Date.now();
    console.log("getting list");
    for(i=0;i<10;i++)
        await getList();
    console.log("got list");
    console.log("seconds elapsed = " + Math.floor((Date.now()-start)/1000));
}

waitForList();



