var constants = require('./constants');

function MapView ($div) {
  this.$div = $div;
}

MapView.prototype.init = function () {
  L.mapbox.accessToken = constants.mapboxAccessToken;
  L.mapbox.map(this.$div[0], constants.mapboxMapId);
};

module.exports = MapView;
