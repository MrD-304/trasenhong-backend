const router = require("express").Router();
const ctrl   = require("../controllers/orderController");
const auth   = require("../middlewares/auth");

router.get("/track/:code", ctrl.track);
router.post("/",           ctrl.create);
router.get("/my",          auth, ctrl.getMyOrders);
router.put("/:code/cancel",auth, ctrl.cancelOrder);

module.exports = router;
