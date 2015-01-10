module.exports = {
  port            : process.env.PORT || 3000,
  uaApiKey        : process.env.UA_API_KEY,
  uaApiSecret     : process.env.UA_API_SECRET,
  stravaApiKey    : process.env.STRAVA_API_KEY,
  stravaApiSecret : process.env.STRAVA_API_SECRET,
  defaultPage     : 1,
  defaultPerPage  : 20,
  maxPerPage      : 40
};
