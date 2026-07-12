const express = require('express');
const router = express.Router();
const productController = require('../controllers/product.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const { validate } = require('../middlewares/validate.middleware');
const { createProductValidator, updateProductValidator } = require('../validators/product.validator');

router.use(authenticate);

// All product operations require an active shop context
router.use((req, res, next) => {
  if (!req.user.shop_id) {
    return res.status(400).json({
      success: false,
      code: 'NO_SHOP_SELECTED',
      message: 'No shop selected. Please select a shop before managing products.',
      action: 'select_shop',
    });
  }
  next();
});

router.get('/', productController.getAll);
router.get('/:id', productController.getById);
router.post('/', validate(createProductValidator), productController.create);
router.put('/:id', validate(updateProductValidator), productController.update);
router.delete('/:id', productController.delete);

module.exports = router;
