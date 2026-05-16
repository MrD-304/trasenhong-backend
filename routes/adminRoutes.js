const router = require("express").Router();
const ctrl   = require("../controllers/adminController");
const auth   = require("../middlewares/auth");
const admin  = require("../middlewares/isAdmin");

router.use(auth, admin);

router.get("/dashboard",              ctrl.getDashboard);
router.get("/orders",                 ctrl.listOrders);
router.get("/orders/:id",             ctrl.getOrder);
router.put("/orders/:id/confirm",     ctrl.confirmOrder);
router.put("/orders/:id/status",      ctrl.updateOrderStatus);
router.get("/products",               ctrl.listProducts);
router.get("/users",                  ctrl.listUsers);
router.put("/users/:id/toggle",       ctrl.toggleUser);
router.get("/promo-codes",            ctrl.listPromoCodes);
router.post("/promo-codes",           ctrl.createPromoCode);
router.put("/promo-codes/:id/toggle", ctrl.togglePromoCode);

module.exports = router;
