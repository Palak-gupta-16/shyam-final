import React from 'react';
import { Edit, Trash2, DollarSign, Truck, User, Calendar } from 'lucide-react';
import Card from '../common/Card';
import Button from '../common/Button';
import Badge from '../common/Badge';
import { Fare } from '../../types';

interface FareTableProps {
  fares: Fare[];
  loading: boolean;
  onEdit: (fare: Fare) => void;
  onDelete: (fare: Fare) => void;
}

const FareTable: React.FC<FareTableProps> = ({
  fares,
  loading,
  onEdit,
  onDelete
}) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getFareTypeBadge = (fareType: string) => {
    return fareType === 'given_by_us' 
      ? <Badge variant="primary" size="sm">Given by Us</Badge>
      : <Badge variant="warning" size="sm">Given by Other Party</Badge>;
  };

  if (loading) {
    return (
      <Card>
        <Card.Body>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2 text-gray-600">Loading fares...</span>
          </div>
        </Card.Body>
      </Card>
    );
  }

  if (fares.length === 0) {
    return (
      <Card>
        <Card.Body>
          <div className="text-center py-8">
            <DollarSign className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Fares Found</h3>
            <p className="text-gray-500">No fare records match your current filters.</p>
          </div>
        </Card.Body>
      </Card>
    );
  }

  return (
    <Card>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Order Details
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Vehicle Info
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Fare Details
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Recorded By
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {fares.map((fare) => (
              <tr key={fare._id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      Order #{fare.orderNumber}
                    </div>
                    <div className="text-sm text-gray-500">
                      {fare.customerOrSupplier}
                    </div>
                  </div>
                </td>
                
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-start space-x-3">
                    <div className="p-2 bg-blue-50 rounded-lg">
                      <Truck className="h-4 w-4 text-blue-600" />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {fare.vehicleNumber}
                      </div>
                      <div className="text-sm text-gray-500 flex items-center">
                        <User className="h-3 w-3 mr-1" />
                        {fare.driverName}
                      </div>
                    </div>
                  </div>
                </td>
                
                <td className="px-6 py-4 whitespace-nowrap">
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      ₹{fare.amount.toLocaleString()}
                    </div>
                    <div className="mt-1">
                      {getFareTypeBadge(fare.fareType)}
                    </div>
                    {fare.notes && (
                      <div className="text-xs text-gray-500 mt-1 max-w-xs truncate">
                        {fare.notes}
                      </div>
                    )}
                  </div>
                </td>
                
                <td className="px-6 py-4 whitespace-nowrap">
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      {fare.recordedBy.name}
                    </div>
                    <div className="text-sm text-gray-500 flex items-center">
                      <Calendar className="h-3 w-3 mr-1" />
                      {formatDate(fare.recordedAt)}
                    </div>
                  </div>
                </td>
                
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <div className="flex space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      icon={Edit}
                      onClick={() => onEdit(fare)}
                      title="Edit fare"
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      icon={Trash2}
                      onClick={() => onDelete(fare)}
                      className="text-red-600 hover:text-red-700"
                      title="Delete fare"
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
};

export default FareTable;