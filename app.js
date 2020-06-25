var express = require('express'); // import express package to the express value
var bodyParser = require('body-parser'); // import body-parser middleware to a variable
var fileUpload = require('express-fileupload'); // used for handling CSV and image files
var editJsonFile = require("edit-json-file"); // used for writing to JSON
var nodemailer = require("nodemailer"); // used for sending confirmation emails from application
const { BlobServiceClient } = require('@azure/storage-blob'); // used for connecting to the Azure Storage container
var cookieParser = require('cookie-parser');
var expressSession = require('express-session');
var bodyParser = require('body-parser');
var methodOverride = require('method-override');
var passport = require('passport');
var util = require('util');
var bunyan = require('bunyan');
var config = require('./config');
// set up database for express session
var MongoStore = require('connect-mongo')(expressSession);
var mongoose = require('mongoose');

// Start QuickStart here

var OIDCStrategy = require('passport-azure-ad').OIDCStrategy;

var log = bunyan.createLogger({
    name: 'Microsoft OIDC Example Web Application'
});

/******************************************************************************
 * Set up passport in the app 
 ******************************************************************************/

//-----------------------------------------------------------------------------
// To support persistent login sessions, Passport needs to be able to
// serialize users into and deserialize users out of the session.  Typically,
// this will be as simple as storing the user ID when serializing, and finding
// the user by ID when deserializing.
//-----------------------------------------------------------------------------
passport.serializeUser(function(user, done) {
    done(null, user.oid);
});

passport.deserializeUser(function(oid, done) {
    findByOid(oid, function (err, user) {
      done(err, user);
    });
});

// array to hold logged in users
var users = [];

var findByOid = function(oid, fn) {
  for (var i = 0, len = users.length; i < len; i++) {
    var user = users[i];
   log.info('we are using user: ', user);
    if (user.oid === oid) {
      return fn(null, user);
    }
  }
  return fn(null, null);
};

//-----------------------------------------------------------------------------
// Use the OIDCStrategy within Passport.
// 
// Strategies in passport require a `verify` function, which accepts credentials
// (in this case, the `oid` claim in id_token), and invoke a callback to find
// the corresponding user object.
// 
// The following are the accepted prototypes for the `verify` function
// (1) function(iss, sub, done)
// (2) function(iss, sub, profile, done)
// (3) function(iss, sub, profile, access_token, refresh_token, done)
// (4) function(iss, sub, profile, access_token, refresh_token, params, done)
// (5) function(iss, sub, profile, jwtClaims, access_token, refresh_token, params, done)
// (6) prototype (1)-(5) with an additional `req` parameter as the first parameter
//
// To do prototype (6), passReqToCallback must be set to true in the config.
//-----------------------------------------------------------------------------
passport.use(new OIDCStrategy({
    identityMetadata: config.creds.identityMetadata,
    clientID: config.creds.clientID,
    responseType: config.creds.responseType,
    responseMode: config.creds.responseMode,
    redirectUrl: config.creds.redirectUrl,
    allowHttpForRedirectUrl: config.creds.allowHttpForRedirectUrl,
    clientSecret: config.creds.clientSecret,
    validateIssuer: config.creds.validateIssuer,
    isB2C: config.creds.isB2C,
    issuer: config.creds.issuer,
    passReqToCallback: config.creds.passReqToCallback,
    scope: config.creds.scope,
    loggingLevel: config.creds.loggingLevel,
    nonceLifetime: config.creds.nonceLifetime,
    nonceMaxAmount: config.creds.nonceMaxAmount,
    useCookieInsteadOfSession: config.creds.useCookieInsteadOfSession,
    cookieEncryptionKeys: config.creds.cookieEncryptionKeys,
    clockSkew: config.creds.clockSkew,
  },
  function(iss, sub, profile, accessToken, refreshToken, done) {
    if (!profile.oid) {
      return done(new Error("No oid found"), null);
    }
    // asynchronous verification, for effect...
    process.nextTick(function () {
      findByOid(profile.oid, function(err, user) {
        if (err) {
          return done(err);
        }
        if (!user) {
          // "Auto-registration"
          users.push(profile);
          return done(null, profile);
        }
        return done(null, user);
      });
    });
  }
));

var app = express(); // instantiate the application by calling the express() method, as this is the Node.js framework being used

// Allows reading the fields from the text fields on the upload form
// For more information, see: https://expressjs.com/en/resources/middleware/body-parser.html
app.use(bodyParser.urlencoded({ extended: false })); 

// Configure app to use the .ejs files contained within 'views'
app.set('views', __dirname + '/views');
app.use(express.static("views"));
app.set('view engine', 'ejs');
app.use(methodOverride());
app.use(cookieParser());

// set up session middleware
if (config.useMongoDBSessionStore) {
  mongoose.connect(config.databaseUri);
  app.use(express.session({
    secret: 'secret',
    cookie: {maxAge: config.mongoDBSessionMaxAge * 1000},
    store: new MongoStore({
      mongooseConnection: mongoose.connection,
      clear_interval: config.mongoDBSessionMaxAge
    })
  }));
} else {
  app.use(expressSession({ secret: 'keyboard cat', resave: true, saveUninitialized: false }));
}

app.use(bodyParser.urlencoded({ extended : true }));

// Initialize Passport!  Also use passport.session() middleware, to support
// persistent login sessions (recommended).
app.use(passport.initialize());
app.use(passport.session());

app.use(express.static(__dirname + 'public'));


// Enables the application to use the express-fileupload middleware, which is used for processing the files
app.use(fileUpload());

//************************** */
//ROUTE CONTROL//
function ensureAuthenticated(req, res, next) {
    if (req.isAuthenticated()) { return next(); }
    res.redirect('/login');
};
  
app.get('/', function(req, res) {
    res.render('index', { user: req.user });
});

app.get('/login',
  function(req, res, next) {
    passport.authenticate('azuread-openidconnect', 
      { 
        response: res,                      // required
        resourceURL: config.resourceURL,    // optional. Provide a value if you want to specify the resource.
        customState: 'my_state',            // optional. Provide a value if you want to provide custom state value.
        failureRedirect: '/' 
      }
    )(req, res, next);
  },
  function(req, res) {
    log.info('Login was called in the Sample');
    res.redirect('/');
});

// 'GET returnURL'
// `passport.authenticate` will try to authenticate the content returned in
// query (such as authorization code). If authentication fails, user will be
// redirected to '/' (home page); otherwise, it passes to the next middleware.
app.get('/auth/openid/return',
  function(req, res, next) {
    passport.authenticate('azuread-openidconnect', 
      { 
        response: res,                      // required
        failureRedirect: '/'  
      }
    )(req, res, next);
  },
  function(req, res) {
    log.info('We received a return from AzureAD.');
    res.redirect('/');
  });

// 'POST returnURL'
// `passport.authenticate` will try to authenticate the content returned in
// body (such as authorization code). If authentication fails, user will be
// redirected to '/' (home page); otherwise, it passes to the next middleware.
app.post('/auth/openid/return',
  function(req, res, next) {
    passport.authenticate('azuread-openidconnect', 
      { 
        response: res,                      // required
        failureRedirect: '/'  
      }
    )(req, res, next);
  },
  function(req, res) {
    log.info('We received a return from AzureAD.');
    res.redirect('/');
  });

// 'logout' route, logout from passport, and destroy the session with AAD.
app.get('/logout', function(req, res){
  req.session.destroy(function(err) {
    req.logOut();
    res.redirect(config.destroySessionUrl);
  });
});

  
var info = {}; // Temporary means of storing ID, name, and text
var infoJSON; // JSON storage of ID, name, and text
var writeStatus; // Holds a String to convey if writing to the JSON file was successful
var imageStatus; // Holds a String to convey if uploading an image was successful
var csvStatus; // Holds a String to convey if uploading an CSV file was successful 
var dateUTC;
var transporter = nodemailer.createTransport({ // specify credentials for 'from' email
    service: 'outlook',
    auth: {
        user: 'ton@bondintelligence.us',
        pass: 'Mariners1817$$$'
    }
});
// ^^^ Email reference: https://www.w3schools.com/nodejs/nodejs_email.asp

// app.get('/dashboard', function (req, res) {
//     res.sendFile('dashboard.html', {root: __dirname + '/client/'});
// })

// Saves text as a JSON in Azure Blob Storage container 1
// Reference: https://github.com/richardgirges/express-fileupload/tree/master/example#multi-file-upload
var uploadToAzure = async function(req, res, next) {
    var userID = req.user.displayName;
    //console.log(userID);
    info[0] = req.body.id; // Stores ID to first spot in info array
    info[1] = req.body.name; // Stores name to second spot in info array
    info[2] = req.body.text; // Stores text to third spot in info array
    info[3] = req.body.email; // Stores email to fourth spot in info array
    dateUTC = new Date().toString();
    let imageFile = req.files.image;
    imageFile.mv('uploads/' + 'uploadedimage.png', function(err) {
        if (err) {
            return res.status(500).send(err);
        }
    });
    let csvFile = req.files.csv;
    csvFile.mv('uploads/' + 'uploadedcsv.csv', function(err) {
        if (err) {
            return res.status(500).send(err);
        }
    });
    imageStatus = "Image uploaded!";
    csvStatus = 'CSV file uploaded!';
    // AZURE UPLOAD PROCESSES START HERE -- AZURE UPLOAD PROCESSES START HERE -- AZURE UPLOAD PROCESSES START HERE -- AZURE UPLOAD PROCESSES START HERE -- AZURE UPLOAD PROCESSES START HERE -- AZURE UPLOAD PROCESSES START HERE
    // AZURE UPLOAD PROCESSES START HERE -- AZURE UPLOAD PROCESSES START HERE -- AZURE UPLOAD PROCESSES START HERE -- AZURE UPLOAD PROCESSES START HERE -- AZURE UPLOAD PROCESSES START HERE -- AZURE UPLOAD PROCESSES START HERE
    // AZURE UPLOAD PROCESSES START HERE -- AZURE UPLOAD PROCESSES START HERE -- AZURE UPLOAD PROCESSES START HERE -- AZURE UPLOAD PROCESSES START HERE -- AZURE UPLOAD PROCESSES START HERE -- AZURE UPLOAD PROCESSES START HERE
    const AZURE_STORAGE_CONNECTION_STRING = "DefaultEndpointsProtocol=https;AccountName=selfupload;AccountKey=7wTyMyW2xtyB3viClN+x+aJexDdkiW9z6ItAI6OfAVQyo5MFpnx5m0cWacCJjhVo+VwKHxvDLKNPOrxgW2fp2A==;EndpointSuffix=core.windows.net"
    // Create the BlobServiceClient object
    const blobServiceClient = await BlobServiceClient.fromConnectionString(AZURE_STORAGE_CONNECTION_STRING);
    // Access existing 'container1'
    const containerClient = await blobServiceClient.getContainerClient('container1'); //containerName
    // Create a unique name for each blob; this is done by using the current UTC timestamp
    const jsonName = userID + "_" + dateUTC + '.json'; // JSON file with text field data
    const imgName = userID + "_" + dateUTC + '.png'; // Image
    const csvName = userID + "_" + dateUTC + '.csv'; // CSV file
    // Create a blob for the JSON, image, and CSV
    const blockJSONClient = containerClient.getBlockBlobClient(jsonName);
    const blockImageClient = containerClient.getBlockBlobClient(imgName);
    const blockCSVClient = containerClient.getBlockBlobClient(csvName);
    // Add form data to the JSON file
    var data = '{ "ID": ' + "\"" + info[0] + "\"" + ' , "Name": ' + "\"" + info[1] + "\"" + ' , "Text": ' + "\"" + info[2] + "\"" + '}';
    // Set each blob to be its respective file
    const uploadJSON = await blockJSONClient.upload(data, data.length);
    const uploadImage = await blockImageClient.uploadFile("uploads/uploadedimage.png") // For testing purposes - OPEN DATA LOGO URL: https://opendata.info/wp-content/uploads/2019/08/Transparent_Background.png
    const uploadCSV = await blockCSVClient.uploadFile("uploads/uploadedcsv.csv")
    // AZURE UPLOAD PROCESSES END HERE -- AZURE UPLOAD PROCESSES END HERE -- AZURE UPLOAD PROCESSES END HERE -- AZURE UPLOAD PROCESSES END HERE -- AZURE UPLOAD PROCESSES END HERE -- AZURE UPLOAD PROCESSES END HERE
    // AZURE UPLOAD PROCESSES END HERE -- AZURE UPLOAD PROCESSES END HERE -- AZURE UPLOAD PROCESSES END HERE -- AZURE UPLOAD PROCESSES END HERE -- AZURE UPLOAD PROCESSES END HERE -- AZURE UPLOAD PROCESSES END HERE
    // AZURE UPLOAD PROCESSES END HERE -- AZURE UPLOAD PROCESSES END HERE -- AZURE UPLOAD PROCESSES END HERE -- AZURE UPLOAD PROCESSES END HERE -- AZURE UPLOAD PROCESSES END HERE -- AZURE UPLOAD PROCESSES END HERE
    next(); // move to the giveConfirmation method
}

// Sends confirmation email and displays confirmation message
var giveConfirmation = function(req, res) {
    var address = '' + info[3];
    var mailOptions = {
        from: '',
        to: address,
        subject: '[OPEN DATA] Upload Confirmation',
        text: 'This is to notify you that your upload has been received on our end.' + 
        '\n' + 'You provided the following information: ' + 
        '\n' + 'ID: ' + info[0] + 
        '\n' + 'Name: ' + info[1] + 
        '\n' + 'Text: ' + info[2]
    };
    transporter.sendMail(mailOptions, function(error, info){
        if (error) {
            console.log(error);
        }
        else {
            console.log('Email sent: ' + info.response);
        }
    });
    res.render('confirmation', { user: req.user });
}

// Calls the uploadToAzure and giveConfirmation functions in consecutive order
// For more information on this format, visit the Route handlers section of the following link:
// https://expressjs.com/en/guide/routing.html
app.post('/processupload', [uploadToAzure, giveConfirmation]);

// Launches local server at http://localhost:5000/
app.listen(5000, function() {
    console.log('Server running at http://localhost:5000/');
});