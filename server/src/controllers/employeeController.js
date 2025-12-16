import { User } from '../models/User.js';
import { Product } from '../models/Product.js';
import { Review } from '../models/Review.js';

// Get current employee's performance
export const getMyPerformance = async (req, res) => {
  try {
    const employeeId = req.user._id;

    // Get products created by employee
    const productsCreated = await Product.countDocuments({ createdBy: employeeId, isActive: true });

    // Get average rating of products
    const products = await Product.find({ createdBy: employeeId, isActive: true }).select('_id');
    const productIds = products.map((p) => p._id);

    let averageProductRating = 0;
    if (productIds.length > 0) {
      const reviews = await Review.find({ productId: { $in: productIds } });
      if (reviews.length > 0) {
        const totalRating = reviews.reduce((sum, r) => sum + r.rating, 0);
        averageProductRating = totalRating / reviews.length;
      }
    }

    // Get reviews received
    const reviewsReceived = await Review.countDocuments({ productId: { $in: productIds } });

    // Get tasks completed (placeholder)
    const tasksCompleted = 0; // TODO: Implement when Task model is available

    // Calculate total sales (placeholder)
    const totalSales = 0; // TODO: Implement when sales tracking is available

    // Get performance over time (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const productsByMonth = await Product.aggregate([
      {
        $match: {
          createdBy: employeeId,
          isActive: true,
          createdAt: { $gte: sixMonthsAgo },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
          },
          count: { $sum: 1 },
        },
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1 },
      },
    ]);

    const performance = {
      employeeId,
      productsCreated,
      averageProductRating: Math.round(averageProductRating * 10) / 10,
      tasksCompleted,
      reviewsReceived,
      totalSales,
      productsByMonth,
    };

    res.json({ performance });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get all users (read-only for employees)
export const getUsers = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', role = '' } = req.query;
    const skip = (page - 1) * limit;

    const query = {};

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    if (role) {
      query.role = role;
    }

    const users = await User.find(query)
      .select('-passwordHash')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await User.countDocuments(query);

    res.json({
      users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

