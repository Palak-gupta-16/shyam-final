const {
  Order,
  Inventory,
  GatePass,
  MillDailySummary,
  StoreIssuance,
} = require('../models');

const toDayKey = (date) => {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const createDateRange = (startDate, endDate) => {
  const start = startDate ? new Date(startDate) : new Date();
  const end = endDate ? new Date(endDate) : new Date();

  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);

  return { start, end };
};

const getDailySeries = (items, dateField, valueField) => {
  const map = new Map();

  items.forEach((item) => {
    const key = toDayKey(item[dateField]);
    const rawValue = valueField ? item[valueField] : 1;
    const numericValue = Number(rawValue);
    const value = Number.isFinite(numericValue) ? numericValue : 1;
    map.set(key, (map.get(key) || 0) + value);
  });

  return Array.from(map.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, value]) => ({ date, value }));
};

const getReportsAnalytics = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const { start, end } = createDateRange(startDate, endDate);

    const orderFilter = { createdAt: { $gte: start, $lte: end } };
    const gateFilter = { createdAt: { $gte: start, $lte: end } };
    const storeFilter = { dateIssued: { $gte: start, $lte: end } };
    const productionFilter = { date: { $gte: start, $lte: end } };

    const [
      orders,
      inventory,
      gatePasses,
      dailySummaries,
      storeIssuances,
    ] = await Promise.all([
      Order.find(orderFilter)
        .select('type status customerOrSupplier netWeight isBlocked invoice createdAt')
        .lean(),
      Inventory.find({})
        .select('type status quantity availableQuantity')
        .lean(),
      GatePass.find(gateFilter).select('status createdAt').lean(),
      MillDailySummary.find(productionFilter)
        .select('date totalPieces totalWeight efficiency electricity')
        .lean(),
      StoreIssuance.find(storeFilter)
        .select('status item approvedQuantity returnedQuantity dateIssued')
        .lean(),
    ]);

    const dispatchOrders = orders.filter((o) => o.type === 'dispatch');
    const purchaseOrders = orders.filter((o) => o.type === 'purchase');
    const completedOrders = orders.filter((o) => o.status === 'completed');
    const blockedOrders = orders.filter((o) => o.isBlocked);

    const invoiceAmount = dispatchOrders.reduce((sum, order) => sum + (Number(order.invoice?.amount) || 0), 0);
    const fareAmount = orders.reduce((sum, order) => sum + (Number(order.invoice?.fare?.amount) || 0), 0);
    const paidFareCount = orders.filter((o) => o.invoice?.fare?.paymentStatus === 'paid').length;
    const unpaidFareCount = orders.filter((o) => o.invoice?.fare?.paymentStatus === 'unpaid').length;

    const productionTotalPieces = dailySummaries.reduce((sum, s) => sum + (Number(s.totalPieces) || 0), 0);
    const productionTotalWeight = dailySummaries.reduce((sum, s) => sum + (Number(s.totalWeight) || 0), 0);
    const productionAvgEfficiency = dailySummaries.length
      ? dailySummaries.reduce((sum, s) => sum + (Number(s.efficiency) || 0), 0) / dailySummaries.length
      : 0;
    const electricityConsumption = dailySummaries.reduce(
      (sum, s) => sum + (Number(s.electricity?.consumption) || 0),
      0
    );

    const lowStockItems = inventory.filter((i) => i.status === 'low_stock').length;
    const outOfStockItems = inventory.filter((i) => i.status === 'out_of_stock').length;
    const blockedStockItems = inventory.filter((i) => i.status === 'blocked').length;

    const gateStatusCounts = gatePasses.reduce((acc, gp) => {
      acc[gp.status] = (acc[gp.status] || 0) + 1;
      return acc;
    }, {});

    const storeStatusCounts = storeIssuances.reduce((acc, record) => {
      acc[record.status] = (acc[record.status] || 0) + 1;
      return acc;
    }, {});

    const topPartiesMap = new Map();
    orders.forEach((order) => {
      const name = order.customerOrSupplier || 'Unknown';
      const existing = topPartiesMap.get(name) || { name, orders: 0, totalWeight: 0 };
      existing.orders += 1;
      existing.totalWeight += Number(order.netWeight) || 0;
      topPartiesMap.set(name, existing);
    });

    const topParties = Array.from(topPartiesMap.values())
      .sort((a, b) => b.orders - a.orders)
      .slice(0, 10);

    const response = {
      range: {
        startDate: start,
        endDate: end,
      },
      orders: {
        total: orders.length,
        dispatch: dispatchOrders.length,
        purchase: purchaseOrders.length,
        completed: completedOrders.length,
        blocked: blockedOrders.length,
        invoiceAmount,
        fareAmount,
      },
      production: {
        days: dailySummaries.length,
        totalPieces: productionTotalPieces,
        totalWeight: productionTotalWeight,
        averageEfficiency: Number(productionAvgEfficiency.toFixed(2)),
        electricityConsumption: Number(electricityConsumption.toFixed(2)),
      },
      inventory: {
        totalItems: inventory.length,
        lowStockItems,
        outOfStockItems,
        blockedStockItems,
        totalQuantity: inventory.reduce((sum, i) => sum + (Number(i.quantity) || 0), 0),
        totalAvailableQuantity: inventory.reduce((sum, i) => sum + (Number(i.availableQuantity) || 0), 0),
      },
      financial: {
        invoiceAmount,
        fareAmount,
        paidFareCount,
        unpaidFareCount,
      },
      gate: {
        total: gatePasses.length,
        statusCounts: gateStatusCounts,
      },
      store: {
        total: storeIssuances.length,
        statusCounts: storeStatusCounts,
        requestedQuantity: storeIssuances.reduce((sum, r) => sum + (Number(r.item?.quantity) || 0), 0),
        approvedQuantity: storeIssuances.reduce((sum, r) => sum + (Number(r.approvedQuantity) || 0), 0),
        returnedQuantity: storeIssuances.reduce((sum, r) => sum + (Number(r.returnedQuantity) || 0), 0),
      },
      trends: {
        ordersByDay: getDailySeries(orders, 'createdAt'),
        productionWeightByDay: getDailySeries(dailySummaries, 'date', 'totalWeight'),
        gateByDay: getDailySeries(gatePasses, 'createdAt'),
      },
      topParties,
    };

    return res.status(200).json({
      message: 'Reports analytics retrieved successfully',
      data: response,
    });
  } catch (error) {
    console.error('Get reports analytics error:', error);
    return res.status(500).json({ message: 'Server error retrieving reports analytics' });
  }
};

module.exports = {
  getReportsAnalytics,
};
