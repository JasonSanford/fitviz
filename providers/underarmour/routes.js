var passport = require('passport');
var router   = require('express').Router();

router.get(
  '/',
  passport.authenticate('underarmour'),
  function (req, resp) {
    // The request will be redirected to Under Armour for authentication, so this
    // function will not be called.
  }
);

router.get(
  '/callback',
  passport.authenticate('underarmour', { failureRedirect: '/' }),
  function (req, resp) {
    resp.redirect('/');
  }
);

module.exports = router;
