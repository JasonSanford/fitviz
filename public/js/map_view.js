var Spinner = require('spin');

var constants = require('./constants');

function MapView ($mapDiv) {
  this.$mapDiv     = $mapDiv;
  this.$spinnerDiv = $mapDiv.find('.spinner-container');
}

MapView.prototype.init = function () {
  L.mapbox.accessToken = constants.mapboxAccessToken;
  L.mapbox.map(this.$mapDiv[0], constants.mapboxMapId);
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

module.exports = MapView;
