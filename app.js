var express        = require('express');
var passport       = require('passport');
var MMFStrategy    = require('passport-mapmyfitness').Strategy;
var morgan         = require('morgan');
var session        = require('express-session');
var bodyParser     = require('body-parser');
var cookieParser   = require('cookie-parser');
var methodOverride = require('method-override');

var constants = require('./constants');

var mmfStrategy = new MMFStrategy({
    clientID     : constants.mmfApiKey,
    clientSecret : constants.mmfApiSecret,
    callbackURL  : 'http://localhost:' + constants.port + '/auth/mapmyfitness/callback'
  },
  function (accessToken, refreshToken, profile, done) {
    process.nextTick(function () {
      return done(null, profile);
    });
  }
);

passport.use(mmfStrategy);

var app = express();

app.set('views', __dirname + '/views');
app.set('view engine', 'jade');
app.use(morgan('combined'));
app.use(cookieParser());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(methodOverride());
app.use(session({ secret: 'whatever idc', resave: false, saveUninitialized: true }));
app.use(passport.initialize());
app.use(passport.session());
app.use(express.static(__dirname + '/public'));
app.engine('jade', require('jade').__express);

app.get('/', function(req, resp){
  resp.render('index', {});
});

app.listen(constants.port);
console.log('Listening on port: ' + constants.port);
