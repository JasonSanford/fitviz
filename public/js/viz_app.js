var request = require('request');
var moment  = require('moment');
var Spinner = require('spin');

var constants = require('./constants');
var utils     = require('./utils');
var MapView   = require('./map_view');

function VizApp (selector) {
  this.$div        = $(selector);
  this.$leftDiv    = this.$div.find('.left');
  this.$spinnerDiv = this.$leftDiv.find('.spinner-container');
  this.$mapDiv     = this.$div.find('.right');

  this.resetHeight         = utils.bind(this.resetHeight, this);
  this.getWorkoutCallback  = utils.bind(this.getWorkoutCallback, this);
}

VizApp.prototype.initEvents = function () {
  var me = this;
  $(window).on('resize', this.resetHeight);

  this.$leftDiv.on('click', 'table.workouts-table tbody tr', function (event) {
    var $tr = (function () {
      if (event.target.tagName.toLowerCase() === 'span') {
        return $(event.target).parent('td').parent('tr');
      } else {
        return $(event.target).parent('tr');
      }
    }());

    var workoutId     = $tr.data('workout-id');
    var hasTimeSeries = $tr.data('has-time-series');

    if (hasTimeSeries) {
      me.showWorkout(workoutId);
    } else {
      window.alert('This workout has no time series data and cannot be shown.');
    }
  });

  this.$leftDiv.on('click', '.page', function (event) {
    event.preventDefault();
    var $target = $(event.target);
    me.$leftDiv.html('<div class="spinner-container full-height"></div>');
    me.getWorkouts(parseInt($target.data('page'), 10));
  });
};

VizApp.prototype.resetHeight = function () {
  var windowHeight = $(window).height();
  var navHeight    = $('.navbar').outerHeight();
  var appHeight    = windowHeight - navHeight;
  this.$div.height(appHeight);
};

VizApp.prototype.getWorkout = function (workoutId) {
  var options = {
    url: 'workouts/' + workoutId,
    json: true
  };
  request(options, this.getWorkoutCallback);
};

VizApp.prototype.getWorkouts = function (page) {
  var me = this;
  this.setLoading(true);
  var options = {
    url: 'workouts?page=' + page,
    json: true
  };
  request(options, function (error, response, body) {
    me.getWorkoutsCallback(error, response, body, page);
  });
};

VizApp.prototype.getWorkoutCallback = function (error, response, body) {
  if (error) {
    this.displayError(error);
  } else {
    var feature = body;
    this.mapView.displayWorkout(feature);
  }
  this.mapView.setLoading(false);
};

VizApp.prototype.getWorkoutsCallback = function (error, response, body, page) {
  if (error) {
    this.displayError(error);
  } else {
    var totalCount        = body.total_count;
    var workouts          = body.workouts;
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

    var totalPages = Math.ceil(totalCount / 20);

    var pageHtml   = '<h3>Page ' + page + ' of ' + totalPages + '</h3><div class="pagination"><ul>';
    for (var i = 0; i < totalPages; i++) {
      var currentPage = i + 1;
      var html = (currentPage === page) ?
        ('<li class="active"><span>' + currentPage + '</span></li>') :
        ('<li><a class="page" href="#page-' + currentPage +'" data-page="' + currentPage + '">' + currentPage + '</a></li>');
      pageHtml += html;
    }
    pageHtml += '</ul></div>';

    this.$leftDiv.html(workoutsTableHtml + pageHtml);
    this.setLoading(false);
  }
};

VizApp.prototype.setLoading = function (loading) {
  if (loading) {
    this.spinner = new Spinner().spin(this.$leftDiv.find('.spinner-container')[0]);
  } else {
    this.spinner.stop();
    delete this.spinner;
  }
};

VizApp.prototype.showWorkout = function (workoutId) {
  var me = this;
  this.mapView.setLoading(true);
  this.getWorkout(workoutId);
};

VizApp.prototype.displayError = function (error) {
  console.log(error.message);
  window.alert(error.message);
};

VizApp.prototype.init = function () {
  this.initEvents();
  this.resetHeight();
  this.mapView = new MapView(this.$mapDiv);
  this.mapView.init();
  this.getWorkouts(1);
};

module.exports = VizApp;