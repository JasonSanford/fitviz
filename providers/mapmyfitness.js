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
  mmfApiRequest('workout', { order_by: '-start_datetime', user: user.provider_id }, user.access_token, function (error, response, body) {
    if (error) {
      callback(error);
    } else {
      callback(null, body);
    }
  });
}

module.exports = {
  getWorkouts: getWorkouts
};
