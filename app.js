var express        = require('express');
var passport       = require('passport');
var UAStrategy     = require('passport-underarmour').Strategy;
var StravaStrategy = require('passport-strava').Strategy;
var morgan         = require('morgan');
var session        = require('express-session');
var bodyParser     = require('body-parser');
var cookieParser   = require('cookie-parser');
var methodOverride = require('method-override');
var jade           = require('jade');
var RedisStore     = require('connect-redis')(session);

var constants        = require('./constants');
var uaProvider       = require('./providers/underarmour');
var stravaProvider   = require('./providers/strava');
var uaRoutes         = require('./providers/underarmour/routes');
var stravaRoutes     = require('./providers/strava/routes');
var utils            = require('./utils');

var providerMap = {
  'underarmour' : uaProvider,
  'strava'      : stravaProvider
};

function ensureAuthenticated (req, resp, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  resp.redirect('/');
}

function authUser (profile, accessToken, refreshToken, cb) {
  var user = {
    provider     : profile.provider,
    provider_id  : profile.id.toString(),
    profile      : profile,
    name         : profile.displayName,
    access_token : accessToken
  };
  cb(null, user);
}

passport.serializeUser(function (user, done) {
  done(null, user);
});

passport.deserializeUser(function (obj, done) {
  done(null, obj);
});

if (process.env.REDISTOGO_URL) {
  var redisStore = new RedisStore({ url: process.env.REDISTOGO_URL });
} else {
  var redisStore = new RedisStore({
    host : 'localhost',
    port : 6379,
    db   : 1
  });
}

var uaStrategy = new UAStrategy({
    clientID     : constants.uaApiKey,
    clientSecret : constants.uaApiSecret,
    callbackURL  : process.env.DEVELOPMENT ?
      ('http://localhost:' + constants.port + '/auth/underarmour/callback') :
      'http://fitviz.website/auth/underarmour/callback'
  },
  function (accessToken, refreshToken, profile, done) {
    authUser(profile, accessToken, refreshToken, function (error, user) {
      if (error) {
        done(error);
      } else {
        done(null, user);
      }
    });
  }
);
passport.use(uaStrategy);

var stravaStrategy = new StravaStrategy({
    clientID     : constants.stravaApiKey,
    clientSecret : constants.stravaApiSecret,
    callbackURL  : process.env.DEVELOPMENT ?
      ('http://localhost:' + constants.port + '/auth/strava/callback') :
      'http://fitviz.website/auth/strava/callback'
  },
  function (accessToken, refreshToken, profile, done) {
    authUser(profile, accessToken, refreshToken, function (error, user) {
      if (error) {
        done(error);
      } else {
        done(null, user);
      }
    });
  }
);
passport.use(stravaStrategy);

var app = express();

app.set('views', __dirname + '/views');
app.set('view engine', 'jade');
app.set('port', constants.port);

app.use(morgan('combined'));
app.use(cookieParser());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(methodOverride());
app.use(session({
  secret: 'whatever idc',
  resave: false,
  saveUninitialized: false,
  store: redisStore
}));
app.use(passport.initialize());
app.use(passport.session());
app.use(express.static(__dirname + '/public'));

app.engine('jade', jade.__express);

app.get(
  '/',
  function(req, resp) {
    var context = {
      user      : req.user,
      hasMap    : req.user ? true : false,
      fullWidth : req.user ? true : false
    };
    resp.render('index', context);
  }
);

app.get(
  '/workouts',
  ensureAuthenticated,
  function (req, resp) {
    var pageInfo = utils.getPageInfo(req);
    var provider = providerMap[req.user.provider];
    provider.getWorkouts(req.user, pageInfo, function (error, workouts) {
      if (error) {
        resp.status(500);
        resp.json({ error: error.message });
      } else {
        resp.json(workouts);
      }
    });
  }
);

app.get(
  '/workouts/:workoutId',
  ensureAuthenticated,
  function (req, resp) {
    var provider = providerMap[req.user.provider];
    provider.getWorkout(req.user, req.param('workoutId'), function (error, workout) {
      if (error) {
        resp.status(500);
        resp.json({ error: error.message });
      } else {
        resp.json(workout);
      }
    });
  }
);

app.use('/auth/underarmour', uaRoutes);
app.use('/auth/strava', stravaRoutes);

app.get('/sign_out', function (req, resp){
  req.logout();
  resp.redirect('/');
});

app.listen(app.get('port'), function () {
  console.log('Listening on port: ' + app.get('port'));
});
