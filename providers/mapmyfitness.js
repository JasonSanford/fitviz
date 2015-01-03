var request = require('request');

var constants = require('../constants');

function mmfApiRequest (path, params, accessToken, callback) {
  var apiBase = 'https://oauth2-api.mapmyapi.com/v7.0/';

  var options = {
    uri: apiBase + path,
    qs: params,
    json: true,
    headers: {
      'Api-Key': constants.mmfApiKey,
      'Authorization': 'Bearer ' + accessToken
    }
  };
  console.log(JSON.stringify(options));
  request(options, callback);
}

function getWorkouts (user, pageInfo, callback) {
  var limit = pageInfo.perPage;
  var offset = pageInfo.page === 1 ? 0 : ((pageInfo.page - 1) * pageInfo.perPage);
  var params = {
    order_by: '-start_datetime',
    user: user.provider_id,
    limit: limit,
    offset: offset
  };
  mmfApiRequest('workout', params, user.access_token, function (error, response, body) {
    if (error) {
      callback(error);
    } else {
      var mmfWorkouts = body._embedded.workouts;
      var workouts = mmfWorkouts.map(function (mmfWorkout) {
        return {
          start_date      : mmfWorkout.start_datetime,
          name            : mmfWorkout.name,
          id              : mmfWorkout._links.self[0].id,
          has_time_series : mmfWorkout.has_time_series,
          active_time     : mmfWorkout.aggregates.active_time_total,
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
  getWorkouts: getWorkouts
};
