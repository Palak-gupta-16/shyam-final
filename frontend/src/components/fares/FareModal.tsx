import React, { useState, useEffect } from 'react';
import { DollarSign, Truck, User } from 'lucide-react';
import Modal from '../common/Modal';
import Button from '../common/Button';
import Input from '../common/Input';
import { Order, Fare } from '../../types';
import { fareAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

interface FareModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: Order | null;
  onSuccess: () => void;
  existingFare?: Fare | null;
}

const FareModal: React.FC<FareModalProps> = ({
  isOpen,
  onClose,
  order,
  onSuccess,
  existingFare
}) => {
  const [formData, setFormData] = useState({
    fareType: 'given_by_us' as 'given_by_us' | 'given_by_other_party',
    amount: 0,
    notes: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user, hasRole } = useAuth();

  useEffect(() => {
    if (existingFare) {
      setFormData({
        fareType: existingFare.fareType,
        amount: existingFare.amount,
        notes: existingFare.notes || ''
      });
    } else {
      setFormData({
        fareType: 'given_by_us',
        amount: 0,
        notes: ''
      });
    }
    setError(null); // Clear error when modal opens
  }, [existingFare, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!order) return;

    console.log('Submitting fare:', { orderId: order._id, formData, userRole: user?.role });

    try {
      setLoading(true);
      setError(null);
      
      if (existingFare) {
        console.log('Updating existing fare...');
        await fareAPI.updateFare(order._id, formData);
      } else {
        console.log('Recording new fare...');
        await fareAPI.recordFare(order._id, formData);
      }
      
      console.log('Fare operation successful');
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error recording/updating fare:', error);
      console.log('Error details:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message
      });
      
      if (error.response?.status === 401) {
        setError('You are not authorized to perform this action. Please check your permissions.');
      } else if (error.response?.status === 403) {
        setError('Access denied. You need Accounting or Director role to record fares.');
      } else if (error.response?.data?.message) {
        setError(error.response.data.message);
      } else {
        setError('An error occurred while recording the fare. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (!order) return null;

  // Check if user has required role
  const canRecordFare = hasRole(['Accounting', 'Director']);
  
  if (!canRecordFare) {
    return (
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Access Denied"
        size="lg"
      >
        <div className="text-center py-8">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <div className="flex items-center justify-center mb-4">
              <svg className="h-12 w-12 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 19.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-red-900 mb-2">Access Denied</h3>
            <p className="text-red-700 mb-4">
              You need <strong>Accounting</strong> or <strong>Director</strong> role to record vehicle fares.
            </p>
            <p className="text-sm text-red-600">
              Your current role: <strong>{user?.role || 'Unknown'}</strong>
            </p>
            <div className="mt-6">
              <button
                onClick={onClose}
                className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={existingFare ? 'Update Vehicle Fare' : 'Record Vehicle Fare'}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Order Info */}
        <div className="bg-blue-50 p-4 rounded-lg">
          <div className="flex items-center space-x-3 mb-3">
            <DollarSign className="h-5 w-5 text-blue-600" />
            <h4 className="font-medium text-blue-900">
              {existingFare ? 'Update' : 'Record'} Fare for Order #{order.orderNumber}
            </h4>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center space-x-2">
              <Truck className="h-4 w-4 text-blue-600" />
              <span className="text-blue-700">
                Vehicle: {order.vehicle?.number || 'N/A'}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <User className="h-4 w-4 text-blue-600" />
              <span className="text-blue-700">
                Driver: {order.vehicle?.driverName || 'N/A'}
              </span>
            </div>
          </div>
          <div className="mt-2 text-sm text-blue-700">
            Customer/Supplier: {order.customerOrSupplier}
          </div>
        </div>

        {/* Fare Type Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Fare Type *
          </label>
          <div className="grid grid-cols-1 gap-3">
            <label className="flex items-center p-4 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
              <input
                type="radio"
                name="fareType"
                value="given_by_us"
                checked={formData.fareType === 'given_by_us'}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  fareType: e.target.value as 'given_by_us' | 'given_by_other_party' 
                }))}
                className="mr-3"
              />
              <div>
                <div className="font-medium text-gray-900">Fare Given by Us</div>
                <div className="text-sm text-gray-500">
                  We are paying the transportation fare
                </div>
              </div>
            </label>
            
            <label className="flex items-center p-4 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
              <input
                type="radio"
                name="fareType"
                value="given_by_other_party"
                checked={formData.fareType === 'given_by_other_party'}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  fareType: e.target.value as 'given_by_us' | 'given_by_other_party' 
                }))}
                className="mr-3"
              />
              <div>
                <div className="font-medium text-gray-900">Fare Given by Other Party</div>
                <div className="text-sm text-gray-500">
                  Customer/Supplier is paying the transportation fare
                </div>
              </div>
            </label>
          </div>
        </div>

        {/* Amount */}
        <Input
          label="Fare Amount (₹) *"
          type="number"
          min="0"
          step="1"
          value={formData.amount}
          onChange={(e) => setFormData(prev => ({ 
            ...prev, 
            amount: Number(e.target.value) 
          }))}
          required
          placeholder="Enter fare amount"
        />

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Notes (Optional)
          </label>
          <textarea
            value={formData.notes}
            onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
            placeholder="Any additional notes about the fare..."
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end space-x-3 pt-4 border-t">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={loading}>
            {existingFare ? 'Update' : 'Record'} Fare
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default FareModal;