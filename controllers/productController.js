const Product = require('../models/Product');
const Category = require('../models/Category');
const cloudinary = require("../utils/cloudinary");


// ✅ ADD
exports.addProduct = async (req, res) => {
  try {
    const { title, description, category } = req.body;
    const images = req.files
      ? await Promise.all(
        req.files.map((file) => {
          return new Promise((resolve, reject) => {
            cloudinary.uploader.upload_stream(
              { folder: "hth/products" },
              (err, res) => (err ? reject(err) : resolve(res.secure_url))
            ).end(file.buffer);
          });
        })
      )
      : [];

    const product = await Product.create({
      title,
      description,
      category,
      images,
      user: req.userId,
    });

    res.status(201).json(product);
  } catch (err) {
    console.error('Product creation error:', err);
    res.status(500).json({ error: err.message });
  }
};

// GET
exports.getProducts = async (req, res) => {
  try {
    const products = await Product.find()
      .populate('user', 'name username email profileImage')
      .populate('category', 'name')
      .sort({ createdAt: -1 });

    res.json(products);
  } catch (err) {
    res.status(500).json({ error: 'Məhsullar alınmadı' });
  }
};

exports.getLatestProducts = async (req, res) => {
  try {
    const latest = await Product.find({ user: { $exists: true } })
      .sort({ createdAt: -1 })
      .limit(6)
      .populate('user', 'name profileImage');

    console.log('LATEST PRODUCTS:', latest);
    res.json(latest);
  } catch (err) {
    console.error('Error fetching latest products:', err);
    res.status(500).json({ message: 'Failed to fetch latest products' });
  }
};





// ✅ DELETE
exports.deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ error: 'Product not found' });

    if (!product.user || product.user._id?.toString() !== req.userId?.toString()) {
      return res.status(403).json({ error: 'Silməyə icazə yoxdur' });
    }

    await product.deleteOne();
    res.json({ message: 'Product deleted' });
  } catch (err) {
    console.error('Delete product error:', err);
    res.status(500).json({ error: 'Product delete failed' });
  }
};

// UPDATE
exports.updateProduct = async (req, res) => {
  try {
    const { title, description, category } = req.body;
    const images = req.files
      ? await Promise.all(
        req.files.map((file) => {
          return new Promise((resolve, reject) => {
            cloudinary.uploader.upload_stream(
              { folder: "hth/products" },
              (err, res) => (err ? reject(err) : resolve(res.secure_url))
            ).end(file.buffer);
          });
        })
      )
      : [];

    const updatedData = { title, description, category };
    if (images.length > 0) {
      updatedData.images = images;
    }

    const updated = await Product.findByIdAndUpdate(req.params.id, updatedData, {
      new: true,
    })
      .populate('user', 'name profileImage')
      .populate('category', 'name');

    res.json(updated);
  } catch (err) {
    console.error('Məhsul yenilənmədi:', err);
    res.status(500).json({ message: 'Server xətası' });
  }
};



// ✅ GET BY ID
exports.getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate('user', 'name email profileImage') // buraya profileImage əlavə edildi
      .populate('category', 'name');

    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.json(product);
  } catch (err) {
    console.error('Get product by ID error:', err);
    res.status(500).json({ error: 'Failed to fetch product' });
  }
};


// ✅ Yalnız istifadəçinin öz məhsullarını gətir
exports.getMyProducts = async (req, res) => {
  try {
    const userId = req.userId;
    const products = await Product.find({ user: userId })
      .populate('category', 'name')
      .populate('user', 'name profileImage')
      .sort({ createdAt: -1 });

    res.status(200).json(products);
  } catch (err) {
    console.error('❌ getMyProducts xətası:', err.message);
    res.status(500).json({ message: 'Məhsullar yüklənərkən xəta baş verdi' });
  }
};


// ✅ GET BY USER ID
exports.getProductsByUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const products = await Product.find({ user: userId }).populate('category')
      .populate('user', 'name profileImage');
    res.status(200).json(products);
  } catch (err) {
    res.status(500).json({ message: 'İstifadəçi məhsulları alınmadı', error: err.message });
  }
};


// ✅ GET BY CATEGORY NAME
exports.getProductsByCategory = async (req, res) => {
  try {
    const categoryName = req.params.category;

    // 1. Ad ilə uyğun olan category-ni tap
    const category = await Category.findOne({ name: categoryName });
    if (!category) return res.status(404).json({ error: 'Kateqoriya tapılmadı' });

    // 2. Tapılan category._id ilə məhsulları tap
    const products = await Product.find({ category: category._id })
      .populate('user', 'name profileImage')
      .populate('category', 'name')
      .sort({ createdAt: -1 });

    res.json(products);
  } catch (err) {
    console.error('Kategoriya üzrə məhsul tapılmadı:', err);
    res.status(500).json({ error: 'Server xətası' });
  }
};
