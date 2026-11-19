require("dotenv").config();

const TelegramBot = require("node-telegram-bot-api");
const fs = require("fs");

const TOKEN = process.env.BOT_TOKEN;

if (!TOKEN) {
    console.error("❌ BOT_TOKEN belum diisi!");
    process.exit(1);
}

const bot = new TelegramBot(TOKEN, {
    polling: true
});

const DB_FILE = "stock.json";

// ========================================
// STOCK AWAL
// ========================================

const initialStock = [
    { name: "POPMIE", stock: 0, unit: "pcs" },
    { name: "SARI GANDUM COKLAT", stock: 6, unit: "pcs" },
    { name: "MOMOGI MINI", stock: 1, unit: "box" },
    { name: "MAKARONI NGEHE", stock: 0, unit: "pcs" },
    { name: "USUS NGEHE", stock: 3, unit: "pcs" },
    { name: "SAUS ABC EXTRA PEDAS 275ml", stock: 4, unit: "pcs" },
    { name: "SAUS INDOFOOD EXTRA PEDAS 275ml", stock: 5, unit: "pcs" },
    { name: "SAUS BELIBIS EXTRA PEDAS 235ml", stock: 3, unit: "pcs" }
];

// ========================================
// DATABASE
// ========================================

function loadStock() {

    if (!fs.existsSync(DB_FILE)) {

        fs.writeFileSync(
            DB_FILE,
            JSON.stringify(initialStock, null, 2)
        );

        return initialStock;
    }

    try {

        return JSON.parse(
            fs.readFileSync(DB_FILE, "utf8")
        );

    } catch (error) {

        console.error("❌ stock.json rusak. Menggunakan stock awal.");

        return initialStock;
    }
}

function saveStock(stock) {

    fs.writeFileSync(
        DB_FILE,
        JSON.stringify(stock, null, 2)
    );
}

let products = loadStock();

// ========================================
// HELPER
// ========================================

function findProduct(name) {

    return products.find(
        product =>
            product.name.toLowerCase() ===
            name.trim().toLowerCase()
    );
}

function formatStock() {

    let message =
        "📦 STOCK TERKINI\n" +
        "━━━━━━━━━━━━━━━━━━\n";

    let totalItems = 0;

    for (const product of products) {

        let status = "";

        if (product.stock === 0) {
            status = " ❌ HABIS";
        } else if (product.stock <= 3) {
            status = " ⚠️";
        }

        message +=
            `• ${product.name} : ${product.stock} ${product.unit}${status}\n`;

        totalItems += product.stock;
    }

    message +=
        "━━━━━━━━━━━━━━━━━━\n" +
        `📊 TOTAL STOCK: ${totalItems} unit`;

    return message;
}

// ========================================
// START
// ========================================

bot.onText(/^\/start$/, (msg) => {

    const message =
        "🤖 STOCK BOT AKTIF!\n\n" +

        "📦 COMMAND:\n\n" +

        "/stock\n" +
        "Lihat semua stock.\n\n" +

        "/terjual Nama Barang Jumlah\n" +
        "Kurangi stock barang.\n\n" +

        "/tambah Nama Barang Jumlah\n" +
        "Tambah stock barang.\n\n" +

        "/tambah Nama Barang Jumlah unit\n" +
        "Tambah barang baru.\n\n" +

        "/hapus Nama Barang\n" +
        "Hapus barang dari daftar.\n\n" +

        "/set Nama Barang Jumlah\n" +
        "Atur stock langsung.\n\n" +

        "💡 Contoh:\n" +
        "/terjual USUS NGEHE 2\n\n" +

        "/tambah USUS NGEHE 5\n\n" +

        "/tambah INDOMIE GORENG 10 pcs\n\n" +

        "/hapus POPMIE";

    bot.sendMessage(
        msg.chat.id,
        message
    );
});

// ========================================
// STOCK
// ========================================

bot.onText(/^\/stock$/, (msg) => {

    bot.sendMessage(
        msg.chat.id,
        formatStock()
    );

});

// ========================================
// TERJUAL
// ========================================

bot.onText(/^\/terjual (.+) (\d+)$/i, (msg, match) => {

    const productName = match[1].trim();
    const amount = parseInt(match[2]);

    if (amount <= 0) {

        return bot.sendMessage(
            msg.chat.id,
            "❌ Jumlah harus lebih dari 0."
        );
    }

    const product = findProduct(productName);

    if (!product) {

        return bot.sendMessage(
            msg.chat.id,
            `❌ Barang "${productName}" tidak ditemukan.\n\n` +
            `Gunakan /tambah untuk membuat barang baru.`
        );
    }

    if (product.stock < amount) {

        return bot.sendMessage(
            msg.chat.id,
            `⚠️ STOCK TIDAK CUKUP!\n\n` +
            `📦 ${product.name}\n` +
            `Stock sekarang : ${product.stock} ${product.unit}\n` +
            `Diminta        : ${amount} ${product.unit}`
        );
    }

    const oldStock = product.stock;

    product.stock -= amount;

    saveStock(products);

    let message =
        `✅ STOCK UPDATED\n\n` +
        `📦 ${product.name}\n` +
        `Sebelum : ${oldStock} ${product.unit}\n` +
        `Terjual : ${amount} ${product.unit}\n` +
        `Sisa    : ${product.stock} ${product.unit}`;

    if (product.stock === 0) {

        message += "\n\n🚨 STOCK HABIS!";

    } else if (product.stock <= 3) {

        message += "\n\n⚠️ LOW STOCK!";
    }

    bot.sendMessage(
        msg.chat.id,
        message
    );
});

// ========================================
// TAMBAH STOCK / BARANG BARU
// ========================================

bot.onText(/^\/tambah (.+) (\d+)(?: (pcs|box|pack|dus|karton|botol|bungkus))?$/i, (msg, match) => {

    const productName = match[1].trim();
    const amount = parseInt(match[2]);

    let unit = match[3]
        ? match[3].toLowerCase()
        : null;

    if (amount <= 0) {

        return bot.sendMessage(
            msg.chat.id,
            "❌ Jumlah harus lebih dari 0."
        );
    }

    const product = findProduct(productName);

    // ========================================
    // BARANG SUDAH ADA
    // ========================================

    if (product) {

        const oldStock = product.stock;

        product.stock += amount;

        saveStock(products);

        return bot.sendMessage(
            msg.chat.id,
            `✅ STOCK DITAMBAH\n\n` +
            `📦 ${product.name}\n` +
            `Sebelum : ${oldStock} ${product.unit}\n` +
            `Masuk   : ${amount} ${product.unit}\n` +
            `Sekarang: ${product.stock} ${product.unit}`
        );
    }

    // ========================================
    // BARANG BARU
    // ========================================

    if (!unit) {
        unit = "pcs";
    }

    const newProduct = {
        name: productName,
        stock: amount,
        unit: unit
    };

    products.push(newProduct);

    saveStock(products);

    bot.sendMessage(
        msg.chat.id,
        `🆕 BARANG BARU DITAMBAHKAN!\n\n` +
        `📦 ${productName}\n` +
        `Stock : ${amount} ${unit}\n\n` +
        `Gunakan /stock untuk melihat daftar terbaru.`
    );
});

// ========================================
// HAPUS BARANG
// ========================================

bot.onText(/^\/hapus\s+(.+)$/i, (msg, match) => {

    let productName = match[1].trim();

    // Bersihkan tanda "=" di akhir nama
    productName = productName
        .replace(/\s*=\s*$/, "")
        .trim()
        .toLowerCase();

    const index = products.findIndex(product => {

        let savedName = product.name
            .trim()
            .replace(/\s*=\s*$/, "")
            .trim()
            .toLowerCase();

        return savedName === productName;
    });

    if (index === -1) {

        return bot.sendMessage(
            msg.chat.id,
            `❌ Barang "${match[1].trim()}" tidak ditemukan.\n\n` +
            `💡 Coba cek daftar dengan /stock`
        );

    }

    const removedProduct = products[index];

    products.splice(index, 1);

    saveStock(products);

    bot.sendMessage(
        msg.chat.id,
        `🗑️ BARANG DIHAPUS\n\n` +
        `📦 ${removedProduct.name}\n` +
        `Stock terakhir : ${removedProduct.stock} ${removedProduct.unit}\n\n` +
        `✅ Barang sudah dihapus dari daftar stock.`
    );

});

// ========================================
// SET STOCK
// ========================================

bot.onText(/^\/set (.+) (\d+)$/i, (msg, match) => {

    const productName = match[1].trim();
    const amount = parseInt(match[2]);

    const product = findProduct(productName);

    if (!product) {

        return bot.sendMessage(
            msg.chat.id,
            `❌ Barang "${productName}" tidak ditemukan.`
        );
    }

    const oldStock = product.stock;

    product.stock = amount;

    saveStock(products);

    bot.sendMessage(
        msg.chat.id,
        `✅ STOCK DISET\n\n` +
        `📦 ${product.name}\n` +
        `Sebelum : ${oldStock} ${product.unit}\n` +
        `Sekarang: ${amount} ${product.unit}`
    );
});

// ========================================
// BAHASA BIASA
// ========================================

bot.on("message", (msg) => {

    if (!msg.text) return;

    const text = msg.text.trim();

    // Abaikan command
    if (text.startsWith("/")) return;

    const match =
        text.match(/^(.+?)\s+terjual\s+(\d+)$/i);

    if (!match) return;

    const productName = match[1].trim();
    const amount = parseInt(match[2]);

    const product = findProduct(productName);

    if (!product) {

        return bot.sendMessage(
            msg.chat.id,
            `❌ Barang "${productName}" tidak ditemukan.`
        );
    }

    if (product.stock < amount) {

        return bot.sendMessage(
            msg.chat.id,
            `⚠️ STOCK TIDAK CUKUP!\n\n` +
            `📦 ${product.name}\n` +
            `Stock sekarang : ${product.stock} ${product.unit}\n` +
            `Terjual        : ${amount} ${product.unit}`
        );
    }

    const oldStock = product.stock;

    product.stock -= amount;

    saveStock(products);

    let message =
        `✅ STOCK UPDATED\n\n` +
        `📦 ${product.name}\n` +
        `Sebelum : ${oldStock} ${product.unit}\n` +
        `Terjual : ${amount} ${product.unit}\n` +
        `Sisa    : ${product.stock} ${product.unit}`;

    if (product.stock === 0) {

        message += "\n\n🚨 STOCK HABIS!";

    } else if (product.stock <= 3) {

        message += "\n\n⚠️ LOW STOCK!";
    }

    bot.sendMessage(
        msg.chat.id,
        message
    );
});

// ========================================
// BOT READY
// ========================================

console.log("================================");
console.log("🤖 STOCK BOT AKTIF!");
console.log("📦 Database: stock.json");
console.log("================================");
