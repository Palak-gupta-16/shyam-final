import React, { useState, useEffect, useCallback } from 'react';
import { 
  Package, 
  Plus, 
  Search, 
  Edit3, 
  AlertTriangle,
  TrendingDown,
  Boxes,
  Factory,
  Store,
  Trash2
} from 'lucide-react';
import DashboardLayout from '../components/layout/DashboardLayout';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import Table from '../components/common/Table';
import Modal from '../components/common/Modal';
import Badge from '../components/common/Badge';
import { inventoryAPI } from '../services/api';
import { InventoryItem } from '../types';

const Inventory: React.FC = () => {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [filteredInventory, setFilteredInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);

  const inventoryTypes = [
    { value: 'all', label: 'All Items', icon: Package },
    { value: 'finished_product', label: 'Finished Products', icon: Boxes },
    { value: 'raw_material', label: 'Raw Materials', icon: Factory },
    { value: 'store_item', label: 'Store Items', icon: Store },
    { value: 'waste_material', label: 'Waste / Scrap', icon: Trash2 },
  ];

  const inventoryStatuses = [
    { value: 'all', label: 'All Status' },
    { value: 'available', label: 'Available' },
    { value: 'needed', label: 'Needed' },
    { value: 'low_stock', label: 'Low Stock' },
    { value: 'out_of_stock', label: 'Out of Stock' },
  ];

  useEffect(() => {
    fetchInventory();
  }, []);

  const filterInventory = useCallback(() => {
    let filtered = inventory;

    if (selectedType !== 'all') {
      filtered = filtered.filter(item => item.type === selectedType);
    }

    if (selectedStatus !== 'all') {
      filtered = filtered.filter(item => item.status === selectedStatus);
    }

    if (searchTerm) {
      filtered = filtered.filter(item =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredInventory(filtered);
  }, [inventory, searchTerm, selectedType, selectedStatus]);

  useEffect(() => {
    filterInventory();
  }, [filterInventory]);

  const fetchInventory = async () => {
    try {
      setLoading(true);
      const data = await inventoryAPI.getInventory();
      setInventory(data.inventory);
    } catch (error) {
      console.error('Error fetching inventory:', error);
    } finally {
      setLoading(false);
    }
  };



  const getStatusBadge = (item: InventoryItem) => {
    switch (item.status) {
      case 'out_of_stock':
        return <Badge variant="error" size="sm">Out of Stock</Badge>;
      case 'low_stock':
        return <Badge variant="warning" size="sm">Low Stock</Badge>;
      case 'needed':
        return <Badge variant="info" size="sm">Needed</Badge>;
      case 'available':
        return <Badge variant="success" size="sm">Available</Badge>;
      default:
        return <Badge variant="secondary" size="sm">{item.status}</Badge>;
    }
  };

  const getTypeIcon = (type: string) => {
    const typeConfig = inventoryTypes.find(t => t.value === type);
    const Icon = typeConfig?.icon || Package;
    return <Icon className="h-4 w-4" />;
  };

  const columns = [
    {
      key: 'sku',
      title: 'SKU',
      sortable: true,
      render: (value: string, record: InventoryItem) => (
        <div className="flex items-center space-x-2">
          <div className="p-1 bg-gray-100 rounded">
            {getTypeIcon(record.type)}
          </div>
          <span className="font-medium">{value}</span>
        </div>
      ),
    },
    {
      key: 'name',
      title: 'Item Name',
      sortable: true,
      render: (value: string, record: InventoryItem) => (
        <div>
          <div className="font-medium text-gray-900">{value}</div>
          {record.dimensions && (
            <div className="text-sm text-gray-500">{record.dimensions}</div>
          )}
        </div>
      ),
    },
    {
      key: 'type',
      title: 'Type',
      sortable: true,
      render: (value: string) => (
        <Badge variant="secondary" size="sm">
          {value.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
        </Badge>
      ),
    },
    {
      key: 'quantity',
      title: 'Quantity',
      sortable: true,
      align: 'right' as const,
      render: (value: number, record: InventoryItem) => (
        <div className="text-right">
          <div className="font-medium">{value.toLocaleString()}</div>
          <div className="text-sm text-gray-500">{record.unit}</div>
        </div>
      ),
    },
        {
      key: 'quantity',
      title: 'Quantity',
      sortable: true,
      align: 'right' as const,
      render: (value: number, record: InventoryItem) => (
        <div className="text-right">
          <div className="font-medium">{value.toLocaleString()}</div>
          <div className="text-sm text-gray-500">{record.unit}</div>
        </div>
      ),
    },
    {
      key: 'length',
      title: 'Length',
      sortable: true,
      align: 'right' as const,
      render: (value: number) => (
        <span className="text-gray-600">{value || 0}</span>
      ),
    },
    {
      key: 'status',
      title: 'Status',
      render: (_: any, record: InventoryItem) => getStatusBadge(record),
    },
    {
      key: 'location',
      title: 'Location',
      render: (value: string) => (
        <span className="text-gray-600">{value || '-'}</span>
      ),
    },
    {
      key: 'actions',
      title: 'Actions',
      render: (_: any, record: InventoryItem) => (
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="sm"
            icon={Edit3}
            onClick={() => {
              setSelectedItem(record);
              setShowEditModal(true);
            }}
          />
        </div>
      ),
    },
  ];

  const stats = [
    {
      title: 'Total Items',
      value: inventory.length,
      icon: Package,
      color: 'primary' as const,
    },
    {
      title: 'Low Stock Items',
      value: inventory.filter(item => item.status === 'low_stock').length,
      icon: AlertTriangle,
      color: 'warning' as const,
    },
    {
      title: 'Out of Stock',
      value: inventory.filter(item => item.status === 'out_of_stock').length,
      icon: TrendingDown,
      color: 'error' as const,
    },

  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Inventory Management</h1>
            <p className="text-gray-600 mt-2">Monitor and manage your factory inventory</p>
          </div>
          <Button
            icon={Plus}
            onClick={() => setShowAddModal(true)}
          >
            Add Item
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat, index) => (
            <Card key={index}>
              <Card.Body>
                <div className="flex items-center">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">
                      {typeof stat.value === 'number' ? stat.value.toLocaleString() : stat.value}
                    </p>
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
                  placeholder="Search by name, SKU, or description..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  icon={Search}
                />
              </div>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Type:</label>
                  <div className="flex gap-2">
                    {inventoryTypes.map((type) => (
                      <Button
                        key={type.value}
                        variant={selectedType === type.value ? 'primary' : 'secondary'}
                        size="sm"
                        icon={type.icon}
                        onClick={() => setSelectedType(type.value)}
                      >
                        {type.label}
                      </Button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Status:</label>
                  <div className="flex gap-2">
                    {inventoryStatuses.map((status) => (
                      <Button
                        key={status.value}
                        variant={selectedStatus === status.value ? 'primary' : 'secondary'}
                        size="sm"
                        onClick={() => setSelectedStatus(status.value)}
                      >
                        {status.label}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </Card.Body>
        </Card>

        {/* Inventory Table */}
        <Table
          columns={columns}
          data={filteredInventory}
          loading={loading}
          emptyText="No inventory items found"
        />

        {/* Add Item Modal */}
        <AddItemModal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false);
            fetchInventory();
          }}
        />

        {/* Edit Item Modal */}
        {selectedItem && (
          <EditItemModal
            isOpen={showEditModal}
            onClose={() => {
              setShowEditModal(false);
              setSelectedItem(null);
            }}
            item={selectedItem}
            onSuccess={() => {
              setShowEditModal(false);
              setSelectedItem(null);
              fetchInventory();
            }}
          />
        )}
      </div>
    </DashboardLayout>
  );
};

// Add Item Modal Component
const AddItemModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}> = ({ isOpen, onClose, onSuccess }) => {
  const [formData, setFormData] = useState<{
    sku: string;
    type: 'finished_product' | 'raw_material' | 'store_item' | 'waste_material';
    status: 'available' | 'needed' | 'low_stock' | 'out_of_stock';
    name: string;
    dimensions: string;
    length: number;
    quantity: number;
    unit: string;
    location: string;
    description: string;
    minimumStock: number;
  }>({
    sku: '',
    type: 'finished_product',
    status: 'available',
    name: '',
    dimensions: '',
    length: 0,
    quantity: 0,
    unit: 'mt',
    location: '',
    description: '',
    minimumStock: 0,
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      await inventoryAPI.addInventoryItem(formData);
      onSuccess();
    } catch (error) {
      console.error('Error adding item:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add New Item" size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="SKU"
            value={formData.sku}
            onChange={(e) => setFormData(prev => ({ ...prev, sku: e.target.value }))}
            required
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
            <select
              value={formData.type}
              onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value as 'finished_product' | 'raw_material' | 'store_item' | 'waste_material' }))}
              className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="finished_product">Finished Product</option>
              <option value="raw_material">Raw Material</option>
              <option value="store_item">Store Item</option>
              <option value="waste_material">Waste / Scrap</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={formData.status}
              onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as 'available' | 'needed' | 'low_stock' | 'out_of_stock' }))}
              className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="available">Available</option>
              <option value="needed">Needed</option>
              <option value="low_stock">Low Stock</option>
              <option value="out_of_stock">Out of Stock</option>
            </select>
          </div>
        </div>

        <Input
          label="Item Name"
          value={formData.name}
          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
          required
        />

        <div className="grid grid-cols-3 gap-4">
          <Input
            label="Dimensions"
            value={formData.dimensions}
            onChange={(e) => setFormData(prev => ({ ...prev, dimensions: e.target.value }))}
          />
          <Input
            label="Location"
            value={formData.location}
            onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
          />
          <Input
            label="length"
            type="number"
            value={formData.length}
            onChange={(e) => setFormData(prev => ({ ...prev, length: Number(e.target.value) }))}
          />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <Input
            label="Quantity"
            type="number"
            value={formData.quantity}
            onChange={(e) => setFormData(prev => ({ ...prev, quantity: Number(e.target.value) }))}
            required
          />
          <Input
            label="Unit"
            value={formData.unit}
            onChange={(e) => setFormData(prev => ({ ...prev, unit: e.target.value }))}
          />
          <Input
            label="Minimum Stock"
            type="number"
            value={formData.minimumStock}
            onChange={(e) => setFormData(prev => ({ ...prev, minimumStock: Number(e.target.value) }))}
          />
          
        </div>

        <Input
          label="Description"
          value={formData.description}
          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
        />

        <div className="flex justify-end space-x-3 pt-4">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={loading}>
            Add Item
          </Button>
        </div>
      </form>
    </Modal>
  );
};

// Edit Item Modal Component
const EditItemModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  item: InventoryItem;
  onSuccess: () => void;
}> = ({ isOpen, onClose, item, onSuccess }) => {
  const [quantity, setQuantity] = useState(item.quantity);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      await inventoryAPI.updateInventoryItem(item._id, { quantity });
      onSuccess();
    } catch (error) {
      console.error('Error updating item:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Update Quantity" size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="bg-gray-50 p-4 rounded-lg">
          <h4 className="font-medium text-gray-900">{item.name}</h4>
          <p className="text-sm text-gray-600">SKU: {item.sku}</p>
          <p className="text-sm text-gray-600">Current Quantity: {item.quantity} {item.unit}</p>
        </div>

        <Input
          label="New Quantity"
          type="number"
          value={quantity}
          onChange={(e) => setQuantity(Number(e.target.value))}
          required
        />

        <div className="flex justify-end space-x-3 pt-4">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={loading}>
            Update Quantity
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default Inventory;
