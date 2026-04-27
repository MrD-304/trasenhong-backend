const router = require("express").Router();
const ctrl   = require("../controllers/authController");
const auth   = require("../middlewares/auth");

router.post("/register",          ctrl.register);
router.post("/login",             ctrl.login);
router.get( "/me",          auth, ctrl.getMe);
router.put( "/me",          auth, ctrl.updateMe);
router.put( "/me/password", auth, ctrl.changePassword);

module.exports = router;
