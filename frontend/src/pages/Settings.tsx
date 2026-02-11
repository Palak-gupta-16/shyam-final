import React, { useState } from 'react';
import { 
  Settings as SettingsIcon, 
  User, 
  Bell, 
  Shield, 
  Database,
  Palette,
  Globe,
  Download,
  Upload,
  RefreshCw,
  Save,
  Eye,
  EyeOff
} from 'lucide-react';
import DashboardLayout from '../components/layout/DashboardLayout';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import Badge from '../components/common/Badge';
import { useAuth } from '../context/AuthContext';
import RegisterForm from '../components/auth/RegisterForm';

const Settings: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('new_user');
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const tabs = [
    // { id: 'profile', label: 'Profile', icon: User },
    // { id: 'notifications', label: 'Notifications', icon: Bell },
    // { id: 'security', label: 'Security', icon: Shield },
    // { id: 'system', label: 'System', icon: Database },
    // { id: 'appearance', label: 'Appearance', icon: Palette },
    // { id: 'backup', label: 'Backup & Export', icon: Download },
    { id: 'new_user', label: 'Create New User', icon: User },
  ];

  const handleSave = async () => {
    setSaving(true);
    // Simulate save operation
    await new Promise(resolve => setTimeout(resolve, 1000));
    setSaving(false);
  };

  const renderTabContent = () => {
    switch (activeTab) {
      // case 'profile':
      //   return <ProfileSettings user={user} onSave={handleSave} saving={saving} />;
      // case 'notifications':
      //   return <NotificationSettings onSave={handleSave} saving={saving} />;
      // case 'security':
      //   return <SecuritySettings onSave={handleSave} saving={saving} showPassword={showPassword} setShowPassword={setShowPassword} />;
      // case 'system':
      //   return <SystemSettings onSave={handleSave} saving={saving} />;
      // case 'appearance':
      //   return <AppearanceSettings onSave={handleSave} saving={saving} />;
      // case 'backup':
      //   return <BackupSettings />;
      case 'new_user':
  return (
    <Card>
      <Card.Header>
        <h3 className="text-lg font-medium text-gray-900">
          Create New User
        </h3>
        <p className="text-sm text-gray-600">
          Register a new user account with role and permissions
        </p>
      </Card.Header>

      <Card.Body>
        <RegisterForm embedded />
      </Card.Body>
    </Card>
  );
      default:
        return <ProfileSettings user={user} onSave={handleSave} saving={saving} />;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
            <p className="text-gray-600 mt-2">Manage your application preferences and configuration</p>
          </div>
          <Badge variant="secondary" size="sm">
            <SettingsIcon className="h-3 w-3 mr-1" />
            Admin Panel
          </Badge>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Settings Navigation */}
          <Card className="lg:col-span-1">
            <Card.Body>
              <nav className="space-y-1">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`
                      w-full flex items-center px-3 py-2 text-left text-sm font-medium rounded-lg transition-colors
                      ${activeTab === tab.id
                        ? 'bg-blue-50 text-blue-700 border-blue-200'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      }
                    `}
                  >
                    <tab.icon className="h-4 w-4 mr-3" />
                    {tab.label}
                  </button>
                ))}
              </nav>
            </Card.Body>
          </Card>

          {/* Settings Content */}
          <div className="lg:col-span-3">
            {renderTabContent()}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

// Profile Settings Component
const ProfileSettings: React.FC<{ 
  user: any; 
  onSave: () => void; 
  saving: boolean; 
}> = ({ user, onSave, saving }) => {
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    alias: user?.alias || '',
    phone: '',
    department: '',
    employeeId: '',
  });

  return (
    <Card>
      <Card.Header>
        <h3 className="text-lg font-medium text-gray-900">Profile Information</h3>
        <p className="text-sm text-gray-600">Update your personal information and contact details</p>
      </Card.Header>
      <Card.Body>
        <div className="space-y-6">
          <div className="flex items-center space-x-6">
            <div className="h-20 w-20 bg-blue-100 rounded-full flex items-center justify-center">
              <User className="h-10 w-10 text-blue-600" />
            </div>
            <div>
              <Button variant="secondary" size="sm">
                Change Photo
              </Button>
              <p className="text-xs text-gray-500 mt-1">JPG, PNG up to 2MB</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input
              label="Full Name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              required
            />
            <Input
              label="Email Address"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              required
            />
            <Input
              label="Alias/Username"
              value={formData.alias}
              onChange={(e) => setFormData(prev => ({ ...prev, alias: e.target.value }))}
            />
            <Input
              label="Phone Number"
              value={formData.phone}
              onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
            />
            <Input
              label="Department"
              value={formData.department}
              onChange={(e) => setFormData(prev => ({ ...prev, department: e.target.value }))}
            />
            <Input
              label="Employee ID"
              value={formData.employeeId}
              onChange={(e) => setFormData(prev => ({ ...prev, employeeId: e.target.value }))}
            />
          </div>

          <div className="flex justify-end">
            <Button onClick={onSave} loading={saving} icon={Save}>
              Save Changes
            </Button>
          </div>
        </div>
      </Card.Body>
    </Card>
  );
};

// Notification Settings Component
const NotificationSettings: React.FC<{ 
  onSave: () => void; 
  saving: boolean; 
}> = ({ onSave, saving }) => {
  const [settings, setSettings] = useState({
    orderUpdates: true,
    systemAlerts: true,
    emailNotifications: false,
    smsAlerts: true,
    weeklyReports: true,
    maintenanceAlerts: true,
  });

  const toggleSetting = (key: string) => {
    setSettings(prev => ({ ...prev, [key]: !prev[key as keyof typeof prev] }));
  };

  return (
    <Card>
      <Card.Header>
        <h3 className="text-lg font-medium text-gray-900">Notification Preferences</h3>
        <p className="text-sm text-gray-600">Choose what notifications you want to receive</p>
      </Card.Header>
      <Card.Body>
        <div className="space-y-6">
          <div className="space-y-4">
            {Object.entries(settings).map(([key, value]) => (
              <div key={key} className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-medium text-gray-900">
                    {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                  </h4>
                  <p className="text-sm text-gray-600">
                    Receive notifications for {key.toLowerCase().replace(/([A-Z])/g, ' $1')}
                  </p>
                </div>
                <button
                  onClick={() => toggleSetting(key)}
                  className={`
                    relative inline-flex h-6 w-11 items-center rounded-full transition-colors
                    ${value ? 'bg-blue-600' : 'bg-gray-200'}
                  `}
                >
                  <span
                    className={`
                      inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                      ${value ? 'translate-x-6' : 'translate-x-1'}
                    `}
                  />
                </button>
              </div>
            ))}
          </div>

          <div className="flex justify-end">
            <Button onClick={onSave} loading={saving} icon={Save}>
              Save Preferences
            </Button>
          </div>
        </div>
      </Card.Body>
    </Card>
  );
};

// Security Settings Component
const SecuritySettings: React.FC<{ 
  onSave: () => void; 
  saving: boolean;
  showPassword: boolean;
  setShowPassword: (show: boolean) => void;
}> = ({ onSave, saving, showPassword, setShowPassword }) => {
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  return (
    <Card>
      <Card.Header>
        <h3 className="text-lg font-medium text-gray-900">Security Settings</h3>
        <p className="text-sm text-gray-600">Manage your account security and access controls</p>
      </Card.Header>
      <Card.Body>
        <div className="space-y-6">
          {/* Change Password */}
          <div>
            <h4 className="text-md font-medium text-gray-900 mb-4">Change Password</h4>
            <div className="space-y-4">
              <div className="relative">
                <Input
                  label="Current Password"
                  type={showPassword ? "text" : "password"}
                  value={passwordData.currentPassword}
                  onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-8 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <Input
                label="New Password"
                type={showPassword ? "text" : "password"}
                value={passwordData.newPassword}
                onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
              />
              <Input
                label="Confirm New Password"
                type={showPassword ? "text" : "password"}
                value={passwordData.confirmPassword}
                onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
              />
            </div>
          </div>

          {/* Session Management */}
          <div className="border-t pt-6">
            <h4 className="text-md font-medium text-gray-900 mb-4">Session Management</h4>
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">Active Sessions</p>
                  <p className="text-sm text-gray-600">2 active sessions found</p>
                </div>
                <Button variant="secondary" size="sm">
                  View All Sessions
                </Button>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={onSave} loading={saving} icon={Save}>
              Update Security Settings
            </Button>
          </div>
        </div>
      </Card.Body>
    </Card>
  );
};

// System Settings Component
const SystemSettings: React.FC<{ 
  onSave: () => void; 
  saving: boolean; 
}> = ({ onSave, saving }) => {
  return (
    <Card>
      <Card.Header>
        <h3 className="text-lg font-medium text-gray-900">System Configuration</h3>
        <p className="text-sm text-gray-600">Manage system-wide settings and preferences</p>
      </Card.Header>
      <Card.Body>
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Default Language
              </label>
              <select className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500">
                <option value="en">English</option>
                <option value="hi">Hindi</option>
                <option value="gu">Gujarati</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Timezone
              </label>
              <select className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500">
                <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
                <option value="UTC">UTC</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date Format
              </label>
              <select className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500">
                <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                <option value="YYYY-MM-DD">YYYY-MM-DD</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Currency
              </label>
              <select className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500">
                <option value="INR">Indian Rupee (₹)</option>
                <option value="USD">US Dollar ($)</option>
              </select>
            </div>
          </div>

          <div className="border-t pt-6">
            <h4 className="text-md font-medium text-gray-900 mb-4">System Status</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="flex items-center">
                  <div className="h-2 w-2 bg-green-500 rounded-full mr-2"></div>
                  <span className="text-sm font-medium text-green-900">Database</span>
                </div>
                <p className="text-sm text-green-700 mt-1">Connected</p>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="flex items-center">
                  <div className="h-2 w-2 bg-green-500 rounded-full mr-2"></div>
                  <span className="text-sm font-medium text-green-900">API Server</span>
                </div>
                <p className="text-sm text-green-700 mt-1">Online</p>
              </div>
              <div className="bg-yellow-50 p-4 rounded-lg">
                <div className="flex items-center">
                  <div className="h-2 w-2 bg-yellow-500 rounded-full mr-2"></div>
                  <span className="text-sm font-medium text-yellow-900">Backup</span>
                </div>
                <p className="text-sm text-yellow-700 mt-1">Last: 2 hours ago</p>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={onSave} loading={saving} icon={Save}>
              Save System Settings
            </Button>
          </div>
        </div>
      </Card.Body>
    </Card>
  );
};

// Appearance Settings Component
const AppearanceSettings: React.FC<{ 
  onSave: () => void; 
  saving: boolean; 
}> = ({ onSave, saving }) => {
  const [theme, setTheme] = useState('light');

  return (
    <Card>
      <Card.Header>
        <h3 className="text-lg font-medium text-gray-900">Appearance Settings</h3>
        <p className="text-sm text-gray-600">Customize the look and feel of your interface</p>
      </Card.Header>
      <Card.Body>
        <div className="space-y-6">
          <div>
            <h4 className="text-md font-medium text-gray-900 mb-4">Theme</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div 
                className={`border rounded-lg p-4 cursor-pointer transition-all ${
                  theme === 'light' ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-200'
                }`}
                onClick={() => setTheme('light')}
              >
                <div className="bg-white h-20 rounded border border-gray-200 mb-3"></div>
                <p className="text-sm font-medium text-gray-900">Light</p>
              </div>
              <div 
                className={`border rounded-lg p-4 cursor-pointer transition-all ${
                  theme === 'dark' ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-200'
                }`}
                onClick={() => setTheme('dark')}
              >
                <div className="bg-gray-800 h-20 rounded border border-gray-600 mb-3"></div>
                <p className="text-sm font-medium text-gray-900">Dark</p>
              </div>
              <div 
                className={`border rounded-lg p-4 cursor-pointer transition-all ${
                  theme === 'auto' ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-200'
                }`}
                onClick={() => setTheme('auto')}
              >
                <div className="bg-gradient-to-r from-white to-gray-800 h-20 rounded border border-gray-300 mb-3"></div>
                <p className="text-sm font-medium text-gray-900">Auto</p>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={onSave} loading={saving} icon={Save}>
              Save Appearance
            </Button>
          </div>
        </div>
      </Card.Body>
    </Card>
  );
};

// Backup Settings Component
const BackupSettings: React.FC = () => {
  return (
    <Card>
      <Card.Header>
        <h3 className="text-lg font-medium text-gray-900">Backup & Export</h3>
        <p className="text-sm text-gray-600">Manage data backup and export operations</p>
      </Card.Header>
      <Card.Body>
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="text-md font-medium text-gray-900 mb-2">Database Backup</h4>
              <p className="text-sm text-gray-600 mb-4">Export complete database backup</p>
              <Button icon={Download} size="sm" className="w-full">
                Download Backup
              </Button>
            </div>
            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="text-md font-medium text-gray-900 mb-2">System Configuration</h4>
              <p className="text-sm text-gray-600 mb-4">Export system settings and configuration</p>
              <Button icon={Download} size="sm" variant="secondary" className="w-full">
                Export Config
              </Button>
            </div>
          </div>

          <div className="border-t pt-6">
            <h4 className="text-md font-medium text-gray-900 mb-4">Restore from Backup</h4>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
              <Upload className="h-8 w-8 mx-auto text-gray-400 mb-2" />
              <p className="text-sm font-medium text-gray-900 mb-1">Upload backup file</p>
              <p className="text-sm text-gray-600 mb-4">Select a backup file to restore system data</p>
              <Button variant="secondary" size="sm">
                Choose File
              </Button>
            </div>
          </div>

          <div className="border-t pt-6">
            <h4 className="text-md font-medium text-gray-900 mb-4">Automatic Backup</h4>
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-900">Daily Backup Schedule</p>
                  <p className="text-sm text-blue-700">Next backup: Today at 2:00 AM</p>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge variant="success" size="sm">Active</Badge>
                  <Button variant="secondary" size="sm" icon={RefreshCw}>
                    Run Now
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card.Body>
    </Card>
  );
};

export default Settings;
