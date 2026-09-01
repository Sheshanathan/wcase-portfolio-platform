const router = require("express").Router();
const { serveMedia } = require("../controllers/mediaController");

router.get("/:fileName", serveMedia);

module.exports = router;
