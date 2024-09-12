// backend/models/User.js
const userSchema = new mongoose.Schema({
  // ... bestaande velden
  role: { type: String, enum: ['teacher', 'admin'], default: 'teacher' },
  notificationPreferences: {
    email: { type: Boolean, default: true },
    inApp: { type: Boolean, default: true },
  },
  language: { type: String, default: 'en' },
});

// backend/models/Notification.js
const notificationSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  message: { type: String, required: true },
  type: { type: String, enum: ['info', 'warning', 'alert'], default: 'info' },
  read: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

const Notification = mongoose.model('Notification', notificationSchema);

// backend/controllers/adminController.js
exports.createUser = async (req, res) => {
  try {
    const newUser = new User(req.body);
    await newUser.save();
    res.status(201).json(newUser);
  } catch (error) {
    res.status(500).json({ message: 'Error creating user', error });
  }
};

exports.getUsers = async (req, res) => {
  try {
    const users = await User.find({}, '-password');
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching users', error });
  }
};

// ... Voeg soortgelijke functies toe voor updateUser en deleteUser

// backend/controllers/reportController.js
const { generateCSV, generatePDF } = require('../utils/reportGenerators');

exports.generateReport = async (req, res) => {
  try {
    const { groupId, startDate, endDate, format } = req.query;
    const moods = await Mood.find({
      group: groupId,
      timestamp: { $gte: new Date(startDate), $lte: new Date(endDate) }
    });

    let report;
    if (format === 'csv') {
      report = generateCSV(moods);
      res.header('Content-Type', 'text/csv');
      res.attachment('mood_report.csv');
    } else if (format === 'pdf') {
      report = await generatePDF(moods);
      res.header('Content-Type', 'application/pdf');
      res.attachment('mood_report.pdf');
    } else {
      return res.status(400).json({ message: 'Invalid format specified' });
    }

    res.send(report);
  } catch (error) {
    res.status(500).json({ message: 'Error generating report', error });
  }
};

// backend/services/notificationService.js
const Notification = require('../models/Notification');

exports.createNotification = async (userId, message, type = 'info') => {
  const notification = new Notification({
    user: userId,
    message,
    type,
  });
  await notification.save();
};

exports.getUnreadNotifications = async (userId) => {
  return Notification.find({ user: userId, read: false });
};

// backend/controllers/notificationController.js
const notificationService = require('../services/notificationService');

exports.getNotifications = async (req, res) => {
  try {
    const notifications = await notificationService.getUnreadNotifications(req.user._id);
    res.json(notifications);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching notifications', error });
  }
};

// backend/routes/index.js
const adminController = require('../controllers/adminController');
const reportController = require('../controllers/reportController');
const notificationController = require('../controllers/notificationController');

// ... bestaande routes

router.post('/users', authenticate, authorize('admin'), adminController.createUser);
router.get('/users', authenticate, authorize('admin'), adminController.getUsers);
router.get('/reports', authenticate, reportController.generateReport);
router.get('/notifications', authenticate, notificationController.getNotifications);

// backend/middleware/auth.js
exports.authorize = (role) => {
  return (req, res, next) => {
    if (req.user.role !== role) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    next();
  };
};
