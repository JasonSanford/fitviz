function getWorkouts (user, pageInfo, callback) {
  //callback(new Error('oops'));
  callback(null, [{hey: 'ho'}]);
}

module.exports = {
  getWorkouts: getWorkouts
};
