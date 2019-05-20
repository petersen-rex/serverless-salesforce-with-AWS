const nforce = require('./');

const sfuser = process.env.SFUSER;
const sfpass = process.env.SFPASS;
const clientID = process.env.CLIENTID;
const clientSecret = process.env.CLIENTSECRET;

const auth = {
    org: {},
    oauth: {}
}

const response = {
    statusCode:200,
    headers: {
        "Access-Control-Allow-Origin": "*"
    },
    body: "",
}

async function authenticate(){
    console.log("creating connection");

    auth.org = nforce.createConnection({
        clientId: clientID,
        clientSecret: clientSecret,
        redirectUri: 'http://localhost:3000/oauth/_callback'
    });

    auth.oauth = await auth.org.authenticate({ username: sfuser, password: sfpass});
}

async function newContact(event){
    await authenticate();
    
    if(!auth.oauth) return response;

    var body = JSON.parse(event.body);

    var contactObject = nforce.createSObject("Contact", body);

    await auth.org.insert({sobject: contactObject, oauth:auth.oauth});

    var body = {
        oauth: auth.oauth
    }
    response.body = JSON.stringify(body);

    return response;

}
async function deleteContact(contactID){
    await authenticate();
    
    if(!auth.oauth) return response;


    var contactObject = nforce.createSObject("Contact",{id:contactID});

    await auth.org.delete({sobject: contactObject, oauth:auth.oauth});

    var body = {
        oauth: auth.oauth
    }
    response.body = JSON.stringify(body);

    return response;

}

async function updateContact(contactID, event){
    await authenticate();
    
    if(!auth.oauth) return response;

    var body = JSON.parse(event.body);

    var contactObject = nforce.createSObject("Contact", body);

    await auth.org.update({sobject: contactObject, oauth:auth.oauth});

    var body = {
        oauth: auth.oauth
    }
    response.body = JSON.stringify(body);

    return response;

}

async function getContact(contactID){
    await authenticate();
    
    if(!auth.oauth) return response;

    var contact = await auth.org.getRecord({ type: 'contact', id: contactID, oauth: auth.oauth });

    var body = {
        record: contact,
        auth: auth
    }
    response.body = JSON.stringify(body);

    return response;

}

async function getContacts(){
    console.log("getContacts");

    await authenticate();

    console.log("got Oauth: " + JSON.stringify(auth.oauth));

    if(!auth.oauth) return response;

    var query = 'SELECT Id, FirstName, LastName, Phone, Email, Account.Name FROM Contact';

    var queryResults = await auth.org.query({ query: query, oauth: auth.oauth });

    var body = {
        records : queryResults.records,
        oauth : auth.oauth,
    }
    response.body=JSON.stringify(body);

    return response;
}

async function sfRouter(event, context){
    
    if (!event && !event.path) return response;
    
    console.log("Event " +  JSON.stringify(event));

    const restResource = event.path.split("/")[1];
    const restArgument = event.path.split("/")[2];

    var dispatchCommand = event.httpMethod+"-"+restResource+"-"+(restArgument?"arg":"noarg"); 
    console.log("dispatchCommand: " + dispatchCommand);

    switch (dispatchCommand){
        case "GET-contacts-arg"     : return getContact(restArgument);
        case "GET-contacts-noarg"   : return getContacts();
        case "PUT-contacts-arg"     : return updateContact(restArgument, event);
        case "POST-contacts-noarg"  : return newContact(event);
        case "DELETE-contacts-arg"  : return deleteContact(restArgument);
        default: response.body = "no action defined for: " + dispatchCommand;
        return response; 
    }
}

module.exports.sfRouter = sfRouter;