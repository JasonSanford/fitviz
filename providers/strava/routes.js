var passport = require('passport');
var router   = require('express').Router();

router.get(
  '/',
  passport.authenticate('strava'),
  function (req, resp) {
    // The request will be redirected to Strava for authentication, so this
    // function will not be called.
  }
);

router.get(
  '/callback',
  passport.authenticate('strava', { failureRedirect: '/' }),
  function (req, resp) {
    resp.redirect('/');
  }
);

module.exports = router;
