import React, { useState, useEffect, useCallback } from 'react';
import { 
  Shield, 
  Plus, 
  Search, 
  Clock,
  CheckCircle,
  XCircle,
  Truck,
  User,
  Calendar
} from 'lucide-react';
import DashboardLayout from '../components/layout/DashboardLayout';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import Modal from '../components/common/Modal';
import Badge from '../components/common/Badge';
import Table from '../components/common/Table';
import { gatePassAPI } from '../services/api';
import { GatePass } from '../types';
import { useAuth } from '../context/AuthContext';
// import { useAuth } from '../context/AuthContext';

const GatePasses: React.FC = () => {
  const { hasRole } = useAuth();// User auth context available if needed
  const [gatePasses, setGatePasses] = useState<GatePass[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedGatePass, setSelectedGatePass] = useState<GatePass | null>(null);

  const fetchGatePasses = useCallback(async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (selectedStatus !== 'all') params.status = selectedStatus;
      
      const response = await gatePassAPI.getGatePasses(params);
      setGatePasses(response.gatePasses || []);
    } catch (error) {
      console.error('Error fetching gate passes:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedStatus]);

  useEffect(() => {
    fetchGatePasses();
  }, [fetchGatePasses]);



  const handleApprove = async (gatePassId: string) => {
    try {
      await gatePassAPI.approveGatePass(gatePassId);
      fetchGatePasses();
    } catch (error) {
      console.error('Error approving gate pass:', error);
    }
  };

  const handleReject = async (gatePassId: string) => {
    try {
      await gatePassAPI.rejectGatePass(gatePassId, 'Rejected by guard');
      fetchGatePasses();
    } catch (error) {
      console.error('Error rejecting gate pass:', error);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge variant="success" size="sm" dot>Approved</Badge>;
      case 'rejected':
        return <Badge variant="error" size="sm" dot>Rejected</Badge>;
      default:
        return <Badge variant="warning" size="sm" dot>Pending</Badge>;
    }
  };

  const getStats = () => {
    return [
      {
        title: 'Total Requests',
        value: gatePasses.length,
        icon: Shield,
        color: 'primary' as const,
      },
      {
        title: 'Pending',
        value: gatePasses.filter(gp => gp.status === 'pending').length,
        icon: Clock,
        color: 'warning' as const,
      },
      {
        title: 'Approved',
        value: gatePasses.filter(gp => gp.status === 'approved').length,
        icon: CheckCircle,
        color: 'success' as const,
      },
      {
        title: 'Rejected',
        value: gatePasses.filter(gp => gp.status === 'rejected').length,
        icon: XCircle,
        color: 'error' as const,
      },
    ];
  };

  const filteredGatePasses = gatePasses.filter(gp =>
    gp.vehicle.number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    gp.vehicle.driverName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    gp.purpose.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const columns = [
    {
      key: '_id',
      title: 'ID',
      render: (value: string) => (
        <span className="font-mono text-sm">{value.slice(-6)}</span>
      ),
    },
    {
      key: 'vehicle',
      title: 'Vehicle Details',
      render: (_: any, record: GatePass) => (
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-blue-50 rounded-lg">
            <Truck className="h-4 w-4 text-blue-600" />
          </div>
          <div>
            <div className="font-medium text-gray-900">{record.vehicle.number}</div>
            <div className="text-sm text-gray-500">{record.vehicle.driverName}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'purpose',
      title: 'Purpose',
      render: (value: string) => (
        <span className="text-gray-900">{value}</span>
      ),
    },
    {
      key: 'requestBy',
      title: 'Requested By',
      render: (value: any) => (
        <div className="flex items-center space-x-2">
          <div className="p-1 bg-gray-100 rounded-full">
            <User className="h-3 w-3 text-gray-600" />
          </div>
          <span className="text-sm text-gray-900">{value?.name}</span>
        </div>
      ),
    },
    {
      key: 'status',
      title: 'Status',
      render: (value: string) => getStatusBadge(value),
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
      render: (_: any, record: GatePass) => (
        <div className="flex items-center space-x-2">
          {hasRole([ 'General_Manager', 'Director']) &&  record.status === 'pending' && (
            <>
              <Button
                variant="success"
                size="sm"
                icon={CheckCircle}
                onClick={() => handleApprove(record._id)}
              >
                Approve
              </Button>
              <Button
                variant="danger"
                size="sm"
                icon={XCircle}
                onClick={() => handleReject(record._id)}
              >
                Reject
              </Button>
            </>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSelectedGatePass(record);
              setShowDetailsModal(true);
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
            <h1 className="text-3xl font-bold text-gray-900">Gate Pass Management</h1>
            <p className="text-gray-600 mt-2">Manage vehicle entry and exit requests</p>
          </div>
          <Button
            icon={Plus}
            onClick={() => setShowCreateModal(true)}
          >
            New Gate Pass
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
                  placeholder="Search by vehicle number, driver name, or purpose..."
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
                  <option value="rejected">Rejected</option>
                </select>
              </div>
            </div>
          </Card.Body>
        </Card>

        {/* Gate Passes Table */}
        <Table
          columns={columns}
          data={filteredGatePasses}
          loading={loading}
          emptyText="No gate passes found"
        />

        {/* Create Gate Pass Modal */}
        <CreateGatePassModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            fetchGatePasses();
          }}
        />

        {/* Gate Pass Details Modal */}
        {selectedGatePass && (
          <GatePassDetailsModal
            isOpen={showDetailsModal}
            onClose={() => {
              setShowDetailsModal(false);
              setSelectedGatePass(null);
            }}
            gatePass={selectedGatePass}
          />
        )}
      </div>
    </DashboardLayout>
  );
};

// Create Gate Pass Modal
const CreateGatePassModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}> = ({ isOpen, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    vehicleNumber: '',
    driverName: '',
    purpose: '',
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      await gatePassAPI.createGatePass({
        vehicle: {
          number: formData.vehicleNumber,
          driverName: formData.driverName,
        },
        purpose: formData.purpose,
      });
      onSuccess();
      setFormData({ vehicleNumber: '', driverName: '', purpose: '' });
    } catch (error) {
      console.error('Error creating gate pass:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create New Gate Pass" size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Vehicle Number"
          value={formData.vehicleNumber}
          onChange={(e) => setFormData(prev => ({ ...prev, vehicleNumber: e.target.value }))}
          placeholder="e.g., XYZ123"
          required
          icon={Truck}
        />

        <Input
          label="Driver Name"
          value={formData.driverName}
          onChange={(e) => setFormData(prev => ({ ...prev, driverName: e.target.value }))}
          placeholder="Enter driver name"
          required
          icon={User}
        />

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Purpose of Visit
          </label>
          <textarea
            value={formData.purpose}
            onChange={(e) => setFormData(prev => ({ ...prev, purpose: e.target.value }))}
            placeholder="Describe the purpose of the visit..."
            required
            rows={3}
            className="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          />
        </div>

        <div className="flex justify-end space-x-3 pt-4">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={loading}>
            Create Gate Pass
          </Button>
        </div>
      </form>
    </Modal>
  );
};

// Gate Pass Details Modal
const GatePassDetailsModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  gatePass: GatePass;
}> = ({ isOpen, onClose, gatePass }) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Gate Pass Details" size="lg">
      <div className="space-y-6">
        {/* Status Banner */}
        <div className={`
          p-4 rounded-lg border-2 
          ${gatePass.status === 'approved' ? 'bg-green-50 border-green-200' : 
            gatePass.status === 'rejected' ? 'bg-red-50 border-red-200' : 
            'bg-yellow-50 border-yellow-200'}
        `}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {gatePass.status === 'approved' ? (
                <CheckCircle className="h-6 w-6 text-green-600" />
              ) : gatePass.status === 'rejected' ? (
                <XCircle className="h-6 w-6 text-red-600" />
              ) : (
                <Clock className="h-6 w-6 text-yellow-600" />
              )}
              <div>
                <h3 className="font-medium text-gray-900">
                  Gate Pass #{gatePass._id.slice(-6)}
                </h3>
                <p className="text-sm text-gray-600">
                  Status: {gatePass.status.charAt(0).toUpperCase() + gatePass.status.slice(1)}
                </p>
              </div>
            </div>
            {getStatusBadge(gatePass.status)}
          </div>
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-medium text-gray-500 mb-1">Vehicle Details</h4>
              <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                <Truck className="h-5 w-5 text-gray-600" />
                <div>
                  <p className="font-medium text-gray-900">{gatePass.vehicle.number}</p>
                  <p className="text-sm text-gray-600">Driver: {gatePass.vehicle.driverName}</p>
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-medium text-gray-500 mb-1">Purpose</h4>
              <p className="text-gray-900 bg-gray-50 p-3 rounded-lg">{gatePass.purpose}</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-medium text-gray-500 mb-1">Request Information</h4>
              <div className="space-y-2 bg-gray-50 p-3 rounded-lg">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Requested By:</span>
                  <span className="text-sm font-medium">{gatePass.requestBy.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Created:</span>
                  <span className="text-sm font-medium">
                    {new Date(gatePass.createdAt).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            {gatePass.status !== 'pending' && (
              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-1">
                  {gatePass.status === 'approved' ? 'Approval' : 'Rejection'} Details
                </h4>
                <div className="space-y-2 bg-gray-50 p-3 rounded-lg">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">
                      {gatePass.status === 'approved' ? 'Approved By:' : 'Rejected By:'}
                    </span>
                    <span className="text-sm font-medium">
                      {gatePass.approvedBy?.name || gatePass.rejectedBy?.name}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Date:</span>
                    <span className="text-sm font-medium">
                      {new Date(gatePass.approvedAt || gatePass.rejectedAt || '').toLocaleString()}
                    </span>
                  </div>
                  {gatePass.rejectionReason && (
                    <div>
                      <span className="text-sm text-gray-600">Reason:</span>
                      <p className="text-sm font-medium mt-1">{gatePass.rejectionReason}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <Button onClick={onClose}>Close</Button>
        </div>
      </div>
    </Modal>
  );
};

// Helper function for status badge (same as in component)
const getStatusBadge = (status: string) => {
  switch (status) {
    case 'approved':
      return <Badge variant="success" size="sm" dot>Approved</Badge>;
    case 'rejected':
      return <Badge variant="error" size="sm" dot>Rejected</Badge>;
    default:
      return <Badge variant="warning" size="sm" dot>Pending</Badge>;
  }
};

export default GatePasses;
