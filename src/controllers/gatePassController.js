const { GatePass } = require('../models');

// Create gate pass request
const createGatePass = async (req, res) => {
  try {
    const { vehicle, purpose } = req.body;

    const gatePass = new GatePass({
      requestBy: req.user._id,
      vehicle,
      purpose,
      status: 'pending'
    });

    await gatePass.save();

    // Populate the requestBy field for response
    await gatePass.populate('requestBy', 'name alias role');

    res.status(201).json({
      message: 'Gate pass requested',
      gp: gatePass
    });

  } catch (error) {
    console.error('Create gate pass error:', error);
    
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ 
        message: 'Validation failed', 
        errors: validationErrors 
      });
    }
    
    res.status(500).json({ message: 'Server error creating gate pass' });
  }
};

// Approve gate pass
const approveGatePass = async (req, res) => {
  try {
    const { id } = req.params;

    const gatePass = await GatePass.findById(id);
    if (!gatePass) {
      return res.status(404).json({ message: 'Gate pass not found' });
    }

    if (gatePass.status !== 'pending') {
      return res.status(400).json({ 
        message: `Cannot approve gate pass with status: ${gatePass.status}` 
      });
    }

    // Update gate pass
    gatePass.status = 'approved';
    gatePass.approvedBy = req.user._id;
    gatePass.approvedAt = new Date();

    await gatePass.save();

    // Populate fields for response
    await gatePass.populate([
      { path: 'requestBy', select: 'name alias role' },
      { path: 'approvedBy', select: 'name alias role' }
    ]);

    res.status(200).json({
      message: 'Gate pass approved',
      gp: gatePass
    });

  } catch (error) {
    console.error('Approve gate pass error:', error);
    res.status(500).json({ message: 'Server error approving gate pass' });
  }
};

// Reject gate pass
const rejectGatePass = async (req, res) => {
  try {
    const { id } = req.params;
    const { rejectionReason } = req.body;

    const gatePass = await GatePass.findById(id);
    if (!gatePass) {
      return res.status(404).json({ message: 'Gate pass not found' });
    }

    if (gatePass.status !== 'pending') {
      return res.status(400).json({ 
        message: `Cannot reject gate pass with status: ${gatePass.status}` 
      });
    }

    // Update gate pass
    gatePass.status = 'rejected';
    gatePass.rejectedBy = req.user._id;
    gatePass.rejectedAt = new Date();
    gatePass.rejectionReason = rejectionReason;

    await gatePass.save();

    // Populate fields for response
    await gatePass.populate([
      { path: 'requestBy', select: 'name alias role' },
      { path: 'rejectedBy', select: 'name alias role' }
    ]);

    res.status(200).json({
      message: 'Gate pass rejected',
      gp: gatePass
    });

  } catch (error) {
    console.error('Reject gate pass error:', error);
    res.status(500).json({ message: 'Server error rejecting gate pass' });
  }
};

// Get gate passes with filters
const getGatePasses = async (req, res) => {
  try {
    const { status, page = 1, perPage = 25 } = req.query;

    // Build filter object
    const filter = {};
    if (status) filter.status = status;

    // Calculate pagination
    const skip = (page - 1) * perPage;

    // Get gate passes
    const gatePasses = await GatePass.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(perPage))
      .populate('requestBy', 'name alias role')
      .populate('approvedBy', 'name alias role')
      .populate('rejectedBy', 'name alias role')
      .lean();

    // Get total count for pagination info
    const totalCount = await GatePass.countDocuments(filter);

    res.status(200).json({
      gatePasses,
      pagination: {
        page: parseInt(page),
        perPage: parseInt(perPage),
        total: totalCount,
        totalPages: Math.ceil(totalCount / perPage)
      }
    });

  } catch (error) {
    console.error('Get gate passes error:', error);
    res.status(500).json({ message: 'Server error retrieving gate passes' });
  }
};

// Get gate pass by ID
const getGatePassById = async (req, res) => {
  try {
    const { id } = req.params;

    const gatePass = await GatePass.findById(id)
      .populate('requestBy', 'name alias role')
      .populate('approvedBy', 'name alias role')
      .populate('rejectedBy', 'name alias role');

    if (!gatePass) {
      return res.status(404).json({ message: 'Gate pass not found' });
    }

    res.status(200).json({
      message: 'Gate pass retrieved',
      gp: gatePass
    });

  } catch (error) {
    console.error('Get gate pass by ID error:', error);
    res.status(500).json({ message: 'Server error retrieving gate pass' });
  }
};

// Get pending gate passes
const getPendingGatePasses = async (req, res) => {
  try {
    const pendingGatePasses = await GatePass.find({ status: 'pending' })
      .sort({ createdAt: 1 }) // Oldest first for processing
      .populate('requestBy', 'name alias role')
      .lean();

    res.status(200).json({
      message: 'Pending gate passes retrieved',
      gatePasses: pendingGatePasses,
      count: pendingGatePasses.length
    });

  } catch (error) {
    console.error('Get pending gate passes error:', error);
    res.status(500).json({ message: 'Server error retrieving pending gate passes' });
  }
};

module.exports = {
  createGatePass,
  approveGatePass,
  rejectGatePass,
  getGatePasses,
  getGatePassById,
  getPendingGatePasses
};
