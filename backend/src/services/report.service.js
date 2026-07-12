const { Sale, SaleItem, Product, Customer, Inventory } = require('../models');
const { Op, fn, col, literal } = require('sequelize');

class ReportService {
  async getDailySales(shopId, date) {
    const result = await Sale.findOne({
      attributes: [
        [fn('COUNT', col('id')), 'total_sales'],
        [fn('COALESCE', fn('SUM', col('net_amount')), 0), 'total_revenue'],
        [fn('COALESCE', fn('SUM', col('discount')), 0), 'total_discount'],
      ],
      where: { shop_id: shopId, sale_date: date, status: 'completed' },
      raw: true,
    });
    return result;
  }

  async getMonthlySales(shopId, year, month) {
    return Sale.findAll({
      attributes: [
        [fn('DATE', col('sale_date')), 'date'],
        [fn('COUNT', col('id')), 'total_sales'],
        [fn('COALESCE', fn('SUM', col('net_amount')), 0), 'total_revenue'],
      ],
      where: {
        shop_id: shopId,
        status: 'completed',
        [Op.and]: [
          literal(`YEAR(sale_date) = ${year}`),
          literal(`MONTH(sale_date) = ${month}`),
        ],
      },
      group: [fn('DATE', col('sale_date'))],
      order: [[fn('DATE', col('sale_date')), 'ASC']],
      raw: true,
    });
  }

  async getTopProducts(shopId, startDate, endDate, limit = 10) {
    return SaleItem.findAll({
      attributes: [
        [fn('SUM', col('SaleItem.quantity')), 'total_quantity'],
        [fn('SUM', col('SaleItem.total')), 'total_revenue'],
      ],
      include: [
        { model: Sale, attributes: [], where: { shop_id: shopId, status: 'completed', sale_date: { [Op.between]: [startDate, endDate] } } },
        { model: Product, attributes: ['id', 'name', 'sku'] },
      ],
      group: ['Product.id'],
      order: [[fn('SUM', col('SaleItem.total')), 'DESC']],
      limit,
      raw: true,
      nest: true,
    });
  }

  async getProfitReport(shopId, startDate, endDate) {
    const result = await SaleItem.findOne({
      attributes: [
        [fn('COALESCE', fn('SUM', col('Sale.net_amount')), 0), 'total_sales'],
        [fn('COALESCE', fn('SUM', literal('`SaleItem`.`quantity` * `Product`.`purchase_price`')), 0), 'total_cost'],
      ],
      include: [
        { model: Sale, attributes: [], where: { shop_id: shopId, status: 'completed', sale_date: { [Op.between]: [startDate, endDate] } } },
        { model: Product, attributes: [] },
      ],
      raw: true,
    });

    const totalSales = parseFloat(result?.total_sales || 0);
    const totalCost = parseFloat(result?.total_cost || 0);
    return { total_sales: totalSales, total_cost: totalCost, profit: totalSales - totalCost };
  }

  async getDashboardSummary(shopId) {
    const today = new Date().toISOString().split('T')[0];

    const [todaySales, totalProducts, totalCustomers, lowStock] = await Promise.all([
      Sale.findOne({
        attributes: [[fn('COUNT', col('id')), 'count'], [fn('COALESCE', fn('SUM', col('net_amount')), 0), 'revenue']],
        where: { shop_id: shopId, sale_date: today, status: 'completed' },
        raw: true,
      }),
      Product.count({ where: { shop_id: shopId, is_active: true } }),
      Customer.count({ where: { shop_id: shopId, is_active: true } }),
      Inventory.count({ where: { shop_id: shopId, quantity: { [Op.lte]: col('Inventory.min_stock_level') } } }),
    ]);

    return {
      today_sales: todaySales,
      total_products: totalProducts,
      total_customers: totalCustomers,
      low_stock_items: lowStock,
    };
  }
}

module.exports = new ReportService();
