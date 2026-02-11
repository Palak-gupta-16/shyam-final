import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, Mail, Lock, Eye, EyeOff, UserCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types';
import Button from '../common/Button';
import Input from '../common/Input';
import Card from '../common/Card';
import toast from 'react-hot-toast';

const ROLES: { value: UserRole; label: string; description: string }[] = [
  { value: 'Guard', label: 'Guard', description: 'Vehicle entry/exit management' },
  { value: 'Weighbridge', label: 'Weighbridge Operator', description: 'Weight recording operations' },
  { value: 'Loading', label: 'Loading Supervisor', description: 'Loading operations management' },
  { value: 'Unloading', label: 'Unloading Supervisor', description: 'Unloading operations management' },
  { value: 'Mill_Supervisor', label: 'Mill Supervisor', description: 'Mill operations and reporting' },
  { value: 'Accounting', label: 'Accounting', description: 'Invoice and billing management' },
  { value: 'Stocks', label: 'Stock Manager', description: 'Stock management operations' },
  { value: 'Store_Keeper', label: 'Store Keeper', description: 'Inventory and store management' },
  { value: 'Purchasing', label: 'Purchasing', description: 'Purchase order management' },
  { value: 'General_Manager', label: 'General Manager', description: 'General management access' },
  { value: 'Director', label: 'Director', description: 'Full system access' },
];

interface RegisterFormProps {
  embedded?: boolean;
}

const RegisterForm: React.FC<RegisterFormProps> = ({ embedded = false }) => {
  const navigate = useNavigate();
  const { register } = useAuth();
  
  const [formData, setFormData] = useState({
    name: '',
    alias: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'Guard' as UserRole,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const passwordRegex =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
    if (error) setError('');
  };

  const validateForm = () => {
    if (!formData.name.trim()) {
      setError('Name is required');
      return false;
    }
    if (!formData.alias.trim()) {
      setError('Alias is required');
      return false;
    }
    if (!formData.email.trim()) {
      setError('Email is required');
      return false;
    }
     if (!passwordRegex.test(formData.password)) {
    setError(
      'Password must be at least 8 characters and include uppercase, lowercase, and a number'
    );
    return false;
  }

  // ✅ Confirm password validation
  if (formData.confirmPassword.trim() === '') {
    setError('Please confirm your password');
    return false;
  }

  if (formData.password !== formData.confirmPassword) {
    setError('Passwords do not match');
    return false;
  }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setIsLoading(true);
    setError('');

    try {
      await register({
        name: formData.name,
        alias: formData.alias,
        email: formData.email,
        password: formData.password,
        role: formData.role,
      });
      setSuccess(true);
      setTimeout(() => {
        // navigate('/login');
      }, 2000);
    } catch (err: any) {
  const apiError = err.response?.data;

  if (apiError?.errors) {
    apiError.errors.forEach((e: any) => toast.error(e.message));
  } else {
    toast.error(apiError?.message || 'Registration failed');
  }
} finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className={embedded ? "w-full" : "min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-secondary-100 px-4"}>

        <Card className="w-full max-w-md" shadow="lg">
          <Card.Body>
            <div className="text-center">
              <div className="mx-auto h-16 w-16 bg-success-600 rounded-full flex items-center justify-center mb-4">
                <UserCheck className="h-8 w-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Registration Successful!</h2>
              <p className="text-gray-600 mb-6">
                Your account has been created successfully. You will be redirected to the login page shortly.
              </p>
              {/* <Button onClick={() => navigate('/login')}>
                Go to Login
              </Button> */}
            </div>
          </Card.Body>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-secondary-100 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md" shadow="lg">
        <Card.Body>
          <div className="text-center mb-8">
            <div className="mx-auto h-16 w-16 bg-[rgb(238,119,53)] rounded-full flex items-center justify-center mb-4">
              <span className="text-2xl font-bold text-white">S</span>
            </div>
            <h2 className="text-3xl font-bold text-gray-900">Create Account</h2>
            <p className="mt-2 text-gray-600">Join SHYAM SUPER APP</p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-error-50 border border-error-200 rounded-lg">
              <p className="text-error-800 text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <Input
              label="Full Name"
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              icon={User}
              placeholder="Enter your full name"
              required
            />

            <Input
              label="Alias"
              type="text"
              name="alias"
              value={formData.alias}
              onChange={handleChange}
              icon={User}
              placeholder="Enter your alias/nickname"
              required
            />

            <Input
              label="Email Address"
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              icon={Mail}
              placeholder="Enter your email"
              required
            />

            <div>
              <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">
                Role
              </label>
              <select
                id="role"
                name="role"
                value={formData.role}
                onChange={handleChange}
                className="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                required
              >
                {ROLES.map((role) => (
                  <option key={role.value} value={role.value}>
                    {role.label}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-gray-500">
                {ROLES.find(r => r.value === formData.role)?.description}
              </p>
            </div>

            <div className="relative">
              <Input
                label="Password"
                type={showPassword ? 'text' : 'password'}
                name="password"
                value={formData.password}
                onChange={handleChange}
                icon={Lock}
                placeholder="Enter your password"
                required
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>

            <div className="relative">
              <Input
                label="Confirm Password"
                type={showConfirmPassword ? 'text' : 'password'}
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                icon={Lock}
                placeholder="Confirm your password"
                required
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>

            <Button
              type="submit"
              loading={isLoading}
              fullWidth
              className="mt-8"
            >
              Create Account
            </Button>
          </form>

          {!embedded && (
  <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Already have an account?{' '}
              <Link
                to="/login"
                className="font-medium text-primary-600 hover:text-primary-500 transition-colors"
              >
                Sign in here
              </Link>
            </p>
          </div>)}
        </Card.Body>
      </Card>
    </div>
  );
};

export default RegisterForm;
