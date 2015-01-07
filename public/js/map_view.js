var Spinner = require('spin');

var Rainbow   = require('./rainbow');
var constants = require('./constants');

function MapView ($mapDiv) {
  this.$mapDiv     = $mapDiv;
  this.$spinnerDiv = $mapDiv.find('.spinner-container');
}

MapView.prototype.init = function () {
  L.mapbox.accessToken = constants.mapboxAccessToken;
  this.map             = L.mapbox.map(this.$mapDiv[0], constants.mapboxMapId);
  this.featureGroup    = new L.FeatureGroup([]);
  this.featureGroup.addTo(this.map);
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

MapView.prototype.displayWorkout = function (feature) {
  var me         = this;
  var lineString = feature.geometry;
  var properties = feature.properties;

  var displayMetricKey      = properties.available_metrics.indexOf('heartrate') > -1 ? 'heartrate' : properties.available_metrics[0];
  var displayMetric         = properties.metrics[displayMetricKey];
  var displayMetricMinValue = properties.aggregates[displayMetricKey + '_min'];
  var displayMetricMaxValue = properties.aggregates[displayMetricKey + '_max'];

  var rainbow = new Rainbow();
  rainbow.setNumberRange(displayMetricMinValue, displayMetricMaxValue);
  //rainbow.setSpectrum('ffffb2', 'fecc5c', 'fd8d3c', 'f03b20', 'bd0026');
  rainbow.setSpectrum('66ccff', '3333ff', '0000cc', 'ffffcc', 'ffff00', 'ffcc66', 'ff9900', 'ff3300', 'ffffff');
  //rainbow.setSpectrum('000000', '0000ff', '00ffff', '00ff00', 'ffff00', 'ff0000', 'ffffff');
  //rainbow.setSpectrum('0000ff', 'ff0000');

  this.featureGroup.clearLayers();
  lineString.coordinates.forEach(function (coordinate) {
    var color = rainbow.colourAt(coordinate[displayMetric.arrayPosition]);
    var pathOptions = {
      radius      : 5,
      stroke      : false,
      fillColor   : '#' + color,
      fillOpacity : 0.8
    };
    var circleMarker = new L.CircleMarker([coordinate[1], coordinate[0]], pathOptions);
    me.featureGroup.addLayer(circleMarker);
  });
  this.map.fitBounds(this.featureGroup.getBounds());
};

module.exports = MapView;
