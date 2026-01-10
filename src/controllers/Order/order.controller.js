const { VNPay, ProductCode, VnpLocale, ignoreLogger } = require('vnpay');
const Order = require('../../model/Order');
const Product = require('../../model/SanPham');  // Import model sản phẩm
const nodemailer = require('nodemailer');
const mongoose = require("mongoose");
const SePayTransaction = require('../../model/SepayTransaction');
const Cart = require('../../model/Cart');
require('dotenv').config();

const vnpay = new VNPay({
    tmnCode: 'RWGT12RE',
    secureSecret: 'QY7RO4BTNA0NUG0ZS30M59RQNHIHRFKT',
    vnpayHost: 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html',
    testMode: true, // tùy chọn, ghi đè vnpayHost thành sandbox nếu là true
    hashAlgorithm: 'SHA512', // tùy chọn   
    enableLog: true, // optional   
    loggerFn: ignoreLogger, // optional
});

// API tạo đơn hàng
const createOrder1 = async (req, res) => {
    try {
        const { lastName, firstName, email, address, phone, note,
            products, idKhachHang, thanhTien, soTienCanThanhToan, soTienGiamGia, giamGia, tongSoLuong
        } = req.body;

        console.log("lastName, firstName, email, address, phone, note: ", lastName, firstName, email, address, phone, note);
        console.log("products: ", products);
        console.log("idKhachHang: ", idKhachHang);
        console.log(" thanhTien, soTienCanThanhToan, soTienGiamGia, giamGia, tongSoLuong: ", thanhTien, soTienCanThanhToan, soTienGiamGia, giamGia, tongSoLuong); 
        
        // Hàm định dạng tiền tệ VND
        const formatCurrency = (amount) => {
            return new Intl.NumberFormat('vi-VN', {
                style: 'currency',
                currency: 'VND',
            }).format(amount);
        }

        //---- GỬI XÁC NHẬN ĐƠN HÀNG VỀ EMAIL
        const transporter = nodemailer.createTransport({
            service: 'Gmail',
            auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
            }
        });

        // Tạo bảng HTML để hiển thị thông tin đơn hàng
        let productsHtml = '';

        // Lặp qua các sản phẩm trong đơn hàng
        for (const product of products) {
            // Tìm sản phẩm trong cơ sở dữ liệu bằng _idSP
            const productDetails = await Product.findById(product._idSP).exec();

            // Kiểm tra nếu tìm thấy sản phẩm
            if (productDetails) {
                // Thêm thông tin sản phẩm vào bảng HTML
                productsHtml += `
                    <tr>
                        <td>${productDetails.TenSP}</td>  
                        <td>${product.size}</td>  
                        <td>${product.quantity}</td>  
                        <td>${formatCurrency(product.price)}</td>  <!-- Giá mỗi sản phẩm -->
                        <td>${formatCurrency(product.quantity * product.price)}</td>  <!-- Tổng tiền cho sản phẩm -->
                    </tr>
                `;
            }
        }       

        const sendOrderConfirmationEmail1 = async (toEmail) => {
            // Tạo nội dung email với bảng sản phẩm
            const mailOptions = {
                from: 'Bùi Cường',
                to: toEmail,
                subject: 'Xác nhận đơn hàng của bạn.',
                html: `
                        <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; background-color: #f9f9f9; padding: 20px; border-radius: 10px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                            <h2 style="text-align: center; color: #2c3e50; font-size: 24px;">Cảm ơn bạn đã đặt hàng!</h2>
                            <p style="color: #34495e; font-size: 18px;">Chào bạn <span style="color: #e74c3c; font-weight: bold; font-style: italic;">${lastName} ${firstName}</span>,</p>
                            <p style="font-size: 16px;">Đơn hàng của bạn đã được xác nhận.</p>
                            
                            <h3 style="color: #2c3e50; font-size: 20px; text-align: center;">Thông tin sản phẩm đã đặt hàng</h3>                                        
                            <table border="1" cellpadding="8" cellspacing="0" style="border-collapse: collapse; width: 100%; margin-bottom: 20px; background-color: #ffffff;">
                                <thead>
                                    <tr>
                                        <th style="text-align: left; padding: 8px; background-color: #ecf0f1; color: #2c3e50;">Tên sản phẩm</th>
                                        <th style="text-align: left; padding: 8px; background-color: #ecf0f1; color: #2c3e50;">Kích thước</th>
                                        <th style="text-align: left; padding: 8px; background-color: #ecf0f1; color: #2c3e50;">Số lượng</th>
                                        <th style="text-align: left; padding: 8px; background-color: #ecf0f1; color: #2c3e50;">Đơn giá</th>
                                        <th style="text-align: left; padding: 8px; background-color: #ecf0f1; color: #2c3e50;">Tổng tiền</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${productsHtml}
                                </tbody>
                            </table>

                            <div style="background-color: #fff; padding: 15px; margin-bottom: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);">
                                <p><strong>Tổng số lượng đặt:</strong> <span style="color: #2980b9;">${tongSoLuong}</span> sản phẩm</p>
                                <p><strong>Tổng tiền:</strong> <span style="color: #e74c3c;">${formatCurrency(thanhTien)}</span></p>
                                <p><strong>Phí giao hàng:</strong> <span style="color: #2ecc71;">0</span></p>
                                <p><strong>Giảm giá:</strong> <span style="color: #e67e22;">-${formatCurrency(soTienGiamGia)}</span> (${giamGia}%)</p>
                                <p><strong>Số tiền cần thanh toán:</strong> <span style="color: #e74c3c;">${formatCurrency(soTienCanThanhToan)}</span></p>
                            </div>
                
                            <p><strong>Số điện thoại:</strong> ${phone}</p>
                            <p><strong>Địa chỉ nhận hàng:</strong> <span style="color: #34495e; font-style: italic;">${address}</span></p>
                            <br/>
                                                                                   
                            <p style="text-align: center; font-size: 16px;">Bạn có thể theo dõi đơn hàng tại <a href="https://trang-chu-gbluestore.vercel.app/" style="color: #3498db; text-decoration: none;">WebShop GBlueStore</a></p>
                        </div>
                    `
            };

            return new Promise((resolve, reject) => {
                transporter.sendMail(mailOptions, (error, info) => {
                    if (error) {
                        reject(error);
                    } else {
                        console.log('Email sent: ' + info.response);
                        resolve();
                    }
                });
            });
        };
        const sendOrderConfirmationEmail = async (toEmail) => {
            // Tạo nội dung email với bảng sản phẩm
            const mailOptions = {
                from: 'Bùi Cường',
                to: toEmail,
                subject: '🎉 Xác nhận đơn hàng của bạn! 🎉',
                html: `
                    <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; background-color: #f9f9f9; padding: 20px; border-radius: 10px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                        <h2 style="text-align: center; color: #2c3e50; font-size: 24px;">💖 Cảm ơn bạn đã đặt hàng! 💖</h2>
                        <p style="color: #34495e; font-size: 18px;">Xin chào <span style="color: #e74c3c; font-weight: bold; font-style: italic;">${lastName} ${firstName}</span>,</p>
                        <p style="font-size: 16px;">🎊 Đơn hàng của bạn đã được xác nhận! 🎊</p>
                        
                        <h3 style="color: #2c3e50; font-size: 20px; text-align: center;">🛒 Thông tin sản phẩm đã đặt hàng 🛍️</h3>                                        
                        <table border="1" cellpadding="8" cellspacing="0" style="border-collapse: collapse; width: 100%; margin-bottom: 20px; background-color: #ffffff;">
                            <thead>
                                <tr>
                                    <th style="text-align: left; padding: 8px; background-color: #ecf0f1; color: #2c3e50;">📦 Tên sản phẩm</th>
                                    <th style="text-align: left; padding: 8px; background-color: #ecf0f1; color: #2c3e50;">⚙️ Kích thước</th>
                                    <th style="text-align: left; padding: 8px; background-color: #ecf0f1; color: #2c3e50;">🔢 Số lượng</th>
                                    <th style="text-align: left; padding: 8px; background-color: #ecf0f1; color: #2c3e50;">💰 Đơn giá</th>
                                    <th style="text-align: left; padding: 8px; background-color: #ecf0f1; color: #2c3e50;">🧾 Tổng tiền</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${productsHtml}
                            </tbody>
                        </table>
        
                        <div style="background-color: #fff; padding: 15px; margin-bottom: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);">
                            <p><strong>📦 Tổng số lượng đặt:</strong> <span style="color: #2980b9;">${tongSoLuong}</span> sản phẩm</p>
                            <p><strong>💰 Tổng tiền:</strong> <span style="color: #e74c3c;">${formatCurrency(thanhTien)}</span></p>
                            <p><strong>🚚 Phí giao hàng:</strong> <span style="color: #2ecc71;">Miễn phí</span></p>
                            <p><strong>🎁 Giảm giá:</strong> <span style="color: #e67e22;">-${formatCurrency(soTienGiamGia)}</span> (${giamGia}%)</p>
                            <p><strong>💵 Số tiền cần thanh toán:</strong> <span style="color: #e74c3c; font-weight: bold;">${formatCurrency(soTienCanThanhToan)}</span></p>
                        </div>
            
                        <p><strong>📞 Số điện thoại:</strong> ${phone}</p>
                        <p><strong>🏠 Địa chỉ nhận hàng:</strong> <span style="color: #34495e; font-style: italic;">${address}</span></p>
                        <br/>
                                                               
                        <p style="text-align: center; font-size: 16px;">📦 Bạn có thể theo dõi đơn hàng tại <a href="https://trang-chu-gbluestore.vercel.app/" style="color: #3498db; text-decoration: none; font-weight: bold;">GBlueStore</a></p>
                    </div><
                `
            };
        
            return new Promise((resolve, reject) => {
                transporter.sendMail(mailOptions, (error, info) => {
                    if (error) {
                        reject(error);
                    } else {
                        console.log('📧 Email sent: ' + info.response);
                        resolve();
                    }
                });
            });
        };
        

        const sendOrderNotificationToAdmin = async (adminEmail) => {
            // Gửi email thông báo đơn hàng mới đến Admin
            // Email chứa thông tin khách hàng và danh sách sản phẩm
        
            const mailOptions = {
                from: 'Hệ Thống WebShop',
                to: adminEmail,  // Email Admin nhận thông báo
                subject: '🔔 Đơn hàng mới vừa được đặt',
                html: `
                    <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; background-color: #f9f9f9; padding: 20px; border-radius: 10px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                        <h2 style="text-align: center; color: #e74c3c; font-size: 24px;">📦 Đơn hàng mới</h2>
                        <p style="font-size: 16px;">Một khách hàng vừa đặt hàng thành công trên hệ thống.</p>
                        
                        <h3 style="color: #2c3e50; font-size: 20px;">👤 Thông tin khách hàng</h3>
                        <p><strong>Họ và tên:</strong> <span style="color: #2980b9;">${lastName} ${firstName}</span></p>
                        <p><strong>Số điện thoại:</strong> <span style="color: #27ae60;">${phone}</span></p>
                        <p><strong>Địa chỉ giao hàng:</strong> <span style="color: #34495e;">${address}</span></p>
        
                        <h3 style="color: #2c3e50; font-size: 20px;">🛒 Thông tin đơn hàng</h3>
                        <table border="1" cellpadding="8" cellspacing="0" style="border-collapse: collapse; width: 100%; background-color: #ffffff;">
                            <thead>
                                <tr>
                                    <th style="text-align: left; padding: 8px; background-color: #ecf0f1; color: #2c3e50;">Sản phẩm</th>
                                    <th style="text-align: left; padding: 8px; background-color: #ecf0f1; color: #2c3e50;">Kích thước</th>
                                    <th style="text-align: left; padding: 8px; background-color: #ecf0f1; color: #2c3e50;">Số lượng</th>
                                    <th style="text-align: left; padding: 8px; background-color: #ecf0f1; color: #2c3e50;">Đơn giá</th>
                                    <th style="text-align: left; padding: 8px; background-color: #ecf0f1; color: #2c3e50;">Tổng</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${productsHtml} <!-- Danh sách sản phẩm -->
                            </tbody>
                        </table>
        
                        <div style="background-color: #fff; padding: 15px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1); margin-bottom: 20px;">
                            <p><strong>📌 Tổng số lượng:</strong> <span style="color: #2980b9;">${tongSoLuong}</span> sản phẩm</p>
                            <p><strong>💰 Tổng tiền:</strong> <span style="color: #e74c3c;">${formatCurrency(thanhTien)}</span></p>
                            <p><strong>🚚 Phí giao hàng:</strong> <span style="color: #2ecc71;">Miễn phí</span></p>
                            <p><strong>🎁 Giảm giá:</strong> <span style="color: #e67e22;">-${formatCurrency(soTienGiamGia)}</span> (${giamGia}%)</p>
                            <p><strong>💳 Số tiền cần thanh toán:</strong> <span style="color: #e74c3c;">${formatCurrency(soTienCanThanhToan)}</span></p>
                        </div>
        
                        <p style="text-align: center; font-size: 16px;">Admin có thể quản lý đơn hàng tại <a href="https://trang-admin-gbluestore.vercel.app/admin" style="color: #3498db; text-decoration: none;">Trang Quản Lý</a></p>
                    </div>
                `
            };
        
            return new Promise((resolve, reject) => {
                transporter.sendMail(mailOptions, (error, info) => {
                    if (error) {
                        reject(error);
                    } else {
                        console.log('📧 Email thông báo đơn hàng đã gửi đến Admin: ' + info.response);
                        resolve();
                    }
                });
            });
        };
        


        
        // Kiểm tra số lượng tồn của từng size trong sản phẩm
        for (const item of products) {
            // Tìm sản phẩm trong database
            const product = await Product.findById(item._idSP);

            // Kiểm tra nếu sản phẩm không tồn tại
            if (!product) {
                return res.status(404).json({
                    message: `Sản phẩm với ID ${item._idSP} không tồn tại!`,
                });
            }

            // Tìm size sản phẩm trong mảng sizes
            const size = product.sizes.find(s => s.size === item.size);
            
            // Kiểm tra nếu size không tồn tại
            if (!size) {
                return res.status(400).json({
                    message: `Size ${item.size} của sản phẩm không hợp lệ!`,
                });
            }

            // Kiểm tra số lượng tồn có đủ hay không
            if (size.quantity < item.quantity) {
                return res.status(400).json({
                    message: `Sản phẩm ${product.TenSP} - cấu hình: ${item.size} chỉ còn ${size.quantity} sản phẩm trong kho, bạn không thể đặt ${item.quantity} sản phẩm!`,
                });
            }
        }

        // Tạo đơn hàng mới
        const newOrder = new Order({
            lastName, firstName, email, address, phone, note, products, soTienGiamGia, giamGia, soTienCanThanhToan, thanhTien, tongSoLuong, idKhachHang: idKhachHang || null
        });

        // Lưu đơn hàng vào database
        await newOrder.save();

        // Gửi email thông báo đặt hàng thành công
        await sendOrderConfirmationEmail(email);  
        
        // Gửi email thông báo đơn hàng mới đến Admin
        const emailAdmin = 'hungcuongb48@gmail.com'
        await sendOrderNotificationToAdmin(emailAdmin)

        // Cập nhật số lượng tồn kho và số lượng bán cho từng sản phẩm
        for (let product of products) {
            const { _idSP, size, quantity } = product;

            // Tìm sản phẩm theo _idSP
            const productData = await Product.findById(_idSP);

            if (productData) {
                console.log(`Found product: ${productData.TenSP}`);

                // Kiểm tra xem sản phẩm có kích thước (size) nào khớp với size đã đặt không
                let updated = false;

                // Duyệt qua các kích thước (sizes) của sản phẩm
                for (let sizeData of productData.sizes) {
                    if (sizeData.size === size) {
                        console.log(`Updating size ${sizeData.size} with quantity ${quantity}`);

                        // Giảm số lượng tồn kho của size đã đặt
                        if (sizeData.quantity >= quantity) {
                            sizeData.quantity -= quantity;
                            productData.SoLuongBan += quantity;
                            updated = true;
                            break; // Dừng vòng lặp khi đã tìm thấy size tương ứng
                        } else {
                            console.log(`Not enough stock for size ${sizeData.size}`);
                            return res.status(400).json({ message: `Không đủ số lượng cho size ${sizeData.size}` });
                        }
                    }
                }

                // Nếu đã cập nhật size thì tính lại tổng số lượng tồn kho của sản phẩm
                if (updated) {
                    // Cập nhật lại SoLuongTon (tổng số lượng tồn kho)
                    productData.SoLuongTon = productData.sizes.reduce((total, size) => total + size.quantity, 0);
                    console.log(`Updated stock for product: ${productData.TenSP}, new SoLuongTon: ${productData.SoLuongTon}`);

                    // Lưu lại thông tin sản phẩm đã cập nhật
                    await productData.save();
                }
            } else {
                console.log(`Product not found: ${productId}`);
            }
        }

        await Cart.findOneAndDelete({ idKhachHang: idKhachHang });
        
        // Trả về thông tin đơn hàng đã tạo
        return res.status(201).json({
            message: 'Đặt hàng thành công!',
            data: newOrder,  
            _idDH:  newOrder._id,
            soTienCanThanhToan: newOrder.soTienCanThanhToan,    
        });
    } catch (error) {
        return res.status(500).json({
            message: 'Đã xảy ra lỗi khi tạo đơn hàng!',
            error: error.message,
        });
    }
};
const createOrder = async (req, res) => {
    try {
        // Lấy data trực tiếp từ body
        const data = req.body;
        const { 
            lastName, firstName, email, address, phone, note,
            products, idKhachHang, thanhTien, soTienCanThanhToan, 
            soTienGiamGia, giamGia, tongSoLuong 
        } = data;

        // Kiểm tra dữ liệu đầu vào
        if (!products || !Array.isArray(products)) {
            return res.status(400).json({ message: 'Danh sách sản phẩm không hợp lệ!' });
        }

        const formatCurrency = (amount) => {
            return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount || 0);
        };

        // 1. Chuẩn bị nội dung Email
        let productsHtml = '';
        for (const item of products) {
            const p = await Product.findById(item._idSP);
            if (p) {
                productsHtml += `
                    <tr>
                        <td style="padding:8px; border:1px solid #ddd;">${p.TenSP}</td>
                        <td style="padding:8px; border:1px solid #ddd; text-align:center;">${item.size}</td>
                        <td style="padding:8px; border:1px solid #ddd; text-align:center;">${item.quantity}</td>
                        <td style="padding:8px; border:1px solid #ddd; text-align:right;">${formatCurrency(item.price)}</td>
                    </tr>`;
            }
        }

        // 2. Gửi Email
        const transporter = nodemailer.createTransport({
            service: 'Gmail',
            auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
        });

        const mailOptions = {
            from: '"GBlueStore Shop" <noreply@buihungcuong.site>',
            to: email,
            subject: 'Xác nhận đơn hàng thành công',
            html: `<div style="font-family:Arial; max-width:600px; margin:auto; border:1px solid #eee; padding:20px;">
                <h2 style="color:#10b981; text-align:center;">Cảm ơn bạn đã đặt hàng!</h2>
                <p>Chào <b>${lastName} ${firstName}</b>, đơn hàng của bạn đã được tiếp nhận.</p>
                <table style="width:100%; border-collapse:collapse; margin:20px 0;">
                    <thead style="background:#f9f9f9;">
                        <tr><th style="padding:8px; border:1px solid #ddd;">Sản phẩm</th><th style="padding:8px; border:1px solid #ddd;">Kích thước</th><th style="padding:8px; border:1px solid #ddd;">SL</th><th style="padding:8px; border:1px solid #ddd;">Giá</th></tr>
                    </thead>
                    <tbody>${productsHtml}</tbody>
                </table>
                <p><b>Tổng thanh toán: <span style="color:red;">${formatCurrency(soTienCanThanhToan)}</span></b></p>
                <p>Địa chỉ: ${address} - SĐT: ${phone}</p>
            </div>`
        };

        // 3. Lưu Đơn hàng
        const newOrder = new Order({
            lastName, firstName, email, address, phone, note, products, 
            soTienGiamGia, giamGia, soTienCanThanhToan, thanhTien, 
            tongSoLuong, idKhachHang: idKhachHang || null
        });
        const savedOrder = await newOrder.save();

        // 4. Cập nhật tồn kho
        for (const item of products) {
            await Product.updateOne(
                { _id: item._idSP, "sizes.size": item.size },
                { $inc: { "sizes.$.quantity": -item.quantity, "SoLuongBan": item.quantity, "SoLuongTon": -item.quantity } }
            );
        }

        if (idKhachHang) await Cart.findOneAndDelete({ idKhachHang });
        await transporter.sendMail(mailOptions);

        return res.status(201).json({
            success: true,
            message: 'Đặt hàng thành công!',
            _idDH: savedOrder._id,
            soTienCanThanhToan: savedOrder.soTienCanThanhToan,
            data: savedOrder
        });

    } catch (error) {
        console.error("Lỗi:", error);
        return res.status(500).json({ message: 'Lỗi hệ thống!', error: error.message });
    }
};

const findOrderById = async (req, res) => {
    try {
        const idDH = req.query.idDH;
        const order = await Order.findOne({ _id: idDH }).exec();
        if (!order) {
            return { success: false, message: "Order not found!" };
        }
        return res.status(201).json({
            data: order,  
        });
    } catch (error) {
        console.error("Error finding order:", error);
        return { success: false, message: "Internal server error" };
    }
};

const createOrderThanhToanVNPay = async (req, res) => {
    try {
        const { lastName, firstName, email, address, phone, note,
            products, idKhachHang, thanhTien, soTienCanThanhToan, soTienGiamGia, giamGia, tongSoLuong
        } = req.body;

        console.log("lastName, firstName, email, address, phone, note: ", lastName, firstName, email, address, phone, note);
        console.log("products: ", products);
        console.log("idKhachHang: ", idKhachHang);
        console.log(" thanhTien, soTienCanThanhToan, soTienGiamGia, giamGia, tongSoLuong: ", thanhTien, soTienCanThanhToan, soTienGiamGia, giamGia, tongSoLuong); 
        
        // Hàm định dạng tiền tệ VND
        const formatCurrency = (amount) => {
            return new Intl.NumberFormat('vi-VN', {
                style: 'currency',
                currency: 'VND',
            }).format(amount);
        }

        //---- GỬI XÁC NHẬN ĐƠN HÀNG VỀ EMAIL
        const transporter = nodemailer.createTransport({
            service: 'Gmail',
            auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
            }
        });

        // Tạo bảng HTML để hiển thị thông tin đơn hàng
        let productsHtml = '';

        // Lặp qua các sản phẩm trong đơn hàng
        for (const product of products) {
            // Tìm sản phẩm trong cơ sở dữ liệu bằng _idSP
            const productDetails = await Product.findById(product._idSP).exec();

            // Kiểm tra nếu tìm thấy sản phẩm
            if (productDetails) {
                // Thêm thông tin sản phẩm vào bảng HTML
                productsHtml += `
                    <tr>
                        <td>${productDetails.TenSP}</td>  
                        <td>${product.size}</td>  
                        <td>${product.quantity}</td>  
                        <td>${formatCurrency(product.price)}</td>  <!-- Giá mỗi sản phẩm -->
                        <td>${formatCurrency(product.quantity * product.price)}</td>  <!-- Tổng tiền cho sản phẩm -->
                    </tr>
                `;
            }
        }       

        const sendOrderConfirmationEmail = async (toEmail) => {
            // Tạo nội dung email với bảng sản phẩm
            const mailOptions = {
                from: 'Bùi Cường',
                to: toEmail,
                subject: 'Xác nhận đơn hàng của bạn.',
                html: `
                        <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; background-color: #f9f9f9; padding: 20px; border-radius: 10px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                            <h2 style="text-align: center; color: #2c3e50; font-size: 24px;">Cảm ơn bạn đã đặt hàng!</h2>
                            <p style="color: #34495e; font-size: 18px;">Chào bạn <span style="color: #e74c3c; font-weight: bold; font-style: italic;">${lastName} ${firstName}</span>,</p>
                            <p style="font-size: 16px;">Đơn hàng của bạn đã được xác nhận.</p>
                            
                            <h3 style="color: #2c3e50; font-size: 20px; text-align: center;">Thông tin sản phẩm đã đặt hàng</h3>                                        
                            <table border="1" cellpadding="8" cellspacing="0" style="border-collapse: collapse; width: 100%; margin-bottom: 20px; background-color: #ffffff;">
                                <thead>
                                    <tr>
                                        <th style="text-align: left; padding: 8px; background-color: #ecf0f1; color: #2c3e50;">Tên sản phẩm</th>
                                        <th style="text-align: left; padding: 8px; background-color: #ecf0f1; color: #2c3e50;">Kích thước</th>
                                        <th style="text-align: left; padding: 8px; background-color: #ecf0f1; color: #2c3e50;">Số lượng</th>
                                        <th style="text-align: left; padding: 8px; background-color: #ecf0f1; color: #2c3e50;">Đơn giá</th>
                                        <th style="text-align: left; padding: 8px; background-color: #ecf0f1; color: #2c3e50;">Tổng tiền</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${productsHtml}
                                </tbody>
                            </table>

                            <div style="background-color: #fff; padding: 15px; margin-bottom: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);">
                                <p><strong>Tổng số lượng đặt:</strong> <span style="color: #2980b9;">${tongSoLuong}</span> sản phẩm</p>
                                <p><strong>Tổng tiền:</strong> <span style="color: #e74c3c;">${formatCurrency(thanhTien)}</span></p>
                                <p><strong>Phí giao hàng:</strong> <span style="color: #2ecc71;">0</span></p>
                                <p><strong>Giảm giá:</strong> <span style="color: #e67e22;">-${formatCurrency(soTienGiamGia)}</span> (${giamGia}%)</p>
                                <p><strong>Số tiền cần thanh toán:</strong> <span style="color: #e74c3c;">${formatCurrency(soTienCanThanhToan)}</span></p>
                            </div>
                
                            <p><strong>Số điện thoại:</strong> ${phone}</p>
                            <p><strong>Địa chỉ nhận hàng:</strong> <span style="color: #34495e; font-style: italic;">${address}</span></p>
                            <br/>
                                                                                   
                            <p style="text-align: center; font-size: 16px;">Bạn có thể theo dõi đơn hàng tại <a href="https://trang-chu-gbluestore.vercel.app/" style="color: #3498db; text-decoration: none;">GblueStore</a></p>
                        </div>
                    `
            };

            return new Promise((resolve, reject) => {
                transporter.sendMail(mailOptions, (error, info) => {
                    if (error) {
                        reject(error);
                    } else {
                        console.log('Email sent: ' + info.response);
                        resolve();
                    }
                });
            });
        };


        
        // Kiểm tra số lượng tồn của từng size trong sản phẩm
        for (const item of products) {
            // Tìm sản phẩm trong database
            const product = await Product.findById(item._idSP);

            // Kiểm tra nếu sản phẩm không tồn tại
            if (!product) {
                return res.status(404).json({
                    message: `Sản phẩm với ID ${item._idSP} không tồn tại!`,
                });
            }

            // Tìm size sản phẩm trong mảng sizes
            const size = product.sizes.find(s => s.size === item.size);
            
            // Kiểm tra nếu size không tồn tại
            if (!size) {
                return res.status(400).json({
                    message: `Size ${item.size} của sản phẩm không hợp lệ!`,
                });
            }

            // Kiểm tra số lượng tồn có đủ hay không
            if (size.quantity < item.quantity) {
                return res.status(400).json({
                    message: `Sản phẩm ${product.TenSP} - cấu hình: ${item.size} chỉ còn ${size.quantity} sản phẩm trong kho, bạn không thể đặt ${item.quantity} sản phẩm!`,
                });
            }
        }

        // Tạo đơn hàng mới
        const newOrder = new Order({
            lastName, firstName, email, address, phone, note, products, soTienGiamGia, giamGia, soTienCanThanhToan, thanhTien, tongSoLuong, idKhachHang: idKhachHang || null
        });

        // Lưu đơn hàng vào database
        await newOrder.save();

        // Gửi email thông báo đặt hàng thành công
        await sendOrderConfirmationEmail(email);

        // Lấy returnUrl từ frontend gửi lên, nếu không có thì sử dụng mặc định

        const returnUrl = req.body?.returnUrl || 'http://localhost:8088/api/order/vnpay_return';
        console.log("newOrder._id.toString(): ", newOrder._id.toString());
        
        // Tạo URL thanh toán
        const paymentUrl = vnpay.buildPaymentUrl({
            vnp_Amount: soTienCanThanhToan,
            vnp_IpAddr:
                req.headers['x-forwarded-for'] ||
                req.connection.remoteAddress ||
                req.socket.remoteAddress ||
                req.ip,
            vnp_TxnRef: newOrder._id.toString(),
            vnp_OrderInfo: `Thanh toan don hang ${newOrder._id}`,
            vnp_OrderType: ProductCode.Other,
            vnp_ReturnUrl: returnUrl, // Đường dẫn nên là của frontend
            vnp_Locale: VnpLocale.VN,
        });

        // Cập nhật số lượng tồn kho và số lượng bán cho từng sản phẩm
        for (let product of products) {
            const { _idSP, size, quantity } = product;

            // Tìm sản phẩm theo _idSP
            const productData = await Product.findById(_idSP);

            if (productData) {
                console.log(`Found product: ${productData.TenSP}`);

                // Kiểm tra xem sản phẩm có kích thước (size) nào khớp với size đã đặt không
                let updated = false;

                // Duyệt qua các kích thước (sizes) của sản phẩm
                for (let sizeData of productData.sizes) {
                    if (sizeData.size === size) {
                        console.log(`Updating size ${sizeData.size} with quantity ${quantity}`);

                        // Giảm số lượng tồn kho của size đã đặt
                        if (sizeData.quantity >= quantity) {
                            sizeData.quantity -= quantity;
                            productData.SoLuongBan += quantity;
                            updated = true;
                            break; // Dừng vòng lặp khi đã tìm thấy size tương ứng
                        } else {
                            console.log(`Not enough stock for size ${sizeData.size}`);
                            return res.status(400).json({ message: `Không đủ số lượng cho size ${sizeData.size}` });
                        }
                    }
                }

                // Nếu đã cập nhật size thì tính lại tổng số lượng tồn kho của sản phẩm
                if (updated) {
                    // Cập nhật lại SoLuongTon (tổng số lượng tồn kho)
                    productData.SoLuongTon = productData.sizes.reduce((total, size) => total + size.quantity, 0);
                    console.log(`Updated stock for product: ${productData.TenSP}, new SoLuongTon: ${productData.SoLuongTon}`);

                    // Lưu lại thông tin sản phẩm đã cập nhật
                    await productData.save();
                }
            } else {
                console.log(`Product not found: ${productId}`);
            }
        }
        

        // Trả về thông tin đơn hàng đã tạo
        return res.status(201).json({
            message: 'Đặt hàng thành công!',
            data: newOrder,
            paymentUrl
        });
    } catch (error) {
        return res.status(500).json({
            message: 'Đã xảy ra lỗi khi tạo đơn hàng!',
            error: error.message,
        });
    }
};

const updateCongTienKhiNap = async (req, res) => {
    const session = await mongoose.startSession();

    try {
        await session.startTransaction();

        const sePayWebhookData = {
            id: parseInt(req.body.id),
            gateway: req.body.gateway,
            transactionDate: req.body.transactionDate,
            accountNumber: req.body.accountNumber,
            subAccount: req.body.subAccount,
            code: req.body.code,
            content: req.body.content,
            transferType: req.body.transferType,
            description: req.body.description,
            transferAmount: parseFloat(req.body.transferAmount),
            referenceCode: req.body.referenceCode,
            accumulated: parseInt(req.body.accumulated),
        };

        // nếu SePayTransaction có hơn 1 giao dịch collection 
        if (await SePayTransaction.countDocuments() > 0) {
            const existingTransaction = await SePayTransaction.findOne({
                _id: sePayWebhookData.id,
            });
            if (existingTransaction) {
                return res.status(400).json({
                    message: "transaction này đã thực hiện giao dịch",
                });
            }
        }

        // api chứng thực
        const pattern = process.env.SEPAY_API_KEY;
        const authorizationAPI = req.headers.authorization;
        const apiKey = authorizationAPI.split(" ")[1];

        // kiểm tra xác thực api
        if (pattern === apiKey) {
            // Tạo lịch sử giao dịch
            const newTransaction = await SePayTransaction.create({
                _id: sePayWebhookData.id,
                gateway: sePayWebhookData.gateway,
                transactionDate: sePayWebhookData.transactionDate,
                accountNumber: sePayWebhookData.accountNumber,
                subAccount: sePayWebhookData.subAccount,
                code: sePayWebhookData.code,
                content: sePayWebhookData.content,
                transferType: sePayWebhookData.transferType,
                description: sePayWebhookData.description,
                transferAmount: sePayWebhookData.transferAmount,
                referenceCode: sePayWebhookData.referenceCode,
            });

            // const matchContent = sePayWebhookData.content.match(/dh([a-f0-9]{24})/);
            const matchContent = sePayWebhookData.content.match(/DH([a-zA-Z0-9]{6,30})/);
            console.log("matchContent: ", matchContent);                
            const idOrder = matchContent[0].replace("DH", "");
            console.log("idOrder: ", idOrder);           
            
            // Tìm đơn hàng trong database
            const order = await Order.findById(idOrder).session(session);
            if (!order) {
                res.status(404).json({ message: "Không tìm thấy đơn hàng." });
            }

            // Kiểm tra số tiền thanh toán có khớp với số tiền cần thanh toán không
            if (order.soTienCanThanhToan !== sePayWebhookData.transferAmount) {
                res.status(404).json({ message: "Số tiền thanh toán không khớp" });
            }
            
            const updatedUser = await Order.findOneAndUpdate(
                // { _id: idOrder },
                { _id: idOrder },
                {
                    $set: { TinhTrangThanhToan: "Đã Thanh Toán" },
                    $push: {
                        transactionHistory: {
                            date: new Date(),
                            amount: sePayWebhookData.transferAmount,
                            type: "deposit",
                            reference: sePayWebhookData.id,
                        },
                    },
                },
                { new: true, session }
            );

            if (!updatedUser) {
                return res
                    .status(404)
                    .json({ message: "User account not found" });
            }
            await session.commitTransaction();

            return res.status(200).json({
                success: true,
                newBalance: updatedUser.TinhTrangThanhToan,
                processedAt: new Date().toISOString(),
                message: `Thanh toán thành công`,
            });
        }
        return res.status(400).json({ message: "Invalid transaction" });
    } catch (error) {
        await session.abortTransaction(); // Hủy giao dịch nếu có lỗi
        console.error("Lỗi:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    } finally {
        session.endSession();
    }
};

const thanhToanOnlineSepay = async (req, res) => {
  try {
    console.log("🔍 Raw body từ SePay:", JSON.stringify(req.body, null, 2));

    // ✅ Chuẩn bị dữ liệu từ SePay webhook
    const sePayWebhookData = {
      sepayId: req.body.id,
      gateway: req.body.gateway,
      transactionDate: new Date(req.body.transactionDate),
      accountNumber: req.body.accountNumber,
      subAccount: req.body.subAccount || "",
      code: req.body.code || "",
      content: req.body.content,
      transferType: req.body.transferType || "in",
      description: req.body.description || "",
      transferAmount: parseFloat(req.body.transferAmount),
      referenceCode: req.body.referenceCode || "",
      accumulated: parseInt(req.body.accumulated) || 0,
    };

    console.log("📝 Parsed data:", JSON.stringify(sePayWebhookData, null, 2));

    // ✅ Trích xuất mã đơn hàng từ nội dung
    const idOrder = sePayWebhookData.content.replace(/DH\s*/gi, "").trim();
    console.log("📦 Mã đơn hàng:", idOrder);
    console.log("💰 Số tiền:", sePayWebhookData.transferAmount);

    // 1️⃣ BẢO MẬT: Kiểm tra API Key từ SePay
    const authorizationAPI = req.headers.authorization;

    if (authorizationAPI !== process.env.SEPAY_API_KEY) {
      console.error("❌ API Key không hợp lệ");
      return res.status(401).json({ message: "Unauthorized: Sai API Key" });
    }



    // 2️⃣ KIỂM TRA TRÙNG LẶP
    const existingTransaction = await SePayTransaction.findOne({ 
      sepayId: sePayWebhookData.sepayId 
    });

    console.log("==> ĐANG TÌM TRONG DB VỚI sepayId =", sePayWebhookData.sepayId);
    console.log("==> KẾT QUẢ TÌM:", existingTransaction);

    // if (existingTransaction) {
    //   console.log("⚠️ Giao dịch đã xử lý:", sePayWebhookData.sepayId);
    //   return res.status(200).json({ 
    //     message: "Giao dịch đã được xử lý trước đó",
    //     transactionId: existingTransaction._id 
    //   });
    // }

    // 3️⃣ TÌM ĐƠN HÀNG
    const order = await Order.findOne({ maDonHang: idOrder });

    if (!order) {
      // ✅ Lưu giao dịch thất bại để đối soát
      console.log("💾 Đang lưu transaction (không tìm thấy đơn)...");
      
      // ✅ THAY ĐỔI: Dùng insertMany thay vì create
      const failedTransactionResult = await SePayTransaction.collection.insertOne({
        sepayId: sePayWebhookData.sepayId,
        gateway: sePayWebhookData.gateway,
        transactionDate: sePayWebhookData.transactionDate,
        accountNumber: sePayWebhookData.accountNumber,
        subAccount: sePayWebhookData.subAccount,
        code: sePayWebhookData.code,
        content: sePayWebhookData.content,
        transferType: sePayWebhookData.transferType,
        description: sePayWebhookData.description,
        transferAmount: sePayWebhookData.transferAmount,
        referenceCode: sePayWebhookData.referenceCode,
        accumulated: sePayWebhookData.accumulated,
        orderId: idOrder,
        processedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      console.log("✅ Đã lưu transaction:", failedTransactionResult.insertedId);
      console.error("❌ Không tìm thấy đơn hàng:", idOrder);
      
      return res.status(200).json({
        success: false,
        message: "Đã lưu giao dịch nhưng không tìm thấy đơn hàng: " + idOrder,
        transactionId: failedTransactionResult.insertedId,
      });
    }

    // 4️⃣ KIỂM TRA SỐ TIỀN
    let trangThaiMoi = order.TinhTrangThanhToan;
    const soTienThieu = order.soTienCanThanhToan - sePayWebhookData.transferAmount;

    if (soTienThieu <= 0) {
      trangThaiMoi = "Đã Thanh Toán";
      console.log("✅ Thanh toán đủ/thừa:", Math.abs(soTienThieu));
    }  else {
      console.warn(`⚠️ Thanh toán thiếu: Cần ${order.soTienCanThanhToan}, nhận ${sePayWebhookData.transferAmount}`);
    }

    // 5️⃣ LƯU GIAO DỊCH
    console.log("💾 Đang lưu transaction...");
    
    // ✅ THAY ĐỔI: Dùng insertOne thay vì create
    const newTransactionResult = await SePayTransaction.collection.insertOne({
      sepayId: sePayWebhookData.sepayId,
      gateway: sePayWebhookData.gateway,
      transactionDate: sePayWebhookData.transactionDate,
      accountNumber: sePayWebhookData.accountNumber,
      subAccount: sePayWebhookData.subAccount,
      code: sePayWebhookData.code,
      content: sePayWebhookData.content,
      transferType: sePayWebhookData.transferType,
      description: sePayWebhookData.description,
      transferAmount: sePayWebhookData.transferAmount,
      referenceCode: sePayWebhookData.referenceCode,
      accumulated: sePayWebhookData.accumulated,
      orderId: order.maDonHang,
      processedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const transactionId = newTransactionResult.insertedId;
    console.log("✅ Đã lưu transaction:", transactionId);

    // 6️⃣ CẬP NHẬT ĐƠN HÀNG
    console.log("📝 Đang cập nhật đơn hàng...");
    
    const updatedOrder = await Order.findOneAndUpdate(
      { maDonHang: idOrder },
      {
        $set: {
          TinhTrangThanhToan: trangThaiMoi,
        //   phuongThucThanhToan: "Chuyển khoản",
        },
        $push: {
          transactionHistory: {
            date: new Date(),
            amount: sePayWebhookData.transferAmount,
            type: "deposit",
            reference: String(sePayWebhookData.referenceCode || sePayWebhookData.sepayId),
            gateway: sePayWebhookData.gateway,
            transactionId: transactionId,
          },
        },
      },
      { new: true }
    );

    console.log("✅ Xử lý thành công đơn hàng:", order.maDonHang);

    return res.status(200).json({
      success: true,
      data: {
        orderId: updatedOrder.maDonHang,
        TinhTrangThanhToan: updatedOrder.TinhTrangThanhToan,
        soTienCanThanhToan: updatedOrder.soTienCanThanhToan,
        soTienNhan: sePayWebhookData.transferAmount,
        transactionId: transactionId,
      },
      message: "Xử lý thanh toán thành công",
    });

  } catch (error) {
    console.error("❌ Lỗi SePay Webhook:", error);
    console.error("Stack trace:", error.stack);
    
    return res.status(500).json({ 
      success: false,
      message: error.message || "Internal Server Error",
      error: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
  }
};

const layChiTietDonHang = async (req, res) => {
  try {
    const { maDonHang } = req.params;
    const don = await Order.findOne({ maDonHang }).populate(
      "idKhachHang",
    );
    if (!don)
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy đơn hàng!" });
    res.json({ success: true, data: don });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { createOrder, createOrderThanhToanVNPay, updateCongTienKhiNap, findOrderById, thanhToanOnlineSepay, layChiTietDonHang };
