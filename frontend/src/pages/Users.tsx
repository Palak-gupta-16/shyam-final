import React, { useState, useEffect, useCallback } from 'react';
import { 
  Users as UsersIcon, 
  Plus, 
  Search, 
  Filter,
  Edit3,
  Trash2,
  UserCheck,
  UserX,
  Shield,
  Mail,
  Phone,
  Calendar,
  MoreVertical
} from 'lucide-react';
import toast from 'react-hot-toast';
import DashboardLayout from '../components/layout/DashboardLayout';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import Modal from '../components/common/Modal';
import Badge from '../components/common/Badge';
import Table from '../components/common/Table';
import { authAPI } from '../services/api';
import Pagination from '../components/common/Pagination';
import { User, UserRole } from '../types';

const Users: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const roles: { value: string; label: string; color: string }[] = [
    { value: 'all', label: 'All Roles', color: 'gray' },
    { value: 'Director', label: 'Director', color: 'purple' },
    { value: 'General_Manager', label: 'General Manager', color: 'blue' },
    { value: 'Store_Keeper', label: 'Store Keeper', color: 'green' },
    { value: 'Purchasing', label: 'Purchasing', color: 'yellow' },
    { value: 'Guard', label: 'Guard', color: 'red' },
    { value: 'Weighbridge', label: 'Weighbridge', color: 'indigo' },
    { value: 'Loading', label: 'Loading', color: 'pink' },
    { value: 'Accounting', label: 'Accounting', color: 'orange' },
  ];

  useEffect(() => {
    fetchUsers();
  }, []);

const fetchUsers = useCallback(async () => {
  try {
    setLoading(true);

    const res = await authAPI.getAll();

    // 👇 this matches your backend response
    setUsers(res.users || []);

  } catch (error) {
    toast.error('Error fetching users: ' + (error as any).message);
  } finally {
    setLoading(false);
  }
}, []);


  const filterUsers = useCallback(() => {
    let filtered = users;

    if (selectedRole !== 'all') {
      filtered = filtered.filter(user => user.role === selectedRole);
    }

    if (searchTerm) {
      filtered = filtered.filter(user =>
        user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.alias.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredUsers(filtered);
  }, [users, searchTerm, selectedRole]);

  useEffect(() => {
    filterUsers();
  }, [filterUsers]);

  const getRoleBadge = (role: UserRole) => {
    const roleConfig = roles.find(r => r.value === role);
    return (
      <Badge 
        variant="secondary" 
        size="sm"
        className={`bg-${roleConfig?.color || 'gray'}-100 text-${roleConfig?.color || 'gray'}-800`}
      >
        {roleConfig?.label || role}
      </Badge>
    );
  };

  const handleDeleteUser = async (userId: string) => {
    try {
      // Simulate API call
      setUsers(prev => prev.filter(user => user._id !== userId));
      setShowDeleteModal(false);
      setSelectedUser(null);
    } catch (error) {
      console.error('Error deleting user:', error);
    }
  };

  const columns = [
    {
      key: 'name',
      title: 'User',
      sortable: true,
      render: (_: any, record: User) => (
        <div className="flex items-center space-x-3">
          <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
            <span className="text-sm font-medium text-blue-600">
              {record.name.split(' ').map(n => n[0]).join('').toUpperCase()}
            </span>
          </div>
          <div>
            <div className="font-medium text-gray-900">{record.name}</div>
            <div className="text-sm text-gray-500">@{record.alias}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'email',
      title: 'Contact',
      render: (value: string) => (
        <div>
          <div className="flex items-center text-gray-900">
            <Mail className="h-4 w-4 mr-2 text-gray-400" />
            {value}
          </div>
        </div>
      ),
    },
    {
      key: 'role',
      title: 'Role',
      sortable: true,
      render: (value: UserRole) => getRoleBadge(value),
    },
    {
      key: 'createdAt',
      title: 'Created',
      sortable: true,
      render: (value: string) => (
        <div className="flex items-center text-sm text-gray-500">
          <Calendar className="h-4 w-4 mr-2" />
          {new Date(value).toLocaleDateString()}
        </div>
      ),
    },
    // {
    //   key: 'actions',
    //   title: 'Actions',
    //   render: (_: any, record: User) => (
    //     <div className="flex items-center space-x-2">
    //       <Button
    //         variant="ghost"
    //         size="sm"
    //         icon={Edit3}
    //         onClick={() => {
    //           setSelectedUser(record);
    //           setShowEditModal(true);
    //         }}
    //       />
    //       <Button
    //         variant="ghost"
    //         size="sm"
    //         icon={Trash2}
    //         onClick={() => {
    //           setSelectedUser(record);
    //           setShowDeleteModal(true);
    //         }}
    //       />
    //     </div>
    //   ),
    // },
  ];

  const totalPages = Math.ceil(filteredUsers.length / pageSize);
  const paginatedUsers = filteredUsers.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const getStats = () => {
    return [
      {
        title: 'Total Users',
        value: users.length,
        icon: UsersIcon,
        color: 'primary' as const,
      },
      {
        title: 'Active Users',
        value: users.length, // Assuming all are active for now
        icon: UserCheck,
        color: 'success' as const,
      },
      {
        title: 'Admin Users',
        value: users.filter(u => ['Director', 'General_Manager'].includes(u.role)).length,
        icon: Shield,
        color: 'warning' as const,
      },
      {
        title: 'Operational Staff',
        value: users.filter(u => !['Director', 'General_Manager'].includes(u.role)).length,
        icon: UsersIcon,
        color: 'info' as const,
      },
    ];
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
            <p className="text-gray-600 mt-2">Manage system users and their access permissions</p>
          </div>
          {/* <Button
            icon={Plus}
            onClick={() => setShowCreateModal(true)}
          >
            Add User
          </Button> */}
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
                  <div className={`p-3 rounded-lg bg-${stat.color === 'primary' ? 'blue' : stat.color === 'info' ? 'blue' : stat.color}-50`}>
                    <stat.icon className={`h-6 w-6 text-${stat.color === 'primary' ? 'blue' : stat.color === 'info' ? 'blue' : stat.color}-600`} />
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
                  placeholder="Search users by name, email, or username..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  icon={Search}
                />
              </div>
              <div className="flex gap-2">
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {roles.map((role) => (
                    <option key={role.value} value={role.value}>
                      {role.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </Card.Body>
        </Card>

        {/* Users Table */}
        <Table
          columns={columns}
          data={paginatedUsers}
          loading={loading}
          emptyText="No users found"
        />

        {/* Pagination */}
        {totalPages > 1 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            pageSize={pageSize}
            onPageSizeChange={setPageSize}
            total={filteredUsers.length}
            showSizeChanger
            showQuickJumper
          />
        )}

        {/* Create User Modal */}
        {/* <CreateUserModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            fetchUsers();
          }}
        /> */}

        {/* Edit User Modal */}
        {selectedUser && (
          <EditUserModal
            isOpen={showEditModal}
            onClose={() => {
              setShowEditModal(false);
              setSelectedUser(null);
            }}
            user={selectedUser}
            onSuccess={() => {
              setShowEditModal(false);
              setSelectedUser(null);
              fetchUsers();
            }}
          />
        )}

        {/* Delete Confirmation Modal */}
        {selectedUser && (
          <Modal
            isOpen={showDeleteModal}
            onClose={() => {
              setShowDeleteModal(false);
              setSelectedUser(null);
            }}
            title="Delete User"
            size="md"
          >
            <div className="space-y-4">
              <div className="flex items-center space-x-3 p-4 bg-red-50 rounded-lg">
                <UserX className="h-8 w-8 text-red-600" />
                <div>
                  <h4 className="font-medium text-red-900">Delete User Account</h4>
                  <p className="text-sm text-red-700">
                    This action cannot be undone. The user will lose access to the system.
                  </p>
                </div>
              </div>
              
              <p className="text-gray-700">
                Are you sure you want to delete <strong>{selectedUser.name}</strong>? 
                This will permanently remove their account and all associated data.
              </p>

              <div className="flex justify-end space-x-3 pt-4">
                <Button 
                  variant="secondary" 
                  onClick={() => {
                    setShowDeleteModal(false);
                    setSelectedUser(null);
                  }}
                >
                  Cancel
                </Button>
                <Button 
                  variant="danger"
                  onClick={() => handleDeleteUser(selectedUser._id)}
                >
                  Delete User
                </Button>
              </div>
            </div>
          </Modal>
        )}
      </div>
    </DashboardLayout>
  );
};

// Create User Modal
// const CreateUserModal: React.FC<{
//   isOpen: boolean;
//   onClose: () => void;
//   onSuccess: () => void;
// }> = ({ isOpen, onClose, onSuccess }) => {
//   const [formData, setFormData] = useState({
//     name: '',
//     alias: '',
//     email: '',
//     role: 'Store_Keeper' as UserRole,
//     password: '',
//     confirmPassword: '',
//   });
//   const [loading, setLoading] = useState(false);

//   const handleSubmit = async (e: React.FormEvent) => {
//     e.preventDefault();
//     if (formData.password !== formData.confirmPassword) {
//       alert('Passwords do not match');
//       return;
//     }

//     try {
//       setLoading(true);
//       // Simulate API call
//       await new Promise(resolve => setTimeout(resolve, 1000));
//       onSuccess();
//       setFormData({
//         name: '',
//         alias: '',
//         email: '',
//         role: 'Store_Keeper',
//         password: '',
//         confirmPassword: '',
//       });
//     } catch (error) {
//       console.error('Error creating user:', error);
//     } finally {
//       setLoading(false);
//     }
//   };

//   return (
//     <Modal isOpen={isOpen} onClose={onClose} title="Create New User" size="lg">
//       <form onSubmit={handleSubmit} className="space-y-4">
//         <div className="grid grid-cols-2 gap-4">
//           <Input
//             label="Full Name"
//             value={formData.name}
//             onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
//             required
//             placeholder="Enter full name"
//           />
//           <Input
//             label="Username/Alias"
//             value={formData.alias}
//             onChange={(e) => setFormData(prev => ({ ...prev, alias: e.target.value }))}
//             required
//             placeholder="Enter username"
//           />
//         </div>

//         <Input
//           label="Email Address"
//           type="email"
//           value={formData.email}
//           onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
//           required
//           placeholder="Enter email address"
//         />

//         <div>
//           <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
//           <select
//             value={formData.role}
//             onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value as UserRole }))}
//             className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500"
//           >
//             <option value="Director">Director</option>
//             <option value="General_Manager">General Manager</option>
//             <option value="Store_Keeper">Store Keeper</option>
//             <option value="Purchasing">Purchasing</option>
//             <option value="Guard">Guard</option>
//             <option value="Weighbridge">Weighbridge</option>
//             <option value="Loading">Loading</option>
//             <option value="Accounting">Accounting</option>
//           </select>
//         </div>

//         <div className="grid grid-cols-2 gap-4">
//           <Input
//             label="Password"
//             type="password"
//             value={formData.password}
//             onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
//             required
//             placeholder="Enter password"
//           />
//           <Input
//             label="Confirm Password"
//             type="password"
//             value={formData.confirmPassword}
//             onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
//             required
//             placeholder="Confirm password"
//           />
//         </div>

//         <div className="flex justify-end space-x-3 pt-4">
//           <Button variant="secondary" onClick={onClose}>
//             Cancel
//           </Button>
//           <Button type="submit" loading={loading}>
//             Create User
//           </Button>
//         </div>
//       </form>
//     </Modal>
//   );
// };

// Edit User Modal
const EditUserModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  user: User;
  onSuccess: () => void;
}> = ({ isOpen, onClose, user, onSuccess }) => {
  const [formData, setFormData] = useState({
    name: user.name,
    alias: user.alias,
    email: user.email,
    role: user.role,
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      onSuccess();
    } catch (error) {
      console.error('Error updating user:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit User" size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Full Name"
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            required
          />
          <Input
            label="Username/Alias"
            value={formData.alias}
            onChange={(e) => setFormData(prev => ({ ...prev, alias: e.target.value }))}
            required
          />
        </div>

        <Input
          label="Email Address"
          type="email"
          value={formData.email}
          onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
          required
        />

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
          <select
            value={formData.role}
            onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value as UserRole }))}
            className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="Director">Director</option>
            <option value="General_Manager">General Manager</option>
            <option value="Store_Keeper">Store Keeper</option>
            <option value="Purchasing">Purchasing</option>
            <option value="Guard">Guard</option>
            <option value="Weighbridge">Weighbridge</option>
            <option value="Loading">Loading</option>
            <option value="Accounting">Accounting</option>
          </select>
        </div>

        <div className="flex justify-end space-x-3 pt-4">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={loading}>
            Update User
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default Users;
