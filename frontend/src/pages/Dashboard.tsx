import React, { useState, useEffect, useCallback } from 'react';
import { 
  FileText, 
  Package, 
  Shield, 
  Factory, 
  Clock,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import DashboardLayout from '../components/layout/DashboardLayout';
import StatsCard from '../components/dashboard/StatsCard';
import Card from '../components/common/Card';
import Badge from '../components/common/Badge';
import { useAuth } from '../context/AuthContext';
import { ordersAPI, inventoryAPI, gatePassAPI } from '../services/api';
import { Order, GatePass } from '../types';

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalOrders: 0,
    pendingOrders: 0,
    completedOrders: 0,
    totalInventory: 0,
    lowStockItems: 0,
    pendingGatePasses: 0,
  });
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [recentGatePasses, setRecentGatePasses] = useState<GatePass[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      
      // Fetch stats based on user role
      const promises = [];
      
      // Orders (if user has access)
      const hasOrderAccess = user?.role && ['General_Manager', 'Director', 'Store_Keeper', 'Purchasing', 'Guard', 'Weighbridge', 'Loading', 'Accounting'].includes(user.role);
      const hasInventoryAccess = user?.role && ['General_Manager', 'Director', 'Store_Keeper'].includes(user.role);
      const hasGatePassAccess = user?.role && ['Guard', 'Director', 'General_Manager'].includes(user.role);

      if (hasOrderAccess) {
        promises.push(ordersAPI.getOrders({ page: 1, perPage: 10 }));
      }
      
      if (hasInventoryAccess) {
        promises.push(inventoryAPI.getInventory());
        promises.push(inventoryAPI.getLowStockItems());
      }
      
      if (hasGatePassAccess) {
        promises.push(gatePassAPI.getGatePasses({ page: 1, perPage: 5 }));
        promises.push(gatePassAPI.getPendingGatePasses());
      }

      const results = await Promise.allSettled(promises);
      
      // Process results based on what was fetched
      let resultIndex = 0;
      
      // Orders
      if (hasOrderAccess) {
        const ordersResult = results[resultIndex++];
        if (ordersResult.status === 'fulfilled') {
          const ordersData = ordersResult.value as any;
          setRecentOrders(ordersData.orders || []);
          setStats(prev => ({
            ...prev,
            totalOrders: ordersData.pagination?.total || 0,
            pendingOrders: (ordersData.orders || []).filter((order: Order) => 
              order.status.includes('pending') || order.status.includes('inside_factory')
            ).length,
            completedOrders: (ordersData.orders || []).filter((order: Order) => 
              order.status === 'completed'
            ).length,
          }));
        }
      }
      
      // Inventory
      if (hasInventoryAccess) {
        const inventoryResult = results[resultIndex++];
        const lowStockResult = results[resultIndex++];
        
        if (inventoryResult.status === 'fulfilled') {
          const inventoryData = inventoryResult.value as any;
          setStats(prev => ({
            ...prev,
            totalInventory: (inventoryData || []).length,
          }));
        }
        
        if (lowStockResult.status === 'fulfilled') {
          const lowStockData = lowStockResult.value as any;
          setStats(prev => ({
            ...prev,
            lowStockItems: (lowStockData.items || []).length,
          }));
        }
      }
      
      // Gate passes
      if (hasGatePassAccess) {
        const gatePassesResult = results[resultIndex++];
        const pendingGatePassesResult = results[resultIndex++];
        
        if (gatePassesResult.status === 'fulfilled') {
          const gatePassesData = gatePassesResult.value as any;
          setRecentGatePasses(gatePassesData.gatePasses || []);
        }
        
        if (pendingGatePassesResult.status === 'fulfilled') {
          const pendingData = pendingGatePassesResult.value as any;
          setStats(prev => ({
            ...prev,
            pendingGatePasses: (pendingData.gatePasses || []).length,
          }));
        }
      }
      
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.role]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const getOrderStatusColor = (status: string) => {
    if (status === 'completed') return 'success';
    if (status.includes('pending')) return 'warning';
    if (status.includes('ready')) return 'info';
    return 'primary';
  };

  const getGatePassStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'success';
      case 'rejected': return 'error';
      default: return 'warning';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Welcome back, {user?.alias || user?.name}!
          </h1>
          <p className="text-gray-600 mt-2">
            Here's what's happening in your factory today.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatsCard
            title="Total Orders"
            value={stats.totalOrders}
            icon={FileText}
            color="primary"
            loading={loading}
            change={{
              value: 12,
              type: 'increase',
              label: 'from last week'
            }}
          />
          <StatsCard
            title="Pending Orders"
            value={stats.pendingOrders}
            icon={Clock}
            color="warning"
            loading={loading}
          />
          <StatsCard
            title="Completed Orders"
            value={stats.completedOrders}
            icon={CheckCircle}
            color="success"
            loading={loading}
          />
          <StatsCard
            title="Low Stock Items"
            value={stats.lowStockItems}
            icon={AlertCircle}
            color="error"
            loading={loading}
          />
        </div>

        {/* Recent Activity Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Orders */}
          {user?.role && ['General_Manager', 'Director', 'Store_Keeper', 'Purchasing', 'Guard', 'Weighbridge', 'Loading', 'Accounting'].includes(user.role) && (
            <Card>
              <Card.Header>
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium text-gray-900">Recent Orders</h3>
                  <FileText className="h-5 w-5 text-gray-400" />
                </div>
              </Card.Header>
              <Card.Body padding="none">
                {recentOrders.length > 0 ? (
                  <div className="divide-y divide-gray-200">
                    {recentOrders.slice(0, 5).map((order) => (
                      <div key={order._id} className="p-4 hover:bg-gray-50">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900">
                              Order #{order.orderNumber}
                            </p>
                            <p className="text-xs text-gray-500">
                              {order.customerOrSupplier} • {order.type}
                            </p>
                            <p className="text-xs text-gray-400 mt-1">
                              {formatDate(order.createdAt)}
                            </p>
                          </div>
                          <Badge 
                            variant={getOrderStatusColor(order.status) as any}
                            size="sm"
                          >
                            {order.status.replace(/_/g, ' ')}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 text-center text-gray-500">
                    <FileText className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                    <p>No recent orders</p>
                  </div>
                )}
              </Card.Body>
            </Card>
          )}

          {/* Recent Gate Passes */}
          {user?.role && ['Guard', 'Director', 'General_Manager'].includes(user.role) && (
            <Card>
              <Card.Header>
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium text-gray-900">Recent Gate Passes</h3>
                  <Shield className="h-5 w-5 text-gray-400" />
                </div>
              </Card.Header>
              <Card.Body padding="none">
                {recentGatePasses.length > 0 ? (
                  <div className="divide-y divide-gray-200">
                    {recentGatePasses.slice(0, 5).map((gatePass) => (
                      <div key={gatePass._id} className="p-4 hover:bg-gray-50">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900">
                              {gatePass.vehicle.number}
                            </p>
                            <p className="text-xs text-gray-500">
                              {gatePass.vehicle.driverName} • {gatePass.purpose}
                            </p>
                            <p className="text-xs text-gray-400 mt-1">
                              {formatDate(gatePass.createdAt)}
                            </p>
                          </div>
                          <Badge 
                            variant={getGatePassStatusColor(gatePass.status) as any}
                            size="sm"
                          >
                            {gatePass.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 text-center text-gray-500">
                    <Shield className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                    <p>No recent gate passes</p>
                  </div>
                )}
              </Card.Body>
            </Card>
          )}
        </div>

        {/* Quick Actions */}
        <Card>
          <Card.Header>
            <h3 className="text-lg font-medium text-gray-900">Quick Actions</h3>
          </Card.Header>
          <Card.Body>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {user?.role && ['Store_Keeper', 'Purchasing', 'General_Manager', 'Director'].includes(user.role) && (
                <button className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-center">
                  <FileText className="h-8 w-8 mx-auto text-primary-600 mb-2" />
                  <span className="text-sm font-medium text-gray-900">New Order</span>
                </button>
              )}
              
              {user?.role && ['Guard', 'Director', 'General_Manager'].includes(user.role) && (
                <button className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-center">
                  <Shield className="h-8 w-8 mx-auto text-success-600 mb-2" />
                  <span className="text-sm font-medium text-gray-900">Gate Pass</span>
                </button>
              )}
              
              {user?.role && ['General_Manager', 'Director', 'Store_Keeper'].includes(user.role) && (
                <button className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-center">
                  <Package className="h-8 w-8 mx-auto text-warning-600 mb-2" />
                  <span className="text-sm font-medium text-gray-900">Add Inventory</span>
                </button>
              )}
              
              {user?.role && ['Mill_Supervisor', 'General_Manager', 'Director'].includes(user.role) && (
                <button className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-center">
                  <Factory className="h-8 w-8 mx-auto text-info-600 mb-2" />
                  <span className="text-sm font-medium text-gray-900">Mill Report</span>
                </button>
              )}
            </div>
          </Card.Body>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
