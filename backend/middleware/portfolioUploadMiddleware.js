const { createUpload } = require("./uploadSupport");

module.exports = createUpload({ imagesOnly: true, maxFileSize: 5 * 1024 * 1024, maxFiles: 1 });
