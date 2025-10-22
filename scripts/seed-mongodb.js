#!/usr/bin/env node

/**
 * TechHub E-Commerce Full Data Seeder 🎉
 * --------------------------------------
 * Generates realistic MongoDB data for testing performance.
 * - Users, Products, Orders, UserActivity, BlogPosts, Comments, Places, Logs
 * - Clears old data before seeding
 * - Batch inserts with progress indicators
 * - Maintains references between collections
 */

console.log(`🚀 TechHub E-Commerce Data Seeder Started...\n`);

const {execSync} = require("child_process");
const os = require("os");

// ============================
// 0️⃣ Node.js Check
// ============================
function checkNode() {
    try {
        const version = execSync("node -v", {stdio: "pipe"}).toString().trim();
        console.log(`✅ Node.js is installed: ${version}\n`);
    } catch (e) {
        console.error("❌ Node.js is not installed. Install it from https://nodejs.org/");
        process.exit(1);
    }
}

checkNode();

// ============================
// 1️⃣ Install Required Packages
// ============================
function installPackage(pkg) {
    try {
        require.resolve(pkg);
    } catch (e) {
        console.log(`⚡ ${pkg} not found. Installing...`);
        execSync(`npm install ${pkg}`, {stdio: "inherit"});
        console.log(`\n`);
    }
}

installPackage("@faker-js/faker");
installPackage("mongodb");

const {faker} = require("@faker-js/faker");
const {MongoClient, ObjectId} = require("mongodb");

// ============================
// 2️⃣ MongoDB Config & Connection
// ============================
const MONGO_URL = "mongodb://localhost:27017";
const DB_NAME = "techhub_ecommerce";

async function connectDB() {
    const client = new MongoClient(MONGO_URL);
    await client.connect();
    console.log("✅ Connected to MongoDB \n");
    return client.db(DB_NAME);
}

// ============================
// 3️⃣ Clear Old Data Function
// ============================
async function clearOldData(db) {
    console.log("🧹 Clearing old data from all collections...");
    const collections = ["users", "products", "orders", "userActivity", "blogPosts", "comments", "places", "logs"];
    for (const name of collections) {
        const coll = db.collection(name);
        const count = await coll.countDocuments();
        if (count > 0) {
            await coll.deleteMany({});
            console.log(`✅ Cleared ${count} documents from '${name}'`);
        } else {
            console.log(`ℹ️  '${name}' is already empty`);
        }
    }
    console.log("🧹 All old data cleared!\n");
}

// ============================
// 4️⃣ Helper Functions
// ============================
const randomFromArray = arr => arr[Math.floor(Math.random() * arr.length)];
const randomCoordinates = () => [faker.location.longitude(), faker.location.latitude()];

// ============================
// 5️⃣ Seeder Configurations
// ============================
const SEED_CONFIG = {
    NUM_USERS: 100_000,
    NUM_PRODUCTS: 10_000,
    NUM_ORDERS: 500_000,
    NUM_USER_ACTIVITY: 500_000,
    NUM_BLOG_POSTS: 1_000,
    NUM_COMMENTS: 25_000,
    NUM_PLACES: 500,
    NUM_LOGS: 1_000_000,
};

// ============================
// 6️⃣ Progress Helper Function
// ============================
function printProgress(prefix, current, total) {
    const percent = ((current / total) * 100).toFixed(2);
    process.stdout.write(`\r${prefix} progress: ${percent}%   ${current === total ? '\n' : ''}`);
}

// ============================
// 7️⃣ Main Seeder Function
// ============================
(async () => {
    const db = await connectDB();

    // Clear old data
    await clearOldData(db);


    console.log("\n🌱 Seeding new data into TechHub E-Commerce collections...\n");

    // ----------------------------
    // 👥 Generate Users
    // ----------------------------
    console.log("👥 Generating users...");
    const roles = ["customer", "admin", "vendor"];
    const userBatch = [];
    const batchSizeUsers = 10_000;

    for (let i = 0; i < SEED_CONFIG.NUM_USERS; i++) {
        const role = randomFromArray(roles);
        userBatch.push({
            _id: new ObjectId(),
            email: faker.internet.email(),
            password: faker.internet.password(),
            firstName: faker.person.firstName(),
            lastName: faker.person.lastName(),
            role,
            status: randomFromArray(["active", "inactive", "suspended"]),
            address: {
                street: faker.location.streetAddress(),
                city: faker.location.city(),
                state: faker.location.state(),
                country: faker.location.country(),
                zipCode: faker.location.zipCode(),
                location: {type: "Point", coordinates: randomCoordinates()}
            },
            phone: faker.phone.number(),
            createdAt: faker.date.past(3),
            lastLogin: faker.date.recent(30),
            preferences: {
                language: randomFromArray(["en", "es", "fr", "de"]),
                currency: randomFromArray(["USD", "EUR", "GBP"]),
                notifications: faker.datatype.boolean()
            }
        });

        if (userBatch.length >= batchSizeUsers) {
            await db.collection("users").insertMany(userBatch);
            userBatch.length = 0;
            printProgress("⏳ Users", i + 1, SEED_CONFIG.NUM_USERS);
        }
    }
    if (userBatch.length) await db.collection("users").insertMany(userBatch);
    // printProgress("⏳ Users", SEED_CONFIG.NUM_USERS, SEED_CONFIG.NUM_USERS);
    console.log("✅ Users generation complete!\n");

    const customers = await db.collection("users").find({role: "customer"}, {
        projection: {
            _id: 1,
            address: 1,
            firstName: 1,
            lastName: 1,
            email: 1
        }
    }).toArray();

    // ----------------------------
    // 📦 Generate Products
    // ----------------------------
    console.log("📦 Generating products...");
    const categories = ["laptops", "phones", "accessories", "audio"];
    const products = [];
    const productBatch = [];
    const batchSizeProducts = 5_000;

    for (let i = 0; i < SEED_CONFIG.NUM_PRODUCTS; i++) {
        const product = {
            _id: new ObjectId(),
            sku: `SKU-${faker.string.uuid()}`,
            name: faker.commerce.productName(),
            description: faker.commerce.productDescription(),
            category: randomFromArray(categories),
            brand: faker.company.name(),
            tags: faker.helpers.arrayElements(["electronics", "sale", "featured", "new"], faker.number.int({
                min: 1,
                max: 3
            })),
            price: parseFloat(faker.commerce.price(50, 2000)),
            stock: faker.number.int({min: 0, max: 1000}),
            specs: {
                weight: `${faker.number.int({min: 1, max: 5})}kg`,
                dimensions: `${faker.number.int({min: 10, max: 50})}x${faker.number.int({
                    min: 10,
                    max: 50
                })}x${faker.number.int({min: 1, max: 10})}cm`,
                color: faker.color.human(),
                storage: randomFromArray(["128GB", "256GB", "512GB", "1TB"]),
                ram: randomFromArray(["8GB", "16GB", "32GB"])
            },
            ratings: {
                average: faker.number.float({min: 0, max: 5, precision: 0.1}),
                count: faker.number.int({min: 0, max: 1000})
            },
            status: randomFromArray(["active", "discontinued", "out_of_stock"]),
            createdAt: faker.date.past(2),
            updatedAt: faker.date.recent(10)
        };
        productBatch.push(product);
        products.push(product);

        if (productBatch.length >= batchSizeProducts) {
            await db.collection("products").insertMany(productBatch);
            productBatch.length = 0;
            printProgress("⏳ Products", i + 1, SEED_CONFIG.NUM_PRODUCTS);
        }
    }
    if (productBatch.length) await db.collection("products").insertMany(productBatch);
    console.log("✅ Products generation complete!\n");

    // ----------------------------
    // 🛒 Generate Orders
    // ----------------------------
    console.log("🛒 Generating orders...");
    const orderBatch = [];
    const batchSizeOrders = 5_000;

    for (let i = 0; i < SEED_CONFIG.NUM_ORDERS; i++) {
        const customer = randomFromArray(customers);
        const numItems = faker.number.int({min: 1, max: 5});
        const items = [];
        let totalAmount = 0;

        for (let j = 0; j < numItems; j++) {
            const product = randomFromArray(products);
            const quantity = faker.number.int({min: 1, max: 5});
            const subtotal = quantity * product.price;
            items.push({
                productId: product._id,
                sku: product.sku,
                name: product.name,
                quantity,
                price: product.price,
                subtotal
            });
            totalAmount += subtotal;
        }

        const discountAmount = totalAmount * faker.number.float({min: 0, max: 0.2, precision: 0.01});
        const finalAmount = totalAmount - discountAmount;

        orderBatch.push({
            _id: new ObjectId(),
            orderNumber: `ORD-${faker.string.uuid()}`,
            customerId: customer._id,
            items,
            totalAmount,
            discountAmount,
            finalAmount,
            status: randomFromArray(["pending", "processing", "shipped", "delivered", "cancelled", "refunded"]),
            shippingAddress: customer.address,
            paymentMethod: randomFromArray(["credit_card", "paypal", "bank_transfer"]),
            paymentStatus: randomFromArray(["pending", "paid", "failed", "refunded"]),
            createdAt: faker.date.past(2),
            updatedAt: faker.date.recent(30),
            shippedAt: faker.date.recent(20),
            deliveredAt: faker.date.recent(10)
        });

        if (orderBatch.length >= batchSizeOrders) {
            await db.collection("orders").insertMany(orderBatch);
            orderBatch.length = 0;
            printProgress("⏳ Orders", i + 1, SEED_CONFIG.NUM_ORDERS);
        }
    }
    if (orderBatch.length) await db.collection("orders").insertMany(orderBatch);
    console.log("✅ Orders generation complete!\n");

    // ----------------------------
    // 📊 Generate User Activity
    // ----------------------------
    console.log("📊 Generating user activity...");
    const activityBatch = [];
    const batchSizeActivity = 10_000;
    const actions = ["login", "logout", "view_product", "add_to_cart", "purchase", "search"];

    for (let i = 0; i < SEED_CONFIG.NUM_USER_ACTIVITY; i++) {
        const user = randomFromArray(customers);
        activityBatch.push({
            _id: new ObjectId(),
            userId: user._id,
            sessionId: faker.string.uuid(),
            action: randomFromArray(actions),
            metadata: {
                productId: randomFromArray(products)._id,
                searchQuery: faker.commerce.productName(),
                page: faker.internet.url(),
                ipAddress: faker.internet.ip(),
                userAgent: faker.internet.userAgent()
            },
            timestamp: faker.date.recent(90)
        });

        if (activityBatch.length >= batchSizeActivity) {
            await db.collection("userActivity").insertMany(activityBatch);
            activityBatch.length = 0;
            printProgress("⏳ User Activity", i + 1, SEED_CONFIG.NUM_USER_ACTIVITY);
        }
    }
    if (activityBatch.length) await db.collection("userActivity").insertMany(activityBatch);
    console.log("✅ User Activity generation complete!\n");

    // ----------------------------
    // 📝 Blog Posts
    // ----------------------------
    console.log("📝 Generating blog posts...");
    const blogBatch = [];
    const batchSizeBlog = 100;
    const blogCategories = ["tutorials", "news", "guides"];

    for (let i = 0; i < SEED_CONFIG.NUM_BLOG_POSTS; i++) {
        blogBatch.push({
            _id: new ObjectId(),
            title: faker.lorem.sentence(),
            slug: faker.helpers.slugify(faker.lorem.words()),
            content: faker.lorem.paragraphs(5),
            authorId: randomFromArray(customers)._id,
            category: randomFromArray(blogCategories),
            tags: faker.helpers.arrayElements(["mongodb", "nodejs", "backend", "frontend", "performance"], faker.number.int({
                min: 1,
                max: 3
            })),
            publishedAt: faker.date.past(2),
            status: randomFromArray(["draft", "published", "archived"]),
            views: faker.number.int({min: 0, max: 10000}),
            commentsCount: 0
        });

        if (blogBatch.length >= batchSizeBlog) {
            await db.collection("blogPosts").insertMany(blogBatch);
            blogBatch.length = 0;
            printProgress("⏳ Blog Posts", i + 1, SEED_CONFIG.NUM_BLOG_POSTS);
        }
    }
    if (blogBatch.length) await db.collection("blogPosts").insertMany(blogBatch);
    console.log("✅ Blog Posts generation complete!\n");

    // ----------------------------
    // 💬 Comments
    // ----------------------------
    console.log("💬 Generating comments...");
    const commentsBatch = [];
    const batchSizeComments = 500;
    const blogPosts = await db.collection("blogPosts").find({}, {projection: {_id: 1}}).toArray();

    for (let i = 0; i < SEED_CONFIG.NUM_COMMENTS; i++) {
        const post = randomFromArray(blogPosts);
        const user = randomFromArray(customers);
        commentsBatch.push({
            _id: new ObjectId(),
            postId: post._id,
            userId: user._id,
            userName: `${user.firstName} ${user.lastName}`,
            userEmail: user.email,
            comment: faker.lorem.sentences(2),
            parentCommentId: null,
            status: randomFromArray(["approved", "pending", "spam"]),
            createdAt: faker.date.recent(30)
        });

        if (commentsBatch.length >= batchSizeComments) {
            await db.collection("comments").insertMany(commentsBatch);
            commentsBatch.length = 0;
            printProgress("⏳ Comments", i + 1, SEED_CONFIG.NUM_COMMENTS);
        }
    }
    if (commentsBatch.length) await db.collection("comments").insertMany(commentsBatch);
    console.log("✅ Comments generation complete!\n");

    // ----------------------------
    // 📍 Places
    // ----------------------------
    console.log("📍 Generating places...");
    const placesBatch = [];
    const placeTypes = ["store", "warehouse", "pickup_point"];

    for (let i = 0; i < SEED_CONFIG.NUM_PLACES; i++) {
        placesBatch.push({
            _id: new ObjectId(),
            name: `${faker.company.name()} ${randomFromArray(["Store", "Warehouse", "Hub"])}`,
            type: randomFromArray(placeTypes),
            address: {
                street: faker.location.streetAddress(),
                city: faker.location.city(),
                state: faker.location.state(),
                zipCode: faker.location.zipCode(),
                country: faker.location.country()
            },
            location: {type: "Point", coordinates: randomCoordinates()},
            hours: "9AM - 9PM",
            phone: faker.phone.number(),
            status: randomFromArray(["open", "closed", "temporarily_closed"])
        });
        printProgress("⏳ Places", i + 1, SEED_CONFIG.NUM_PLACES);
    }

    await db.collection("places").insertMany(placesBatch);
    console.log("✅ Places generation complete!\n");

    // ----------------------------
    // 🗂 Logs
    // ----------------------------
    console.log("🗂 Generating logs...");
    const logsBatch = [];
    const batchSizeLogs = 5_000;
    const services = ["api", "payment", "shipping", "auth"];
    const levels = ["info", "warning", "error", "critical"];
    const regions = ["us-east", "us-west", "eu", "asia"];

    for (let i = 0; i < SEED_CONFIG.NUM_LOGS; i++) {
        logsBatch.push({
            _id: new ObjectId(),
            level: randomFromArray(levels),
            message: faker.lorem.sentence(),
            service: randomFromArray(services),
            userId: randomFromArray(customers)._id,
            metadata: {extra: faker.lorem.words(3)},
            timestamp: faker.date.recent(90),
            region: randomFromArray(regions)
        });

        if (logsBatch.length >= batchSizeLogs) {
            await db.collection("logs").insertMany(logsBatch);
            logsBatch.length = 0;
            printProgress("⏳ Logs", i + 1, SEED_CONFIG.NUM_LOGS);
        }
    }

    if (logsBatch.length) await db.collection("logs").insertMany(logsBatch);
    console.log("✅ Logs generation complete!\n");

    // ----------------------------
    // 🎉 Done
    // ----------------------------
    console.log("🎉 All collections generated successfully! Closing connection.");
    process.exit(0);
})();
