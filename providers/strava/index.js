var strava = require('strava-v3');

var metrics = require('../../metrics');

var normalizedMetrics = {
  watts    : 'power',
  altitude : 'elevation'
};

function getWorkout (user, workoutId, callback) {
  var params = {
    access_token : user.access_token,
    id           : workoutId
  };
  strava.activities.get(params, function (error, activity) {
    if (error) {
      return callback(error);
    }

    params.types = 'latlng,altitude,heartrate,cadence,watts';
    strava.streams.activity(params, function (error, streams) {
      if (error) {
        return callback(error);
      }

      var i, coordinates, coordinatesStream;
      var availableMetrics = [];
      var aggregates       = {};
      var ignoreMetrics    = ['distance'];

      for (i = 0; i < streams.length; i++) {
        stream = streams[i];
        if (stream.type === 'latlng') {
          coordinatesStream = streams[i];
          break;
        }
      }

      coordinates = coordinatesStream.data.map(function (latLng) {
        return [latLng[1], latLng[0]];
      });

      streams.forEach(function (stream) {
        var normalizedMetricKey;
        if (stream.type !== 'latlng') {  // We already handled latlng
          if (stream.type in metrics || stream.type in normalizedMetrics) {
            if (stream.type in metrics) {
              normalizedMetricKey = stream.type;
            } else {
              normalizedMetricKey = normalizedMetrics[stream.type];
            }
            if (ignoreMetrics.indexOf(normalizedMetricKey) < 0) {
              availableMetrics.push(normalizedMetricKey);
            }

            var total = 0;
            var count = 0;

            stream.data.forEach(function (streamValue, index) {
              coordinates[index][metrics[normalizedMetricKey].arrayPosition] = streamValue;

              total += streamValue;
              count++;

              if (index === 0) {
                aggregates[normalizedMetricKey + '_min'] = streamValue;
                aggregates[normalizedMetricKey + '_max'] = streamValue;
              } else {
                if (streamValue < aggregates[normalizedMetricKey + '_min']) {
                  aggregates[normalizedMetricKey + '_min'] = streamValue;
                }
                if (streamValue > aggregates[normalizedMetricKey + '_max']) {
                  aggregates[normalizedMetricKey + '_max'] = streamValue;
                }
              }
            });

            aggregates[normalizedMetricKey + '_avg'] = (total / count);
          } else {
            console.log('No metric found: ' + stream.type + '. Skipping.');
          }
        }
      });

      var feature = {
        id         : workoutId,
        type       : 'Feature',
        properties : {
          available_metrics : availableMetrics,
          metrics           : metrics,
          aggregates        : aggregates,
          name              : activity.name,
          notes             : activity.description,
          start_date        : activity.start_date
        },
        geometry   : {
          type        : 'LineString',
          coordinates : coordinates
        }
      };

      callback(null, feature);
    });
  });
}

function getWorkouts (user, pageInfo, callback) {
  var params = {
    access_token : user.access_token,
    page         : pageInfo.page,
    per_page     : pageInfo.perPage
  };
  strava.athlete.listActivities(params, function (error, stravaWorkouts) {
    if (error) {
      callback(error);
    } else {
      var workouts = stravaWorkouts.map(function (stravaWorkout) {
        return {
          start_date      : stravaWorkout.start_date,
          name            : stravaWorkout.name,
          type            : stravaWorkout.type,
          id              : stravaWorkout.id,
          has_time_series : true,
          active_time     : stravaWorkout.moving_time,
          elapsed_time    : stravaWorkout.elapsed_time,
          distance        : stravaWorkout.distance,
          heart_rate_avg  : stravaWorkout.average_heartrate,
          heart_rate_max  : stravaWorkout.max_heartrate
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
