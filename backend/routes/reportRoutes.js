const router = require("express").Router();
const { submit } = require("../controllers/reportController");
const rateLimit = require("../middleware/rateLimit");
router.use(require("../middleware/noQuery"));
router.post("/", rateLimit({ windowMs: 60 * 60 * 1000, max: 5 }), submit);
module.exports = router;
