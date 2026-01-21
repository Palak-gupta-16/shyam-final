import React, { useState, useEffect, useCallback } from 'react';
import { 
  FileText, 
  Download, 
  Search, 
  DollarSign,
  Edit,
  CheckCircle,
  Package,
  TrendingUp,
  AlertCircle
} from 'lucide-react';
import DashboardLayout from '../components/layout/DashboardLayout';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import Modal from '../components/common/Modal';
import Badge from '../components/common/Badge';
import OrderStatusBadge from '../components/orders/OrderStatusBadge';
import Pagination from '../components/common/Pagination';
import { ordersAPI } from '../services/api';
import { Order, OrderStatus } from '../types';
import { useAuth } from '../context/AuthContext';

const Accounts: React.FC = () => {
  const { hasRole } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showFareModal, setShowFareModal] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [fareForm, setFareForm] = useState({
    fareAmount: 0,
    paidBy: 'our_side' as 'our_side' | 'other_party',
    fareNotes: ''
  });
  const [invoiceForm, setInvoiceForm] = useState({
    amount: 0,
    RatePerUnit: 0,
    TaxPercentage: 0,
    invoiceNotes: '',
    pdfUrl: ''
  });

  // Fetch orders ready for billing
  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);

      const params: any = {
        page: currentPage,
        perPage: 20,
        status: [
          'ready_for_billing',
          'ready_for_billing_purchase',
          'ready_for_dispatch',
          'ready_for_exit_purchase',
          'completed'
        ]
      };

      if (selectedStatus !== 'all') params.status = [selectedStatus];
      if (selectedType !== 'all') params.type = selectedType;

      const response = await ordersAPI.getOrdersByStatus(params);
      setOrders(response.orders || []);
      setTotalPages(response.pagination?.totalPages || 1);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  }, [currentPage, selectedStatus, selectedType]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Handle fare form submission
  const handleFareSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder) return;

    try {
      await ordersAPI.updateFareDetails(selectedOrder._id, fareForm);
      setShowFareModal(false);
      setSelectedOrder(null);
      setFareForm({ fareAmount: 0, paidBy: 'our_side', fareNotes: '' });
      fetchOrders();
    } catch (error) {
      console.error('Error updating fare:', error);
    }
  };

  // Handle invoice generation
  const handleInvoiceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder) return;

    try {
      await ordersAPI.generateInvoice(selectedOrder._id, invoiceForm);
      setShowInvoiceModal(false);
      setSelectedOrder(null);
      setInvoiceForm({ amount: 0, RatePerUnit: 0, TaxPercentage: 0, invoiceNotes: '', pdfUrl: '' });
      fetchOrders();
    } catch (error) {
      console.error('Error generating invoice:', error);
    }
  };

  // Open fare modal with existing data
  const openFareModal = (order: Order) => {
    setSelectedOrder(order);
    setFareForm({
      fareAmount: order.invoice?.fare?.amount || 0,
      paidBy: order.invoice?.fare?.paidBy || 'our_side',
      fareNotes: order.invoice?.fare?.notes || ''
    });
    setShowFareModal(true);
  };

  // Open invoice modal
  const openInvoiceModal = (order: Order) => {
    setSelectedOrder(order);
    setInvoiceForm({
      amount: order.invoice?.amount || 0,
      RatePerUnit: order.invoice?.RatePerUnit || 0,
      TaxPercentage: order.invoice?.TaxPercentage || 0,
      invoiceNotes: order.invoice?.invoiceNotes || '',
      pdfUrl: order.invoice?.pdfUrl || ''
    });
    setShowInvoiceModal(true);
  };

  // Generate printable invoice view
  const generateInvoiceView = (order: Order) => {
    const invoice = order.invoice;
    const fare = invoice?.fare;
    
    const invoiceHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Invoice #${invoice?.billNumber || 'N/A'}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 40px; }
          .header { text-align: center; margin-bottom: 30px; border-bottom: 3px solid #333; padding-bottom: 20px; }
          .header h1 { margin: 0; color: #333; }
          .info { margin: 20px 0; }
          .info-row { display: flex; justify-content: space-between; margin: 10px 0; }
          .info-label { font-weight: bold; }
          .table { width: 100%; border-collapse: collapse; margin: 30px 0; }
          .table th, .table td { border: 1px solid #ddd; padding: 12px; text-align: left; }
          .table th { background-color: #f4f4f4; font-weight: bold; }
          .total-section { margin-top: 30px; text-align: right; }
          .total-row { margin: 10px 0; font-size: 16px; }
          .total-row.grand { font-size: 20px; font-weight: bold; border-top: 2px solid #333; padding-top: 10px; }
          .fare-section { background: #f9f9f9; padding: 15px; margin: 20px 0; border-radius: 5px; }
          @media print { button { display: none; } }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>SHYAM SUPER APP</h1>
          <p>Invoice #${invoice?.billNumber || 'N/A'}</p>
          <p>Date: ${new Date().toLocaleDateString()}</p>
        </div>
        
        <div class="info">
          <div class="info-row">
            <div><span class="info-label">Order Number:</span> #${order.orderNumber}</div>
            <div><span class="info-label">Order Type:</span> ${order.type.toUpperCase()}</div>
          </div>
          <div class="info-row">
            <div><span class="info-label">${order.type === 'dispatch' ? 'Customer' : 'Supplier'}:</span> ${order.customerOrSupplier}</div>
            <div><span class="info-label">Vehicle:</span> ${order.vehicle?.number || 'N/A'}</div>
          </div>
          ${order.vehicle?.driverName ? `
          <div class="info-row">
            <div><span class="info-label">Driver:</span> ${order.vehicle.driverName}</div>
            <div><span class="info-label">Contact:</span> ${order.vehicle.driverNumber || 'N/A'}</div>
          </div>
          ` : ''}
        </div>

        <table class="table">
          <thead>
            <tr>
              <th>Product</th>
              <th>Dimensions</th>
              <th>Quantity</th>
              <th>Unit</th>
            </tr>
          </thead>
          <tbody>
            ${order.products.map(product => `
              <tr>
                <td>${product.name}</td>
                <td>${product.dimensions || 'N/A'}</td>
                <td>${product.quantity}</td>
                <td>${product.unit || 'pcs'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        ${order.weights ? `
        <div class="info">
          <h3>Weight Details</h3>
          <div class="info-row">
            <div><span class="info-label">Empty Weight:</span> ${order.weights.emptyWeight || 'N/A'} kg</div>
            <div><span class="info-label">Final Weight:</span> ${order.weights.finalWeight || 'N/A'} kg</div>
          </div>
          <div class="info-row">
            <div><span class="info-label">Net Weight:</span> ${order.netWeight || 'N/A'} kg</div>
          </div>
        </div>
        ` : ''}

        ${fare ? `
        <div class="fare-section">
          <h3>Transportation Fare</h3>
          <div class="info-row">
            <div><span class="info-label">Fare Amount:</span> ₹${fare.amount?.toLocaleString() || '0'}</div>
            <div><span class="info-label">Paid By:</span> ${fare.paidBy === 'our_side' ? 'Our Side' : 'Other Party'}</div>
          </div>
          ${fare.notes ? `<div><span class="info-label">Notes:</span> ${fare.notes}</div>` : ''}
        </div>
        ` : ''}

        <div class="total-section">
          ${invoice?.RatePerUnit ? `<div class="total-row">Rate per Unit: ₹${invoice.RatePerUnit.toLocaleString()}</div>` : ''}
          ${invoice?.TaxPercentage ? `<div class="total-row">Tax: ${invoice.TaxPercentage}%</div>` : ''}
          <div class="total-row grand">Total Amount: ₹${invoice?.amount?.toLocaleString() || '0'}</div>
        </div>

        ${invoice?.invoiceNotes ? `
        <div class="info" style="margin-top: 30px;">
          <h3>Notes</h3>
          <p>${invoice.invoiceNotes}</p>
        </div>
        ` : ''}

        <div style="margin-top: 50px; text-align: center;">
          <button onclick="window.print()" style="padding: 10px 30px; background: #007bff; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 16px;">Print Invoice</button>
          <button onclick="window.close()" style="padding: 10px 30px; background: #6c757d; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 16px; margin-left: 10px;">Close</button>
        </div>
      </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(invoiceHTML);
      printWindow.document.close();
    }
  };

  // Download invoice
  const handleDownloadInvoice = (order: Order) => {
    if (order.invoice?.pdfUrl) {
      window.open(order.invoice.pdfUrl, '_blank');
    } else {
      // Generate printable invoice view
      generateInvoiceView(order);
    }
  };

  // Filter orders
  const filteredOrders = orders.filter(order =>
    order.orderNumber.toString().includes(searchTerm) ||
    order.customerOrSupplier.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (order.vehicle?.number && order.vehicle.number.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Calculate statistics
  const stats = {
    totalOrders: filteredOrders.length,
    withFare: filteredOrders.filter(o => o.invoice?.fare?.amount).length,
    withInvoice: filteredOrders.filter(o => o.invoice?.billNumber).length,
    totalRevenue: filteredOrders
      .filter(o => o.invoice?.amount && o.type === 'dispatch')
      .reduce((sum, o) => sum + (o.invoice?.amount || 0), 0),
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Accounts & Billing</h1>
            <p className="text-gray-600 mt-1">Manage fare details and invoices</p>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <Card.Body>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Orders</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalOrders}</p>
                </div>
                <FileText className="h-10 w-10 text-blue-500" />
              </div>
            </Card.Body>
          </Card>

          <Card>
            <Card.Body>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">With Fare Details</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.withFare}</p>
                </div>
                <DollarSign className="h-10 w-10 text-green-500" />
              </div>
            </Card.Body>
          </Card>

          <Card>
            <Card.Body>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Invoices Generated</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.withInvoice}</p>
                </div>
                <CheckCircle className="h-10 w-10 text-purple-500" />
              </div>
            </Card.Body>
          </Card>

          <Card>
            <Card.Body>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Revenue</p>
                  <p className="text-2xl font-bold text-gray-900">₹{stats.totalRevenue.toLocaleString()}</p>
                </div>
                <TrendingUp className="h-10 w-10 text-orange-500" />
              </div>
            </Card.Body>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <Card.Body>
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1">
                <Input
                  placeholder="Search by order number, customer, or vehicle..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  icon={Search}
                />
              </div>
              <div className="flex gap-2">
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="all">All Status</option>
                  <option value="ready_for_billing">Ready for Billing (Dispatch)</option>
                  <option value="ready_for_billing_purchase">Ready for Billing (Purchase)</option>
                  <option value="ready_for_dispatch">Ready for Dispatch</option>
                  <option value="ready_for_exit_purchase">Ready for Exit (Purchase)</option>
                  <option value="completed">Completed</option>
                </select>
                <select
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="all">All Types</option>
                  <option value="dispatch">Dispatch</option>
                  <option value="purchase">Purchase</option>
                </select>
              </div>
            </div>
          </Card.Body>
        </Card>

        {/* Orders Table */}
        <Card>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Order #
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Customer/Supplier
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Vehicle
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fare Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Paid By
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Invoice
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan={9} className="px-6 py-8 text-center text-gray-500">
                      Loading orders...
                    </td>
                  </tr>
                ) : filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-6 py-8 text-center text-gray-500">
                      No orders found
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((order) => (
                    <tr key={order._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="font-medium text-gray-900">#{order.orderNumber}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge variant={order.type === 'dispatch' ? 'primary' : 'warning'} size="sm">
                          {order.type}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{order.customerOrSupplier}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {order.vehicle?.number ? (
                          <div>
                            <div className="text-sm font-medium text-gray-900">{order.vehicle.number}</div>
                            <div className="text-xs text-gray-500">{order.vehicle.driverName}</div>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400 italic">Not added</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {order.invoice?.fare?.amount ? (
                          <span className="text-sm font-medium text-gray-900">
                            ₹{order.invoice.fare.amount.toLocaleString()}
                          </span>
                        ) : (
                          <span className="text-sm text-gray-400 italic">Not set</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {order.invoice?.fare?.paidBy ? (
                          <Badge 
                            variant={order.invoice.fare.paidBy === 'our_side' ? 'error' : 'success'} 
                            size="sm"
                          >
                            {order.invoice.fare.paidBy === 'our_side' ? 'Our Side' : 'Other Party'}
                          </Badge>
                        ) : (
                          <span className="text-sm text-gray-400 italic">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {order.invoice?.billNumber ? (
                          <div className="flex items-center">
                            <CheckCircle className="h-4 w-4 text-green-500 mr-1" />
                            <span className="text-sm text-gray-900">#{order.invoice.billNumber}</span>
                          </div>
                        ) : (
                          <div className="flex items-center">
                            <AlertCircle className="h-4 w-4 text-amber-500 mr-1" />
                            <span className="text-sm text-gray-500">Pending</span>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <OrderStatusBadge status={order.status} />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="flex items-center gap-2">
                          {!order.invoice?.fare?.amount && (
                            <Button
                              variant="ghost"
                              size="sm"
                              icon={DollarSign}
                              onClick={() => openFareModal(order)}
                            >
                              Add Fare
                            </Button>
                          )}
                          {order.invoice?.fare?.amount && !order.invoice?.billNumber && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                icon={Edit}
                                onClick={() => openFareModal(order)}
                              >
                                Edit Fare
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                icon={FileText}
                                onClick={() => openInvoiceModal(order)}
                              >
                                Generate Invoice
                              </Button>
                            </>
                          )}
                          {order.invoice?.billNumber && (
                            <Button
                              variant="ghost"
                              size="sm"
                              icon={Download}
                              onClick={() => handleDownloadInvoice(order)}
                            >
                              Download
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Pagination */}
        {totalPages > 1 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            total={orders.length}
            pageSize={20}
          />
        )}

        {/* Fare Modal */}
        <Modal
          isOpen={showFareModal}
          onClose={() => {
            setShowFareModal(false);
            setSelectedOrder(null);
          }}
          title={`Fare Details - Order #${selectedOrder?.orderNumber}`}
          size="md"
        >
          <form onSubmit={handleFareSubmit}>
            <div className="space-y-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-medium text-blue-900">Transportation Fare</h4>
                <p className="text-sm text-blue-700 mt-1">
                  Enter the transportation fare and specify who will pay
                </p>
              </div>

              <Input
                label="Fare Amount (₹)"
                type="number"
                step="1"
                value={fareForm.fareAmount}
                onChange={(e) => setFareForm(prev => ({ ...prev, fareAmount: Number(e.target.value) }))}
                required
                placeholder="Enter fare amount"
              />

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Who Will Pay the Fare?
                </label>
                <div className="space-y-2">
                  <label className="flex items-center p-3 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
                    <input
                      type="radio"
                      name="paidBy"
                      value="our_side"
                      checked={fareForm.paidBy === 'our_side'}
                      onChange={(e) => setFareForm(prev => ({ ...prev, paidBy: e.target.value as 'our_side' | 'other_party' }))}
                      className="mr-3"
                    />
                    <div>
                      <div className="font-medium text-gray-900">Our Side</div>
                      <div className="text-sm text-gray-500">We will pay the transportation fare</div>
                    </div>
                  </label>
                  <label className="flex items-center p-3 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
                    <input
                      type="radio"
                      name="paidBy"
                      value="other_party"
                      checked={fareForm.paidBy === 'other_party'}
                      onChange={(e) => setFareForm(prev => ({ ...prev, paidBy: e.target.value as 'our_side' | 'other_party' }))}
                      className="mr-3"
                    />
                    <div>
                      <div className="font-medium text-gray-900">Other Party</div>
                      <div className="text-sm text-gray-500">Customer/Supplier will pay the fare</div>
                    </div>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes (Optional)
                </label>
                <textarea
                  value={fareForm.fareNotes}
                  onChange={(e) => setFareForm(prev => ({ ...prev, fareNotes: e.target.value }))}
                  placeholder="Additional fare details..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-6 mt-6 border-t">
              <Button variant="secondary" onClick={() => setShowFareModal(false)}>
                Cancel
              </Button>
              <Button type="submit">
                Save Fare Details
              </Button>
            </div>
          </form>
        </Modal>

        {/* Invoice Modal */}
        <Modal
          isOpen={showInvoiceModal}
          onClose={() => {
            setShowInvoiceModal(false);
            setSelectedOrder(null);
          }}
          title={`Generate Invoice - Order #${selectedOrder?.orderNumber}`}
          size="md"
        >
          <form onSubmit={handleInvoiceSubmit}>
            <div className="space-y-4">
              <div className="bg-green-50 p-4 rounded-lg">
                <h4 className="font-medium text-green-900">Invoice Generation</h4>
                <p className="text-sm text-green-700 mt-1">
                  Create billing invoice for this order
                </p>
                {selectedOrder?.invoice?.fare && (
                  <div className="mt-2 text-sm text-green-700">
                    <strong>Fare:</strong> ₹{selectedOrder.invoice.fare.amount?.toLocaleString()} 
                    ({selectedOrder.invoice.fare.paidBy === 'our_side' ? 'Our Side' : 'Other Party'})
                  </div>
                )}
              </div>

              <Input
                label="Invoice Amount (₹)"
                type="number"
                step="1"
                value={invoiceForm.amount}
                onChange={(e) => setInvoiceForm(prev => ({ ...prev, amount: Number(e.target.value) }))}
                required
                placeholder="Enter total invoice amount"
              />

              <Input
                label="Rate per Unit (₹)"
                type="number"
                step="0.01"
                value={invoiceForm.RatePerUnit}
                onChange={(e) => setInvoiceForm(prev => ({ ...prev, RatePerUnit: Number(e.target.value) }))}
                placeholder="Rate per unit"
              />

              <Input
                label="Tax Percentage (%)"
                type="number"
                step="0.01"
                value={invoiceForm.TaxPercentage}
                onChange={(e) => setInvoiceForm(prev => ({ ...prev, TaxPercentage: Number(e.target.value) }))}
                placeholder="Tax percentage"
              />

              <Input
                label="Invoice PDF URL (Optional)"
                value={invoiceForm.pdfUrl}
                onChange={(e) => setInvoiceForm(prev => ({ ...prev, pdfUrl: e.target.value }))}
                placeholder="Enter invoice PDF URL if available"
              />

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Invoice Notes
                </label>
                <textarea
                  value={invoiceForm.invoiceNotes}
                  onChange={(e) => setInvoiceForm(prev => ({ ...prev, invoiceNotes: e.target.value }))}
                  placeholder="Additional invoice details..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-6 mt-6 border-t">
              <Button variant="secondary" onClick={() => setShowInvoiceModal(false)}>
                Cancel
              </Button>
              <Button type="submit">
                Generate Invoice
              </Button>
            </div>
            <div className="text-sm text-gray-500 mt-2">
              Note: If no PDF URL is provided, a printable invoice will be generated automatically.
            </div>
          </form>
        </Modal>
      </div>
    </DashboardLayout>
  );
};

export default Accounts;