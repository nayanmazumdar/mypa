const productRepo = require('../repositories/mysql/product.repository');
const { generateId } = require('../utils/helper');
const { parsePagination, buildPaginationMeta } = require('../utils/pagination');
const logger = require('../config/logger');

class ProductService {
  async getAll(userId, query) {
    const { page, limit, offset } = parsePagination(query);
    const filters = { search: query.search, categoryId: query.category_id };

    const [products, total] = await Promise.all([
      productRepo.findAll(userId, { limit, offset, ...filters }),
      productRepo.count(userId, filters),
    ]);

    const pagination = buildPaginationMeta(total, page, limit);
    return { products, pagination };
  }

  async getById(id, userId) {
    const product = await productRepo.findById(id, userId);
    if (!product) {
      const error = new Error('Product not found');
      error.statusCode = 404;
      throw error;
    }
    return product;
  }

  async create(userId, data) {
    const uuid = generateId();
    const productData = {
      uuid,
      user_id: userId,
      name: data.name,
      sku: data.sku || null,
      barcode: data.barcode || null,
      category_id: data.category_id || null,
      description: data.description || null,
      purchase_price: data.purchase_price,
      selling_price: data.selling_price,
      unit: data.unit || 'piece',
      tax_rate: data.tax_rate || 0,
      image_url: data.image_url || null,
    };

    const product = await productRepo.create(productData);
    logger.info(`Product created: ${product.name} (${uuid})`);
    return product;
  }

  async update(id, userId, data) {
    const existing = await productRepo.findById(id, userId);
    if (!existing) {
      const error = new Error('Product not found');
      error.statusCode = 404;
      throw error;
    }

    const updateData = {};
    const allowedFields = ['name', 'sku', 'barcode', 'category_id', 'description', 'purchase_price', 'selling_price', 'unit', 'tax_rate', 'image_url', 'is_active'];
    for (const field of allowedFields) {
      if (data[field] !== undefined) {
        updateData[field] = data[field];
      }
    }

    const product = await productRepo.update(id, userId, updateData);
    logger.info(`Product updated: ${id}`);
    return product;
  }

  async delete(id, userId) {
    const existing = await productRepo.findById(id, userId);
    if (!existing) {
      const error = new Error('Product not found');
      error.statusCode = 404;
      throw error;
    }

    await productRepo.delete(id, userId);
    logger.info(`Product deleted: ${id}`);
    return true;
  }
}

module.exports = new ProductService();
