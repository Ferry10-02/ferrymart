const { sanitizePayload } = require('../utils/sanitize');

const validate = (schema, source = 'body') => {
  return (req, res, next) => {
    try {
      const raw = source === 'body' ? sanitizePayload(req.body) : req[source];
      const parsed = schema.parse(raw);
      req[source] = parsed;
      next();
    } catch (err) {
      next(err);
    }
  };
};

module.exports = { validate };
