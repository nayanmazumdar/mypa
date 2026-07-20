const { Inventory, Product, StockMovement, sequelize } = require('../models');
const { Op } = require('sequelize');
const logger = require('../config/logger');

class InventoryService {
  async getStock(shopId, productId) {
    return Inventory.findOne({
      where: { shop_id: shopId, product_id: productId },
    });
  }

  async getAllStock(shopId, { limit, offset, search }) {
    const include = [{
      model: Product,
      attributes: ['name', 'sku', 'barcode'],
      where: search ? {
        [Op.or]: [
          { name: { [Op.like]: `%${search}%` } },
          { sku: { [Op.like]: `%${search}%` } },
        ],
      } : undefined,
    }];

    const { rows, count } = await Inventory.findAndCountAll({
      where: { shop_id: shopId },
      include,
      order: [[Product, 'name', 'ASC']],
      limit,
      offset,
    });

    const items = rows.map(i => {
      const plain = i.get({ plain: true });
      plain.product_name = plain.Product?.name || null;
      plain.sku = plain.Product?.sku || null;
      plain.barcode = plain.Product?.barcode || null;
      delete plain.Product;
      return plain;
    });

    return { items, total: count };
  }

  async getLowStock(shopId) {
    const rows = await Inventory.findAll({
      where: {
        shop_id: shopId,
        quantity: { [Op.lte]: sequelize.col('Inventory.min_stock_level') },
      },
      include: [{ model: Product, attributes: ['name', 'sku'] }],
      order: [['quantity', 'ASC']],
    });

    return rows.map(i => {
      const plain = i.get({ plain: true });
      plain.product_name = plain.Product?.name || null;
      plain.sku = plain.Product?.sku || null;
      delete plain.Product;
      return plain;
    });
  }

  async addStock(shopId, userId, productId, quantity, type, referenceType, referenceId, notes) {
    await sequelize.transaction(async (t) => {
      const existing = await Inventory.findOne({
        where: { shop_id: shopId, product_id: productId },
        transaction: t,
      });

      if (existing) {
        if (type === 'in') {
          await existing.increment('quantity', { by: quantity, transaction: t });
        } else {
          await existing.decrement('quantity', { by: quantity, transaction: t });
        }
      } else {
        await Inventory.create({
          product_id: productId,
          user_id: userId,
          shop_id: shopId,
          quantity: type === 'in' ? quantity : -quantity,
        }, { transaction: t });
      }

      await StockMovement.create({
        product_id: productId,
        user_id: userId,
        shop_id: shopId,
        type,
        quantity,
        reference_type: referenceType || null,
        reference_id: referenceId || null,
        notes: notes || null,
      }, { transaction: t });
    });

    logger.info(`Stock ${type}: product ${productId}, qty ${quantity}`);
  }

  async getStockHistory(shopId, productId) {
    const movements = await StockMovement.findAll({
      where: { shop_id: shopId, product_id: productId },
      order: [['created_at', 'DESC']],
      limit: 50,
    });
    return movements;
  }

  async updateSettings(shopId, productId, { min_stock_level, max_stock_level, location }) {
    const inventory = await Inventory.findOne({
      where: { shop_id: shopId, product_id: productId },
    });

    if (!inventory) {
      const error = new Error('Inventory record not found');
      error.statusCode = 404;
      throw error;
    }

    const updates = {};
    if (min_stock_level !== undefined) updates.min_stock_level = min_stock_level;
    if (max_stock_level !== undefined) updates.max_stock_level = max_stock_level;
    if (location !== undefined) updates.location = location;

    await inventory.update(updates);
    return inventory;
  }
}

module.exports = new InventoryService();
