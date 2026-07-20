const { Product, Category, Inventory } = require('../models');
const { Op } = require('sequelize');
const { generateId } = require('../utils/helper');
const { parsePagination, buildPaginationMeta } = require('../utils/pagination');
const logger = require('../config/logger');

class ProductService {
  async getAll(shopId, query) {
    const { page, limit, offset } = parsePagination(query);
    const where = { shop_id: shopId };

    if (query.search) {
      where[Op.or] = [
        { name: { [Op.like]: `%${query.search}%` } },
        { sku: { [Op.like]: `%${query.search}%` } },
        { barcode: { [Op.like]: `%${query.search}%` } },
      ];
    }
    if (query.category_id) where.category_id = query.category_id;

    const { rows, count } = await Product.findAndCountAll({
      where,
      include: [{ model: Category, attributes: ['name'] }],
      order: [['created_at', 'DESC']],
      limit,
      offset,
    });

    const products = rows.map(p => {
      const plain = p.get({ plain: true });
      plain.category_name = plain.Category?.name || null;
      delete plain.Category;
      return plain;
    });

    const pagination = buildPaginationMeta(count, page, limit);
    return { products, pagination };
  }

  async getById(id, shopId) {
    const product = await Product.findOne({
      where: { id, shop_id: shopId },
      include: [{ model: Category, attributes: ['name'] }],
    });
    if (!product) {
      const error = new Error('Product not found');
      error.statusCode = 404;
      throw error;
    }
    return product;
  }

  async create(shopId, data, userId) {
    const uuid = generateId();
    // Coerce empty strings to null for unique-constrained fields so that
    // multiple products without a SKU/barcode don't collide on the unique index.
    const sku = data.sku?.trim() || null;
    const barcode = data.barcode?.trim() || null;
    const product = await Product.create({
      ...data,
      sku,
      barcode,
      uuid,
      user_id: userId,
      shop_id: shopId,
    });

    // Create inventory entry
    await Inventory.create({
      product_id: product.id,
      user_id: userId,
      shop_id: shopId,
      quantity: 0,
      min_stock_level: data.min_stock_level || 0,
      max_stock_level: data.max_stock_level || 0,
    });

    logger.info(`Product created: ${product.name} (${product.sku})`);
    return product;
  }

  async update(id, shopId, data) {
    const product = await Product.findOne({ where: { id, shop_id: shopId } });
    if (!product) {
      const error = new Error('Product not found');
      error.statusCode = 404;
      throw error;
    }
    // Coerce empty strings to null for unique-constrained fields
    const updates = { ...data };
    if ('sku' in updates) updates.sku = updates.sku?.trim() || null;
    if ('barcode' in updates) updates.barcode = updates.barcode?.trim() || null;
    await product.update(updates);
    return product;
  }

  async delete(id, shopId) {
    const deleted = await Product.destroy({ where: { id, shop_id: shopId } });
    if (!deleted) {
      const error = new Error('Product not found');
      error.statusCode = 404;
      throw error;
    }
    return true;
  }
}

module.exports = new ProductService();
