var Rainbow = require('./rainbow');

function WorkoutDisplay (feature, mapView) {
  var properties = feature.properties;

  this.mapView          = mapView;
  this.lineString       = feature.geometry;
  this.metrics          = properties.metrics;
  this.availableMetrics = properties.available_metrics;
  this.aggregates       = properties.aggregates;

  var displayMetricKey = this.availableMetrics.indexOf('heartrate') > -1 ? 'heartrate' : this.availableMetrics[0];

  this.setDisplayMetric(displayMetricKey, true);
}

WorkoutDisplay.prototype.clearCurrentMetric = function () {
  this.mapView.featureGroup.clearLayers();
};

WorkoutDisplay.prototype.setDisplayMetric = function (displayMetricKey, firstRun) {
  var me = this;

  this.clearCurrentMetric();

  var displayMetric         = this.metrics[displayMetricKey];
  var displayMetricMinValue = this.aggregates[displayMetricKey + '_min'];
  var displayMetricMaxValue = this.aggregates[displayMetricKey + '_max'];

  var rainbow = new Rainbow();
  rainbow.setNumberRange(displayMetricMinValue, displayMetricMaxValue);
  //rainbow.setSpectrum('ffffb2', 'fecc5c', 'fd8d3c', 'f03b20', 'bd0026');
  rainbow.setSpectrum('66ccff', '3333ff', '0000cc', 'ffffcc', 'ffff00', 'ffcc66', 'ff9900', 'ff3300', 'ffffff');
  //rainbow.setSpectrum('000000', '0000ff', '00ffff', '00ff00', 'ffff00', 'ff0000', 'ffffff');
  //rainbow.setSpectrum('0000ff', 'ff0000');

  this.lineString.coordinates.forEach(function (coordinate) {
    var color = rainbow.colourAt(coordinate[displayMetric.arrayPosition]);
    var pathOptions = {
      radius      : 5,
      stroke      : false,
      fillColor   : '#' + color,
      fillOpacity : 0.8
    };
    var circleMarker = new L.CircleMarker([coordinate[1], coordinate[0]], pathOptions);
    me.mapView.featureGroup.addLayer(circleMarker);
  });

  if (firstRun) {
    this.mapView.map.fitBounds(this.mapView.featureGroup.getBounds());
  }

  var metricsDivHtml = [];
  this.availableMetrics.forEach(function (metricKey) {
    var metric = me.metrics[metricKey];
    metricsDivHtml.push(
      '<label><input type="radio" name="metric" value="' + metricKey + '"' + (metricKey === displayMetricKey ? ' checked' : '') + '>' + metric.display +'</label>'
    );
  });
  this.mapView.$metricsDiv.html(metricsDivHtml.join(''));
};

WorkoutDisplay.prototype.destroy = function () {
  this.clearCurrentMetric();
};

module.exports = WorkoutDisplay;
