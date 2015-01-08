var request = require('request');

var activityTypes = require('./activity_types');
var constants     = require('../../constants');

var metrics = {
  'lng': {
    arrayPosition: 0,
    display: 'Longitude'
  },
  'lat': {
    arrayPosition: 1,
    display: 'Latitude'
  },
  'elevation': {
    arrayPosition: 2,
    display: 'Elevation'
  },
  'distance': {
    arrayPosition: 3,
    display: 'Distance'
  },
  'heartrate': {
    arrayPosition: 4,
    display: 'Heart Rate'
  },
  'speed': {
    arrayPosition: 5,
    display: 'Speed'
  }
};

function mmfApiRequest (path, params, accessToken, callback) {
  var apiBase = 'https://oauth2-api.mapmyapi.com/v7.0/';

  var options = {
    uri     : apiBase + path,
    qs      : params,
    json    : true,
    headers : {
      'Api-Key'       : constants.mmfApiKey,
      'Authorization' : 'Bearer ' + accessToken
    }
  };
  request(options, callback);
}

function getWorkout (user, workoutId, callback) {
  var params = { field_set: 'time_series' };
  mmfApiRequest('workout/' + workoutId, params, user.access_token, function (error, response, body) {
    if (error) {
      callback(error);
    } else {
      var positions        = body.time_series.position;
      var positionsObj     = {};
      var availableMetrics = [];
      var ignoreMetrics    = ['distance'];

      positions.forEach(function (position) {
        var positionIndex = position[0];
        positionsObj[positionIndex] = position[1];
      });

      var metricsKeys = Object.keys(metrics);

      metricsKeys.forEach(function (metricsKey) {
        var metric = metrics[metricsKey];
        var timeSeriesElement = body.time_series[metricsKey];

        if (timeSeriesElement) {
          if (ignoreMetrics.indexOf(metricsKey) < 0) {
            // Don't worry about visualizing distance
            availableMetrics.push(metricsKey);
          }

          timeSeriesElement.forEach(function (position) {
            var positionIndex = position[0];
            if (positionsObj[positionIndex]) {
              // Only add time series info for known geographic positions
              positionsObj[positionIndex][metricsKey] = position[1];
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
        aggregates        : body.aggregates,
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
  mmfApiRequest('workout', params, user.access_token, function (error, response, body) {
    if (error) {
      callback(error);
    } else {
      var mmfWorkouts = body._embedded.workouts;
      var workouts = mmfWorkouts.map(function (mmfWorkout) {
        var activityType = (function (){
          var thisActivityType = activityTypes[mmfWorkout._links.activity_type[0].id];
          if (thisActivityType.id === thisActivityType.rootId) {
            return thisActivityType.name;
          } else {
            return activityTypes[thisActivityType.rootId].name;
          }
        }());
        return {
          start_date      : mmfWorkout.start_datetime,
          name            : mmfWorkout.name,
          type            : activityType,
          id              : mmfWorkout._links.self[0].id,
          has_time_series : mmfWorkout.has_time_series,
          active_time     : mmfWorkout.aggregates.active_time_total,
          elapsed_time    : mmfWorkout.aggregates.elapsed_time_total,
          distance        : mmfWorkout.aggregates.distance_total,
          heart_rate_avg  : mmfWorkout.aggregates.heartrate_avg,
          heart_rate_max  : mmfWorkout.aggregates.heartrate_max
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
