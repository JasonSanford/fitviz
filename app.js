var express        = require('express');
var passport       = require('passport');
var MMFStrategy    = require('passport-mapmyfitness').Strategy;
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
var mmfProvider      = require ('./providers/mapmyfitness');

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

orm.connect(connectionString, function (error, db) {
  if (error) { throw error; }
  var User = db.define('user', modelDefinitions.user);

  var mmfStrategy = new MMFStrategy({
      clientID     : constants.mmfApiKey,
      clientSecret : constants.mmfApiSecret,
      callbackURL  : 'http://localhost:' + constants.port + '/auth/mapmyfitness/callback'
    },
    function (accessToken, refreshToken, profile, done) {
      authUser(profile, accessToken, function (error, user) {
        if (error) {
          done(error);
        } else {
          done(null, user);
        }
      });
    }
  );

  passport.use(mmfStrategy);

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
    store: new RedisStore({
      host: 'localhost',
      port: 6379,
      db: 1
    })
  }));
  app.use(passport.initialize());
  app.use(passport.session());
  app.use(express.static(__dirname + '/public'));

  app.engine('jade', jade.__express);

  app.get(
    '/',
    function(req, resp) {
      var context = {
        user: req.user,
        hasMap: req.user ? true : false
      };
      resp.render('index', context);
    }
  );

  app.get(
    '/workouts',
    ensureAuthenticated,
    function (req, resp) {

      var pageInfo = getPageInfo(req);
      console.log('pageInfo: ' + JSON.stringify(pageInfo));
      mmfProvider.getWorkouts(req.user, pageInfo, function (error, workouts) {
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
      mmfProvider.getWorkout(req.user, req.param('workoutId'), function (error, workout) {
        if (error) {
          resp.status(500);
          resp.json({ error: error.message });
        } else {
          resp.json(workout);
        }
      });
    }
  );

  app.get(
    '/auth/mapmyfitness',
    passport.authenticate('mapmyfitness'),
    function (req, resp) {
        // The request will be redirected to MMF for authentication, so this
        // function will not be called.
    }
  );

  app.get(
    '/auth/mapmyfitness/callback',
    passport.authenticate('mapmyfitness', { failureRedirect: '/' }),
    function (req, resp) {
      resp.redirect('/');
    }
  );

  app.get('/sign_out', function (req, resp){
    req.logout();
    resp.redirect('/');
  });

  app.listen(app.get('port'), function () {
    console.log('Listening on port: ' + app.get('port'));
  });

  function authUser (profile, accessToken, cb) {
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
          userParams.access_token = accessToken;
          userParams.profile = profile;
          userParams.name = profile.displayName;
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

  function getPageInfo (req) {
    var perPage = req.query.per_page || constants.defaultPerPage;
    var page    = req.query.page     || constants.defaultPage;

    perPage = parseInt(perPage, 10);
    page    = parseInt(page, 10);

    if (isNaN(perPage)) {
      perPage = constants.defaultPerPage;
    }
    if (isNaN(page)) {
      page = constants.defaultPage;
    }

    if (perPage > constants.maxPerPage) {
      perPage = constants.maxPerPage;
    }

    return { page: page, perPage: perPage };
  }
});
