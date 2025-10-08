import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  Download, 
  Calendar,
  TrendingUp,
  Package,
  Truck,
  Clock,
  DollarSign,
  FileText,
  Filter
} from 'lucide-react';
import DashboardLayout from '../components/layout/DashboardLayout';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import Badge from '../components/common/Badge';

const Reports: React.FC = () => {
  const [selectedReport, setSelectedReport] = useState('orders');
  const [dateRange, setDateRange] = useState({
    from: new Date().toISOString().split('T')[0],
    to: new Date().toISOString().split('T')[0],
  });
  const [loading, setLoading] = useState(false);

  const reportTypes = [
    {
      id: 'orders',
      title: 'Order Reports',
      description: 'Comprehensive order analysis and metrics',
      icon: FileText,
      color: 'blue' as const,
    },
    {
      id: 'production',
      title: 'Production Reports',
      description: 'Mill production and efficiency analysis',
      icon: BarChart3,
      color: 'green' as const,
    },
    {
      id: 'inventory',
      title: 'Inventory Reports',
      description: 'Stock levels and movement analysis',
      icon: Package,
      color: 'yellow' as const,
    },
    {
      id: 'financial',
      title: 'Financial Reports',
      description: 'Revenue and billing analysis',
      icon: DollarSign,
      color: 'purple' as const,
    },
    {
      id: 'operational',
      title: 'Operational Reports',
      description: 'Gate passes and vehicle movement',
      icon: Truck,
      color: 'red' as const,
    },
  ];

  const generateReport = async () => {
    setLoading(true);
    // Simulate report generation
    await new Promise(resolve => setTimeout(resolve, 2000));
    setLoading(false);
  };

  const exportReport = (format: 'pdf' | 'excel') => {
    console.log(`Exporting ${selectedReport} report as ${format}`);
    // Implement export functionality
  };

  const renderReportContent = () => {
    switch (selectedReport) {
      case 'orders':
        return <OrderReportsContent dateRange={dateRange} />;
      case 'production':
        return <ProductionReportsContent dateRange={dateRange} />;
      case 'inventory':
        return <InventoryReportsContent dateRange={dateRange} />;
      case 'financial':
        return <FinancialReportsContent dateRange={dateRange} />;
      case 'operational':
        return <OperationalReportsContent dateRange={dateRange} />;
      default:
        return <OrderReportsContent dateRange={dateRange} />;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Reports & Analytics</h1>
            <p className="text-gray-600 mt-2">Comprehensive business intelligence and reporting</p>
          </div>
          <div className="flex items-center space-x-3">
            <Button
              variant="secondary"
              icon={Download}
              onClick={() => exportReport('excel')}
            >
              Export Excel
            </Button>
            <Button
              variant="secondary"
              icon={Download}
              onClick={() => exportReport('pdf')}
            >
              Export PDF
            </Button>
          </div>
        </div>

        {/* Report Type Selection */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {reportTypes.map((report) => (
            <div 
              key={report.id}
              className={`cursor-pointer transition-all duration-200 ${
                selectedReport === report.id 
                  ? `ring-2 ring-${report.color}-500` 
                  : 'hover:shadow-md'
              }`}
              onClick={() => setSelectedReport(report.id)}
            >
              <Card 
                className={selectedReport === report.id ? `border-${report.color}-200` : ''}
              >
                <Card.Body>
                  <div className="text-center">
                    <div className={`p-3 rounded-lg bg-${report.color}-50 mx-auto w-fit mb-3`}>
                      <report.icon className={`h-6 w-6 text-${report.color}-600`} />
                    </div>
                    <h3 className="font-medium text-gray-900 mb-1">{report.title}</h3>
                    <p className="text-sm text-gray-600">{report.description}</p>
                  </div>
                </Card.Body>
              </Card>
            </div>
          ))}
        </div>

        {/* Date Range and Filters */}
        <Card>
          <Card.Body>
            <div className="flex flex-col lg:flex-row gap-4 items-center">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4 text-gray-500" />
                  <span className="text-sm font-medium text-gray-700">Date Range:</span>
                </div>
                <Input
                  type="date"
                  value={dateRange.from}
                  onChange={(e) => setDateRange(prev => ({ ...prev, from: e.target.value }))}
                  className="w-auto"
                />
                <span className="text-gray-500">to</span>
                <Input
                  type="date"
                  value={dateRange.to}
                  onChange={(e) => setDateRange(prev => ({ ...prev, to: e.target.value }))}
                  className="w-auto"
                />
              </div>
              <div className="flex items-center space-x-3 ml-auto">
                <Button
                  variant="secondary"
                  icon={Filter}
                  size="sm"
                >
                  More Filters
                </Button>
                <Button
                  onClick={generateReport}
                  loading={loading}
                  icon={BarChart3}
                >
                  Generate Report
                </Button>
              </div>
            </div>
          </Card.Body>
        </Card>

        {/* Report Content */}
        {renderReportContent()}
      </div>
    </DashboardLayout>
  );
};

// Order Reports Component
const OrderReportsContent: React.FC<{ dateRange: any }> = ({ dateRange }) => (
  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
    <Card>
      <Card.Header>
        <h3 className="text-lg font-medium text-gray-900">Order Summary</h3>
      </Card.Header>
      <Card.Body>
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Total Orders</span>
            <Badge variant="primary" size="sm">156</Badge>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Dispatch Orders</span>
            <Badge variant="success" size="sm">89</Badge>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Purchase Orders</span>
            <Badge variant="warning" size="sm">67</Badge>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Completed</span>
            <Badge variant="success" size="sm">134</Badge>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Pending</span>
            <Badge variant="warning" size="sm">22</Badge>
          </div>
        </div>
      </Card.Body>
    </Card>

    <Card>
      <Card.Header>
        <h3 className="text-lg font-medium text-gray-900">Order Trends</h3>
      </Card.Header>
      <Card.Body>
        <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
          <div className="text-center">
            <TrendingUp className="h-12 w-12 mx-auto text-gray-400 mb-3" />
            <p className="text-gray-600">Order trends chart</p>
            <p className="text-sm text-gray-500 mt-1">
              Interactive chart showing order volume over time
            </p>
          </div>
        </div>
      </Card.Body>
    </Card>

    <Card className="lg:col-span-2">
      <Card.Header>
        <h3 className="text-lg font-medium text-gray-900">Top Customers/Suppliers</h3>
      </Card.Header>
      <Card.Body>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Orders
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Volume (MT)
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  ABC Steel Industries
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">23</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">456.7</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <Badge variant="success" size="sm">Customer</Badge>
                </td>
              </tr>
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  XYZ Raw Materials
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">18</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">234.5</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <Badge variant="warning" size="sm">Supplier</Badge>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card.Body>
    </Card>
  </div>
);

// Production Reports Component
const ProductionReportsContent: React.FC<{ dateRange: any }> = ({ dateRange }) => (
  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
    <Card>
      <Card.Header>
        <h3 className="text-lg font-medium text-gray-900">Production Metrics</h3>
      </Card.Header>
      <Card.Body>
        <div className="space-y-4">
          <div className="text-center">
            <div className="text-3xl font-bold text-green-600">2,456</div>
            <div className="text-sm text-gray-600">Total Pieces Produced</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-600">94.2%</div>
            <div className="text-sm text-gray-600">Average Efficiency</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-yellow-600">152</div>
            <div className="text-sm text-gray-600">Total Miss Rolls</div>
          </div>
        </div>
      </Card.Body>
    </Card>

    <Card className="lg:col-span-2">
      <Card.Header>
        <h3 className="text-lg font-medium text-gray-900">Production Timeline</h3>
      </Card.Header>
      <Card.Body>
        <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
          <div className="text-center">
            <Clock className="h-12 w-12 mx-auto text-gray-400 mb-3" />
            <p className="text-gray-600">Production timeline chart</p>
            <p className="text-sm text-gray-500 mt-1">
              Hourly production data visualization
            </p>
          </div>
        </div>
      </Card.Body>
    </Card>
  </div>
);

// Inventory Reports Component
const InventoryReportsContent: React.FC<{ dateRange: any }> = ({ dateRange }) => (
  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
    <Card>
      <Card.Header>
        <h3 className="text-lg font-medium text-gray-900">Inventory Status</h3>
      </Card.Header>
      <Card.Body>
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Total Items</span>
            <Badge variant="primary" size="sm">245</Badge>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Low Stock Items</span>
            <Badge variant="warning" size="sm">12</Badge>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Out of Stock</span>
            <Badge variant="error" size="sm">3</Badge>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Total Value</span>
            <span className="font-medium">₹2,45,67,890</span>
          </div>
        </div>
      </Card.Body>
    </Card>

    <Card>
      <Card.Header>
        <h3 className="text-lg font-medium text-gray-900">Stock Movement</h3>
      </Card.Header>
      <Card.Body>
        <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
          <div className="text-center">
            <Package className="h-12 w-12 mx-auto text-gray-400 mb-3" />
            <p className="text-gray-600">Stock movement chart</p>
            <p className="text-sm text-gray-500 mt-1">
              Inventory in/out trends over time
            </p>
          </div>
        </div>
      </Card.Body>
    </Card>
  </div>
);

// Financial Reports Component
const FinancialReportsContent: React.FC<{ dateRange: any }> = ({ dateRange }) => (
  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
    <Card>
      <Card.Header>
        <h3 className="text-lg font-medium text-gray-900">Revenue Summary</h3>
      </Card.Header>
      <Card.Body>
        <div className="space-y-4">
          <div className="text-center">
            <div className="text-3xl font-bold text-green-600">₹45.6L</div>
            <div className="text-sm text-gray-600">Total Revenue</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-600">₹38.2L</div>
            <div className="text-sm text-gray-600">Net Revenue</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-purple-600">156</div>
            <div className="text-sm text-gray-600">Invoices Generated</div>
          </div>
        </div>
      </Card.Body>
    </Card>

    <Card className="lg:col-span-2">
      <Card.Header>
        <h3 className="text-lg font-medium text-gray-900">Revenue Trend</h3>
      </Card.Header>
      <Card.Body>
        <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
          <div className="text-center">
            <DollarSign className="h-12 w-12 mx-auto text-gray-400 mb-3" />
            <p className="text-gray-600">Revenue trend chart</p>
            <p className="text-sm text-gray-500 mt-1">
              Monthly revenue analysis and forecasting
            </p>
          </div>
        </div>
      </Card.Body>
    </Card>
  </div>
);

// Operational Reports Component
const OperationalReportsContent: React.FC<{ dateRange: any }> = ({ dateRange }) => (
  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
    <Card>
      <Card.Header>
        <h3 className="text-lg font-medium text-gray-900">Gate Pass Summary</h3>
      </Card.Header>
      <Card.Body>
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Total Requests</span>
            <Badge variant="primary" size="sm">89</Badge>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Approved</span>
            <Badge variant="success" size="sm">76</Badge>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Pending</span>
            <Badge variant="warning" size="sm">8</Badge>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Rejected</span>
            <Badge variant="error" size="sm">5</Badge>
          </div>
        </div>
      </Card.Body>
    </Card>

    <Card>
      <Card.Header>
        <h3 className="text-lg font-medium text-gray-900">Vehicle Movement</h3>
      </Card.Header>
      <Card.Body>
        <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
          <div className="text-center">
            <Truck className="h-12 w-12 mx-auto text-gray-400 mb-3" />
            <p className="text-gray-600">Vehicle movement chart</p>
            <p className="text-sm text-gray-500 mt-1">
              Daily vehicle entry/exit patterns
            </p>
          </div>
        </div>
      </Card.Body>
    </Card>
  </div>
);

export default Reports;
