var request = require('request');
var moment  = require('moment');

var constants = require('./constants');
var utils     = require('./utils');
var MapView   = require('./map_view');

function VizApp (selector) {
  this.$div     = $(selector);
  this.$leftDiv = this.$div.find('.left');
  this.$mapDiv  = this.$div.find('.right');

  this.resetHeight         = utils.bind(this.resetHeight, this);
  this.getWorkoutsCallback = utils.bind(this.getWorkoutsCallback, this);
}

VizApp.prototype.initEvents = function () {
  var me = this;
  $(window).on('resize', this.resetHeight);
  this.$leftDiv.on('click', 'table.workouts-table tr', function (event) {
    var $tr           = $(event.target).parent('tr');
    var workoutId     = $tr.data('workout-id');
    var hasTimeSeries = $tr.data('has-time-series');

    if (hasTimeSeries) {
      me.showWorkout(workoutId);
    } else {
      window.alert('This workout has no time series data and cannot be shown.');
    }
  });
};

VizApp.prototype.resetHeight = function () {
  var windowHeight = $(window).height();
  var navHeight    = $('.navbar').outerHeight();
  var appHeight    = windowHeight - navHeight;
  this.$div.height(appHeight);
};

VizApp.prototype.getWorkouts = function (page) {
  var options = {
    url: window.location.origin + '/workouts',
    qs: {
      page: 1
    },
    json: true
  };
  request(options, this.getWorkoutsCallback);
};

VizApp.prototype.getWorkoutsCallback = function (error, response, body) {
  if (error) {
    this.displayError(error);
  } else {
    var workouts = body;
    var workoutsTableHtml = '<table class="workouts-table striped"><thead><tr><th>Type</th><th>When</th><th>Distance (mi)</th><th>Avg. HR</th><th>Duration</th></tr></thead><tbody>';
    workouts.forEach(function (workout) {
      var d          = new Date(workout.start_date);
      var fromNow    = moment(d).fromNow();
      var miles      = (workout.distance / constants.metersPerMile).toFixed(2);
      var kilometers = (workout.distance / 1000).toFixed(2);
      var duration   = moment().startOf('day').seconds(workout.elapsed_time);
      if (duration.hours() > 0) {
        duration = duration.format('H[h] mm[m] ss[s]');
      } else {
        duration = duration.format('mm[m] ss[s]');
      }
      workoutsTableHtml += '<tr data-workout-id="' + workout.id + '" data-has-time-series="' + workout.has_time_series + '">' +
        '<td>' + workout.type +'</td>' +
        '<td><span title="' + workout.start_date + '">' + fromNow + '</span></td>' +
        '<td><span title="' + kilometers + ' km">' + miles + '</span></td>' +
        '<td>' + (workout.heart_rate_avg ? workout.heart_rate_avg : '-') + '</td>' +
        '<td>' + duration + '</td>' +
      '</tr>';
    });
    workoutsTableHtml += '</tbody></table>';
    this.$leftDiv.html(workoutsTableHtml);
  }
};

VizApp.prototype.showWorkout = function (workoutId) {

};

VizApp.prototype.displayError = function (error) {
  console.log(error.message);
};

VizApp.prototype.init = function () {
  this.initEvents();
  this.resetHeight();
  this.mapView = new MapView(this.$mapDiv);
  this.mapView.init();
  this.getWorkouts(1);
};

module.exports = VizApp;