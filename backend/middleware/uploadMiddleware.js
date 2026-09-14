const { createUpload } = require("./uploadSupport");

module.exports = createUpload({ maxFileSize: 100 * 1000 * 1000, maxFiles: 2 });
