const Cart = require("../../model/Cart");
const SanPham = require("../../model/SanPham");
const Voucher = require("../../model/Voucher");

const addToCart1 = async (req, res) => {
    try {
        const { _idSP, size, quantity, idKhachHang } = req.body;
        // const idKhachHang = req.user._id; // từ middleware xác thực JWT

        // Lấy thông tin sản phẩm
        const product = await SanPham.findById(_idSP);
        if (!product) {
            return res.status(404).json({ message: 'Không tìm thấy sản phẩm.' });
        }

        // Lấy giá theo size
        const selectedSize = product.sizes.find(s => s.size === size);
        if (!selectedSize) {
            return res.status(400).json({ message: 'Kích thước không hợp lệ.' });
        }

        // Kiểm tra số lượng tồn kho theo size
        if (quantity > selectedSize.quantity) {
            return res.status(400).json({ 
                message: `Kích thước ${size} Chỉ còn ${selectedSize.quantity} sản phẩm trong kho.` 
            });
        }

        const price = selectedSize.price;

        // Kiểm tra xem khách hàng đã có giỏ hàng chưa
        let cart = await Cart.findOne({ idKhachHang });

        if (!cart) {
            // Tạo giỏ hàng mới
            cart = new Cart({
                idKhachHang,
                products: [{ 
                    _idSP, 
                    size, 
                    quantity, 
                    price: product.GiamGiaSP > 0 
                        ? Math.round((price * (1 - product.GiamGiaSP / 100)) / 1000) * 1000
                        : price,
                    priceGoc:price
                }]
            });
        } else {
            // Kiểm tra xem sản phẩm đã có trong giỏ chưa
            const index = cart.products.findIndex(p => 
                p._idSP.toString() === _idSP && p.size === size
            );

            if (index > -1) {
                const existingQty = cart.products[index].quantity;
                const totalQty = existingQty + quantity;

                // Kiểm tra tổng số lượng không vượt quá tồn kho
                if (totalQty > selectedSize.quantity) {
                    return res.status(400).json({
                        message: `Bạn đã có ${existingQty} sản phẩm này trong giỏ. Tổng vượt quá tồn kho (${selectedSize.quantity}).`
                    });
                }

                cart.products[index].quantity = totalQty;
            } else {
                cart.products.push({ 
                    _idSP, 
                    size, 
                    quantity, 
                    price: product.GiamGiaSP > 0 
                        ? Math.round((price * (1 - product.GiamGiaSP / 100)) / 1000) * 1000
                        : price,
                    priceGoc: price
                });
            }

        }

        await cart.save();
        res.status(200).json({ message: 'Đã thêm vào giỏ hàng.', data: cart });
    } catch (error) {
        console.error('Lỗi khi thêm vào giỏ hàng:', error);
        res.status(500).json({ message: 'Lỗi server.' });
    }
};

const addToCart = async (req, res) => {
    try {
        const { _idSP, size, quantity, idKhachHang } = req.body;

        // Lấy sản phẩm
        const product = await SanPham.findById(_idSP);
        if (!product) {
            return res.status(404).json({ message: 'Không tìm thấy sản phẩm.' });
        }

        // Lấy size tương ứng
        const selectedSize = product.sizes.find(s => s.size === size);
        if (!selectedSize) {
            return res.status(400).json({ message: 'Kích thước không hợp lệ.' });
        }

        // Check tồn kho
        if (quantity > selectedSize.quantity) {
            return res.status(400).json({
                message: `Kích thước ${size} chỉ còn ${selectedSize.quantity} sản phẩm trong kho.`
            });
        }

        const priceGoc = selectedSize.price;
        const price = product.GiamGiaSP > 0
            ? Math.round((priceGoc * (1 - product.GiamGiaSP / 100)) / 1000) * 1000
            : priceGoc;

        // Tìm cart
        let cart = await Cart.findOne({ idKhachHang });

        if (!cart) {
            // Nếu chưa có, tạo mới
            cart = new Cart({
                idKhachHang,
                products: [{
                    _idSP,
                    size,
                    quantity,
                    price,
                    priceGoc
                }],
                soTienGiamGia: 0 // ban đầu là 0
            });
        } else {
            // Tìm sản phẩm đã tồn tại trong cart chưa
            const index = cart.products.findIndex(p =>
                p._idSP.toString() === _idSP && p.size === size
            );

            if (index > -1) {
                const currentQty = cart.products[index].quantity;
                const totalQty = currentQty + quantity;

                if (totalQty > selectedSize.quantity) {
                    return res.status(400).json({
                        message: `Bạn đã có ${currentQty} sản phẩm này trong giỏ. Tổng vượt kho (${selectedSize.quantity}).`
                    });
                }

                cart.products[index].quantity = totalQty;
            } else {
                // Thêm sản phẩm mới vào giỏ
                cart.products.push({
                    _idSP,
                    size,
                    quantity,
                    price,
                    priceGoc
                });
            }
        }

        // ✅ Cập nhật tổng tiền giỏ hàng
        const tongTienChuaGiam = cart.products.reduce((total, item) => {
            return total + item.price * item.quantity;
        }, 0);

        cart.tongTienChuaGiam = tongTienChuaGiam;
        cart.soTienCanThanhToan = tongTienChuaGiam - cart.soTienGiamGia;

        await cart.save();

        res.status(200).json({ message: 'Đã thêm vào giỏ hàng.', data: cart });
    } catch (error) {
        console.error('Lỗi khi thêm vào giỏ hàng:', error);
        res.status(500).json({ message: 'Lỗi server.' });
    }
};


const getCartByCustomerId = async (req, res) => {
    try {
        const { idKhachHang } = req.query;

        const cart = await Cart.findOne({ idKhachHang })
            .populate({
                path: 'products._idSP',
                populate: {
                    path: 'IdLoaiSP',
                    model: 'LoaiSP' // tên model bạn export
                }
            });

        console.log("---> cart: ", cart);
        

        if (!cart) {
            return res.status(404).json({ message: 'Giỏ hàng trống hoặc không tồn tại.' });
        }

        res.status(200).json({ message: 'Lấy giỏ hàng thành công.', data: cart });
    } catch (error) {
        console.error('Lỗi khi lấy giỏ hàng:', error);
        res.status(500).json({ message: 'Lỗi server.' });
    }
};

const updateCartItemQuantity = async (req, res) => {
    try {
        const { idKhachHang, _idSP, size, quantity } = req.body;

        const cart = await Cart.findOne({ idKhachHang });
        if (!cart) return res.status(404).json({ message: 'Không tìm thấy giỏ hàng' });

        const index = cart.products.findIndex(p =>
            p._idSP.toString() === _idSP && p.size === size
        );

        if (index === -1) return res.status(404).json({ message: 'Không tìm thấy sản phẩm trong giỏ hàng' });

        cart.products[index].quantity = quantity;

        // Cập nhật lại tổng tiền
        const tongTienChuaGiam = cart.products.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        cart.tongTienChuaGiam = tongTienChuaGiam;
        // cart.soTienCanThanhToan = tongTienChuaGiam - cart.soTienGiamGia;

        // Reset giảm giá nếu có
        if (cart.voucherCode) {
            cart.soTienGiamGia = 0;
            cart.soTienCanThanhToan = tongTienChuaGiam;
            cart.voucherCode = null;
        } else {
            cart.soTienCanThanhToan = tongTienChuaGiam - cart.soTienGiamGia;
        }


        await cart.save();

        const populatedCart = await Cart.findOne({ idKhachHang })
        .populate({
            path: 'products._idSP',
            populate: [
              { path: 'IdLoaiSP', model: 'LoaiSP' },
              { path: 'IdHangSX', model: 'HangSX' }
            ]
        });

        res.status(200).json(populatedCart);
    } catch (err) {
        console.error('Lỗi cập nhật giỏ hàng:', err);
        res.status(500).json({ message: 'Lỗi server.' });
    }
};


const removeFromCart = async (req, res) => {
    try {
        const { idKhachHang, _idSP, size } = req.body;

        const cart = await Cart.findOne({ idKhachHang });
        if (!cart) return res.status(404).json({ message: "Không tìm thấy giỏ hàng." });

        // Xoá sản phẩm khỏi giỏ hàng
        cart.products = cart.products.filter(item =>
            !(item._idSP.toString() === _idSP && item.size === size)
        );

        // ✅ Cập nhật tổng tiền giỏ hàng sau khi xoá
        const tongTienChuaGiam = cart.products.reduce((total, item) => {
            return total + item.price * item.quantity;
        }, 0);

        cart.tongTienChuaGiam = tongTienChuaGiam;
        // cart.soTienCanThanhToan = tongTienChuaGiam - cart.soTienGiamGia;

        // Reset giảm giá nếu có
        if (cart.voucherCode) {
            cart.soTienGiamGia = 0;
            cart.soTienCanThanhToan = tongTienChuaGiam;
            cart.voucherCode = null;
        } else {
            cart.soTienCanThanhToan = tongTienChuaGiam - cart.soTienGiamGia;
        }

        await cart.save();

        res.status(200).json({ message: "Đã xóa sản phẩm khỏi giỏ hàng.", data: cart });
    } catch (error) {
        console.error("Lỗi khi xóa sản phẩm:", error);
        res.status(500).json({ message: "Lỗi server." });
    }
};

const applyVoucherToCart = async (req, res) => {
    try {
        const { voucherCode, idKhachHang } = req.body;

        const cart = await Cart.findOne({ idKhachHang: idKhachHang });
        if (!cart) return res.status(404).json({ message: 'Không tìm thấy giỏ hàng' });

        // Đã áp dụng mã rồi
        if (cart.voucherCode) {
            return res.status(400).json({ message: 'Bạn đã áp dụng mã giảm giá rồi không thể áp dụng lại!' });
        }

        const voucher = await Voucher.findOne({ code: voucherCode });
        if (!voucher) return res.status(404).json({ message: 'Mã giảm giá không hợp lệ' });

        const dieuKien = parseFloat(voucher.dieuKien);
        const giamGia = parseFloat(voucher.giamGia);

        if (cart.tongTienChuaGiam < dieuKien) {
            return res.status(400).json({ message: `Đơn hàng phải từ ${dieuKien.toLocaleString()} đ để áp dụng mã` });
        }

        const soTienGiamGia = cart.tongTienChuaGiam * (giamGia / 100);
        const soTienCanThanhToan = cart.tongTienChuaGiam - soTienGiamGia;

        cart.soTienGiamGia = soTienGiamGia;
        cart.soTienCanThanhToan = soTienCanThanhToan;
        cart.voucherCode = voucherCode;
        await cart.save();

        res.status(200).json({
            message: 'Áp dụng mã giảm giá thành công',
            data: cart
        });

    } catch (error) {
        console.error('Lỗi khi áp dụng mã:', error);
        res.status(500).json({ message: 'Đã xảy ra lỗi' });
    }
};


module.exports = { addToCart, getCartByCustomerId, removeFromCart, updateCartItemQuantity, applyVoucherToCart };
