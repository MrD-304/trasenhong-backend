const router = require("express").Router();
const ctrl   = require("../controllers/reviewController");
const auth   = require("../middlewares/auth");
const admin  = require("../middlewares/isAdmin");

router.get("/",          ctrl.getAll);
router.post("/",         ctrl.create);
router.put("/:id",  auth, admin, ctrl.update);
router.delete("/:id",auth, admin, ctrl.remove);

module.exports = router;
