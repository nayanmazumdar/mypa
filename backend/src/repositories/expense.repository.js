const BaseRepository = require('./BaseRepository');

class ExpenseRepository extends BaseRepository {
  constructor() {
    super('expenses');
  }

  async findAllPaginated(shopId, { page, limit, start_date, end_date }) {
    const where = {};
    const conditions = ['shop_id = ?'];
    const params = [shopId];

    if (start_date) { conditions.push('expense_date >= ?'); params.push(start_date); }
    if (end_date) { conditions.push('expense_date <= ?'); params.push(end_date); }

    const offset = (page - 1) * limit;
    const countParams = [...params];

    const [rows] = await this.pool.query(
      `SELECT * FROM expenses WHERE ${conditions.join(' AND ')} ORDER BY expense_date DESC, created_at DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );
    const [countResult] = await this.pool.query(
      `SELECT COUNT(*) as total FROM expenses WHERE ${conditions.join(' AND ')}`,
      countParams
    );

    return {
      data: rows,
      pagination: { page, limit, total: countResult[0].total, totalPages: Math.ceil(countResult[0].total / limit) },
    };
  }

  async getSummaryByCategory(shopId, { start_date, end_date } = {}) {
    const today = new Date().toISOString().split('T')[0];
    const conditions = ['shop_id = ?'];
    const params = [shopId];

    if (start_date) { conditions.push('expense_date >= ?'); params.push(start_date); }
    else { conditions.push('expense_date >= ?'); params.push(today.slice(0, 7) + '-01'); }
    if (end_date) { conditions.push('expense_date <= ?'); params.push(end_date); }

    return this.raw(
      `SELECT category, SUM(amount) as total, COUNT(*) as count
       FROM expenses WHERE ${conditions.join(' AND ')}
       GROUP BY category ORDER BY total DESC`,
      params
    );
  }
}

module.exports = new ExpenseRepository();
