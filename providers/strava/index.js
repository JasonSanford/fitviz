var strava = require('strava-v3');

function getWorkout (user, workoutId, callback) {
  
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
