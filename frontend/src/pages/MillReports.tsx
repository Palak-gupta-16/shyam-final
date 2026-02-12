import React, { useState, useEffect, useCallback } from 'react';
import {
  Factory,
  Plus,
  TrendingUp,
  Clock,
  Gauge,
  BarChart3,
  Download,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';
import DashboardLayout from '../components/layout/DashboardLayout';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import Modal from '../components/common/Modal';
import Table from '../components/common/Table';
import InventoryDropdown from '../components/common/InventoryDropdown';
import { millAPI } from '../services/api';
import { MillHourlyReport, MillDailySummary, InventoryItem, RawMaterialUsage, WasteMaterialOutput } from '../types';

const MillReports: React.FC = () => {
  const [hourlyReports, setHourlyReports] = useState<MillHourlyReport[]>([]);
  const [dailySummaries, setDailySummaries] = useState<MillDailySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'hourly' | 'daily'>('hourly');
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [showAddReportModal, setShowAddReportModal] = useState(false);
  const [showAddSummaryModal, setShowAddSummaryModal] = useState(false);

const fetchReports = useCallback(async () => {
  try {
    setLoading(true);
    if (activeTab === 'hourly') {
  const res = await millAPI.getHourlyReports({ date: selectedDate }) as any;
  setHourlyReports(Array.isArray(res?.reports) ? res.reports : []);
} else {
  const res = await millAPI.getDailySummaries({ startDate: selectedDate, endDate: selectedDate }) as any;
  setDailySummaries(Array.isArray(res?.summaries) ? res.summaries : []);
}

  } catch (error) {
    console.error('Error fetching mill reports:', error);
    if (activeTab === 'hourly') setHourlyReports([]);
    else setDailySummaries([]);
  } finally {
    setLoading(false);
  }
}, [selectedDate, activeTab]);


  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const getHourlyStats = () => {
    const totalProduction = hourlyReports.reduce(
      (sum, r) => sum + (r.finalProducts?.reduce((acc, p) => acc + p.quantity, 0) || 0),
      0
    );
    const totalWaste = hourlyReports.reduce(
      (sum, r) => sum + (r.wasteProducts?.reduce((acc, w) => acc + w.quantity, 0) || 0),
      0
    );
    const avgEfficiency =
      hourlyReports.length > 0
        ? hourlyReports.reduce((sum, _) => sum + 95, 0) /
          hourlyReports.length
        : 0;

    return [
      {
        title: 'Total Production',
        value: `${totalProduction.toLocaleString()} pcs`,
        icon: Factory,
        color: 'primary' as const
      },
      {
        title: 'Total Waste',
        value: `${totalWaste.toLocaleString()}`,
        icon: Gauge,
        color: 'warning' as const
      },
      {
        title: 'Avg Efficiency',
        value: `${avgEfficiency.toFixed(1)}%`,
        icon: TrendingUp,
        color: 'success' as const
      },
      {
        title: 'Active Hours',
        value: hourlyReports.length,
        icon: Clock,
        color: 'info' as const
      }
    ];
  };

  const getDailyStats = () => {
    const lastSummary = dailySummaries[0];
    return [
      {
        title: 'Today\'s Pieces',
        value: lastSummary
          ? `${(lastSummary.totalPieces || 0).toLocaleString()} pcs`
          : '0 pcs',
        icon: Factory,
        color: 'primary' as const
      },
      {
        title: 'Total Weight',
        value: lastSummary
          ? `${(lastSummary.totalWeight || 0).toLocaleString()} kg`
          : '0 kg',
        icon: Gauge,
        color: 'warning' as const
      },
      {
        title: 'Efficiency',
        value: lastSummary
          ? `${(lastSummary.efficiency || 0).toFixed(1)}%`
          : '0%',
        icon: TrendingUp,
        color: 'success' as const
      },
      {
        title: 'Prod. Hours',
        value: lastSummary
          ? `${(lastSummary.productionHours || 0)}h`
          : '0h',
        icon: Clock,
        color: 'info' as const
      }
    ];
  };

  const hourlyColumns = [
    { key: 'hour', title: 'Hour', render: (v: number) => `${v}:00` },
    { 
      key: 'finalProducts', 
      title: 'Final Products', 
      render: (v: any[]) => v?.length ? `${v.length} items` : '0 items'
    },
    { 
      key: 'rawMaterialsConsumed', 
      title: 'Raw Materials', 
      render: (v: any[]) => v?.length ? `${v.length} items` : '0 items',
      align: 'right' as const 
    },
    { 
      key: 'wasteProducts', 
      title: 'Waste', 
      render: (v: any[]) => v?.length ? `${v.length} items` : '0 items',
      align: 'right' as const 
    },
    { key: 'shift', title: 'Shift' },
    { key: 'operatorName', title: 'Operator' },
    { key: 'remarks', title: 'Remarks' }
  ];

  const dailyColumns = [
    { key: 'date', title: 'Date', render: (v: string) => new Date(v).toLocaleDateString() },
    { key: 'name', title: 'Name' },
    { key: 'dimensions', title: 'Dimensions' },
    { key: 'billetSize', title: 'Billet Size' },
    { key: 'totalPieces', title: 'Pieces', align: 'right' as const },
    { key: 'totalWeight', title: 'Weight', align: 'right' as const },
    { key: 'totalMissRolls', title: 'Miss Rolls', align: 'right' as const },
    { key: 'productionHours', title: 'Prod. Hours', align: 'right' as const },
    { key: 'efficiency', title: 'Efficiency (%)', align: 'right' as const },
    { key: 'breakdownSummary', title: 'Breakdown Summary' }
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Mill Operations</h1>
            <p className="text-gray-600">Monitor mill performance</p>
          </div>
          <div className="flex gap-3">
            <Button variant="secondary" icon={Download}>Export</Button>
            {activeTab === 'hourly' ? (
              <Button icon={Plus} onClick={() => setShowAddReportModal(true)}>Add Report</Button>
            ) : (
              <Button icon={Plus} onClick={() => setShowAddSummaryModal(true)}>Add Daily Summary</Button>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {(activeTab === 'hourly' ? getHourlyStats() : getDailyStats()).map((s, i) => (
            <Card key={i}><Card.Body>
              <div className="flex justify-between">
                <div>
                  <p className="text-sm">{s.title}</p>
                  <p className="text-xl font-bold">{s.value}</p>
                </div>
                <s.icon className="h-6 w-6" />
              </div>
            </Card.Body></Card>
          ))}
        </div>

        {/* Tabs */}
        <Card><Card.Body>
          <div className="flex justify-between">
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button onClick={() => setActiveTab('hourly')} className={activeTab==='hourly'?'bg-white px-4 py-2 rounded-md shadow':'px-4 py-2'}>
                Hourly Reports
              </button>
              <button onClick={() => setActiveTab('daily')} className={activeTab==='daily'?'bg-white px-4 py-2 rounded-md shadow':'px-4 py-2'}>
                Daily Summaries
              </button>
            </div>
              <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} />
          </div>
        </Card.Body></Card>

        {/* Table */}
        {activeTab === 'hourly'
          ? <Table columns={hourlyColumns} data={hourlyReports} loading={loading} emptyText="No hourly reports" />
          : <Table columns={dailyColumns} data={dailySummaries} loading={loading} emptyText="No daily summaries" />
        }

        {/* Add Hourly Modal */}
        <AddReportModal isOpen={showAddReportModal} onClose={() => setShowAddReportModal(false)} onSuccess={fetchReports} defaultDate={selectedDate} />
        {/* Add Daily Summary Modal */}
        <AddDailySummaryModal isOpen={showAddSummaryModal} onClose={() => setShowAddSummaryModal(false)} onSuccess={fetchReports} defaultDate={selectedDate} />
      </div>
    </DashboardLayout>
  );
};

const AddReportModal: React.FC<any> = ({ isOpen, onClose, onSuccess, defaultDate }) => {
  const [form, setForm] = useState({
    date: defaultDate, 
    hour: new Date().getHours(), 
    finalProducts: [] as Array<{ productId: string; productName?: string; dimension?: string; quantity: number; _selectedItem?: any; _availableSizes?: any[]; _newSize?: string }>,
    rawMaterialsConsumed: [] as Array<{ materialId: string; materialName?: string; quantity: number; unit?: string }>,
    wasteProducts: [] as Array<{ wasteId: string; wasteName?: string; quantity: number; unit?: string }>,
    shift: 'A', 
    operatorName: '', 
    remarks: ''
  });
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Final Products Management
  const addFinalProduct = () => {
    setForm({
      ...form,
      finalProducts: [...form.finalProducts, { productId: '', productName: '', dimension: '', quantity: 0, _selectedItem: null, _availableSizes: [], _newSize: '' }]
    });
    setErrorMessage('');
  };

  const removeFinalProduct = (index: number) => {
    const updated = [...form.finalProducts];
    updated.splice(index, 1);
    setForm({ ...form, finalProducts: updated });
  };

  const handleFinalProductSelect = (index: number, item: InventoryItem | null) => {
    const updated = [...form.finalProducts];
    updated[index] = {
      ...updated[index],
      productId: item?._id || '',
      productName: item?.name || '',
      dimension: '',
      _selectedItem: item,
      _availableSizes: item?.sizes || []
    };
    setForm({ ...form, finalProducts: updated });
    setErrorMessage('');
  };

  const handleFinalProductChange = (index: number, key: string, value: any) => {
    const updated = [...form.finalProducts];
    updated[index] = { ...updated[index], [key]: value };
    setForm({ ...form, finalProducts: updated });
  };

  // Raw Materials Management
  const addRawMaterial = () => {
    setForm({
      ...form,
      rawMaterialsConsumed: [...form.rawMaterialsConsumed, { materialId: '', materialName: '', quantity: 0, unit: 'kg' }]
    });
    setErrorMessage('');
  };

  const removeRawMaterial = (index: number) => {
    const updated = [...form.rawMaterialsConsumed];
    updated.splice(index, 1);
    setForm({ ...form, rawMaterialsConsumed: updated });
  };

  const handleRawMaterialSelect = (index: number, item: InventoryItem | null) => {
    const updated = [...form.rawMaterialsConsumed];
    updated[index] = {
      ...updated[index],
      materialId: item?._id || '',
      materialName: item?.name || '',
      unit: item?.unit || 'kg'
    };
    setForm({ ...form, rawMaterialsConsumed: updated });
    setErrorMessage('');
  };

  const handleRawMaterialChange = (index: number, key: string, value: any) => {
    const updated = [...form.rawMaterialsConsumed];
    updated[index] = { ...updated[index], [key]: value };
    setForm({ ...form, rawMaterialsConsumed: updated });
  };

  // Waste Products Management
  const addWasteProduct = () => {
    setForm({
      ...form,
      wasteProducts: [...form.wasteProducts, { wasteId: '', wasteName: '', quantity: 0, unit: 'kg' }]
    });
    setErrorMessage('');
  };

  const removeWasteProduct = (index: number) => {
    const updated = [...form.wasteProducts];
    updated.splice(index, 1);
    setForm({ ...form, wasteProducts: updated });
  };

  const handleWasteProductSelect = (index: number, item: InventoryItem | null) => {
    const updated = [...form.wasteProducts];
    updated[index] = {
      ...updated[index],
      wasteId: item?._id || '',
      wasteName: item?.name || '',
      unit: item?.unit || 'kg'
    };
    setForm({ ...form, wasteProducts: updated });
    setErrorMessage('');
  };

  const handleWasteProductChange = (index: number, key: string, value: any) => {
    const updated = [...form.wasteProducts];
    updated[index] = { ...updated[index], [key]: value };
    setForm({ ...form, wasteProducts: updated });
  };

  const submit = async (e: any) => {
    e.preventDefault();
    
    // Validation
    if (form.finalProducts.length === 0) {
      setErrorMessage('At least one final product is required');
      return;
    }
    
    for (let i = 0; i < form.finalProducts.length; i++) {
      const product = form.finalProducts[i];
      if (!product.productId) {
        setErrorMessage(`Final Product ${i + 1}: Please select a product`);
        return;
      }
      if (!product.dimension || product.dimension === '') {
        setErrorMessage(`Final Product ${i + 1}: Please select or enter a size`);
        return;
      }
      if (product.dimension === '__new__' && (!product._newSize || product._newSize.trim() === '')) {
        setErrorMessage(`Final Product ${i + 1}: Please enter the new size name`);
        return;
      }
      if (product.quantity <= 0) {
        setErrorMessage(`Final Product ${i + 1}: Quantity must be greater than 0`);
        return;
      }
    }

    for (let i = 0; i < form.rawMaterialsConsumed.length; i++) {
      const material = form.rawMaterialsConsumed[i];
      if (!material.materialId) {
        setErrorMessage(`Raw Material ${i + 1}: Please select a material`);
        return;
      }
      if (material.quantity <= 0) {
        setErrorMessage(`Raw Material ${i + 1}: Quantity must be greater than 0`);
        return;
      }
    }

    for (let i = 0; i < form.wasteProducts.length; i++) {
      const waste = form.wasteProducts[i];
      if (!waste.wasteId) {
        setErrorMessage(`Waste Product ${i + 1}: Please select a product`);
        return;
      }
      if (waste.quantity <= 0) {
        setErrorMessage(`Waste Product ${i + 1}: Quantity must be greater than 0`);
        return;
      }
    }
    
    setLoading(true);
    setErrorMessage('');
    try {
      // Process final products to replace __new__ with actual new size
      const processedForm = {
        ...form,
        finalProducts: form.finalProducts.map(p => ({
          ...p,
          dimension: p.dimension === '__new__' ? p._newSize : p.dimension
        }))
      };
      await millAPI.createHourlyReport(processedForm);
      onSuccess();
      onClose();
      // Reset form
      setForm({
        date: defaultDate,
        hour: new Date().getHours(),
        finalProducts: [],
        rawMaterialsConsumed: [],
        wasteProducts: [],
        shift: 'A',
        operatorName: '',
        remarks: ''
      });
    } catch (error: any) {
      console.error('Error creating hourly report:', error);
      setErrorMessage(error.response?.data?.message || 'Failed to create hourly report');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Hourly Report" size="4xl">
      <form onSubmit={submit} className="space-y-6">
        {/* Error Message */}
        {errorMessage && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              <span className="text-red-800 font-medium">{errorMessage}</span>
            </div>
          </div>
        )}

        {/* Basic Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input label="Date" type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} required />
          <Input label="Hour (0-23)" type="number" min={0} max={23} value={form.hour} onChange={e => setForm({...form, hour: Number(e.target.value)})} required />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input label="Shift" value={form.shift} onChange={e => setForm({...form, shift: e.target.value})} placeholder="A, B, or C" />
          <Input label="Operator Name" value={form.operatorName} onChange={e => setForm({...form, operatorName: e.target.value})} />
        </div>

        {/* Final Products Section */}
        <div className="bg-green-50 p-4 rounded-lg">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Final Products Produced</h3>
          <div className="space-y-4">
            {form.finalProducts.length === 0 && (
              <div className="bg-white border border-dashed border-green-300 rounded-lg p-4 text-sm text-gray-600">
                No final products added yet. Click "Add Final Product" to begin.
              </div>
            )}

            {form.finalProducts.map((product, index) => (
              <div key={index} className="bg-white p-4 rounded-lg border border-gray-200">
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Final Product {index + 1}
                    </label>
                    <InventoryDropdown
                      type="finished_product"
                      value={product.productId || null}
                      onChange={(item) => handleFinalProductSelect(index, item)}
                      placeholder="Select finished product..."
                      required
                      showStock
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Size *</label>
                    {product._availableSizes && product._availableSizes.length > 0 ? (
                      <select
                        value={product.dimension || ''}
                        onChange={(e) => handleFinalProductChange(index, 'dimension', e.target.value)}
                        className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        required
                      >
                        <option value="">Select size...</option>
                        {product._availableSizes.map((size, idx) => (
                          <option key={idx} value={size.dimension}>
                            {size.dimension} (Stock: {size.quantity})
                          </option>
                        ))}
                        <option value="__new__">+ Add New Size</option>
                      </select>
                    ) : (
                      <input
                        type="text"
                        value={product.dimension || ''}
                        onChange={(e) => handleFinalProductChange(index, 'dimension', e.target.value)}
                        placeholder="Enter size (e.g., 8mm)..."
                        className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        required
                      />
                    )}
                  </div>
                  {product.dimension === '__new__' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">New Size *</label>
                      <input
                        type="text"
                        value={product._newSize || ''}
                        onChange={(e) => handleFinalProductChange(index, '_newSize', e.target.value)}
                        placeholder="e.g., 12mm"
                        className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        required
                      />
                    </div>
                  )}
                  <Input
                    label="Quantity"
                    type="number"
                    value={product.quantity}
                    onChange={e => handleFinalProductChange(index, 'quantity', Number(e.target.value))}
                    required
                    min="0"
                    step="1"
                    placeholder="0"
                  />
                  <div className="flex items-end">
                    <Button
                      type="button"
                      variant="danger"
                      onClick={() => removeFinalProduct(index)}
                      className="w-full"
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              </div>
            ))}
            
            <Button 
              type="button" 
              variant="secondary" 
              onClick={addFinalProduct}
              className="w-full"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Final Product
            </Button>
          </div>
        </div>

        {/* Raw Materials Section */}
        <div className="bg-blue-50 p-4 rounded-lg">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Raw Materials Consumed</h3>
          <div className="space-y-4">
            {form.rawMaterialsConsumed.length === 0 && (
              <div className="bg-white border border-dashed border-blue-300 rounded-lg p-4 text-sm text-gray-600">
                No raw materials added yet. Click "Add Raw Material" to begin.
              </div>
            )}

            {form.rawMaterialsConsumed.map((material, index) => (
              <div key={index} className="bg-white p-4 rounded-lg border border-gray-200">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Raw Material {index + 1}
                    </label>
                    <InventoryDropdown
                      type="raw_material"
                      value={material.materialId || null}
                      onChange={(item) => handleRawMaterialSelect(index, item)}
                      placeholder="Select raw material..."
                      required
                      showStock
                      availableOnly
                    />
                  </div>
                  <Input
                    label="Quantity"
                    type="number"
                    value={material.quantity}
                    onChange={e => handleRawMaterialChange(index, 'quantity', Number(e.target.value))}
                    required
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                  />
                  <div className="flex items-end">
                    <Button
                      type="button"
                      variant="danger"
                      onClick={() => removeRawMaterial(index)}
                      className="w-full"
                    >
                      Remove
                    </Button>
                  </div>
                </div>
                {material.unit && (
                  <div className="mt-2 text-sm text-gray-600">
                    Unit: {material.unit}
                  </div>
                )}
              </div>
            ))}
            
            <Button 
              type="button" 
              variant="secondary" 
              onClick={addRawMaterial}
              className="w-full"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Raw Material
            </Button>
          </div>
        </div>

        {/* Waste Products Section */}
        <div className="bg-yellow-50 p-4 rounded-lg">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Waste Products Generated</h3>
          <div className="space-y-4">
            {form.wasteProducts.length === 0 && (
              <div className="bg-white border border-dashed border-yellow-300 rounded-lg p-4 text-sm text-gray-600">
                No waste products added yet. Add an entry if waste was generated during this hour.
              </div>
            )}

            {form.wasteProducts.map((waste, index) => (
              <div key={index} className="bg-white p-4 rounded-lg border border-gray-200">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Waste Product {index + 1}
                    </label>
                    <InventoryDropdown
                      type="waste_material"
                      value={waste.wasteId || null}
                      onChange={(item) => handleWasteProductSelect(index, item)}
                      placeholder="Select waste product..."
                      required
                      showStock={false}
                    />
                  </div>
                  <Input
                    label="Quantity"
                    type="number"
                    value={waste.quantity}
                    onChange={e => handleWasteProductChange(index, 'quantity', Number(e.target.value))}
                    required
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                  />
                  <div className="flex items-end">
                    <Button
                      type="button"
                      variant="danger"
                      onClick={() => removeWasteProduct(index)}
                      className="w-full"
                    >
                      Remove
                    </Button>
                  </div>
                </div>
                {waste.unit && (
                  <div className="mt-2 text-sm text-gray-600">
                    Unit: {waste.unit}
                  </div>
                )}
              </div>
            ))}
            
            <Button 
              type="button" 
              variant="secondary" 
              onClick={addWasteProduct}
              className="w-full"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Waste Product
            </Button>
          </div>
        </div>
        
        {/* Remarks */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Remarks
          </label>
          <textarea 
            placeholder="Any additional notes or observations..." 
            value={form.remarks} 
            onChange={e => setForm({...form, remarks: e.target.value})} 
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-vertical"
            rows={3}
          />
        </div>

        <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
          <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button type="submit" loading={loading}>
            <CheckCircle className="h-4 w-4 mr-2" />
            Save Report
          </Button>
        </div>
      </form>
    </Modal>
  );
};

const AddDailySummaryModal: React.FC<any> = ({ isOpen, onClose, onSuccess, defaultDate }) => {
  const [form, setForm] = useState({
    date: defaultDate,
    name: '',
    dimensions: '',
    totalPieces: 0,
    totalWeight: 0,
    breakdownSummary: '',
    productionHours: 0,
    efficiency: 0,
    remarks: '',
    finishedProduct: { inventoryItemId: '', dimension: '' },
    rawMaterials: [
      { inventoryItemId: '', materialName: '', quantityUsed: 0, unit: 'kg' }
    ] as RawMaterialUsage[],
    wasteMaterials: [] as WasteMaterialOutput[]
  });
  const [loading, setLoading] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<InventoryItem | null>(null);
  const [availableSizes, setAvailableSizes] = useState<Array<{dimension: string, quantity: number}>>([]);

  const handleMaterialChange = (index: number, key: string, value: any) => {
    const updated = [...form.rawMaterials];
    updated[index] = { ...updated[index], [key]: value };
    setForm({ ...form, rawMaterials: updated });
    setValidationErrors([]); // Clear validation errors when user makes changes
  };

  const handleMaterialSelect = (index: number, item: InventoryItem | null) => {
    const updated = [...form.rawMaterials];
    updated[index] = {
      ...updated[index],
      inventoryItemId: item?._id || '',
      materialName: item?.name || '',
      unit: item?.unit || 'kg'
    };
    setForm({ ...form, rawMaterials: updated });
    setValidationErrors([]);
  };

  const addMaterial = () => {
    setForm({
      ...form,
      rawMaterials: [...form.rawMaterials, { inventoryItemId: '', materialName: '', quantityUsed: 0, unit: 'kg' }]
    });
  };

  const removeMaterial = (index: number) => {
    const updated = [...form.rawMaterials];
    updated.splice(index, 1);
    setForm({ ...form, rawMaterials: updated });
  };

  const handleWasteChange = (index: number, key: keyof WasteMaterialOutput, value: any) => {
    const updated = [...form.wasteMaterials];
    updated[index] = { ...updated[index], [key]: value };
    setForm({ ...form, wasteMaterials: updated });
    setValidationErrors([]);
  };

  const handleWasteSelect = (index: number, item: InventoryItem | null) => {
    const updated = [...form.wasteMaterials];
    updated[index] = {
      ...updated[index],
      inventoryItemId: item?._id || '',
      materialName: item?.name || '',
      unit: item?.unit || 'kg'
    };
    setForm({ ...form, wasteMaterials: updated });
    setValidationErrors([]);
  };

  const addWasteMaterial = () => {
    setForm({
      ...form,
      wasteMaterials: [
        ...form.wasteMaterials,
        { inventoryItemId: '', materialName: '', quantityProduced: 0, unit: 'kg' }
      ]
    });
    setValidationErrors([]);
  };

  const removeWasteMaterial = (index: number) => {
    const updated = [...form.wasteMaterials];
    updated.splice(index, 1);
    setForm({ ...form, wasteMaterials: updated });
    setValidationErrors([]);
  };

  const validateForm = () => {
    const errors: string[] = [];
    
    if (!form.finishedProduct?.inventoryItemId) {
      errors.push('Please select a finished product');
    }
    
    if (!form.finishedProduct?.dimension) {
      errors.push('Please select or enter a size/dimension for the finished product');
    }
    
    if (form.finishedProduct?.dimension === '__new__' && !form.dimensions) {
      errors.push('Please enter the new size dimension');
    }
    
    if (form.totalWeight <= 0) {
      errors.push('Total weight must be greater than 0');
    }
    
    if (form.rawMaterials.length === 0) {
      errors.push('At least one raw material is required');
    }
    
    form.rawMaterials.forEach((material, index) => {
      if (!material.inventoryItemId) {
        errors.push(`Raw material ${index + 1}: Please select a material`);
      }
      if (material.quantityUsed <= 0) {
        errors.push(`Raw material ${index + 1}: Quantity must be greater than 0`);
      }
    });

    form.wasteMaterials.forEach((material, index) => {
      const hasSelection = Boolean(material.inventoryItemId);
      const hasQuantity = material.quantityProduced > 0;

      if (!hasSelection && !hasQuantity) {
        return;
      }

      if (!hasSelection) {
        errors.push(`Waste material ${index + 1}: Please select an item`);
      }

      if (!hasQuantity) {
        errors.push(`Waste material ${index + 1}: Quantity must be greater than 0`);
      }
    });
    
    return errors;
  };

  const submit = async (e: any) => {
    e.preventDefault();
    
    const errors = validateForm();
    if (errors.length > 0) {
      setValidationErrors(errors);
      return;
    }
    
    setLoading(true);
    setValidationErrors([]);
    
    try {
      const rawMaterialsPayload = form.rawMaterials.map((material) => ({
        inventoryItemId: material.inventoryItemId,
        materialName: material.materialName,
        quantityUsed: material.quantityUsed,
        unit: material.unit
      }));

      const wasteMaterialsPayload = form.wasteMaterials
        .filter((material) => material.inventoryItemId && material.quantityProduced > 0)
        .map((material) => ({
          inventoryItemId: material.inventoryItemId,
          materialName: material.materialName,
          quantityProduced: material.quantityProduced,
          unit: material.unit
        }));

      await millAPI.createDailySummary({
        ...form,
        rawMaterials: rawMaterialsPayload,
        wasteMaterials: wasteMaterialsPayload,
        finishedProduct: {
          inventoryItemId: form.finishedProduct.inventoryItemId,
          quantityProduced: form.totalWeight,
          dimension: form.finishedProduct.dimension === '__new__' ? form.dimensions : form.finishedProduct.dimension
        }
      });
      onSuccess();
      onClose();
      // Reset form
      setForm({
        date: defaultDate,
        name: '',
        dimensions: '',
        totalPieces: 0,
        totalWeight: 0,
        breakdownSummary: '',
        productionHours: 0,
        efficiency: 0,
        remarks: '',
        finishedProduct: { inventoryItemId: '', dimension: '' },
        rawMaterials: [{ inventoryItemId: '', materialName: '', quantityUsed: 0, unit: 'kg' }],
        wasteMaterials: []
      });
      setSelectedProduct(null);
      setAvailableSizes([]);
    } catch (error: any) {
      console.error('Error creating daily summary:', error);
      if (error.response?.data?.errors) {
        setValidationErrors(error.response.data.errors);
      } else if (error.response?.data?.missingMaterials) {
        const missingErrors = error.response.data.missingMaterials.map((missing: any) => 
          `${missing.name}: Need ${missing.quantityNeeded}, Available: ${missing.available}`
        );
        setValidationErrors([error.response.data.message, ...missingErrors]);
      } else {
        setValidationErrors([error.response?.data?.message || 'Failed to create daily summary']);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Daily Summary" size='4xl'>
      <form onSubmit={submit} className="space-y-6">
        {/* Validation Errors */}
        {validationErrors.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              <span className="text-red-800 font-medium">Validation Errors</span>
            </div>
            <ul className="text-red-700 text-sm space-y-1">
              {validationErrors.map((error, index) => (
                <li key={index}>• {error}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Basic Information */}
        <div className="grid grid-cols-1">
          <Input 
            label="Date" 
            type="date" 
            value={form.date} 
            onChange={e => setForm({...form, date: e.target.value})} 
            required 
          />
        </div>

        {/* Product Information */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Finished Product</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <InventoryDropdown
              type="finished_product"
              value={form.finishedProduct?.inventoryItemId || null}
              onChange={(item) => {
                setSelectedProduct(item);
                setAvailableSizes(item?.sizes || []);
                setForm({
                  ...form,
                  name: item?.name || '',
                  dimensions: item?.dimensions || '',
                  finishedProduct: { inventoryItemId: item?._id || '', dimension: '' }
                });
                setValidationErrors([]);
              }}
              placeholder="Select finished product..."
              showStock={true}
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Size / Dimension *</label>
              {availableSizes.length > 0 ? (
                <select
                  value={form.finishedProduct?.dimension || ''}
                  onChange={(e) => {
                    setForm({
                      ...form,
                      finishedProduct: {
                        ...form.finishedProduct,
                        dimension: e.target.value
                      }
                    });
                    setValidationErrors([]);
                  }}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value="">Select size...</option>
                  {availableSizes.map((size, idx) => (
                    <option key={idx} value={size.dimension}>
                      {size.dimension} (Stock: {size.quantity})
                    </option>
                  ))}
                  <option value="__new__">+ Add New Size</option>
                </select>
              ) : (
                <input
                  type="text"
                  value={form.finishedProduct?.dimension || ''}
                  onChange={(e) => {
                    setForm({
                      ...form,
                      finishedProduct: {
                        ...form.finishedProduct,
                        dimension: e.target.value
                      }
                    });
                    setValidationErrors([]);
                  }}
                  placeholder="Enter size (e.g., 8mm, 10mm)..."
                  className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              )}
              <p className="mt-1 text-xs text-gray-500">Select existing size or add new</p>
            </div>
            {form.finishedProduct?.dimension === '__new__' && (
              <Input
                label="New Size"
                value={form.dimensions}
                onChange={(e) => setForm({...form, dimensions: e.target.value})}
                placeholder="e.g., 12mm"
                required
              />
            )}
          </div>
        </div>

        {/* Production Details */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Input 
            label="Total Pieces" 
            type="number" 
            value={form.totalPieces} 
            onChange={e => setForm({...form, totalPieces: Number(e.target.value)})} 
            required 
            min="0"
          />
          <Input 
            label="Total Weight (kg)" 
            type="number" 
            value={form.totalWeight} 
            onChange={e => setForm({...form, totalWeight: Number(e.target.value)})} 
            required 
            min="0"
            step="0.01"
          />
          <Input 
            label="Production Hours" 
            type="number" 
            value={form.productionHours} 
            onChange={e => setForm({...form, productionHours: Number(e.target.value)})} 
            min="0" 
            max="24"
            step="0.1"
          />
          <Input 
            label="Efficiency (%)" 
            type="number" 
            value={form.efficiency} 
            onChange={e => setForm({...form, efficiency: Number(e.target.value)})} 
            min="0" 
            max="100"
            step="0.1"
          />
        </div>

        {/* Raw Materials Section */}
        <div className="bg-blue-50 p-4 rounded-lg">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Raw Materials Used</h3>
          <div className="space-y-4">
            {form.rawMaterials.map((material, index) => (
              <div key={index} className="bg-white p-4 rounded-lg border border-gray-200">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Raw Material {index + 1}
                    </label>
                    <InventoryDropdown
                      type="raw_material"
                      value={material.inventoryItemId || null}
                      onChange={(item) => handleMaterialSelect(index, item)}
                      placeholder="Select raw material..."
                      required
                      showStock
                      availableOnly
                    />
                  </div>
                  <Input
                    label="Quantity Used"
                    type="number"
                    value={material.quantityUsed}
                    onChange={e => handleMaterialChange(index, 'quantityUsed', Number(e.target.value))}
                    required
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                  />
                  <div className="flex items-end">
                    <Button
                      type="button"
                      variant="danger"
                      onClick={() => removeMaterial(index)}
                      disabled={form.rawMaterials.length === 1}
                      className="w-full"
                    >
                      Remove
                    </Button>
                  </div>
                </div>
                {material.inventoryItemId && (
                  <div className="mt-2 text-sm text-gray-600">
                    Unit: {material.unit}
                  </div>
                )}
              </div>
            ))}
            
            <Button 
              type="button" 
              variant="secondary" 
              onClick={addMaterial}
              className="w-full"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Raw Material
            </Button>
          </div>
        </div>

        {/* Waste Materials Section */}
        <div className="bg-yellow-50 p-4 rounded-lg">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Waste / Scrap Produced</h3>
          <div className="space-y-4">
            {form.wasteMaterials.length === 0 && (
              <div className="bg-white border border-dashed border-yellow-300 rounded-lg p-4 text-sm text-gray-600">
                No waste recorded for this summary. Add an entry if scrap or waste was collected.
              </div>
            )}

            {form.wasteMaterials.map((material, index) => (
              <div key={index} className="bg-white p-4 rounded-lg border border-gray-200">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Waste Material {index + 1}
                    </label>
                    <InventoryDropdown
                      type="waste_material"
                      value={material.inventoryItemId || null}
                      onChange={(item) => handleWasteSelect(index, item)}
                      placeholder="Select waste item..."
                      showStock={false}
                    />
                  </div>
                  <Input
                    label="Quantity Produced"
                    type="number"
                    value={material.quantityProduced}
                    onChange={e => handleWasteChange(index, 'quantityProduced', Number(e.target.value))}
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                  />
                  <div className="flex items-end">
                    <Button
                      type="button"
                      variant="danger"
                      onClick={() => removeWasteMaterial(index)}
                      className="w-full"
                    >
                      Remove
                    </Button>
                  </div>
                </div>
                {material.unit && (
                  <div className="mt-2 text-sm text-gray-600">
                    Unit: {material.unit}
                  </div>
                )}
              </div>
            ))}

            <Button
              type="button"
              variant="secondary"
              onClick={addWasteMaterial}
              className="w-full"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Waste Entry
            </Button>
          </div>
        </div>

        {/* Additional Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Breakdown Summary
            </label>
            <textarea 
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-vertical"
              rows={3}
              placeholder="Describe any breakdowns that occurred..."
              value={form.breakdownSummary} 
              onChange={e => setForm({...form, breakdownSummary: e.target.value})}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Remarks
            </label>
            <textarea 
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-vertical"
              rows={3}
              placeholder="Additional notes or observations..."
              value={form.remarks} 
              onChange={e => setForm({...form, remarks: e.target.value})}
            />
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" loading={loading}>
            <CheckCircle className="h-4 w-4 mr-2" />
            Save Daily Summary
          </Button>
        </div>
      </form>
    </Modal>
  );
};


export default MillReports;

