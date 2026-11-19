require("dotenv").config();

const TelegramBot = require("node-telegram-bot-api");
const fs = require("fs");

const TOKEN = process.env.BOT_TOKEN;

if (!TOKEN) {
    console.error("BOT_TOKEN belum diisi di file .env");
    process.exit(1);
}

const bot = new TelegramBot(TOKEN, {
    polling: true
});

const DB_FILE = "stock.json";

const initialStock = [
    { name: "Keripik Tempe", stock: 3 },
    { name: "Singkong Balado Basah", stock: 3 },
    { name: "Basreng Asin", stock: 4 },
    { name: "Kerupuk Seblak Kencur", stock: 2 },
    { name: "Emping Melinjo Pedas", stock: 1 },
    { name: "Keripik Ubi Ungu", stock: 1 },
    { name: "Jagung Marning", stock: 1 },
    { name: "Roti Bagelan Keju", stock: 1 },
    { name: "Roti Bagelan Pandan", stock: 2 },
    { name: "Popmie Kuah Pedes Dower", stock: 22 }
];

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
        console.error("Gagal membaca stock.json");
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

function findProduct(name) {
    return products.find(
        product =>
            product.name.toLowerCase() ===
            name.trim().toLowerCase()
    );
}

function formatStock() {
    let message = "STOCK TERKINI\n";
    message += "====================\n";

    let total = 0;

    for (const product of products) {
        message +=
            product.name +
            " : " +
            product.stock +
            " pcs\n";

        total += product.stock;
    }

    message += "====================\n";
    message += "TOTAL STOCK: " + total + " pcs";

    return message;
}

bot.onText(/^\/start$/, (msg) => {

    const welcome =
        "STOCK BOT AKTIF!\n\n" +
        "COMMAND:\n\n" +
        "/stock\n" +
        "Lihat semua stock.\n\n" +
        "/terjual Nama Barang Jumlah\n" +
        "Kurangi stock.\n\n" +
        "/tambah Nama Barang Jumlah\n" +
        "Tambah stock.\n\n" +
        "/set Nama Barang Jumlah\n" +
        "Atur stock langsung.\n\n" +
        "Bisa juga bahasa biasa:\n\n" +
        "keripik tempe terjual 2";

    bot.sendMessage(msg.chat.id, welcome);

});

bot.onText(/^\/stock$/, (msg) => {

    bot.sendMessage(
        msg.chat.id,
        formatStock()
    );

});

bot.onText(/^\/terjual (.+) (\d+)$/i, (msg, match) => {

    const productName = match[1].trim();
    const amount = parseInt(match[2]);

    const product = findProduct(productName);

    if (!product) {
        return bot.sendMessage(
            msg.chat.id,
            "Barang \"" + productName + "\" tidak ditemukan."
        );
    }

    if (amount <= 0) {
        return bot.sendMessage(
            msg.chat.id,
            "Jumlah harus lebih dari 0."
        );
    }

    if (product.stock < amount) {

        return bot.sendMessage(
            msg.chat.id,
            "STOCK TIDAK CUKUP!\n\n" +
            product.name + "\n" +
            "Stock sekarang : " + product.stock + "\n" +
            "Terjual        : " + amount
        );

    }

    const oldStock = product.stock;

    product.stock -= amount;

    saveStock(products);

    let message =
        "STOCK UPDATED\n\n" +
        product.name + "\n" +
        "Sebelum : " + oldStock + "\n" +
        "Terjual : " + amount + "\n" +
        "Sisa    : " + product.stock;

    if (product.stock === 0) {
        message += "\n\nSTOCK HABIS!";
    } else if (product.stock <= 3) {
        message += "\n\nLOW STOCK!";
    }

    bot.sendMessage(
        msg.chat.id,
        message
    );

});

bot.onText(/^\/tambah (.+) (\d+)$/i, (msg, match) => {

    const productName = match[1].trim();
    const amount = parseInt(match[2]);

    const product = findProduct(productName);

    if (!product) {
        return bot.sendMessage(
            msg.chat.id,
            "Barang \"" + productName + "\" tidak ditemukan."
        );
    }

    if (amount <= 0) {
        return bot.sendMessage(
            msg.chat.id,
            "Jumlah harus lebih dari 0."
        );
    }

    const oldStock = product.stock;

    product.stock += amount;

    saveStock(products);

    bot.sendMessage(
        msg.chat.id,
        "STOCK DITAMBAH\n\n" +
        product.name + "\n" +
        "Sebelum  : " + oldStock + "\n" +
        "Masuk    : " + amount + "\n" +
        "Sekarang : " + product.stock
    );

});

bot.onText(/^\/set (.+) (\d+)$/i, (msg, match) => {

    const productName = match[1].trim();
    const amount = parseInt(match[2]);

    const product = findProduct(productName);

    if (!product) {
        return bot.sendMessage(
            msg.chat.id,
            "Barang \"" + productName + "\" tidak ditemukan."
        );
    }

    if (amount < 0) {
        return bot.sendMessage(
            msg.chat.id,
            "Jumlah tidak boleh minus."
        );
    }

    const oldStock = product.stock;

    product.stock = amount;

    saveStock(products);

    bot.sendMessage(
        msg.chat.id,
        "STOCK DISET\n\n" +
        product.name + "\n" +
        "Sebelum  : " + oldStock + "\n" +
        "Sekarang : " + amount
    );

});

bot.on("message", (msg) => {

    if (!msg.text) return;

    const text = msg.text.trim();

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
            "Barang \"" + productName + "\" tidak ditemukan."
        );
    }

    if (amount <= 0) {
        return bot.sendMessage(
            msg.chat.id,
            "Jumlah harus lebih dari 0."
        );
    }

    if (product.stock < amount) {

        return bot.sendMessage(
            msg.chat.id,
            "STOCK TIDAK CUKUP!\n\n" +
            product.name + "\n" +
            "Stock sekarang : " + product.stock + "\n" +
            "Terjual        : " + amount
        );

    }

    const oldStock = product.stock;

    product.stock -= amount;

    saveStock(products);

    let message =
        "STOCK UPDATED\n\n" +
        product.name + "\n" +
        "Sebelum : " + oldStock + "\n" +
        "Terjual : " + amount + "\n" +
        "Sisa    : " + product.stock;

    if (product.stock === 0) {
        message += "\n\nSTOCK HABIS!";
    } else if (product.stock <= 3) {
        message += "\n\nLOW STOCK!";
    }

    bot.sendMessage(
        msg.chat.id,
        message
    );

});

console.log("==============================");
console.log("STOCK BOT AKTIF!");
console.log("Database: stock.json");
console.log("==============================");