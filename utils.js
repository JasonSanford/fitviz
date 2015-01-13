var constants = require('./constants');

function getPageInfo (req) {
  var perPage = req.query.per_page || constants.defaultPerPage;
  var page    = req.query.page     || constants.defaultPage;

  perPage = parseInt(perPage, 10);
  page    = parseInt(page, 10);

  if (isNaN(perPage)) {
    perPage = constants.defaultPerPage;
  }
  if (isNaN(page)) {
    page = constants.defaultPage;
  }

  if (perPage > constants.maxPerPage) {
    perPage = constants.maxPerPage;
  }

  return { page: page, perPage: perPage };
}

module.exports = {
  getPageInfo: getPageInfo
};
