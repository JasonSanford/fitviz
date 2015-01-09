function bind (fn, me) {
  return function(){
    return fn.apply(me, arguments);
  };
}

function metersPerSecondToMilesPerHour (metersPerSecond) {
  return metersPerSecond * 2.23694;
}

function metersPerSecondToMinutesPerMile (metersPerSecond) {
  return 1 / (metersPerSecond / 26.8224);
}

function minutesPerMileToMMSS (minutesPerMile) {
  var minutes        = Math.floor(minutesPerMile);
  var remainder      = minutesPerMile % 1;
  var seconds        = Math.floor(remainder * 60);
  return minutes + ':' + (seconds < 10 ? '0' + seconds : seconds);
}

module.exports = {
  bind                            : bind,
  metersPerSecondToMilesPerHour   : metersPerSecondToMilesPerHour,
  metersPerSecondToMinutesPerMile : metersPerSecondToMinutesPerMile,
  minutesPerMileToMMSS            : minutesPerMileToMMSS
};
