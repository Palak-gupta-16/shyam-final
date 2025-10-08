import React, { useState, useEffect, useCallback } from 'react';
import { 
  Store, 
  Plus, 
  Search, 
  User,
  Calendar,
  CheckCircle,
  Clock,
  AlertTriangle,
  FileText
} from 'lucide-react';
import DashboardLayout from '../components/layout/DashboardLayout';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import Modal from '../components/common/Modal';
import Badge from '../components/common/Badge';
import Table from '../components/common/Table';
import { storeAPI } from '../services/api';
import { StoreIssuance } from '../types';
// import { useAuth } from '../context/AuthContext';

const StoreIssuances: React.FC = () => {
  // const { user } = useAuth(); // User auth context available if needed
  const [issuances, setIssuances] = useState<StoreIssuance[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [selectedIssuance, setSelectedIssuance] = useState<StoreIssuance | null>(null);

  const fetchIssuances = useCallback(async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (selectedStatus !== 'all') params.status = selectedStatus;
      
      const data = await storeAPI.getIssuanceStats();
      setIssuances(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching store issuances:', error);
      setIssuances([]);
    } finally {
      setLoading(false);
    }
  }, [selectedStatus]);

  useEffect(() => {
    fetchIssuances();
  }, [fetchIssuances]);



  const handleApprove = async (issuanceId: string, approvalData: any) => {
    try {
      // Note: This would need to be implemented in the API
      console.log('Approving issuance:', issuanceId, approvalData);
      fetchIssuances();
      setShowApproveModal(false);
      setSelectedIssuance(null);
    } catch (error) {
      console.error('Error approving issuance:', error);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'issued':
        return <Badge variant="success" size="sm" dot>Issued</Badge>;
      case 'returned':
        return <Badge variant="primary" size="sm" dot>Returned</Badge>;
      default:
        return <Badge variant="warning" size="sm" dot>Pending</Badge>;
    }
  };



  const getStats = () => {
    return [
      {
        title: 'Total Requests',
        value: issuances.length,
        icon: Store,
        color: 'primary' as const,
      },
      {
        title: 'Pending Approval',
        value: issuances.filter(i => !i.returned).length,
        icon: Clock,
        color: 'warning' as const,
      },
      {
        title: 'Approved',
        value: issuances.filter(i => i.returned).length,
        icon: CheckCircle,
        color: 'success' as const,
      },
      {
        title: 'High Priority',
        value: issuances.filter(i => i.returnExpected).length,
        icon: AlertTriangle,
        color: 'error' as const,
      },
    ];
  };

  const filteredIssuances = issuances.filter(issuance =>
    issuance.issuedTo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    issuance.item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (issuance.purpose || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const columns = [
    {
      key: '_id',
      title: 'Request ID',
      render: (value: string) => (
        <span className="font-mono text-sm">#{value.slice(-6)}</span>
      ),
    },
    {
      key: 'issuedTo',
      title: 'Issued To',
      render: (value: string) => (
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-blue-50 rounded-lg">
            <User className="h-4 w-4 text-blue-600" />
          </div>
          <div>
            <div className="font-medium text-gray-900">{value}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'item',
      title: 'Item',
      render: (item: any) => (
        <div>
          <div className="font-medium">{item.name}</div>
          <div className="text-sm text-gray-500">Qty: {item.quantity} {item.unit}</div>
        </div>
      ),
    },
    {
      key: 'purpose',
      title: 'Purpose',
      render: (value: string) => (
        <span className="text-gray-900 max-w-xs truncate block">{value}</span>
      ),
    },
    {
      key: 'returnExpected',
      title: 'Return Expected',
      render: (value: boolean) => (
        <Badge variant={value ? "warning" : "secondary"} size="sm">
          {value ? "Yes" : "No"}
        </Badge>
      ),
    },
    {
      key: 'returned',
      title: 'Status',
      render: (value: boolean) => getStatusBadge(value ? 'returned' : 'issued'),
    },
    {
      key: 'createdAt',
      title: 'Created',
      render: (value: string) => (
        <div className="flex items-center space-x-2">
          <Calendar className="h-4 w-4 text-gray-400" />
          <span className="text-sm text-gray-600">
            {new Date(value).toLocaleDateString()}
          </span>
        </div>
      ),
    },
    {
      key: 'actions',
      title: 'Actions',
      render: (_: any, record: StoreIssuance) => (
        <div className="flex items-center space-x-2">
          {!record.returned && (
            <Button
              variant="success"
              size="sm"
              icon={CheckCircle}
              onClick={() => {
                setSelectedIssuance(record);
                setShowApproveModal(true);
              }}
            >
              Issue
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            icon={FileText}
            onClick={() => {
              // View details logic
            }}
          >
            View
          </Button>
        </div>
      ),
    },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Store Issuances</h1>
            <p className="text-gray-600 mt-2">Manage store item requests and approvals</p>
          </div>
          <Button
            icon={Plus}
            onClick={() => setShowCreateModal(true)}
          >
            New Request
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {getStats().map((stat, index) => (
            <Card key={index}>
              <Card.Body>
                <div className="flex items-center">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
                  </div>
                  <div className={`p-3 rounded-lg bg-${stat.color === 'primary' ? 'blue' : stat.color}-50`}>
                    <stat.icon className={`h-6 w-6 text-${stat.color === 'primary' ? 'blue' : stat.color}-600`} />
                  </div>
                </div>
              </Card.Body>
            </Card>
          ))}
        </div>

        {/* Filters and Search */}
        <Card>
          <Card.Body>
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <Input
                  placeholder="Search by requester, items, or purpose..."
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
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="issued">Issued</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
            </div>
          </Card.Body>
        </Card>

        {/* Issuances Table */}
        <Table
          columns={columns}
          data={filteredIssuances}
          loading={loading}
          emptyText="No store issuances found"
        />

        {/* Create Issuance Modal */}
        <CreateIssuanceModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            fetchIssuances();
          }}
        />

        {/* Approve Issuance Modal */}
        {selectedIssuance && (
          <ApproveIssuanceModal
            isOpen={showApproveModal}
            onClose={() => {
              setShowApproveModal(false);
              setSelectedIssuance(null);
            }}
            issuance={selectedIssuance}
            onApprove={handleApprove}
          />
        )}
      </div>
    </DashboardLayout>
  );
};

// Create Issuance Modal
const CreateIssuanceModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}> = ({ isOpen, onClose, onSuccess }) => {
  const [items, setItems] = useState([{ sku: '', name: '', quantity: 1 }]);
  const [purpose, setPurpose] = useState('');
  const [priority, setPriority] = useState('medium');
  const [loading, setLoading] = useState(false);

  const addItem = () => {
    setItems([...items, { sku: '', name: '', quantity: 1 }]);
  };

  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const updateItem = (index: number, field: string, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      await storeAPI.issueStoreItem({
        issuedTo: 'Employee Name', // This would come from form
        item: {
          name: items[0]?.name || '',
          quantity: items[0]?.quantity || 0,
          unit: 'pieces',
        },
        purpose,
        department: 'Production',
        returnExpected: priority === 'high',
      });
      onSuccess();
      setItems([{ sku: '', name: '', quantity: 1 }]);
      setPurpose('');
      setPriority('medium');
    } catch (error) {
      console.error('Error creating issuance:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create Store Issuance Request" size="lg">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Items Section */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <label className="block text-sm font-medium text-gray-700">Items Requested</label>
            <Button type="button" variant="secondary" size="sm" onClick={addItem}>
              Add Item
            </Button>
          </div>
          
          <div className="space-y-3">
            {items.map((item, index) => (
              <div key={index} className="grid grid-cols-12 gap-3 items-end">
                <div className="col-span-4">
                  <Input
                    placeholder="SKU"
                    value={item.sku}
                    onChange={(e) => updateItem(index, 'sku', e.target.value)}
                    required
                  />
                </div>
                <div className="col-span-5">
                  <Input
                    placeholder="Item Name"
                    value={item.name}
                    onChange={(e) => updateItem(index, 'name', e.target.value)}
                    required
                  />
                </div>
                <div className="col-span-2">
                  <Input
                    type="number"
                    placeholder="Qty"
                    min="1"
                    value={item.quantity}
                    onChange={(e) => updateItem(index, 'quantity', Number(e.target.value))}
                    required
                  />
                </div>
                <div className="col-span-1">
                  {items.length > 1 && (
                    <Button
                      type="button"
                      variant="danger"
                      size="sm"
                      onClick={() => removeItem(index)}
                    >
                      ×
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Purpose */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Purpose</label>
          <textarea
            value={purpose}
            onChange={(e) => setPurpose(e.target.value)}
            placeholder="Describe the purpose for these items..."
            required
            rows={3}
            className="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          />
        </div>

        {/* Priority */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </div>

        <div className="flex justify-end space-x-3 pt-4">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={loading}>
            Submit Request
          </Button>
        </div>
      </form>
    </Modal>
  );
};

// Approve Issuance Modal
const ApproveIssuanceModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  issuance: StoreIssuance;
  onApprove: (id: string, data: any) => void;
}> = ({ isOpen, onClose, issuance, onApprove }) => {
  const [approvedQuantities, setApprovedQuantities] = useState<Record<string, number>>({});
  const [notes, setNotes] = useState('');

  useEffect(() => {
    const quantities: Record<string, number> = {};
    quantities[0] = issuance.item.quantity;
    setApprovedQuantities(quantities);
  }, [issuance]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const approvedItems = {
      ...issuance.item,
      approvedQuantity: approvedQuantities[0] || 0,
    };

    onApprove(issuance._id, {
      item: approvedItems,
      notes,
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Approve Store Issuance" size="lg">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Request Details */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h4 className="font-medium text-gray-900 mb-2">Request Details</h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-600">Requested by:</span>
              <span className="ml-2 font-medium">{issuance.issuedTo}</span>
            </div>
            <div>
              <span className="text-gray-600">Priority:</span>
              <span className="ml-2">
                <Badge variant={issuance.returnExpected ? "warning" : "secondary"} size="sm">
                  {issuance.returnExpected ? "Return Expected" : "No Return"}
                </Badge>
              </span>
            </div>
            <div className="col-span-2">
              <span className="text-gray-600">Purpose:</span>
              <p className="mt-1 text-gray-900">{issuance.purpose}</p>
            </div>
          </div>
        </div>

        {/* Items Approval */}
        <div>
          <h4 className="font-medium text-gray-900 mb-3">Approve Quantities</h4>
          <div className="space-y-3">
            <div className="grid grid-cols-12 gap-3 items-center p-3 bg-gray-50 rounded-lg">
              <div className="col-span-3">
                <span className="font-medium text-gray-900">{issuance.item.name}</span>
              </div>
              <div className="col-span-4">
                <span className="text-gray-700">{issuance.item.unit}</span>
              </div>
              <div className="col-span-2 text-center">
                <span className="text-sm text-gray-600">Requested: {issuance.item.quantity}</span>
              </div>
              <div className="col-span-3">
                <Input
                  type="number"
                  min="0"
                  max={issuance.item.quantity}
                  value={approvedQuantities[0] || 0}
                  onChange={(e) => setApprovedQuantities(prev => ({
                    ...prev,
                    0: Number(e.target.value)
                  }))}
                  placeholder="Approved qty"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Approval Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Any notes or conditions for approval..."
            rows={3}
            className="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          />
        </div>

        <div className="flex justify-end space-x-3 pt-4">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="success">
            Approve Request
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default StoreIssuances;
