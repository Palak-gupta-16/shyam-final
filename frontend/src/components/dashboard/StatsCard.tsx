import React from 'react';
import { LucideIcon } from 'lucide-react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import Card from '../common/Card';

interface StatsCardProps {
  title: string;
  value: string | number;
  change?: {
    value: number;
    type: 'increase' | 'decrease' | 'neutral';
    label?: string;
  };
  icon: LucideIcon;
  color?: 'primary' | 'success' | 'warning' | 'error' | 'info';
  loading?: boolean;
}

const StatsCard: React.FC<StatsCardProps> = ({
  title,
  value,
  change,
  icon: Icon,
  color = 'primary',
  loading = false,
}) => {
  const colorClasses = {
    primary: {
      bg: 'bg-primary-500',
      text: 'text-primary-600',
      lightBg: 'bg-primary-50',
    },
    success: {
      bg: 'bg-success-500',
      text: 'text-success-600',
      lightBg: 'bg-success-50',
    },
    warning: {
      bg: 'bg-warning-500',
      text: 'text-warning-600',
      lightBg: 'bg-warning-50',
    },
    error: {
      bg: 'bg-error-500',
      text: 'text-error-600',
      lightBg: 'bg-error-50',
    },
    info: {
      bg: 'bg-blue-500',
      text: 'text-blue-600',
      lightBg: 'bg-blue-50',
    },
  };

  const getTrendIcon = (type: 'increase' | 'decrease' | 'neutral') => {
    switch (type) {
      case 'increase':
        return <TrendingUp className="h-4 w-4" />;
      case 'decrease':
        return <TrendingDown className="h-4 w-4" />;
      default:
        return <Minus className="h-4 w-4" />;
    }
  };

  const getTrendColor = (type: 'increase' | 'decrease' | 'neutral') => {
    switch (type) {
      case 'increase':
        return 'text-success-600';
      case 'decrease':
        return 'text-error-600';
      default:
        return 'text-gray-600';
    }
  };

  if (loading) {
    return (
      <Card className="animate-pulse">
        <Card.Body>
          <div className="flex items-center">
            <div className="flex-1">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-8 bg-gray-200 rounded w-1/2 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-1/4"></div>
            </div>
            <div className="h-12 w-12 bg-gray-200 rounded-lg"></div>
          </div>
        </Card.Body>
      </Card>
    );
  }

  return (
    <Card className="hover:shadow-md transition-shadow duration-200">
      <Card.Body>
        <div className="flex items-center">
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">
              {typeof value === 'number' ? value.toLocaleString() : value}
            </p>
            {change && (
              <div className={`flex items-center mt-2 text-sm ${getTrendColor(change.type)}`}>
                {getTrendIcon(change.type)}
                <span className="ml-1">
                  {Math.abs(change.value)}%
                  {change.label && (
                    <span className="text-gray-500 ml-1">{change.label}</span>
                  )}
                </span>
              </div>
            )}
          </div>
          <div className={`p-3 rounded-lg ${colorClasses[color].lightBg}`}>
            <Icon className={`h-6 w-6 ${colorClasses[color].text}`} />
          </div>
        </div>
      </Card.Body>
    </Card>
  );
};

export default StatsCard;
