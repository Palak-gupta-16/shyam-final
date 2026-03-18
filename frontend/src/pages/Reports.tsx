import React, { useMemo, useState } from 'react';
import { BarChart3, Calendar, DollarSign, Download, Factory, Package, RefreshCcw, Truck } from 'lucide-react';
import DashboardLayout from '../components/layout/DashboardLayout';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import Badge from '../components/common/Badge';
import { reportsAPI } from '../services/api';

interface TrendPoint {
  date: string;
  value: number;
}

interface AnalyticsPayload {
  orders: {
    total: number;
    dispatch: number;
    purchase: number;
    completed: number;
    blocked: number;
    invoiceAmount: number;
    fareAmount: number;
  };
  production: {
    days: number;
    totalPieces: number;
    totalWeight: number;
    averageEfficiency: number;
    electricityConsumption: number;
  };
  inventory: {
    totalItems: number;
    lowStockItems: number;
    outOfStockItems: number;
    blockedStockItems: number;
    totalQuantity: number;
    totalAvailableQuantity: number;
  };
  financial: {
    invoiceAmount: number;
    fareAmount: number;
    paidFareCount: number;
    unpaidFareCount: number;
  };
  gate: {
    total: number;
    statusCounts: Record<string, number>;
  };
  store: {
    total: number;
    statusCounts: Record<string, number>;
    requestedQuantity: number;
    approvedQuantity: number;
    returnedQuantity: number;
  };
  trends: {
    ordersByDay: TrendPoint[];
    productionWeightByDay: TrendPoint[];
    gateByDay: TrendPoint[];
  };
  topParties: Array<{
    name: string;
    orders: number;
    totalWeight: number;
  }>;
}

const today = new Date().toISOString().split('T')[0];

const Reports: React.FC = () => {
  const [selectedReport, setSelectedReport] = useState<'orders' | 'production' | 'inventory' | 'financial' | 'operational'>('orders');
  const [dateRange, setDateRange] = useState({ from: today, to: today });
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<AnalyticsPayload | null>(null);

  const reportTypes = [
    { id: 'orders' as const, title: 'Order Reports', icon: BarChart3 },
    { id: 'production' as const, title: 'Production Reports', icon: Factory },
    { id: 'inventory' as const, title: 'Inventory Reports', icon: Package },
    { id: 'financial' as const, title: 'Financial Reports', icon: DollarSign },
    { id: 'operational' as const, title: 'Operational Reports', icon: Truck },
  ];

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const response = await reportsAPI.getAnalytics({
        startDate: dateRange.from,
        endDate: dateRange.to,
      });
      setData(response.data || null);
    } catch (error) {
      console.error('Error loading reports analytics:', error);
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  const trendToRows = (series: TrendPoint[]) =>
    series.map((point) => (
      <div key={point.date} className="flex items-center justify-between border-b border-gray-100 py-2 text-sm">
        <span className="text-gray-600">{point.date}</span>
        <span className="font-medium text-gray-900">{point.value.toFixed(2)}</span>
      </div>
    ));

  const content = useMemo(() => {
    if (!data) {
      return (
        <Card>
          <Card.Body>
            <p className="text-sm text-gray-600">No analytics data loaded. Choose date range and click Generate Report.</p>
          </Card.Body>
        </Card>
      );
    }

    if (selectedReport === 'orders') {
      return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <Card.Header><h3 className="text-lg font-semibold">Order KPIs</h3></Card.Header>
            <Card.Body>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between"><span>Total Orders</span><Badge variant="primary">{data.orders.total}</Badge></div>
                <div className="flex justify-between"><span>Dispatch</span><Badge variant="success">{data.orders.dispatch}</Badge></div>
                <div className="flex justify-between"><span>Purchase</span><Badge variant="warning">{data.orders.purchase}</Badge></div>
                <div className="flex justify-between"><span>Completed</span><Badge variant="success">{data.orders.completed}</Badge></div>
                <div className="flex justify-between"><span>Blocked</span><Badge variant="error">{data.orders.blocked}</Badge></div>
              </div>
            </Card.Body>
          </Card>

          <Card>
            <Card.Header><h3 className="text-lg font-semibold">Order Trend (Daily Count)</h3></Card.Header>
            <Card.Body>
              <div className="max-h-64 overflow-y-auto">{trendToRows(data.trends.ordersByDay)}</div>
            </Card.Body>
          </Card>

          <Card className="lg:col-span-2">
            <Card.Header><h3 className="text-lg font-semibold">Top Customers/Suppliers</h3></Card.Header>
            <Card.Body>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead>
                    <tr>
                      <th className="px-4 py-2 text-left">Name</th>
                      <th className="px-4 py-2 text-right">Orders</th>
                      <th className="px-4 py-2 text-right">Total Weight</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {data.topParties.map((party) => (
                      <tr key={party.name}>
                        <td className="px-4 py-2">{party.name}</td>
                        <td className="px-4 py-2 text-right">{party.orders}</td>
                        <td className="px-4 py-2 text-right">{party.totalWeight.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card.Body>
          </Card>
        </div>
      );
    }

    if (selectedReport === 'production') {
      return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <Card.Header><h3 className="text-lg font-semibold">Production KPIs</h3></Card.Header>
            <Card.Body>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between"><span>Days Reported</span><Badge variant="primary">{data.production.days}</Badge></div>
                <div className="flex justify-between"><span>Total Pieces</span><span>{data.production.totalPieces.toLocaleString()}</span></div>
                <div className="flex justify-between"><span>Total Weight</span><span>{data.production.totalWeight.toFixed(2)}</span></div>
                <div className="flex justify-between"><span>Avg Efficiency</span><span>{data.production.averageEfficiency.toFixed(2)}%</span></div>
                <div className="flex justify-between"><span>Electricity</span><span>{data.production.electricityConsumption.toFixed(2)}</span></div>
              </div>
            </Card.Body>
          </Card>

          <Card>
            <Card.Header><h3 className="text-lg font-semibold">Production Weight Trend</h3></Card.Header>
            <Card.Body>
              <div className="max-h-64 overflow-y-auto">{trendToRows(data.trends.productionWeightByDay)}</div>
            </Card.Body>
          </Card>
        </div>
      );
    }

    if (selectedReport === 'inventory') {
      return (
        <Card>
          <Card.Header><h3 className="text-lg font-semibold">Inventory Snapshot</h3></Card.Header>
          <Card.Body>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="p-4 bg-gray-50 rounded-lg"><p>Total Items</p><p className="text-xl font-semibold">{data.inventory.totalItems}</p></div>
              <div className="p-4 bg-yellow-50 rounded-lg"><p>Low Stock</p><p className="text-xl font-semibold">{data.inventory.lowStockItems}</p></div>
              <div className="p-4 bg-red-50 rounded-lg"><p>Out of Stock</p><p className="text-xl font-semibold">{data.inventory.outOfStockItems}</p></div>
              <div className="p-4 bg-indigo-50 rounded-lg"><p>Blocked Stock</p><p className="text-xl font-semibold">{data.inventory.blockedStockItems}</p></div>
              <div className="p-4 bg-blue-50 rounded-lg"><p>Total Quantity</p><p className="text-xl font-semibold">{data.inventory.totalQuantity.toFixed(2)}</p></div>
              <div className="p-4 bg-green-50 rounded-lg"><p>Available Quantity</p><p className="text-xl font-semibold">{data.inventory.totalAvailableQuantity.toFixed(2)}</p></div>
            </div>
          </Card.Body>
        </Card>
      );
    }

    if (selectedReport === 'financial') {
      return (
        <Card>
          <Card.Header><h3 className="text-lg font-semibold">Financial Snapshot</h3></Card.Header>
          <Card.Body>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
              <div className="p-4 bg-green-50 rounded-lg"><p>Invoice Amount</p><p className="text-xl font-semibold">₹{data.financial.invoiceAmount.toFixed(2)}</p></div>
              <div className="p-4 bg-blue-50 rounded-lg"><p>Fare Amount</p><p className="text-xl font-semibold">₹{data.financial.fareAmount.toFixed(2)}</p></div>
              <div className="p-4 bg-emerald-50 rounded-lg"><p>Paid Fares</p><p className="text-xl font-semibold">{data.financial.paidFareCount}</p></div>
              <div className="p-4 bg-orange-50 rounded-lg"><p>Unpaid Fares</p><p className="text-xl font-semibold">{data.financial.unpaidFareCount}</p></div>
            </div>
          </Card.Body>
        </Card>
      );
    }

    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <Card.Header><h3 className="text-lg font-semibold">Gate Pass Summary</h3></Card.Header>
          <Card.Body>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span>Total</span><Badge variant="primary">{data.gate.total}</Badge></div>
              {Object.entries(data.gate.statusCounts).map(([status, count]) => (
                <div key={status} className="flex justify-between"><span>{status}</span><span>{count}</span></div>
              ))}
            </div>
          </Card.Body>
        </Card>

        <Card>
          <Card.Header><h3 className="text-lg font-semibold">Store Lifecycle Summary</h3></Card.Header>
          <Card.Body>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span>Total Requests</span><Badge variant="primary">{data.store.total}</Badge></div>
              <div className="flex justify-between"><span>Requested Qty</span><span>{data.store.requestedQuantity.toFixed(2)}</span></div>
              <div className="flex justify-between"><span>Approved Qty</span><span>{data.store.approvedQuantity.toFixed(2)}</span></div>
              <div className="flex justify-between"><span>Returned Qty</span><span>{data.store.returnedQuantity.toFixed(2)}</span></div>
            </div>
          </Card.Body>
        </Card>
      </div>
    );
  }, [data, selectedReport]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Reports & Analytics</h1>
            <p className="text-gray-600 mt-2">Backend-driven KPIs with date filters</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" icon={Download} onClick={() => window.print()}>Print</Button>
          </div>
        </div>

        <Card>
          <Card.Body>
            <div className="flex flex-col lg:flex-row gap-3 lg:items-center">
              <div className="flex items-center gap-2"><Calendar className="h-4 w-4 text-gray-500" /><span className="text-sm">Date Range</span></div>
              <Input type="date" value={dateRange.from} onChange={(e) => setDateRange((p) => ({ ...p, from: e.target.value }))} className="w-auto" />
              <span className="text-gray-500">to</span>
              <Input type="date" value={dateRange.to} onChange={(e) => setDateRange((p) => ({ ...p, to: e.target.value }))} className="w-auto" />
              <div className="ml-auto">
                <Button icon={RefreshCcw} onClick={fetchAnalytics} loading={loading}>Generate Report</Button>
              </div>
            </div>
          </Card.Body>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {reportTypes.map((report) => (
            <button
              key={report.id}
              onClick={() => setSelectedReport(report.id)}
              className={`text-left rounded-lg border p-4 transition ${selectedReport === report.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white hover:shadow-sm'}`}
            >
              <report.icon className="h-5 w-5 text-blue-600 mb-2" />
              <p className="font-medium text-gray-900">{report.title}</p>
            </button>
          ))}
        </div>

        {content}
      </div>
    </DashboardLayout>
  );
};

export default Reports;
