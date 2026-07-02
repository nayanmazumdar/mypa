const express = require('express');
const router = express.Router();
const productController = require('../controllers/product.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const { validate } = require('../middlewares/validate.middleware');
const { createProductValidator, updateProductValidator } = require('../validators/product.validator');

router.use(authenticate);

router.get('/', productController.getAll);
router.get('/:id', productController.getById);
router.post('/', validate(createProductValidator), productController.create);
router.put('/:id', validate(updateProductValidator), productController.update);
router.delete('/:id', productController.delete);

module.exports = router;
