import { Product } from '../models/Product.js';
import { Review } from '../models/Review.js';

// Get all products
export const getProducts = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', category = '', createdBy = '', isActive } = req.query;
    const skip = (page - 1) * limit;

    const query = {};

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { sku: { $regex: search, $options: 'i' } },
      ];
    }

    if (category) {
      query.category = { $regex: category, $options: 'i' };
    }

    if (createdBy) {
      query.createdBy = createdBy;
    }

    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    } else {
      query.isActive = true; // Default to active products
    }

    const products = await Product.find(query)
      .populate('createdBy', 'name email profile.avatar')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Product.countDocuments(query);

    // Get average ratings for each product
    const productsWithRatings = await Promise.all(
      products.map(async (product) => {
        const reviews = await Review.find({ productId: product._id });
        const avgRating =
          reviews.length > 0
            ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
            : 0;
        const reviewCount = reviews.length;

        return {
          ...product.toObject(),
          averageRating: Math.round(avgRating * 10) / 10,
          reviewCount,
        };
      })
    );

    res.json({
      products: productsWithRatings,
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

// Get single product
export const getProduct = async (req, res) => {
  try {
    const { id } = req.params;

    const product = await Product.findById(id).populate('createdBy', 'name email profile.avatar');

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Get reviews
    const reviews = await Review.find({ productId: id })
      .populate('customerId', 'name email')
      .sort({ createdAt: -1 });

    const avgRating =
      reviews.length > 0
        ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
        : 0;

    res.json({
      product: {
        ...product.toObject(),
        averageRating: Math.round(avgRating * 10) / 10,
        reviewCount: reviews.length,
      },
      reviews,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Create product
export const createProduct = async (req, res) => {
  try {
    const { name, description, price, sku, category, tags, images, createdBy } = req.body;

    if (!name || !price) {
      return res.status(400).json({ error: 'Name and price are required' });
    }

    // Admins can set createdBy, others use their own ID
    const productCreatedBy = req.user.role === 'admin' && createdBy ? createdBy : req.user._id;

    const product = await Product.create({
      name,
      description: description || '',
      price: parseFloat(price),
      sku: sku || undefined,
      category: category || '',
      tags: Array.isArray(tags) ? tags : [],
      images: Array.isArray(images) ? images : [],
      createdBy: productCreatedBy,
      isActive: true,
    });

    const populatedProduct = await Product.findById(product._id).populate('createdBy', 'name email');

    res.status(201).json({ product: populatedProduct });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update product
export const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, price, sku, category, tags, images, isActive, createdBy } = req.body;

    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    if (name) product.name = name;
    if (description !== undefined) product.description = description;
    if (price !== undefined) product.price = parseFloat(price);
    if (sku !== undefined) product.sku = sku || undefined;
    if (category !== undefined) product.category = category;
    if (tags !== undefined) product.tags = Array.isArray(tags) ? tags : [];
    if (images !== undefined) product.images = Array.isArray(images) ? images : [];
    if (isActive !== undefined) product.isActive = isActive;
    
    // Admins can change createdBy
    if (req.user.role === 'admin' && createdBy !== undefined) {
      product.createdBy = createdBy;
    }

    await product.save();

    const populatedProduct = await Product.findById(product._id).populate('createdBy', 'name email');

    res.json({ product: populatedProduct });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Delete product
export const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;

    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Soft delete - set isActive to false
    product.isActive = false;
    await product.save();

    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Upload product image
export const uploadProductImage = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const imagePath = `/uploads/products/${req.file.filename}`;

    res.status(201).json({
      message: 'Product image uploaded successfully',
      imageUrl: imagePath,
    });
  } catch (error) {
    next(error);
  }
};

