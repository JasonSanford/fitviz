var Spinner = require('spin');

var constants      = require('./constants');
var WorkoutDisplay = require('./workout_display');

function MapView ($mapDiv) {
  this.$mapDiv           = $mapDiv;
  this.$spinnerDiv       = $mapDiv.find('.spinner-container');
  this.$metricsPickerDiv = $mapDiv.find('.metric-picker');
  this.$metricsDiv       = $mapDiv.find('.metrics');
}

MapView.prototype.init = function () {
  L.mapbox.accessToken = constants.mapboxAccessToken;
  this.map             = L.mapbox.map(this.$mapDiv[0], constants.mapboxMapId);
  this.featureGroup    = new L.FeatureGroup([]);
  this.featureGroup.addTo(this.map);
  this.initEvents();
};

MapView.prototype.initEvents = function () {
  var me = this;

  this.$metricsPickerDiv.on('click', 'input', function (event) {
    var $input = $(event.target);
    me.workoutDisplay.setDisplayMetric($input.val(), false);
  });
};

MapView.prototype.setLoading = function (loading) {
  if (loading) {
    this.$spinnerDiv.show();
    this.spinner = new Spinner().spin(this.$spinnerDiv[0]);
  } else {
    this.$spinnerDiv.hide();
    this.spinner.stop();
  }
};

MapView.prototype.setMetricsVisibility = function (shouldBeVisible) {
  this.$metricsDiv[shouldBeVisible ? 'show' : 'hide']();
};

MapView.prototype.setMetricsPickerVisibility = function (shouldBeVisible) {
  this.$metricsPickerDiv[shouldBeVisible ? 'show' : 'hide']();
};

MapView.prototype.displayWorkout = function (feature) {
  if (this.workoutDisplay) {
    this.workoutDisplay.destroy();
    this.workoutDisplay = null;
  }
  this.workoutDisplay = new WorkoutDisplay(feature, this);
  this.setMetricsPickerVisibility(true);
};

module.exports = MapView;
