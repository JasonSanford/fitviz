var request = require('request');

var activityTypes = require('./activity_types');
var constants     = require('../../constants');
var metrics       = require('../../metrics');

function uaApiRequest (path, params, accessToken, callback) {
  var apiBase = 'https://api.ua.com/v7.0/';

  var options = {
    uri     : apiBase + path,
    qs      : params,
    json    : true,
    headers : {
      'Api-Key'       : constants.uaApiKey,
      'Authorization' : 'Bearer ' + accessToken
    }
  };
  request(options, callback);
}

function getWorkout (user, workoutId, callback) {
  var params = { field_set: 'time_series' };
  uaApiRequest('workout/' + workoutId, params, user.access_token, function (error, response, body) {
    if (error) {
      callback(error);
    } else {
      var positions        = body.time_series.position;
      var positionsObj     = {};
      var availableMetrics = ['elevation'];
      var ignoreMetrics    = ['distance'];
      var aggregates       = {};
      var hasElevation     = false;

      //
      // First create an object to hold positions with relative indexes (distance along)
      // since we only want to add other time series values that occur at geographic positions
      //
      positions.forEach(function (position, index) {
        var positionIndex = position[0];
        var value         = position[1];
        positionsObj[positionIndex] = value;
        if (index === 0 && 'elevation' in value) {  // Should we calculate min/max elevation?
          hasElevation = true;
        }
      });

      //
      // Elevation rides along with lat/lng and doesn't appear with other time series sets
      // Make a special loop to gather aggregates.
      //
      if (hasElevation) {
        Object.keys(positionsObj).forEach(function (positionsObjKey, index) {
          var position  = positionsObj[positionsObjKey];
          var elevation = position.elevation;
          if (index === 0) {
            aggregates.elevation_min = elevation;
            aggregates.elevation_max = elevation;
          } else {
            if (elevation < aggregates.elevation_min) {
              aggregates.elevation_min = elevation;
            }
            if (elevation > aggregates.elevation_max) {
              aggregates.elevation_max = elevation;
            }
          }
        });
      }

      var metricsKeys = Object.keys(metrics);

      metricsKeys.forEach(function (metricsKey) {
        var metric = metrics[metricsKey];
        var timeSeriesElement = body.time_series[metricsKey];

        if (timeSeriesElement) {
          if (ignoreMetrics.indexOf(metricsKey) < 0) {
            // Don't worry about visualizing distance
            availableMetrics.push(metricsKey);
          }

          timeSeriesElement.forEach(function (position, index) {
            var positionIndex = position[0];
            var value         = position[1];
            if (positionsObj[positionIndex]) {  // Only add time series info for known geographic positions
              positionsObj[positionIndex][metricsKey] = value;
              if (index === 0) {
                aggregates[metricsKey + '_min'] = value;
                aggregates[metricsKey + '_max'] = value;
              } else {
                if (value < aggregates[metricsKey + '_min']) {
                  aggregates[metricsKey + '_min'] = value;
                }
                if (value > aggregates[metricsKey + '_max']) {
                  aggregates[metricsKey + '_max'] = value;
                }
              }
            }
          });
        }
      });

      var positionsObjKeys = Object.keys(positionsObj);

      coordinates = positionsObjKeys.map(function (positionsObjKey) {
        var positionObj = positionsObj[positionsObjKey];
        var coord       = [];
        metricsKeys.forEach(function (metricsKey) {
          var metric                  = metrics[metricsKey];
          coord[metric.arrayPosition] = ((positionObj[metricsKey] !== undefined) ? positionObj[metricsKey] : null);
        });
        return coord;
      });

      /*
       * A GeoJSON LineString with extended coordinates to carry extra metrics.
       *
      lineString = {
        type: 'LineString',
        coordinates: [
          [longitude, latitude, elevation, distance, heart_rate, speed],
          ...
        ]
      };
      */

      var properties = {
        available_metrics : availableMetrics,
        aggregates        : aggregates,
        metrics           : metrics
      };
      var geometry = {
        type: 'LineString',
        coordinates: coordinates
      };
      var feature = {
        id         : workoutId,
        type       : 'Feature',
        properties : properties,
        geometry   : geometry
      };

      callback(null, feature);
    }
  });
}

function getWorkouts (user, pageInfo, callback) {
  var limit = pageInfo.perPage;
  var offset = pageInfo.page === 1 ? 0 : ((pageInfo.page - 1) * pageInfo.perPage);
  var params = {
    order_by : '-start_datetime',
    user     : user.provider_id,
    limit    : limit,
    offset   : offset
  };
  uaApiRequest('workout', params, user.access_token, function (error, response, body) {
    if (error) {
      callback(error);
    } else {
      console.log('body: ', JSON.stringify(body));
      var uaWorkouts = body._embedded.workouts;
      var workouts = uaWorkouts.map(function (uaWorkout) {
        var activityType = (function (){
          var thisActivityType = activityTypes[uaWorkout._links.activity_type[0].id];
          if (thisActivityType.id === thisActivityType.rootId) {
            return thisActivityType.name;
          } else {
            return activityTypes[thisActivityType.rootId].name;
          }
        }());
        return {
          start_date      : uaWorkout.start_datetime,
          name            : uaWorkout.name,
          type            : activityType,
          id              : uaWorkout._links.self[0].id,
          has_time_series : uaWorkout.has_time_series,
          active_time     : uaWorkout.aggregates.active_time_total,
          elapsed_time    : uaWorkout.aggregates.elapsed_time_total,
          distance        : uaWorkout.aggregates.distance_total,
          heart_rate_avg  : uaWorkout.aggregates.heartrate_avg,
          heart_rate_max  : uaWorkout.aggregates.heartrate_max
        };
      });
      callback(null, workouts);
    }
  });
}

module.exports = {
  getWorkout  : getWorkout,
  getWorkouts : getWorkouts
};
