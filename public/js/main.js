var request = require('request');

var utils   = require('./utils');
var MapView = require('./map_view');

function App (selector) {
  this.$div     = $(selector);
  this.$leftDiv = this.$div.find('.left');
  this.$mapDiv  = this.$div.find('.right');

  this.resetHeight         = utils.bind(this.resetHeight, this);
  this.getWorkoutsCallback = utils.bind(this.getWorkoutsCallback, this);
}

App.prototype.initEvents = function () {
  $(window).on('resize', this.resetHeight);
};

App.prototype.resetHeight = function () {
  var windowHeight = $(window).height();
  var navHeight    = $('.navbar').outerHeight();
  var appHeight    = windowHeight - navHeight;
  this.$div.height(appHeight);
};

App.prototype.getWorkouts = function (page) {
  var options = {
    url: window.location.origin + '/workouts',
    qs: {
      page: 1
    },
    json: true
  };
  request(options, this.getWorkoutsCallback);
};

App.prototype.getWorkoutsCallback = function (error, response, body) {
  if (error) {
    this.displayError(error);
  } else {
    var workouts = body;
    this.$leftDiv.text(JSON.stringify(workouts));
  }
};

App.prototype.displayError = function (error) {
  console.log(error.message);
};

App.prototype.init = function () {
  this.initEvents();
  this.resetHeight();
  this.mapView = new MapView(this.$mapDiv);
  this.mapView.init();
  this.getWorkouts(1);
};

var app = new App('.app');
app.init();
