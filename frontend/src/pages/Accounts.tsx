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
    paymentStatus: 'unpaid' as 'paid' | 'unpaid',
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
      setFareForm({ fareAmount: 0, paidBy: 'our_side', paymentStatus: 'unpaid', fareNotes: '' });
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
      paymentStatus: order.invoice?.fare?.paymentStatus || 'unpaid',
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

    const taxPercentage = Number(invoice?.TaxPercentage || 18);
    const totalQuantity = order.products.reduce((sum, product) => sum + (Number(product.quantity) || 0), 0);
    const ratePerUnit = Number(invoice?.RatePerUnit || 0) ||
      (totalQuantity > 0
        ? Number((((invoice?.amount || 0) / (1 + taxPercentage / 100)) / totalQuantity).toFixed(2))
        : 0);

    const taxableAmount = Number(
      order.products
        .reduce((sum, product) => sum + (Number(product.quantity) || 0) * ratePerUnit, 0)
        .toFixed(2)
    );

    const cgstRate = Number((taxPercentage / 2).toFixed(2));
    const sgstRate = Number((taxPercentage / 2).toFixed(2));
    const cgstAmount = Number((taxableAmount * (cgstRate / 100)).toFixed(2));
    const sgstAmount = Number((taxableAmount * (sgstRate / 100)).toFixed(2));
    const calculatedTotal = Number((taxableAmount + cgstAmount + sgstAmount).toFixed(2));
    const finalAmount = Number((invoice?.amount || calculatedTotal).toFixed(2));
    const roundOff = Number((finalAmount - calculatedTotal).toFixed(2));

    const formatMoney = (value: number) => value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    const invoiceDate = new Date(invoice?.generatedAt || order.updatedAt || order.createdAt).toLocaleDateString('en-GB');
    const hsnCode = '7216';
    const billNumber = invoice?.billNumber || order.orderNumber;
    const vehicleNumber = order.vehicle?.number || 'N/A';
    const dispatchDate = order.weights?.slipUrl || invoiceDate;
    
    const invoiceHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Invoice #${invoice?.billNumber || 'N/A'}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 16px; color: #111; }
          .title { text-align: center; font-weight: 700; margin-bottom: 8px; font-size: 18px; }
          .box { border: 1px solid #000; }
          .row { display: flex; border-bottom: 1px solid #000; }
          .row:last-child { border-bottom: 0; }
          .col { padding: 6px 8px; border-right: 1px solid #000; font-size: 12px; }
          .col:last-child { border-right: 0; }
          .w-40 { width: 40%; }
          .w-30 { width: 30%; }
          .w-20 { width: 20%; }
          .w-10 { width: 10%; }
          .label { font-weight: 700; }
          .items th, .items td { border: 1px solid #000; padding: 6px; font-size: 12px; }
          .items { width: 100%; border-collapse: collapse; margin-top: 0; }
          .right { text-align: right; }
          .center { text-align: center; }
          .totals { margin-top: 8px; width: 100%; border-collapse: collapse; }
          .totals td { border: 1px solid #000; padding: 6px; font-size: 12px; }
          .footnote { margin-top: 10px; font-size: 11px; }
          .print-actions { margin-top: 20px; text-align: center; }
          .btn { padding: 8px 16px; border-radius: 4px; border: none; cursor: pointer; }
          .btn-primary { background: #0d6efd; color: #fff; }
          .btn-secondary { background: #6c757d; color: #fff; margin-left: 8px; }
          @media print { .print-actions { display: none; } body { margin: 0; } }
        </style>
      </head>
      <body>
        <div class="title">Tax Invoice</div>
        <div class="box">
          <div class="row">
            <div class="col w-40">
              <div class="label">BHOPAL ISPAT PVT. LTD.</div>
              <div>Vidisha Road, Bhopal, MP</div>
              <div>GSTIN: 23AAKCB2691R1Z3</div>
              <div>State Code: 23</div>
            </div>
            <div class="col w-20">
              <div class="label">Invoice No.</div>
              <div>BIPL/25-26/${billNumber}</div>
            </div>
            <div class="col w-20">
              <div class="label">Dated</div>
              <div>${invoiceDate}</div>
            </div>
            <div class="col w-20">
              <div class="label">Mode/Terms</div>
              <div>By Road</div>
            </div>
          </div>

          <div class="row">
            <div class="col w-40">
              <div class="label">Consignee (Ship To)</div>
              <div>${order.customerOrSupplier}</div>
              <div>Bhopal, Madhya Pradesh</div>
            </div>
            <div class="col w-20">
              <div class="label">Dispatch Doc No.</div>
              <div>${order.orderNumber}</div>
            </div>
            <div class="col w-20">
              <div class="label">Delivery Note Date</div>
              <div>${dispatchDate}</div>
            </div>
            <div class="col w-20">
              <div class="label">Vehicle No.</div>
              <div>${vehicleNumber}</div>
            </div>
          </div>

          <table class="items">
            <thead>
              <tr>
                <th class="center" style="width:6%">S. No.</th>
                <th style="width:36%">Description of Goods</th>
                <th class="center" style="width:12%">HSN/SAC</th>
                <th class="right" style="width:12%">Quantity</th>
                <th class="right" style="width:14%">Rate</th>
                <th class="center" style="width:8%">Per</th>
                <th class="right" style="width:12%">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${order.products.map((product, idx) => {
                const qty = Number(product.quantity) || 0;
                const amount = Number((qty * ratePerUnit).toFixed(2));
                return `
                  <tr>
                    <td class="center">${idx + 1}</td>
                    <td>${product.name} ${product.dimensions ? ` ${product.dimensions}` : ''}</td>
                    <td class="center">${hsnCode}</td>
                    <td class="right">${qty.toFixed(3)}</td>
                    <td class="right">${formatMoney(ratePerUnit)}</td>
                    <td class="center">${product.unit || 'MT'}</td>
                    <td class="right">${formatMoney(amount)}</td>
                  </tr>
                `;
              }).join('')}
              <tr>
                <td colspan="6" class="right"><b>Taxable Value</b></td>
                <td class="right"><b>${formatMoney(taxableAmount)}</b></td>
              </tr>
              <tr>
                <td colspan="6" class="right"><b>CGST ${cgstRate}%</b></td>
                <td class="right"><b>${formatMoney(cgstAmount)}</b></td>
              </tr>
              <tr>
                <td colspan="6" class="right"><b>SGST ${sgstRate}%</b></td>
                <td class="right"><b>${formatMoney(sgstAmount)}</b></td>
              </tr>
              <tr>
                <td colspan="6" class="right"><b>Round Off</b></td>
                <td class="right"><b>${formatMoney(roundOff)}</b></td>
              </tr>
              <tr>
                <td colspan="6" class="right"><b>Total</b></td>
                <td class="right"><b>${formatMoney(finalAmount)}</b></td>
              </tr>
            </tbody>
          </table>

          <table class="totals">
            <tr>
              <td style="width:50%"><b>Weight Details</b><br/>Empty: ${order.weights?.emptyWeight || 0} kg<br/>Final: ${order.weights?.finalWeight || 0} kg<br/>Net: ${order.netWeight || 0} kg</td>
              <td style="width:50%"><b>Fare Details</b><br/>Amount: ${fare?.amount ? `INR ${formatMoney(fare.amount)}` : 'N/A'}<br/>Paid By: ${fare?.paidBy === 'our_side' ? 'Our Side' : fare?.paidBy === 'other_party' ? 'Other Party' : 'N/A'}<br/>Payment: ${fare?.paymentStatus || 'N/A'}</td>
            </tr>
          </table>

          <div class="footnote">
            <div><b>Amount in Words:</b> INR ${Math.round(finalAmount).toLocaleString('en-IN')} only</div>
            <div style="margin-top:6px;">This is a computer generated invoice.</div>
            ${invoice?.invoiceNotes ? `<div style="margin-top:6px;"><b>Notes:</b> ${invoice.invoiceNotes}</div>` : ''}
          </div>
        </div>
        <div class="print-actions">
          <button class="btn btn-primary" onclick="window.print()">Print Invoice</button>
          <button class="btn btn-secondary" onclick="window.close()">Close</button>
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
                    Payment
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
                    <td colSpan={10} className="px-6 py-8 text-center text-gray-500">
                      Loading orders...
                    </td>
                  </tr>
                ) : filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-6 py-8 text-center text-gray-500">
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
                        {order.invoice?.fare?.paymentStatus ? (
                          <Badge
                            variant={order.invoice.fare.paymentStatus === 'paid' ? 'success' : 'warning'}
                            size="sm"
                          >
                            {order.invoice.fare.paymentStatus}
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
                              {order.type === 'dispatch' && order.status === 'ready_for_billing' && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  icon={FileText}
                                  onClick={() => openInvoiceModal(order)}
                                >
                                  Generate Invoice
                                </Button>
                              )}
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
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payment Status
                </label>
                <div className="space-y-2">
                  <label className="flex items-center p-3 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
                    <input
                      type="radio"
                      name="paymentStatus"
                      value="paid"
                      checked={fareForm.paymentStatus === 'paid'}
                      onChange={(e) => setFareForm(prev => ({ ...prev, paymentStatus: e.target.value as 'paid' | 'unpaid' }))}
                      className="mr-3"
                    />
                    <div>
                      <div className="font-medium text-gray-900">Paid</div>
                      <div className="text-sm text-gray-500">Fare has been settled</div>
                    </div>
                  </label>
                  <label className="flex items-center p-3 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
                    <input
                      type="radio"
                      name="paymentStatus"
                      value="unpaid"
                      checked={fareForm.paymentStatus === 'unpaid'}
                      onChange={(e) => setFareForm(prev => ({ ...prev, paymentStatus: e.target.value as 'paid' | 'unpaid' }))}
                      className="mr-3"
                    />
                    <div>
                      <div className="font-medium text-gray-900">Unpaid</div>
                      <div className="text-sm text-gray-500">Fare is pending payment</div>
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