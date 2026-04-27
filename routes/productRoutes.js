const router = require("express").Router();
const ctrl   = require("../controllers/productController");
const auth   = require("../middlewares/auth");
const admin  = require("../middlewares/isAdmin");

router.get("/categories",           ctrl.getCategories);
router.get("/",                     ctrl.getAll);
router.get("/:id",                  ctrl.getOne);
router.post("/",   auth, admin,     ctrl.create);
router.put("/:id", auth, admin,     ctrl.update);
router.delete("/:id", auth, admin,  ctrl.remove);

module.exports = router;
