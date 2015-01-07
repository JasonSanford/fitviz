var Spinner = require('spin');

var Rainbow   = require('./rainbow');
var constants = require('./constants');

function MapView ($mapDiv) {
  this.$mapDiv     = $mapDiv;
  this.$spinnerDiv = $mapDiv.find('.spinner-container');
}

MapView.prototype.init = function () {
  L.mapbox.accessToken = constants.mapboxAccessToken;
  this.map = L.mapbox.map(this.$mapDiv[0], constants.mapboxMapId);
  this.featureGroup = new L.FeatureGroup([]);
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

MapView.prototype.displayWorkout = function (lineString) {
  var me = this;

  var rainbow = new Rainbow();
  rainbow.setNumberRange(90, 200);
  rainbow.setSpectrum('ffffb2', 'fecc5c', 'fd8d3c', 'f03b20', 'bd0026');

  this.featureGroup.clearLayers();
  lineString.coordinates.forEach(function (coordinate) {
    var color = rainbow.colourAt(coordinate[4]);
    var pathOptions = {
      radius: 5,
      stroke: false,
      fillColor: '#' + color,
      fillOpacity: 0.8
    };
    var circleMarker = new L.CircleMarker([coordinate[1], coordinate[0]], pathOptions);
    me.featureGroup.addLayer(circleMarker);
  });
  this.map.fitBounds(this.featureGroup.getBounds());
};

module.exports = MapView;
