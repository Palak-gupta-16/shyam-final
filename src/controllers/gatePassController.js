const { GatePass, User } = require('../models');
const { sendGatePassApprovalEmail } = require('../utils/mailer');

// Create gate pass request
const createGatePass = async (req, res) => {
  try {
    const { vehicle, purpose, relatedOrderId } = req.body;

    if (!vehicle || !vehicle.number || !vehicle.driverName || !vehicle.driverContact) {
      return res.status(400).json({
        message: 'Vehicle number, driver name, and driver contact are required'
      });
    }

    if (!purpose || purpose.trim() === '') {
      return res.status(400).json({ message: 'Purpose is required' });
    }

    const gatePass = new GatePass({
      requestBy: req.user._id,
      vehicle: {
        number: vehicle.number,
        driverName: vehicle.driverName,
        driverContact: vehicle.driverContact,
      },
      purpose,
      relatedOrderId: relatedOrderId || undefined,
      status: 'pending_approval'
    });

    await gatePass.save();

    const approvers = await User.find({ role: { $in: ['General_Manager', 'Director'] } })
      .select('email')
      .lean();

    const recipients = approvers.map((u) => u.email).filter(Boolean);
    let emailInfo = { sent: false };

    try {
      emailInfo = await sendGatePassApprovalEmail({ recipients, gatePass });
    } catch (emailError) {
      console.error('Gate pass email notification failed:', emailError);
    }

    // Populate the requestBy field for response
    await gatePass.populate('requestBy', 'name alias role');

    res.status(201).json({
      message: 'Gate pass requested',
      gp: gatePass,
      notification: emailInfo
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

    if (!['pending', 'pending_approval'].includes(gatePass.status)) {
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

    if (!['pending', 'pending_approval'].includes(gatePass.status)) {
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

// Mark approved gate pass as entered into factory
const markGatePassEntered = async (req, res) => {
  try {
    const { id } = req.params;

    const gatePass = await GatePass.findById(id);
    if (!gatePass) {
      return res.status(404).json({ message: 'Gate pass not found' });
    }

    if (gatePass.status !== 'approved') {
      return res.status(400).json({
        message: `Gate pass must be approved before entry. Current status: ${gatePass.status}`,
      });
    }

    gatePass.status = 'inside_factory';
    gatePass.entryTime = new Date();
    await gatePass.save();

    await gatePass.populate([
      { path: 'requestBy', select: 'name alias role' },
      { path: 'approvedBy', select: 'name alias role' },
    ]);

    res.status(200).json({
      message: 'Gate pass marked as entered',
      gp: gatePass,
    });
  } catch (error) {
    console.error('Mark gate pass entered error:', error);
    res.status(500).json({ message: 'Server error marking gate pass as entered' });
  }
};

// Mark gate pass as exited from factory
const markGatePassExited = async (req, res) => {
  try {
    const { id } = req.params;

    const gatePass = await GatePass.findById(id);
    if (!gatePass) {
      return res.status(404).json({ message: 'Gate pass not found' });
    }

    if (!['approved', 'inside_factory'].includes(gatePass.status)) {
      return res.status(400).json({
        message: `Cannot mark exit for gate pass status: ${gatePass.status}`,
      });
    }

    gatePass.status = 'exited';
    gatePass.exitTime = new Date();
    if (!gatePass.entryTime) {
      gatePass.entryTime = gatePass.approvedAt || new Date();
    }

    await gatePass.save();

    await gatePass.populate([
      { path: 'requestBy', select: 'name alias role' },
      { path: 'approvedBy', select: 'name alias role' },
    ]);

    res.status(200).json({
      message: 'Gate pass marked as exited',
      gp: gatePass,
    });
  } catch (error) {
    console.error('Mark gate pass exited error:', error);
    res.status(500).json({ message: 'Server error marking gate pass as exited' });
  }
};

// Get pending gate passes
const getPendingGatePasses = async (req, res) => {
  try {
    const pendingGatePasses = await GatePass.find({ status: { $in: ['pending', 'pending_approval'] } })
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
  markGatePassEntered,
  markGatePassExited,
  getGatePasses,
  getGatePassById,
  getPendingGatePasses
};
