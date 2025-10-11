import React, { useState, useEffect, useRef } from 'react';
import { Printer, Edit, Save, X, FileText, DollarSign, Truck, User, Calendar, Package, Eye } from 'lucide-react';
import Modal from '../common/Modal';
import Button from '../common/Button';
import Input from '../common/Input';
import { Order, Fare } from '../../types';
import { ordersAPI, fareAPI } from '../../services/api';

interface InvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: Order | null;
  onSuccess: () => void;
  onRecordFare?: (order: Order) => void;
}

const InvoiceModal: React.FC<InvoiceModalProps> = ({
  isOpen,
  onClose,
  order,
  onSuccess,
  onRecordFare
}) => {
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [fare, setFare] = useState<Fare | null>(null);
  const [error, setError] = useState<string | null>(null);
  const printRef = useRef<HTMLDivElement>(null);
  
  const [invoiceData, setInvoiceData] = useState({
    amount: 0,
    RatePerUnit: 0,
    TaxPercentage: 9, // Default GST
    invoiceNotes: '',
    companyName: 'BHOPAL ISPAT PVT. LTD.',
    companyAddress: 'Survey No.402/1/1/1, Sukhlisewania,\nVidisha Road, BHOPAL - 462023',
    companyGSTIN: '23AAKCB2691R1Z3',
    companyContact: '9827053499',
    companyEmail: 'bhopalispatlimited@gmail.com',
    // Billing party details
    billingPartyName: '',
    billingPartyAddress: '',
    billingPartyGSTIN: '',
    billingPartyContact: '',
    billingPartyEmail: '',
    billingPartyState: '',
    billingPartyPincode: ''
  });

  useEffect(() => {
    if (order && isOpen) {
      // Initialize invoice data immediately
      const initializeData = () => {
        if (order.invoice) {
          setInvoiceData(prev => ({
            ...prev,
            amount: order.invoice?.amount || 0,
            RatePerUnit: order.invoice?.RatePerUnit || 0,
            TaxPercentage: order.invoice?.TaxPercentage || 9,
            invoiceNotes: order.invoice?.invoiceNotes || '',
            // Use saved billing party details if available
            billingPartyName: order.invoice?.billingParty?.name || order.customerOrSupplier || '',
            billingPartyAddress: order.invoice?.billingParty?.address || '',
            billingPartyGSTIN: order.invoice?.billingParty?.gstin || '',
            billingPartyContact: order.invoice?.billingParty?.contact || '',
            billingPartyEmail: order.invoice?.billingParty?.email || '',
            billingPartyState: order.invoice?.billingParty?.state || 'Madhya Pradesh',
            billingPartyPincode: order.invoice?.billingParty?.pincode || '',
            // Use saved company details if available
            companyName: order.invoice?.company?.name || 'BHOPAL ISPAT PVT. LTD.',
            companyAddress: order.invoice?.company?.address || 'Survey No.402/1/1/1, Sukhlisewania,\nVidisha Road, BHOPAL - 462023',
            companyGSTIN: order.invoice?.company?.gstin || '23AAKCB2691R1Z3',
            companyContact: order.invoice?.company?.contact || '9827053499',
            companyEmail: order.invoice?.company?.email || 'bhopalispatlimited@gmail.com'
          }));
        } else {
          // Set default values for new invoice
          setInvoiceData(prev => ({
            ...prev,
            billingPartyName: order.customerOrSupplier || '',
            billingPartyAddress: '',
            billingPartyGSTIN: '',
            billingPartyContact: '',
            billingPartyEmail: '',
            billingPartyState: 'Madhya Pradesh',
            billingPartyPincode: ''
          }));
        }
        setInitialLoading(false);
      };

      // Initialize data immediately
      initializeData();
      
      // Only fetch fare if we don't have an invoice yet (for new invoice generation)
      if (!order.invoice) {
        setTimeout(() => fetchFare(), 100);
      } else {
        // For existing invoices, don't fetch fare - just show the invoice
        setFare(null);
      }
    } else {
      setInitialLoading(true);
    }
  }, [order, isOpen]);

  const fetchFare = async () => {
    if (!order) return;
    
    try {
      const fareData = await fareAPI.getFareByOrderId(order._id);
      setFare(fareData);
    } catch (error: any) {
      // Don't log error for missing fare - it's optional
      if (error.response?.status !== 404) {
        console.error('Error fetching fare:', error);
      }
      setFare(null);
    }
  };

  const handleGenerateInvoice = async () => {
    if (!order) return;

    // Check if fare is required but missing
    if (!fare && !order.invoice) {
      setError('Vehicle fare must be recorded before generating invoice. Please record the fare first.');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Calculate the total amount based on rate and weight
      const { total } = calculateTotals();
      const invoicePayload = {
        ...invoiceData,
        amount: total // Use calculated total
      };

      await ordersAPI.generateInvoice(order._id, invoicePayload);
      onSuccess();
      setEditing(false);
    } catch (error: any) {
      console.error('Error generating invoice:', error);
      if (error.response?.data?.message) {
        setError(error.response.data.message);
      } else {
        setError('Failed to generate invoice. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const calculateTotals = () => {
    const netWeight = order?.netWeight || 0;
    const ratePerUnit = invoiceData.RatePerUnit;
    const subtotal = netWeight * ratePerUnit;
    const taxAmount = (subtotal * invoiceData.TaxPercentage) / 100;
    const total = subtotal + taxAmount;
    
    return { subtotal, taxAmount, total, netWeight };
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return new Date().toLocaleDateString('en-IN');
    return new Date(dateString).toLocaleDateString('en-IN');
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  };

  if (!order) return null;

  // Show loading screen while initializing
  if (initialLoading) {
    return (
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Loading Invoice..."
        size="md"
      >
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <span className="ml-4 text-gray-600">Loading invoice details...</span>
        </div>
      </Modal>
    );
  }

  const { subtotal, taxAmount, total, netWeight } = calculateTotals();

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editing ? 'Edit Invoice' : 'Invoice Details'}
      size="6xl"
    >
      <div className="space-y-6">
        {/* Workflow Status */}
        {!order.invoice && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <h3 className="font-medium text-blue-900 mb-2">Invoice Generation Workflow</h3>
            <div className="flex items-center space-x-4 text-sm">
              <div className={`flex items-center ${fare ? 'text-green-700' : 'text-yellow-700'}`}>
                <div className={`w-3 h-3 rounded-full mr-2 ${fare ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
                <span>1. Record Fare</span>
                {fare && <span className="ml-1">✓</span>}
              </div>
              <div className="text-gray-400">→</div>
              <div className="flex items-center text-gray-500">
                <div className="w-3 h-3 rounded-full bg-gray-300 mr-2"></div>
                <span>2. Generate Invoice</span>
              </div>
              <div className="text-gray-400">→</div>
              <div className="flex items-center text-gray-500">
                <div className="w-3 h-3 rounded-full bg-gray-300 mr-2"></div>
                <span>3. Move to Gate</span>
              </div>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center">
              <X className="h-5 w-5 text-red-400 mr-2" />
              <p className="text-sm text-red-800">{error}</p>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="no-print flex justify-between items-center">
          <div className="flex space-x-3">
            {!editing && (
              <>
                <Button
                  variant="secondary"
                  icon={Printer}
                  onClick={handlePrint}
                >
                  Print Invoice
                </Button>
                <Button
                  variant="secondary"
                  icon={Edit}
                  onClick={() => setEditing(true)}
                >
                  Edit Invoice
                </Button>
                <Button
                  variant="ghost"
                  icon={Eye}
                  onClick={() => {
                    // Quick preview - just show the invoice without waiting for fare
                    console.log('Quick preview mode');
                  }}
                >
                  Quick Preview
                </Button>
              </>
            )}
            {editing && (
              <>
                <Button
                  variant="primary"
                  icon={Save}
                  onClick={handleGenerateInvoice}
                  loading={loading}
                >
                  Save Changes
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => setEditing(false)}
                >
                  Cancel
                </Button>
              </>
            )}
          </div>
          
          {!order.invoice && (
            <>
              {!fare ? (
                <div className="flex space-x-2">
                  <Button
                    variant="warning"
                    onClick={() => {
                      if (onRecordFare && order) {
                        onClose();
                        onRecordFare(order);
                      } else {
                        alert('Please record the vehicle fare first. Use the "Record Fare" button on the order card.');
                      }
                    }}
                  >
                    Record Fare First
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={handleGenerateInvoice}
                    loading={loading}
                  >
                    Generate Without Fare
                  </Button>
                </div>
              ) : (
                <Button
                  variant="primary"
                  onClick={handleGenerateInvoice}
                  loading={loading}
                >
                  Generate Invoice
                </Button>
              )}
            </>
          )}
        </div>

        {/* Invoice Content */}
        <div ref={printRef} className="print-invoice bg-white border rounded-lg p-8 print:shadow-none print:border-none print:p-4">
          {/* Header */}
          <div className="border-b-2 border-gray-300 pb-6 mb-6">
            <div className="flex justify-between items-start">
              <div>
                {editing ? (
                  <div className="space-y-2">
                    <Input
                      value={invoiceData.companyName}
                      onChange={(e) => setInvoiceData(prev => ({
                        ...prev,
                        companyName: e.target.value
                      }))}
                      className="text-2xl font-bold"
                      placeholder="Company Name"
                    />
                    <textarea
                      value={invoiceData.companyAddress}
                      onChange={(e) => setInvoiceData(prev => ({
                        ...prev,
                        companyAddress: e.target.value
                      }))}
                      rows={3}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Company Address"
                    />
                    <div className="grid grid-cols-1 gap-2">
                      <Input
                        value={invoiceData.companyGSTIN}
                        onChange={(e) => setInvoiceData(prev => ({
                          ...prev,
                          companyGSTIN: e.target.value
                        }))}
                        placeholder="GSTIN/UIN"
                        className="text-sm"
                      />
                      <Input
                        value={invoiceData.companyContact}
                        onChange={(e) => setInvoiceData(prev => ({
                          ...prev,
                          companyContact: e.target.value
                        }))}
                        placeholder="Contact Number"
                        className="text-sm"
                      />
                      <Input
                        value={invoiceData.companyEmail}
                        onChange={(e) => setInvoiceData(prev => ({
                          ...prev,
                          companyEmail: e.target.value
                        }))}
                        placeholder="Email Address"
                        className="text-sm"
                      />
                    </div>
                  </div>
                ) : (
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900">{invoiceData.companyName}</h1>
                    <div className="mt-2 text-sm text-gray-600 whitespace-pre-line">
                      {invoiceData.companyAddress}
                    </div>
                    <div className="mt-2 text-sm text-gray-600">
                      <div>GSTIN/UIN: {invoiceData.companyGSTIN}</div>
                      <div>Contact: {invoiceData.companyContact}</div>
                      <div>Email: {invoiceData.companyEmail}</div>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="text-right">
                <h2 className="text-xl font-bold text-gray-900">TAX INVOICE</h2>
                <div className="mt-2 text-sm">
                  <div>Invoice No: {order.invoice?.billNumber || 'DRAFT'}</div>
                  <div>Date: {formatDate(order.invoice ? order.createdAt : undefined)}</div>
                  <div>Order No: #{order.orderNumber}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Customer & Vehicle Details */}
          <div className="grid grid-cols-2 gap-8 mb-6">
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Bill To:</h3>
              <div className="text-sm text-gray-700">
                {editing ? (
                  <div className="space-y-2">
                    <Input
                      placeholder="Company/Party Name"
                      value={invoiceData.billingPartyName}
                      onChange={(e) => setInvoiceData(prev => ({
                        ...prev,
                        billingPartyName: e.target.value
                      }))}
                      className="text-sm"
                    />
                    <textarea
                      placeholder="Billing Address"
                      value={invoiceData.billingPartyAddress}
                      onChange={(e) => setInvoiceData(prev => ({
                        ...prev,
                        billingPartyAddress: e.target.value
                      }))}
                      rows={3}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        placeholder="GSTIN"
                        value={invoiceData.billingPartyGSTIN}
                        onChange={(e) => setInvoiceData(prev => ({
                          ...prev,
                          billingPartyGSTIN: e.target.value
                        }))}
                        className="text-sm"
                      />
                      <Input
                        placeholder="Pincode"
                        value={invoiceData.billingPartyPincode}
                        onChange={(e) => setInvoiceData(prev => ({
                          ...prev,
                          billingPartyPincode: e.target.value
                        }))}
                        className="text-sm"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        placeholder="Contact Number"
                        value={invoiceData.billingPartyContact}
                        onChange={(e) => setInvoiceData(prev => ({
                          ...prev,
                          billingPartyContact: e.target.value
                        }))}
                        className="text-sm"
                      />
                      <Input
                        placeholder="Email"
                        value={invoiceData.billingPartyEmail}
                        onChange={(e) => setInvoiceData(prev => ({
                          ...prev,
                          billingPartyEmail: e.target.value
                        }))}
                        className="text-sm"
                      />
                    </div>
                    <Input
                      placeholder="State"
                      value={invoiceData.billingPartyState}
                      onChange={(e) => setInvoiceData(prev => ({
                        ...prev,
                        billingPartyState: e.target.value
                      }))}
                      className="text-sm"
                    />
                  </div>
                ) : (
                  <div>
                    <div className="font-medium">{invoiceData.billingPartyName || order.customerOrSupplier}</div>
                    {invoiceData.billingPartyAddress && (
                      <div className="mt-1 whitespace-pre-line">{invoiceData.billingPartyAddress}</div>
                    )}
                    {invoiceData.billingPartyGSTIN && (
                      <div className="mt-1">GSTIN: {invoiceData.billingPartyGSTIN}</div>
                    )}
                    {invoiceData.billingPartyContact && (
                      <div className="mt-1">Contact: {invoiceData.billingPartyContact}</div>
                    )}
                    {invoiceData.billingPartyEmail && (
                      <div className="mt-1">Email: {invoiceData.billingPartyEmail}</div>
                    )}
                    {invoiceData.billingPartyState && (
                      <div className="mt-1">State: {invoiceData.billingPartyState}</div>
                    )}
                    {invoiceData.billingPartyPincode && (
                      <div className="mt-1">Pincode: {invoiceData.billingPartyPincode}</div>
                    )}
                    <div className="mt-2 text-xs text-gray-500">Order Type: {order.type.toUpperCase()}</div>
                  </div>
                )}
              </div>
            </div>
            
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Vehicle Details:</h3>
              <div className="text-sm text-gray-700">
                <div>Vehicle No: {order.vehicle?.number || 'N/A'}</div>
                <div>Driver: {order.vehicle?.driverName || 'N/A'}</div>
                <div>Net Weight: {netWeight} MT</div>
                <div className="mt-2">
                  <div>Empty Weight: {order.weights?.emptyWeight || 'N/A'} kg</div>
                  <div>Final Weight: {order.weights?.finalWeight || 'N/A'} kg</div>
                </div>
              </div>
            </div>
          </div>

          {/* Products Table */}
          <div className="mb-6">
            <table className="w-full border-collapse border border-gray-300">
              <thead>
                <tr className="bg-gray-50">
                  <th className="border border-gray-300 px-4 py-2 text-left">Sl No.</th>
                  <th className="border border-gray-300 px-4 py-2 text-left">Description of Goods</th>
                  <th className="border border-gray-300 px-4 py-2 text-right">Quantity</th>
                  <th className="border border-gray-300 px-4 py-2 text-right">Rate per MT</th>
                  <th className="border border-gray-300 px-4 py-2 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {order.products.map((product, index) => (
                  <tr key={index}>
                    <td className="border border-gray-300 px-4 py-2">{index + 1}</td>
                    <td className="border border-gray-300 px-4 py-2">
                      <div>{product.name}</div>
                      {product.dimensions && (
                        <div className="text-sm text-gray-600">{product.dimensions}</div>
                      )}
                    </td>
                    <td className="border border-gray-300 px-4 py-2 text-right">
                      {netWeight} MT
                    </td>
                    <td className="border border-gray-300 px-4 py-2 text-right">
                      {editing ? (
                        <Input
                          type="number"
                          step="0.01"
                          value={invoiceData.RatePerUnit}
                          onChange={(e) => setInvoiceData(prev => ({
                            ...prev,
                            RatePerUnit: Number(e.target.value)
                          }))}
                          className="w-24 text-right"
                        />
                      ) : (
                        formatCurrency(invoiceData.RatePerUnit)
                      )}
                    </td>
                    <td className="border border-gray-300 px-4 py-2 text-right">
                      {formatCurrency(subtotal)}
                    </td>
                  </tr>
                ))}
                
                {/* Totals */}
                <tr>
                  <td colSpan={4} className="border border-gray-300 px-4 py-2 text-right font-medium">
                    Subtotal:
                  </td>
                  <td className="border border-gray-300 px-4 py-2 text-right">
                    {formatCurrency(subtotal)}
                  </td>
                </tr>
                <tr>
                  <td colSpan={4} className="border border-gray-300 px-4 py-2 text-right font-medium">
                    CGST ({invoiceData.TaxPercentage/2}%):
                  </td>
                  <td className="border border-gray-300 px-4 py-2 text-right">
                    {formatCurrency(taxAmount/2)}
                  </td>
                </tr>
                <tr>
                  <td colSpan={4} className="border border-gray-300 px-4 py-2 text-right font-medium">
                    SGST ({invoiceData.TaxPercentage/2}%):
                  </td>
                  <td className="border border-gray-300 px-4 py-2 text-right">
                    {formatCurrency(taxAmount/2)}
                  </td>
                </tr>
                <tr className="bg-gray-50">
                  <td colSpan={4} className="border border-gray-300 px-4 py-2 text-right font-bold">
                    Total Amount:
                  </td>
                  <td className="border border-gray-300 px-4 py-2 text-right font-bold">
                    {formatCurrency(total)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Fare Information */}
          <div className="mb-6 p-4 rounded-lg border">
            <h3 className="font-semibold text-gray-900 mb-2">Transportation Fare:</h3>
            {fare ? (
              <div className="text-sm text-gray-700 bg-green-50 p-3 rounded">
                <div className="flex items-center mb-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                  <span className="font-medium text-green-800">Fare Recorded</span>
                </div>
                <div>Fare Type: {fare.fareType === 'given_by_us' ? 'Paid by Company' : 'Paid by Customer'}</div>
                <div>Amount: {formatCurrency(fare.amount)}</div>
                {fare.notes && <div>Notes: {fare.notes}</div>}
              </div>
            ) : (
              <div className="text-sm text-gray-700 bg-yellow-50 p-3 rounded">
                <div className="flex items-center mb-2">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full mr-2"></div>
                  <span className="font-medium text-yellow-800">Fare Not Recorded</span>
                </div>
                <div className="text-yellow-700">
                  Vehicle transportation fare has not been recorded yet. 
                  {!order.invoice && ' This is required for invoice generation.'}
                </div>
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="mb-6">
            <h3 className="font-semibold text-gray-900 mb-2">Notes:</h3>
            {editing ? (
              <textarea
                value={invoiceData.invoiceNotes}
                onChange={(e) => setInvoiceData(prev => ({
                  ...prev,
                  invoiceNotes: e.target.value
                }))}
                placeholder="Enter invoice notes..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            ) : (
              <div className="text-sm text-gray-700">
                {invoiceData.invoiceNotes || 'No additional notes'}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t pt-6 text-center text-sm text-gray-600">
            <div>This is a Computer Generated Invoice</div>
            <div className="mt-2">
              Generated on: {formatDate()}
            </div>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="no-print flex justify-end space-x-3 pt-4 border-t">
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default InvoiceModal;