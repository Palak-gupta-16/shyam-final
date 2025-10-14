import React from 'react';
import Badge from '../common/Badge';
import { OrderStatus } from '../../types';

interface OrderStatusBadgeProps {
  status: OrderStatus;
  size?: 'sm' | 'md' | 'lg';
}

const OrderStatusBadge: React.FC<OrderStatusBadgeProps> = ({ status, size = 'md' }) => {
  const getStatusConfig = (status: OrderStatus) => {
    const configs = {
      'draft': { 
        label: 'Draft', 
        variant: 'secondary' as const,
        dot: true 
      },
      'pending_dispatch_approval': { 
        label: 'Pending Dispatch Approval', 
        variant: 'warning' as const,
        dot: true 
      },
      'pending_guard_approval': { 
        label: 'Pending Guard Approval', 
        variant: 'warning' as const,
        dot: true 
      },
      'inside_factory_pending_empty_weight': { 
        label: 'Pending Empty Weight', 
        variant: 'info' as const,
        dot: true 
      },
      'inside_factory_pending_loading': { 
        label: 'Pending Loading', 
        variant: 'info' as const,
        dot: true 
      },
      'inside_factory_pending_final_weight': { 
        label: 'Pending Final Weight', 
        variant: 'info' as const,
        dot: true 
      },
      'ready_for_billing': { 
        label: 'Ready for Billing', 
        variant: 'primary' as const,
        dot: true 
      },
      'ready_for_dispatch': { 
        label: 'Ready for Dispatch', 
        variant: 'primary' as const,
        dot: true 
      },
      'inside_factory_pending_empty_weight_purchase': { 
        label: 'Pending Empty Weight', 
        variant: 'info' as const,
        dot: true 
      },
      'inside_factory_pending_unloading': { 
        label: 'Pending Unloading', 
        variant: 'info' as const,
        dot: true 
      },
      'inside_factory_pending_unloaded': { 
        label: 'Pending Unloaded', 
        variant: 'info' as const,
        dot: true 
      },
      'inside_factory_pending_final_weight_purchase': { 
        label: 'Pending Final Weight', 
        variant: 'info' as const,
        dot: true 
      },
      'ready_for_billing_purchase': { 
        label: 'Ready for Billing', 
        variant: 'primary' as const,
        dot: true 
      },
      'ready_for_exit_purchase': { 
        label: 'Ready for Exit', 
        variant: 'primary' as const,
        dot: true 
      },
      'completed': { 
        label: 'Completed', 
        variant: 'success' as const,
        dot: false 
      },
    };

    return configs[status] || { 
      label: status.replace(/_/g, ' '), 
      variant: 'secondary' as const,
      dot: false 
    };
  };

  const config = getStatusConfig(status);

  return (
    <Badge 
      variant={config.variant} 
      size={size}
      dot={config.dot}
    >
      {config.label}
    </Badge>
  );
};

export default OrderStatusBadge;
