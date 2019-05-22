const nforce = require('./');

const sfuser = process.env.SFUSER;
const sfpass = process.env.SFPASS;
const clientID = process.env.CLIENTID;
const clientSecret = process.env.CLIENTSECRET;

const auth = {};

async function authenticate(){
    console.debug("authenticating");
    if( !auth.oauth){
        console.debug("getting Org");
        auth.org = nforce.createConnection({
            clientId: clientID,
            clientSecret: clientSecret,
            redirectUri: 'http://localhost:3000/oauth/_callback',
            autoRefresh: true,
            onRefresh: function(newOauth, oldOauth, cb) {
                auth.oauth=newOauth;
                cb();
            }

        });
        console.log(JSON.stringify(auth.org));
        auth.oauth = await auth.org.authenticate({ username: sfuser, password: sfpass});
        console.log(JSON.stringify(auth.oauth));
    }
    if(!auth.oauth) throw ({message:"Could not authenticate"});

}

async function newContact(event){
    await authenticate();

    var body = JSON.parse(event.body);

    var contactObject = nforce.createSObject("Contact", body);

    await auth.org.insert({sobject: contactObject, oauth:auth.oauth});

    var body = {
        oauth: auth.oauth
    }
    return JSON.stringify(body);

}
async function deleteContact(contactID){
    await authenticate();
    
    var contactObject = nforce.createSObject("Contact",{id:contactID});

    await auth.org.delete({sobject: contactObject, oauth:auth.oauth});

    var body = {
        oauth: auth.oauth
    }
    return JSON.stringify(body);

}

async function updateContact(contactID, event){
    await authenticate();
    
    var body = JSON.parse(event.body);

    var contactObject = nforce.createSObject("Contact", body);

    await auth.org.update({sobject: contactObject, oauth:auth.oauth});

    var body = {
        oauth: auth.oauth
    }
    return JSON.stringify(body);

}

async function getContact(contactID){
    await authenticate();
    
    var contact = await auth.org.getRecord({ type: 'contact', id: contactID, oauth: auth.oauth });

    var body = {
        record: contact,
        auth: auth
    }
    return JSON.stringify(body);
}

async function getContacts(){
    await authenticate();

    var query = 'SELECT Id, FirstName, LastName, Phone, Email, Account.Name FROM Contact';

    var queryResults = await auth.org.query({ query: query, oauth: auth.oauth });

    var body = {
        records : queryResults.records,
        oauth : auth.oauth,
    }
    return JSON.stringify(body);
}

async function sfRouter(event, context){
    var response = {
        statusCode:200,
        headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Credentials": true
        },
        body: "",
    }

    if (!event || !event.path) {
        response.statusCode=500; 
        return response; 
    }
    
    const restResource = event.path.split("/")[1];
    const restArgument = event.path.split("/")[2];

    const dispatchCommand = event.httpMethod+"-"+restResource+"-"+(restArgument?"arg":"noarg"); 
    console.log("dispatchCommand: " + dispatchCommand);
    console.log("Upon entry, Auth: " + JSON.stringify(auth));

    try {
        switch (dispatchCommand){
            case "GET-contacts-arg"     : response.body = await getContact(restArgument); break;
            case "GET-contacts-noarg"   : response.body = await getContacts(); break;
            case "PUT-contacts-arg"     : response.body = await updateContact(restArgument, event); break;
            case "POST-contacts-noarg"  : response.body = await newContact(event); break;
            case "DELETE-contacts-arg"  : response.body = deleteContact(restArgument); break;
            default: response.body = "No action defined for: " + dispatchCommand;
        }
        return response; 
    } catch(e){
        console.error(e);
        response.body=JSON.stringify(e);
        response.statusCode=500;
        return response;
    }
}

module.exports.sfRouter = sfRouter;