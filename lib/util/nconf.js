  var stripJsonComments = require("strip-json-comments");
  var jsonWithCommentsFormat = {
    stringify: function (obj, replacer, spacing) {
      return JSON.stringify(obj, replacer || null, spacing || 2);
    },

    parse: function(content) {
      return JSON.parse(stripJsonComments(content));
    }
  };

  module.exports.jsonWithCommentsFormat = jsonWithCommentsFormat;