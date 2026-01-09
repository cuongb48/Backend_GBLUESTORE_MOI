const mongoose = require('mongoose');

const cartItemSchema = new mongoose.Schema({
    _idSP: { type: mongoose.SchemaTypes.ObjectId, ref: 'SanPham', required: true },
    size: { type: String, required: true },
    quantity: { type: Number, required: true },
    price: { type: Number, required: true },
    priceGoc: { type: Number, required: true },    

});

const cartSchema = new mongoose.Schema({
    idKhachHang: { type: mongoose.SchemaTypes.ObjectId, ref: 'AccKH', required: true, unique: true },
    products: [cartItemSchema],
    tongTienChuaGiam: { type: Number, default: 0 },
    soTienGiamGia: { type: Number, default: 0 },
    soTienCanThanhToan: { type: Number, default: 0 },
    voucherCode: { type: String, default: null },

}, {
    timestamps: true
});

const Cart = mongoose.model('Cart', cartSchema);

module.exports = Cart;
