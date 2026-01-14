import React from 'react';
import { Calendar, User, Truck, Package, Scale, Receipt } from 'lucide-react';
import { Order } from '../../types';
import Card from '../common/Card';
import Badge from '../common/Badge';
import Button from '../common/Button';
import OrderStatusBadge from './OrderStatusBadge';
import { useAuth } from '../../context/AuthContext';

interface OrderCardProps {
  order: Order;
  onActionClick?: (action: string, orderId: string) => void;
  showActions?: boolean;
}

const OrderCard: React.FC<OrderCardProps> = ({ 
  order, 
  onActionClick, 
  showActions = true 
}) => {
  const { hasRole } = useAuth();

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getAvailableActions = (status: string, orderType: string) => {
    const actions: Array<{ label: string; action: string; variant: string }> = [];

    // If order is blocked, no actions should be available
    if (order.isBlocked) {
      return actions;
    }

    // Role-based action visibility
    const canApproveEntry = hasRole(['Guard', 'Director']);
    const canRecordWeight = hasRole(['Weighbridge', 'Director']);
    const canManageLoading = hasRole(['Loading', 'Director']);
    const canManageUnloading = hasRole(['Unloading', 'Director']);
    const canGenerateInvoice = hasRole(['Accounting', 'Director']);
    const canSignalReady =
      hasRole(['Weighbridge', 'General_Manager', 'Director']) ||
      (orderType === 'dispatch' && hasRole(['Loading'])) ||
      (orderType === 'purchase' && hasRole(['Unloading']));

    // Check history for specific actions
    const isReadyForLoading = order.history.some((h) => h.note === 'Ready for loading signalled');
    const isLoadingAccepted = order.history.some((h) => h.note === 'Loading accepted by supervisor');
    const isReadyForUnloading = order.history.some((h) => h.note === 'Ready for unloading signalled');
    const isUnloadingAccepted = order.history.some((h) => h.note === 'Unloading accepted by supervisor');

    switch (status) {
      case 'pending_guard_approval':
        if (canApproveEntry) {
          actions.push({ label: 'Approve Entry', action: 'guard-approve', variant: 'success' });
        }
        break;
      case 'inside_factory_pending_empty_weight':
      case 'inside_factory_pending_empty_weight_purchase':
        if (canRecordWeight) {
          actions.push({ label: 'Record Empty Weight', action: 'empty-weight', variant: 'primary' });
        }
        break;
      case 'inside_factory_pending_loading':
        if (canSignalReady && orderType === 'dispatch' && !isReadyForLoading) {
          actions.push({ label: 'Ready for Loading', action: 'ready-loading', variant: 'primary' });
        }
        if (canManageLoading && orderType === 'dispatch' && isReadyForLoading && !isLoadingAccepted) {
          actions.push({ label: 'Accept Loading', action: 'accept-loading', variant: 'primary' });
        }
        if (canManageLoading && orderType === 'dispatch' && isReadyForLoading && isLoadingAccepted) {
          actions.push({ label: 'Complete Loading', action: 'complete-loading', variant: 'success' });
        }
        break;
      case 'inside_factory_pending_unloading':
        if (canSignalReady && orderType === 'purchase' && !isReadyForUnloading) {
          actions.push({ label: 'Ready for Unloading', action: 'ready-unloading', variant: 'primary' });
        }
        if (canManageUnloading && orderType === 'purchase' && isReadyForUnloading && !isUnloadingAccepted) {
          actions.push({ label: 'Accept Unloading', action: 'accept-unloading', variant: 'primary' });
        }
        if (canManageUnloading && orderType === 'purchase' && isReadyForUnloading && isUnloadingAccepted) {
          actions.push({ label: 'Complete Unloading', action: 'unloading-complete', variant: 'success' });
        }
        break;
      case 'inside_factory_pending_final_weight':
      case 'inside_factory_pending_final_weight_purchase':
        if (canRecordWeight) {
          actions.push({ label: 'Record Final Weight', action: 'final-weight', variant: 'primary' });
        }
        break;
      case 'ready_for_billing':
      case 'ready_for_billing_purchase':
        if (canGenerateInvoice) {
          actions.push({ label: 'Generate Invoice', action: 'generate-invoice', variant: 'primary' });
        }
        break;
      case 'ready_for_dispatch':
      case 'ready_for_exit_purchase':
        if (canApproveEntry) {
          actions.push({ label: 'Mark Exit', action: 'exit', variant: 'success' });
        }
        break;
    }

    return actions;
  };

  const availableActions = getAvailableActions(order.status, order.type);

  return (
    <Card hover className="transition-all duration-200">
      <Card.Body>
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Order #{order.orderNumber}
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                {order.customerOrSupplier}
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant={order.type === 'dispatch' ? 'primary' : 'warning'}>
                {order.type}
              </Badge>
              <OrderStatusBadge status={order.status} />
            </div>
          </div>

          {/* Blocked Order Warning */}
          {order.isBlocked && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                <span className="text-red-800 font-medium text-sm">Order Blocked</span>
              </div>
              {order.blockedReason && (
                <p className="text-red-700 text-sm">{order.blockedReason}</p>
              )}
              {order.blockedAt && (
                <p className="text-red-600 text-xs mt-1">
                  Blocked on: {new Date(order.blockedAt).toLocaleDateString()}
                </p>
              )}
              {order.priority && (
                <Badge variant="error" className="mt-2">
                  Priority: {order.priority}
                </Badge>
              )}
            </div>
          )}

          {/* Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Vehicle Info */}
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-50 rounded-lg">
                <Truck className="h-4 w-4 text-blue-600" />
              </div>
              <div className="flex-1">
                {order.vehicle?.number ? (
                  <>
                    <p className="text-sm font-medium text-gray-900">
                      {order.vehicle.number}
                    </p>
                    <p className="text-xs text-gray-500">
                      Driver: {order.vehicle.driverName}
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-sm font-medium text-gray-400 italic">
                      No vehicle added
                    </p>
                    {hasRole(['Guard', 'Director']) && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => onActionClick?.('add-vehicle', order._id)}
                        className="mt-1"
                      >
                        Add Vehicle Details
                      </Button>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Products */}
            {hasRole(['Store_Keeper', 'Purchasing', 'General_Manager', 'Director', 'Unloading', 'Loading']) && (
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-green-50 rounded-lg">
                  <Package className="h-4 w-4 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {order.products.length} Products
                  </p>
                  <p className="text-xs text-gray-500">
                    {order.products[0]?.name}
                    {order.products.length > 1 && ` +${order.products.length - 1} more`}
                  </p>
                </div>
              </div>
            )}

            {/* Weights */}
            {hasRole(['Store_Keeper', 'Purchasing', 'General_Manager', 'Director', 'Unloading', 'Loading', 'Weighbridge']) && order.weights && (
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-purple-50 rounded-lg">
                  <Scale className="h-4 w-4 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {order.netWeight ? `${order.netWeight} kg` : 'Weighing'}
                  </p>
                  <p className="text-xs text-gray-500">
                    {order.weights.emptyWeight && `Empty: ${order.weights.emptyWeight}kg`}
                    {order.weights.finalWeight && ` | Final: ${order.weights.finalWeight}kg`}
                  </p>
                </div>
              </div>
            )}

            {/* Invoice */}
            {hasRole(['General_Manager', 'Director', 'Accounting']) && order.invoice && (
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-yellow-50 rounded-lg">
                  <Receipt className="h-4 w-4 text-yellow-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    Bill #{order.invoice.billNumber}
                  </p>
                  <p className="text-xs text-gray-500">
                    ₹{order.invoice.amount?.toLocaleString()}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Timeline */}
          <div className="border-t pt-4">
            <div className="flex items-center space-x-3 text-sm text-gray-500">
              <Calendar className="h-4 w-4" />
              <span>Created: {formatDate(order.createdAt)}</span>
              {order.history.length > 1 && (
                <>
                  <span>•</span>
                  <span>
                    Last updated: {formatDate(order.history[order.history.length - 1].at)}
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Actions */}
          {showActions && availableActions.length > 0 && (
            <div className="border-t pt-4">
              <div className="flex flex-wrap gap-2">
                {availableActions.map((action) => (
                  <Button
                    key={action.action}
                    variant={action.variant as any}
                    size="sm"
                    onClick={() => onActionClick?.(action.action, order._id)}
                  >
                    {action.label}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </div>
      </Card.Body>
    </Card>
  );
};

export default OrderCard;
