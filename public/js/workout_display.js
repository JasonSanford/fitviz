var Rainbow = require('./rainbow');
var utils   = require('./utils');

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
  var displayMetricMaxValue = this.aggregates[displayMetricKey + '_max'];
  var displayMetricMinValue = this.aggregates[displayMetricKey + '_min'] || displayMetricMaxValue;
  if (displayMetricMaxValue === displayMetricMinValue) {
    displayMetricMaxValue += 1;
  }

  if (!(displayMetricMinValue && displayMetricMaxValue)) {
    window.alert('This workout has no time series data and cannot be shown.');
    return;
  }

  var rainbow = new Rainbow();
  rainbow.setNumberRange(displayMetricMinValue, displayMetricMaxValue);
  //rainbow.setSpectrum('ffffb2', 'fecc5c', 'fd8d3c', 'f03b20', 'bd0026');
  rainbow.setSpectrum('66ccff', '3333ff', '0000cc', 'ffffcc', 'ffff00', 'ffcc66', 'ff9900', 'ff3300', 'ffffff');
  //rainbow.setSpectrum('000000', '0000ff', '00ffff', '00ff00', 'ffff00', 'ff0000', 'ffffff');
  //rainbow.setSpectrum('0000ff', 'ff0000');

  this.lineString.coordinates.forEach(function (coordinate) {
    var color = rainbow.colourAt(coordinate[displayMetric.arrayPosition]);
    var pathOptions = {
      radius      : 7,
      stroke      : false,
      fillColor   : '#' + color,
      fillOpacity : 1
    };
    var circleMarker = new L.CircleMarker([coordinate[1], coordinate[0]], pathOptions);
    circleMarker.coordinate = coordinate;
    circleMarker.on('mouseover', function (event) {
      var metricsDivHtml = [];
      me.availableMetrics.forEach(function (availableMetricKey) {
        event.target.setStyle($.extend({}, pathOptions, { stroke: true, color: '#333', weight: 2 }));
        var metric = me.metrics[availableMetricKey];
        if (availableMetricKey === 'speed') {
          metricsDivHtml.push(
            '<p' + (displayMetricKey === availableMetricKey ? ' style="background-color: #C03D20;"' : '') + '>' +
              'Speed: <strong>' + utils.metersPerSecondToMilesPerHour(coordinate[metric.arrayPosition]).toFixed(2) + '</strong> mph' +
            '</p>'
          );
          metricsDivHtml.push(
            '<p' + (displayMetricKey === availableMetricKey ? ' style="background-color: #C03D20;"' : '') + '>' +
              'Pace: <strong>' + utils.minutesPerMileToMMSS(utils.metersPerSecondToMinutesPerMile(coordinate[metric.arrayPosition])) + '</strong> min/mi' +
            '</p>'
          );
        } else {
          metricsDivHtml.push(
            '<p' + (displayMetricKey === availableMetricKey ? ' style="background-color: #C03D20;"' : '') + '>' +
              metric.display + ': <strong>' + coordinate[metric.arrayPosition] + '</strong>' + (metric.unit ? ' ' + metric.unit : '') +
            '</p>'
          );
        }
      });
      me.mapView.$metricsDiv.html(metricsDivHtml.join(''));
      me.mapView.setMetricsVisibility(true);
    });
    circleMarker.on('mouseout', function (event) {
      event.target.setStyle(pathOptions);
      me.mapView.setMetricsVisibility(false);
    });
    me.mapView.featureGroup.addLayer(circleMarker);
  });

  if (firstRun) {
    this.mapView.map.fitBounds(this.mapView.featureGroup.getBounds());
  }

  var metricsPickerDivHtml = [];
  this.availableMetrics.forEach(function (metricKey) {
    var metric = me.metrics[metricKey];
    metricsPickerDivHtml.push(
      '<label>' +
        '<input type="radio" name="metric" value="' + metricKey + '"' + (metricKey === displayMetricKey ? ' checked' : '') + '>' + metric.display +
      '</label>'
    );
  });
  this.mapView.$metricsPickerDiv.html(metricsPickerDivHtml.join(''));
  this.mapView.setMetricsPickerVisibility(true);
};

WorkoutDisplay.prototype.destroy = function () {
  this.clearCurrentMetric();
};

module.exports = WorkoutDisplay;
