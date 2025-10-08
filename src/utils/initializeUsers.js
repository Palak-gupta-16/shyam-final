const { User } = require('../models');

/**
 * Initialize default director user if no users exist in the database
 * This function is called on app startup to ensure there's always an admin user
 */
const initializeDefaultUser = async () => {
  try {
    console.log('👤 Checking for existing users...');
    
    // Check if any users exist in the database
    const userCount = await User.countDocuments();
    
    if (userCount > 0) {
      console.log(`✅ Found ${userCount} existing users. Skipping default user creation.`);
      return;
    }
    
    console.log('📝 No users found. Creating default director user...');
    
    // Get default user credentials from environment variables
    const defaultUser = {
      name: process.env.DEFAULT_DIRECTOR_NAME || 'Default Director',
      alias: process.env.DEFAULT_DIRECTOR_ALIAS || 'Director',
      email: process.env.DEFAULT_DIRECTOR_EMAIL || 'director@shyam.com',
      password: process.env.DEFAULT_DIRECTOR_PASSWORD || 'Director123',
      role: 'Director'
    };
    
    // Validate required environment variables
    if (!process.env.DEFAULT_DIRECTOR_EMAIL || !process.env.DEFAULT_DIRECTOR_PASSWORD) {
      console.warn('⚠️  WARNING: DEFAULT_DIRECTOR_EMAIL or DEFAULT_DIRECTOR_PASSWORD not set in environment variables');
      console.warn('⚠️  Using default credentials. Please update .env file for production!');
    }
    
    // Create the default director user
    const user = new User({
      name: defaultUser.name,
      alias: defaultUser.alias,
      email: defaultUser.email,
      passwordHash: defaultUser.password, // Will be hashed by pre-save middleware
      role: defaultUser.role
    });
    
    await user.save();
    
    console.log('✅ Default director user created successfully!');
    console.log(`   📧 Email: ${defaultUser.email}`);
    console.log(`   👤 Name: ${defaultUser.name}`);
    console.log(`   🏷️  Role: ${defaultUser.role}`);
    console.log('');
    console.log('🔐 IMPORTANT: Please change the default password after first login!');
    console.log('');
    
  } catch (error) {
    console.error('❌ Error initializing default user:', error);
    
    // Don't crash the app if user creation fails
    if (error.code === 11000) {
      console.error('   User with this email already exists');
    } else if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => err.message);
      console.error('   Validation errors:', validationErrors);
    } else {
      console.error('   Unexpected error during user creation');
    }
    
    console.log('⚠️  Continuing app startup despite user creation error...');
  }
};

/**
 * Display startup user information
 */
const displayUserInfo = async () => {
  try {
    const userCount = await User.countDocuments();
    const directorCount = await User.countDocuments({ role: 'Director' });
    
    console.log(`👥 Database contains ${userCount} user(s), ${directorCount} director(s)`);
    
    if (directorCount > 0) {
      const directors = await User.find({ role: 'Director' }).select('name email alias');
      console.log('🎯 Available Directors:');
      directors.forEach(director => {
        console.log(`   • ${director.name} (${director.alias}) - ${director.email}`);
      });
    }
    console.log('');
    
  } catch (error) {
    console.error('Error displaying user info:', error.message);
  }
};

module.exports = {
  initializeDefaultUser,
  displayUserInfo
};
