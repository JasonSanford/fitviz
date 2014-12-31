#!/usr/bin/env node

var orm = require('orm');

var connectionString = require('./connection_string');
var modelDefinitions = require('./model_definitions');

orm.connect(connectionString, function (error, db) {
  if (error) { throw error; }
  var User = db.define('user', modelDefinitions.user);

  console.log('Dropping tables');
  db.drop(function () {

    console.log('Creating tables');
    User.sync(function (error, abc, def) {
      if (error) { throw error; }
      process.exit(0);
    });
  });
});
