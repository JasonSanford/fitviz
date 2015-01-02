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

var constants = require('./constants');
var connectionString = require('./db/connection_string');
var modelDefinitions = require('./db/model_definitions');

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
  app.use(session({ secret: 'whatever idc', resave: false, saveUninitialized: true }));
  app.use(passport.initialize());
  app.use(passport.session());
  app.use(express.static(__dirname + '/public'));

  app.engine('jade', jade.__express);

  app.get(
    '/',
    function(req, resp) {
      resp.render('index', { user: req.user });
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
      provider_id: profile.id
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
});
