var Spinner = require('spin');

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
  this.featureGroup.clearLayers();
  lineString.coordinates.forEach(function (coordinate) {
    var pathOptions = {
      radius: 5,
      stroke: false,
      fillColor: '#ff7800'
    };
    var circleMarker = new L.CircleMarker([coordinate[1], coordinate[0]], pathOptions);
    me.featureGroup.addLayer(circleMarker);
  });
  this.map.fitBounds(this.featureGroup.getBounds());
};

module.exports = MapView;
