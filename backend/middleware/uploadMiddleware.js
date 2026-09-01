const { createUpload } = require("./uploadSupport");

module.exports = createUpload({ maxFileSize: 200 * 1024 * 1024, maxFiles: 2 });
