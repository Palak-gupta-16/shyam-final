import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Store,
  Plus,
  Search,
  User,
  Calendar,
  CheckCircle,
  Clock,
  AlertTriangle,
  Wrench,
  Trash2,
  Send,
  XCircle,
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

const lifecycleStatuses = [
  'raised',
  'approved',
  'rejected',
  'issued',
  'returned',
  'under_repair',
  'repaired',
  'scrapped',
] as const;

type LifecycleStatus = typeof lifecycleStatuses[number];

type ActionType =
  | 'approve'
  | 'reject'
  | 'issue'
  | 'return'
  | 'under_repair'
  | 'repair'
  | 'scrap';

const statusLabel = (status: LifecycleStatus) => {
  switch (status) {
    case 'raised':
      return 'Raised';
    case 'approved':
      return 'Approved';
    case 'rejected':
      return 'Rejected';
    case 'issued':
      return 'Issued';
    case 'returned':
      return 'Returned';
    case 'under_repair':
      return 'Under Repair';
    case 'repaired':
      return 'Repaired';
    case 'scrapped':
      return 'Scrapped';
    default:
      return status;
  }
};

const getStatusBadge = (status: LifecycleStatus) => {
  switch (status) {
    case 'raised':
      return <Badge variant="warning" size="sm" dot>Raised</Badge>;
    case 'approved':
      return <Badge variant="primary" size="sm" dot>Approved</Badge>;
    case 'rejected':
      return <Badge variant="error" size="sm" dot>Rejected</Badge>;
    case 'issued':
      return <Badge variant="success" size="sm" dot>Issued</Badge>;
    case 'returned':
      return <Badge variant="secondary" size="sm" dot>Returned</Badge>;
    case 'under_repair':
      return <Badge variant="warning" size="sm" dot>Under Repair</Badge>;
    case 'repaired':
      return <Badge variant="success" size="sm" dot>Repaired</Badge>;
    case 'scrapped':
      return <Badge variant="error" size="sm" dot>Scrapped</Badge>;
    default:
      return <Badge variant="secondary" size="sm" dot>{status}</Badge>;
  }
};

const StoreIssuances: React.FC = () => {
  const [issuances, setIssuances] = useState<StoreIssuance[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [actionIssuance, setActionIssuance] = useState<StoreIssuance | null>(null);
  const [actionType, setActionType] = useState<ActionType | null>(null);

  const fetchIssuances = useCallback(async () => {
    try {
      setLoading(true);
      const response = await storeAPI.getStoreIssuances(
        selectedStatus !== 'all' ? { status: selectedStatus } : undefined
      );
      setIssuances(response.issuances || []);
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

  const filteredIssuances = useMemo(() => {
    return issuances.filter((issuance) => {
      const value = searchTerm.toLowerCase();
      return (
        issuance.issuedTo.toLowerCase().includes(value) ||
        issuance.item.name.toLowerCase().includes(value) ||
        (issuance.purpose || '').toLowerCase().includes(value) ||
        (issuance.department || '').toLowerCase().includes(value)
      );
    });
  }, [issuances, searchTerm]);

  const stats = useMemo(() => {
    const byStatus = (status: LifecycleStatus) => issuances.filter((item) => item.status === status).length;

    return [
      { title: 'Total Requests', value: issuances.length, icon: Store, color: 'primary' as const },
      { title: 'Raised', value: byStatus('raised'), icon: Clock, color: 'warning' as const },
      { title: 'Issued', value: byStatus('issued'), icon: Send, color: 'success' as const },
      { title: 'Under Repair', value: byStatus('under_repair'), icon: AlertTriangle, color: 'error' as const },
    ];
  }, [issuances]);

  const triggerAction = (issuance: StoreIssuance, action: ActionType) => {
    setActionIssuance(issuance);
    setActionType(action);
  };

  const closeActionModal = () => {
    setActionIssuance(null);
    setActionType(null);
  };

  const renderActions = (record: StoreIssuance) => {
    const actions: React.ReactNode[] = [];

    if (record.status === 'raised') {
      actions.push(
        <Button key="approve" variant="success" size="sm" icon={CheckCircle} onClick={() => triggerAction(record, 'approve')}>
          Approve
        </Button>
      );
      actions.push(
        <Button key="reject" variant="danger" size="sm" icon={XCircle} onClick={() => triggerAction(record, 'reject')}>
          Reject
        </Button>
      );
    }

    if (record.status === 'approved') {
      actions.push(
        <Button key="issue" variant="primary" size="sm" icon={Send} onClick={() => triggerAction(record, 'issue')}>
          Issue
        </Button>
      );
    }

    if (record.status === 'issued') {
      actions.push(
        <Button key="return" variant="secondary" size="sm" icon={CheckCircle} onClick={() => triggerAction(record, 'return')}>
          Return
        </Button>
      );
      actions.push(
        <Button key="repair" variant="warning" size="sm" icon={Wrench} onClick={() => triggerAction(record, 'under_repair')}>
          Under Repair
        </Button>
      );
      actions.push(
        <Button key="scrap" variant="danger" size="sm" icon={Trash2} onClick={() => triggerAction(record, 'scrap')}>
          Scrap
        </Button>
      );
    }

    if (record.status === 'under_repair') {
      actions.push(
        <Button key="mark-repaired" variant="success" size="sm" icon={Wrench} onClick={() => triggerAction(record, 'repair')}>
          Mark Repaired
        </Button>
      );
      actions.push(
        <Button key="scrap-from-repair" variant="danger" size="sm" icon={Trash2} onClick={() => triggerAction(record, 'scrap')}>
          Scrap
        </Button>
      );
    }

    if (actions.length === 0) {
      return <span className="text-sm text-gray-400 italic">No actions</span>;
    }

    return <div className="flex flex-wrap gap-2">{actions}</div>;
  };

  const columns = [
    {
      key: '_id',
      title: 'Request ID',
      render: (value: string) => <span className="font-mono text-sm">#{value.slice(-6)}</span>,
    },
    {
      key: 'issuedTo',
      title: 'Requested For',
      render: (value: string, record: StoreIssuance) => (
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-blue-50 rounded-lg">
            <User className="h-4 w-4 text-blue-600" />
          </div>
          <div>
            <div className="font-medium text-gray-900">{value}</div>
            <div className="text-sm text-gray-500">{record.department || 'No Department'}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'item',
      title: 'Item',
      render: (item: StoreIssuance['item'], record: StoreIssuance) => (
        <div>
          <div className="font-medium">{item.name}</div>
          <div className="text-sm text-gray-500">
            Requested: {item.quantity} {item.unit}
            {record.approvedQuantity ? ` | Approved: ${record.approvedQuantity} ${item.unit}` : ''}
          </div>
        </div>
      ),
    },
    {
      key: 'status',
      title: 'Status',
      render: (value: LifecycleStatus) => getStatusBadge(value),
    },
    {
      key: 'purpose',
      title: 'Purpose',
      render: (value: string) => <span className="text-gray-900 max-w-xs truncate block">{value || 'N/A'}</span>,
    },
    {
      key: 'createdAt',
      title: 'Created',
      render: (value: string) => (
        <div className="flex items-center space-x-2">
          <Calendar className="h-4 w-4 text-gray-400" />
          <span className="text-sm text-gray-600">{new Date(value).toLocaleDateString()}</span>
        </div>
      ),
    },
    {
      key: 'actions',
      title: 'Actions',
      render: (_: unknown, record: StoreIssuance) => renderActions(record),
    },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Store Requests</h1>
            <p className="text-gray-600 mt-2">Manage raise, approval, issue, return, repair, and scrap lifecycle</p>
          </div>
          <Button icon={Plus} onClick={() => setShowCreateModal(true)}>
            Raise Request
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat) => (
            <Card key={stat.title}>
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

        <Card>
          <Card.Body>
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <Input
                  placeholder="Search by name, item, department, or purpose"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  icon={Search}
                />
              </div>
              <div>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="all">All Status</option>
                  {lifecycleStatuses.map((status) => (
                    <option key={status} value={status}>{statusLabel(status)}</option>
                  ))}
                </select>
              </div>
            </div>
          </Card.Body>
        </Card>

        <Table columns={columns} data={filteredIssuances} loading={loading} emptyText="No store requests found" />

        <CreateRequestModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            fetchIssuances();
          }}
        />

        {actionIssuance && actionType && (
          <LifecycleActionModal
            isOpen={Boolean(actionIssuance && actionType)}
            onClose={closeActionModal}
            issuance={actionIssuance}
            actionType={actionType}
            onDone={() => {
              closeActionModal();
              fetchIssuances();
            }}
          />
        )}
      </div>
    </DashboardLayout>
  );
};

const CreateRequestModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}> = ({ isOpen, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    issuedTo: '',
    department: '',
    employeeId: '',
    itemName: '',
    quantity: 1,
    unit: 'pieces',
    purpose: '',
    returnExpected: false,
    remarks: '',
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      await storeAPI.issueStoreItem({
        issuedTo: formData.issuedTo,
        department: formData.department,
        employeeId: formData.employeeId,
        item: {
          name: formData.itemName,
          quantity: Number(formData.quantity),
          unit: formData.unit,
        },
        purpose: formData.purpose,
        returnExpected: formData.returnExpected,
        remarks: formData.remarks,
      });
      onSuccess();
      setFormData({
        issuedTo: '',
        department: '',
        employeeId: '',
        itemName: '',
        quantity: 1,
        unit: 'pieces',
        purpose: '',
        returnExpected: false,
        remarks: '',
      });
    } catch (error) {
      console.error('Error raising request:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Raise Store Request" size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Requested For"
          value={formData.issuedTo}
          onChange={(e) => setFormData((prev) => ({ ...prev, issuedTo: e.target.value }))}
          required
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Department"
            value={formData.department}
            onChange={(e) => setFormData((prev) => ({ ...prev, department: e.target.value }))}
          />
          <Input
            label="Employee ID"
            value={formData.employeeId}
            onChange={(e) => setFormData((prev) => ({ ...prev, employeeId: e.target.value }))}
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Input
            label="Item Name"
            value={formData.itemName}
            onChange={(e) => setFormData((prev) => ({ ...prev, itemName: e.target.value }))}
            required
          />
          <Input
            label="Quantity"
            type="number"
            min="1"
            value={String(formData.quantity)}
            onChange={(e) => setFormData((prev) => ({ ...prev, quantity: Number(e.target.value) || 1 }))}
            required
          />
          <Input
            label="Unit"
            value={formData.unit}
            onChange={(e) => setFormData((prev) => ({ ...prev, unit: e.target.value }))}
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Purpose</label>
          <textarea
            value={formData.purpose}
            onChange={(e) => setFormData((prev) => ({ ...prev, purpose: e.target.value }))}
            rows={3}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <label className="flex items-center space-x-3">
          <input
            type="checkbox"
            checked={formData.returnExpected}
            onChange={(e) => setFormData((prev) => ({ ...prev, returnExpected: e.target.checked }))}
          />
          <span className="text-sm text-gray-700">Return expected</span>
        </label>
        <Input
          label="Remarks"
          value={formData.remarks}
          onChange={(e) => setFormData((prev) => ({ ...prev, remarks: e.target.value }))}
        />

        <div className="flex justify-end space-x-2 pt-2">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={loading}>Raise Request</Button>
        </div>
      </form>
    </Modal>
  );
};

const LifecycleActionModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  issuance: StoreIssuance;
  actionType: ActionType;
  onDone: () => void;
}> = ({ isOpen, onClose, issuance, actionType, onDone }) => {
  const [approvedQuantity, setApprovedQuantity] = useState<number>(issuance.item.quantity);
  const [quantity, setQuantity] = useState<number>(issuance.approvedQuantity || issuance.item.quantity);
  const [reason, setReason] = useState('');
  const [remarks, setRemarks] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setApprovedQuantity(issuance.item.quantity);
    setQuantity(issuance.approvedQuantity || issuance.item.quantity);
    setReason('');
    setRemarks('');
  }, [issuance, actionType]);

  const actionTitleMap: Record<ActionType, string> = {
    approve: 'Approve Request',
    reject: 'Reject Request',
    issue: 'Issue Approved Request',
    return: 'Mark Returned',
    under_repair: 'Move To Under Repair',
    repair: 'Mark Repaired',
    scrap: 'Mark Scrapped',
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);

      if (actionType === 'approve') {
        await storeAPI.approveStoreRequest(issuance._id, { approvedQuantity: Number(approvedQuantity), remarks });
      } else if (actionType === 'reject') {
        await storeAPI.rejectStoreRequest(issuance._id, { reason, remarks });
      } else if (actionType === 'issue') {
        await storeAPI.markStoreIssued(issuance._id, { remarks });
      } else if (actionType === 'return') {
        await storeAPI.returnStoreItem(issuance._id, { quantity: Number(quantity), remarks });
      } else if (actionType === 'under_repair') {
        await storeAPI.markStoreUnderRepair(issuance._id, { remarks });
      } else if (actionType === 'repair') {
        await storeAPI.markStoreRepaired(issuance._id, { quantity: Number(quantity), remarks });
      } else if (actionType === 'scrap') {
        await storeAPI.markStoreScrapped(issuance._id, { remarks });
      }

      onDone();
    } catch (error) {
      console.error('Lifecycle action failed:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={actionTitleMap[actionType]} size="md">
      <form onSubmit={submit} className="space-y-4">
        <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-700">
          <div><strong>Item:</strong> {issuance.item.name}</div>
          <div><strong>Requested:</strong> {issuance.item.quantity} {issuance.item.unit}</div>
          <div><strong>Current Status:</strong> {statusLabel(issuance.status)}</div>
        </div>

        {actionType === 'approve' && (
          <Input
            label="Approved Quantity"
            type="number"
            min="1"
            max={String(issuance.item.quantity)}
            value={String(approvedQuantity)}
            onChange={(e) => setApprovedQuantity(Number(e.target.value) || 1)}
            required
          />
        )}

        {(actionType === 'return' || actionType === 'repair') && (
          <Input
            label="Quantity"
            type="number"
            min="1"
            max={String(issuance.approvedQuantity || issuance.item.quantity)}
            value={String(quantity)}
            onChange={(e) => setQuantity(Number(e.target.value) || 1)}
            required
          />
        )}

        {actionType === 'reject' && (
          <Input
            label="Rejection Reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            required
          />
        )}

        <Input
          label="Remarks"
          value={remarks}
          onChange={(e) => setRemarks(e.target.value)}
        />

        <div className="flex justify-end space-x-2 pt-2">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={loading}>Confirm</Button>
        </div>
      </form>
    </Modal>
  );
};

export default StoreIssuances;
