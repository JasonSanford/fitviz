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
var orm            = require('orm');
var RedisStore     = require('connect-redis')(session);

var constants        = require('./constants');
var connectionString = require('./db/connection_string');
var modelDefinitions = require('./db/model_definitions');
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

passport.serializeUser(function (user, done) {
  done(null, user);
});

passport.deserializeUser(function (obj, done) {
  done(null, obj);
});

if (process.env.REDISTOGO_URL) {
  var redisStore = new RedisStore({url: process.env.REDISTOGO_URL});
} else {
  var redisStore = new RedisStore({
    host: 'localhost',
    port: 6379,
    db: 1
  });
}

orm.connect(connectionString, function (error, db) {
  if (error) { throw error; }
  var User = db.define('user', modelDefinitions.user);

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
    '/settings',
    ensureAuthenticated,
    function (req, resp) {
      var context = {
        user: req.user
      };
      resp.render('settings', context);
    }
  );

  app.post(
    '/delete',
    ensureAuthenticated,
    function (req, resp) {
      User.find({id: req.user.id}).remove(function (error) {
        if (error) {
          console.log('Could not remove user: ' + req.user);
        } else {
          req.logout();
        }
        resp.redirect('/');
      });
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

  function authUser (profile, accessToken, refreshToken, cb) {
    var user;
    var userParams = {
      provider: profile.provider,
      provider_id: profile.id.toString()
    };
    User.find(userParams, 1, function (error, results) {
      if (error) {
        cb(error);
      } else {
        if (results.length > 0) {
          console.log('User found: ' + profile.provider + ':' + profile.id);
          user = results[0];
          cb(null, user);
        } else {
          console.log('Creating user: ' + profile.provider + ':' + profile.id);

          userParams.access_token  = accessToken;
          userParams.refresh_token = refreshToken;
          userParams.profile       = profile;
          userParams.name          = profile.displayName;

          User.create(userParams, function (error, user) {
            if (error) {
              cb(error);
            } else {
              cb(null, user);
            }
          });
        }
      }
    });
  }
});
