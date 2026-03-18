import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, Package } from 'lucide-react';
import Modal from '../common/Modal';
import Button from '../common/Button';
import Input from '../common/Input';
import { Order } from '../../types';
import LoadingDetailsForm from './LoadingDetailsForm';
import {
  LoadingFormState,
  buildLoadingPayload,
  createInitialLoadingFormState
} from '../../utils/loading';

interface OrderActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: Order | null;
  actionType: string;
  onExecute: (data: any) => Promise<void> | void;
}

const OrderActionModal: React.FC<OrderActionModalProps> = ({
  isOpen,
  onClose,
  order,
  actionType,
  onExecute
}) => {
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(false);
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const [loadingFormState, setLoadingFormState] = useState<LoadingFormState | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setFormData({});
      setFormErrors([]);
      setLoadingFormState(null);
      return;
    }

    setFormErrors([]);
    setFormData({});

    if (order && actionType === 'complete-loading') {
      setLoadingFormState(createInitialLoadingFormState(order));
      return;
    }

    if (order && actionType === 'add-fare') {
      setFormData({
        fareAmount: order.invoice?.fare?.amount ?? '',
        paidBy: order.invoice?.fare?.paidBy ?? '',
        paymentStatus: order.invoice?.fare?.paymentStatus ?? 'unpaid',
        fareNotes: order.invoice?.fare?.notes ?? ''
      });
      setLoadingFormState(null);
    } else {
      setLoadingFormState(null);
    }
  }, [isOpen, actionType, order]);

  const recordedSummary = useMemo(() => {
    if (!order || !loadingFormState) {
      return { bundles: 0, weight: 0 };
    }

    const bundles = loadingFormState.productLoads.reduce((sum, load) => sum + load.bundleDetails.length, 0);
    const weight = loadingFormState.productLoads.reduce((sum, load) => {
      const loadWeight = load.bundleDetails.reduce((inner, bundle) => {
        const weightValue = Number(bundle.weight);
        return Number.isNaN(weightValue) ? inner : inner + weightValue;
      }, 0);
      return sum + loadWeight;
    }, 0);

    return {
      bundles,
      weight: Number(weight.toFixed(2))
    };
  }, [loadingFormState, order]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!order) {
      return;
    }

    try {
      setLoading(true);
      setFormErrors([]);

      let processedData: any = { ...formData };

      switch (actionType) {
        case 'add-vehicle': {
          if (!formData.vehicleNumber || !formData.driverName || !formData.driverNumber) {
            setFormErrors(['Please fill all vehicle details.']);
            setLoading(false);
            return;
          }
          processedData = {
            vehicle: {
              number: formData.vehicleNumber.trim(),
              driverName: formData.driverName.trim(),
              driverNumber: formData.driverNumber.trim(),
            }
          };
          break;
        }
        case 'generate-invoice': {
          const amountValue = Number(formData.amount) || 0;
          if (!amountValue || Number.isNaN(amountValue) || amountValue <= 0) {
            setFormErrors(['Please enter a valid invoice amount.']);
            setLoading(false);
            return;
          }

          processedData = {
            amount: amountValue
          };

          const rateValue = formData.rate !== undefined && formData.rate !== '' ? Number(formData.rate) : undefined;
          const taxValue = formData.taxRate !== undefined && formData.taxRate !== '' ? Number(formData.taxRate) : undefined;
          const notesValue = typeof formData.invoiceNotes === 'string' ? formData.invoiceNotes.trim() : '';

          if (rateValue !== undefined && !Number.isNaN(rateValue)) {
            processedData.RatePerUnit = rateValue;
          }

          if (taxValue !== undefined && !Number.isNaN(taxValue)) {
            processedData.TaxPercentage = taxValue;
          }

          if (notesValue) {
            processedData.invoiceNotes = notesValue;
          }
          break;
        }
        case 'add-fare': {
          const fareAmountValue = Number(formData.fareAmount);
          if (Number.isNaN(fareAmountValue) || fareAmountValue <= 0) {
            setFormErrors(['Fare amount must be greater than 0.']);
            setLoading(false);
            return;
          }

          if (!formData.paidBy || !['our_side', 'other_party'].includes(formData.paidBy)) {
            setFormErrors(['Please select who pays the fare.']);
            setLoading(false);
            return;
          }

          if (!formData.paymentStatus || !['paid', 'unpaid'].includes(formData.paymentStatus)) {
            setFormErrors(['Please select fare payment status.']);
            setLoading(false);
            return;
          }

          processedData = {
            fareAmount: fareAmountValue,
            paidBy: formData.paidBy,
            paymentStatus: formData.paymentStatus,
            fareNotes: typeof formData.fareNotes === 'string' ? formData.fareNotes.trim() : ''
          };
          break;
        }
        case 'empty-weight': {
          const emptyWeightValue = Number(formData.emptyWeight);
          if (Number.isNaN(emptyWeightValue) || emptyWeightValue <= 0) {
            setFormErrors(['Empty weight must be a positive number.']);
            setLoading(false);
            return;
          }

          processedData = {
            emptyWeight: emptyWeightValue,
            slipUrl: formData.slipNumber?.trim()
          };
          break;
        }
        case 'final-weight': {
          const finalWeightValue = Number(formData.finalWeight);
          if (Number.isNaN(finalWeightValue) || finalWeightValue <= 0) {
            setFormErrors(['Final weight must be a positive number.']);
            setLoading(false);
            return;
          }

          processedData = {
            finalWeight: finalWeightValue,
            slipUrl: formData.finalSlipNumber?.trim()
          };
          break;
        }
        case 'accept-loading': {
          if (!formData.acceptedBy || typeof formData.acceptedBy !== 'string') {
            setFormErrors(['Please provide the name of the supervisor accepting the load.']);
            setLoading(false);
            return;
          }
          processedData = { acceptedBy: formData.acceptedBy.trim() };
          break;
        }
        case 'complete-loading': {
          if (!loadingFormState) {
            setFormErrors(['Unable to prepare loading form state. Please try again.']);
            setLoading(false);
            return;
          }

          const { payload, errors } = buildLoadingPayload(order, loadingFormState);

          if (errors && errors.length > 0) {
            setFormErrors(errors);
            setLoading(false);
            return;
          }

          processedData = payload;
          break;
        }
        default: {
          // Trim notes where applicable
          const trimmedNotes = typeof formData.notes === 'string' ? formData.notes.trim() : '';
          if (trimmedNotes) {
            processedData.notes = trimmedNotes;
          } else if (processedData.notes) {
            delete processedData.notes;
          }
        }
      }

      await onExecute(processedData);
      setLoading(false);
      setFormData({});
      setLoadingFormState(null);
    } catch (error: any) {
      console.error('Order action error:', error);
      setLoading(false);
      if (error.response?.data?.errors) {
        const errorMessages = error.response.data.errors.map((err: any) => 
          `${err.field}: ${err.message}`
        );
        setFormErrors([error.response.data.message || 'Validation error', ...errorMessages]);
      } else {
        setFormErrors([error.response?.data?.message || 'Failed to execute action. Please try again.']);
      }
    }
  };

  const renderActionForm = () => {
    if (!order) {
      return null;
    }

    switch (actionType) {
      case 'add-vehicle':
        return (
          <div className="space-y-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-medium text-blue-900">Add Vehicle Details</h4>
              <p className="text-sm text-blue-700 mt-1">
                Add vehicle and driver details for Order #{order.orderNumber}.
              </p>
            </div>
            <Input
              label="Vehicle Number"
              value={formData.vehicleNumber || ''}
              onChange={(e) => setFormData((prev) => ({ ...prev, vehicleNumber: e.target.value }))}
              required
              placeholder="e.g., GJ01AB1234"
            />
            <Input
              label="Driver Name"
              value={formData.driverName || ''}
              onChange={(e) => setFormData((prev) => ({ ...prev, driverName: e.target.value }))}
              required
              placeholder="Enter driver name"
            />
            <Input
              label="Driver Phone Number"
              type="tel"
              value={formData.driverNumber || ''}
              onChange={(e) => setFormData((prev) => ({ ...prev, driverNumber: e.target.value }))}
              required
              pattern="[0-9]{10}"
              placeholder="e.g., 9876543210"
            />
          </div>
        );

      case 'guard-approve':
        return (
          <div className="space-y-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-medium text-blue-900">Guard Approval</h4>
              <p className="text-sm text-blue-700 mt-1">
                Approve vehicle entry for Order #{order.orderNumber}.
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Approval Notes</label>
              <textarea
                value={formData.notes || ''}
                onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
                placeholder="Any additional notes..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        );

      case 'empty-weight':
        return (
          <div className="space-y-4">
            <div className="bg-yellow-50 p-4 rounded-lg">
              <h4 className="font-medium text-yellow-900">Record Empty Weight</h4>
              <p className="text-sm text-yellow-700 mt-1">
                Vehicle: {order.vehicle?.number || 'Not added'} | Driver: {order.vehicle?.driverName || 'N/A'}
              </p>
            </div>
            <Input
              label="Empty Weight (KG)"
              type="number"
              step="0.1"
              value={formData.emptyWeight || ''}
              onChange={(e) => setFormData((prev) => ({ ...prev, emptyWeight: e.target.value }))}
              required
              placeholder="Enter empty vehicle weight"
            />
            <Input
              label="Weighbridge Slip Number"
              value={formData.slipNumber || ''}
              onChange={(e) => setFormData((prev) => ({ ...prev, slipNumber: e.target.value }))}
              placeholder="Enter slip number"
            />
          </div>
        );

      case 'accept-loading':
        return (
          <div className="space-y-4">
            <div className="bg-green-50 p-4 rounded-lg">
              <h4 className="font-medium text-green-900">Accept for Loading</h4>
              <p className="text-sm text-green-700 mt-1">
                Confirm the vehicle is ready for loading operations.
              </p>
            </div>
            <Input
              label="Accepted By"
              value={formData.acceptedBy || ''}
              onChange={(e) => setFormData((prev) => ({ ...prev, acceptedBy: e.target.value }))}
              required
              placeholder="Enter supervisor name"
            />
          </div>
        );

      case 'complete-loading':
        return (
          <div className="space-y-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-medium text-blue-900">Complete Loading</h4>
              <p className="text-sm text-blue-700 mt-1">
                Record the weight and size of every bundle loaded for this dispatch.
              </p>
            </div>

            {formErrors.length > 0 && (
              <div className="border border-red-200 bg-red-50 text-red-700 rounded-lg p-3 space-y-1 text-sm">
                <div className="flex items-center space-x-2 font-medium">
                  <AlertCircle className="h-4 w-4" />
                  <span>Fix the following issues before submitting:</span>
                </div>
                <ul className="list-disc list-inside space-y-1">
                  {formErrors.map((error, idx) => (
                    <li key={idx}>{error}</li>
                  ))}
                </ul>
              </div>
            )}

            {loadingFormState && (
              <>
                <LoadingDetailsForm
                  order={order}
                  state={loadingFormState}
                  onStateChange={setLoadingFormState}
                />

                <div className="border border-gray-100 rounded-lg p-3 bg-gray-50 text-sm text-gray-700">
                  <p>
                    Recorded bundles: <strong>{recordedSummary.bundles}</strong>
                  </p>
                  <p>
                    Approximate total weight: <strong>{recordedSummary.weight} kg</strong>
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Loading Notes</label>
                  <textarea
                    value={loadingFormState.notes || ''}
                    onChange={(e) =>
                      setLoadingFormState((prev) =>
                        prev ? { ...prev, notes: e.target.value } : prev
                      )
                    }
                    placeholder="Any loading observations..."
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </>
            )}
          </div>
        );

      case 'final-weight':
        return (
          <div className="space-y-4">
            <div className="bg-purple-50 p-4 rounded-lg">
              <h4 className="font-medium text-purple-900">Record Final Weight</h4>
              <p className="text-sm text-purple-700 mt-1">Record final loaded vehicle weight.</p>
            </div>
            <Input
              label="Final Weight (KG)"
              type="number"
              step="0.1"
              value={formData.finalWeight || ''}
              onChange={(e) => setFormData((prev) => ({ ...prev, finalWeight: e.target.value }))}
              required
              placeholder="Enter final vehicle weight"
            />
            <Input
              label="Final Weighbridge Slip Number"
              value={formData.finalSlipNumber || ''}
              onChange={(e) => setFormData((prev) => ({ ...prev, finalSlipNumber: e.target.value }))}
              placeholder="Enter final slip number"
            />
          </div>
        );

      case 'generate-invoice':
        return (
          <div className="space-y-4">
            <div className="bg-green-50 p-4 rounded-lg">
              <h4 className="font-medium text-green-900">Generate Invoice</h4>
              <p className="text-sm text-green-700 mt-1">
                Create billing invoice for Order #{order.orderNumber}.
              </p>
            </div>
            <Input
              label="Invoice Amount (₹)"
              type="number"
              step="1"
              value={formData.amount || ''}
              onChange={(e) => setFormData((prev) => ({ ...prev, amount: e.target.value }))}
              required
              placeholder="Enter total invoice amount"
            />
            <Input
              label="Rate per Unit (₹)"
              type="number"
              step="0.1"
              value={formData.rate || ''}
              onChange={(e) => setFormData((prev) => ({ ...prev, rate: e.target.value }))}
              placeholder="Rate per unit"
            />
            <Input
              label="Tax Percentage (%)"
              type="number"
              step="0.1"
              value={formData.taxRate || ''}
              onChange={(e) => setFormData((prev) => ({ ...prev, taxRate: e.target.value }))}
              placeholder="Tax percentage"
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Invoice Notes</label>
              <textarea
                value={formData.invoiceNotes || ''}
                onChange={(e) => setFormData((prev) => ({ ...prev, invoiceNotes: e.target.value }))}
                placeholder="Additional invoice details..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        );

      case 'add-fare':
        return (
          <div className="space-y-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-medium text-blue-900">Add Fare Details</h4>
              <p className="text-sm text-blue-700 mt-1">
                Fare is mandatory before invoice generation or exit.
              </p>
            </div>

            <Input
              label="Fare Amount"
              type="number"
              step="1"
              value={formData.fareAmount || ''}
              onChange={(e) => setFormData((prev) => ({ ...prev, fareAmount: e.target.value }))}
              required
              placeholder="Enter fare amount"
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Paid By</label>
              <select
                value={formData.paidBy || ''}
                onChange={(e) => setFormData((prev) => ({ ...prev, paidBy: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                required
              >
                <option value="">Select</option>
                <option value="our_side">Our Side</option>
                <option value="other_party">Other Party</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Payment Status</label>
              <select
                value={formData.paymentStatus || ''}
                onChange={(e) => setFormData((prev) => ({ ...prev, paymentStatus: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                required
              >
                <option value="">Select</option>
                <option value="paid">Paid</option>
                <option value="unpaid">Unpaid</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fare Notes</label>
              <textarea
                value={formData.fareNotes || ''}
                onChange={(e) => setFormData((prev) => ({ ...prev, fareNotes: e.target.value }))}
                placeholder="Add remarks for fare entry"
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        );

      case 'exit':
        return (
          <div className="space-y-4">
            <div className="bg-red-50 p-4 rounded-lg">
              <h4 className="font-medium text-red-900">Vehicle Exit</h4>
              <p className="text-sm text-red-700 mt-1">Confirm vehicle exit and order completion.</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Exit Notes</label>
              <textarea
                value={formData.notes || ''}
                onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
                placeholder="Any exit observations..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        );

      default:
        return (
          <div className="text-center py-8">
            <Package className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Action: {actionType}</h3>
            <p className="text-gray-600">Unknown action type</p>
          </div>
        );
    }
  };

  if (!order) {
    return null;
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`${actionType.replace('-', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())} - Order #${order.orderNumber}`}
      size={actionType === 'complete-loading' ? '4xl' : 'lg'}
    >
      <form onSubmit={handleSubmit}>
        {renderActionForm()}

        {formErrors.length > 0 && actionType !== 'complete-loading' && (
          <div className="border border-red-200 bg-red-50 text-red-700 rounded-lg p-3 space-y-1 text-sm mt-4">
            <div className="flex items-center space-x-2 font-medium">
              <AlertCircle className="h-4 w-4" />
              <span>Unable to continue:</span>
            </div>
            <ul className="list-disc list-inside space-y-1">
              {formErrors.map((error, idx) => (
                <li key={idx}>{error}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex justify-end space-x-3 pt-6 mt-6 border-t">
          <Button variant="secondary" onClick={onClose} type="button">
            Cancel
          </Button>
          <Button type="submit" loading={loading}>
            Execute Action
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default OrderActionModal;
