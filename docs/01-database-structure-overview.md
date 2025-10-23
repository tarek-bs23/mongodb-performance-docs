---
layout: default
title: "1. Database Structure Overview"
nav_order: 1
---

# 1. Database Structure Overview

This section documents the complete MongoDB schema design for the **TechHub E-Commerce Platform**, a simulated large-scale application used throughout this guide to demonstrate **query performance**, **schema design patterns**, and **real-world optimization techniques**.

Each collection represents a core part of a modern e-commerce system, designed to support millions of documents while maintaining realistic relationships between entities.

---

## Collections and documents

### 🧍‍♂️ **1. Users Collection**

Stores all types of users like customers, vendors, and admins are forming the foundation of the system. Referenced in almost every other collection such as orders, reviews, sessions, and activities.

```js
{
  _id: ObjectId(),
  email: String,
  password: String,        // Hashed
  firstName: String,
  lastName: String,
  role: String,            // "customer", "vendor", "admin"
  status: String,          // "active", "inactive", "suspended"
  address: {
    street: String,
    city: String,
    state: String,
    country: String,
    zipCode: String,
    location: {
      type: "Point",
      coordinates: [Number, Number] // [longitude, latitude]
    }
  },
  phone: String,
  createdAt: Date,
  lastLogin: Date,
  preferences: {
    language: String,
    currency: String,
    notifications: Boolean
  }
}
```


### 🛒 **2. Orders Collection**

Captures all purchase transactions made by customers. Each order references a user (`customerId`) and multiple products.

```js
{
  _id: ObjectId(),
  orderNumber: String,
  customerId: ObjectId(),     // references users._id
  items: [
    {
      productId: ObjectId(),
      name: String,
      quantity: Number,
      price: Number,
      subtotal: Number
    }
  ],
  totalAmount: Number,
  discountAmount: Number,
  finalAmount: Number,
  status: String,             // "pending", "processing", "shipped", "delivered", "cancelled"
  shippingAddress: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: String
  },
  paymentMethod: String,      // "credit_card", "paypal", etc.
  paymentStatus: String,      // "pending", "paid", "failed", "refunded"
  createdAt: Date,
  updatedAt: Date,
  shippedAt: Date,
  deliveredAt: Date
}
```

### 📦 **3. Products Collection**

Stores product details such as name, category, price, stock, and specs. Central to the e-commerce model and referenced by orders and reviews.

```js
{
  _id: ObjectId(),
  sku: String,
  name: String,
  description: String,
  category: String,          // e.g., "laptops", "phones", "accessories"
  brand: String,
  tags: [String],
  price: Number,
  stock: Number,
  specs: {
    weight: String,
    dimensions: String,
    color: String,
    storage: String,
    ram: String
  },
  ratings: {
    average: Number,
    count: Number
  },
  status: String,            // "active", "out_of_stock", "discontinued"
  createdAt: Date,
  updatedAt: Date
}
```

### 📝 **4. Blog Posts Collection**

Stores educational and marketing articles created by admins or vendors. Useful for displaying blog or knowledge base content in the platform.

```js
{
  _id: ObjectId(),
  title: String,
  slug: String,
  content: String,
  authorId: ObjectId(),      // references users._id (admin/vendor)
  category: String,
  tags: [String],
  publishedAt: Date,
  status: String,            // "draft", "published", "archived"
  views: Number,
  commentsCount: Number
}
```

### 💬 **5. Comments Collection**

Stores user comments related to blog posts. Kept in a separate collection for better scalability and data organization.

```js
{
  _id: ObjectId(),
  postId: ObjectId(),        // references blogPosts._id
  userId: ObjectId(),        // references users._id
  userName: String,
  userEmail: String,
  comment: String,
  parentCommentId: ObjectId(), // null for top-level
  status: String,            // "approved", "pending", "spam"
  createdAt: Date
}
```

### 🏬 **6. Places Collection**

Represents physical business locations such as stores, warehouses, and pickup points.


```js
{
  _id: ObjectId(),
  name: String,
  type: String,              // "store", "warehouse", "pickup_point"
  address: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: String
  },
  location: {
    type: "Point",
    coordinates: [Number, Number]
  },
  hours: String,
  phone: String,
  status: String             // "open", "closed", "temporarily_closed"
}
```

---

## 🧩 **Schema Relationships Overview**

| Relationship Type    | Example Collections                            | Description                                                             |
| -------------------- | ---------------------------------------------- | ----------------------------------------------------------------------- |
| **1 → 1**            | `users` → `preferences`                        | Embedded subdocument within the user.                                   |
| **1 → Many**         | `users` → `orders`, `users` → `blogPosts`      | Each user can have multiple orders and blog posts.                      |
| **Many → 1**         | `orders.items.productId` → `products._id`      | Multiple order items reference a single product.                        |
| **Many → Many**      | `products.tags` ↔ `blogPosts.tags`             | Tags are represented as arrays of strings for flexible categorization.  |
| **Hierarchical**     | `comments.parentCommentId` → `comments._id`    | Recursive relationship allows threaded/nested comments.                 |
| **1 → 1 (optional)** | `orders.customerId` → `users._id`              | Each order belongs to one customer.                                     |
| **1 → Many**         | `places` → `orders.shippingAddress` (optional) | Optional association if you track orders shipped from a specific place. |
| **1 → 1 (optional)** | `blogPosts.authorId` → `users._id`             | Each blog post is authored by one admin or vendor.                      |
                |

---

## 📊 **Dataset Size Plan**

| Collection     | Approx. Records | Description                       |
| -------------- | --------------- | --------------------------------- |
| `users`        | 1,000,000         | Mix of customers, vendors, admins |
| `products`     | 100,000          | Electronics, accessories, etc.    |
| `orders`       | 10,000,000       | Linked to users and products      |
| `blogPosts`    | 100,000           | Authored by admins/vendors        |
| `comments`     | 2,500,000          | User interactions                 |
| `places`       | 5,000             | Store and warehouse locations     |

--- 

## 🗃️ Data Seeding Guideline

To populate your local MongoDB database with sample data for the **TechHub E-Commerce Platform**, follow these steps to run the provided seeding script. This ensures consistency across the examples in this documentation.

### Prerequisites
Before running the seeding script, ensure the following are installed and configured:
- **MongoDB**: Version 7.0 or higher, with a running local instance (e.g., `mongod`). [Install MongoDB](https://www.mongodb.com/docs/manual/installation/).
- **Node.js**: Version 18.x or higher. [Download Node.js](https://nodejs.org/).
- **Git**: Required to clone the repository. [Install Git](https://git-scm.com/downloads).
- A terminal or command-line interface (e.g., Bash, PowerShell, or Terminal).
- Ensure your MongoDB instance is running and accessible at `mongodb://localhost:27017`.

### Steps to Seed the Database
1. **Clone the Repository**:
   Clone the Git repository containing the seeding script:
   ```bash
   git clone https://github.com/tarek-bs23/mongodb-performance-docs.git
   ```

2. **Navigate to the Scripts Directory**:
   Move to the directory containing the seeding script:
   ```bash
   cd mongodb-performance-docs/scripts
   ```

3. **Run the Seeding Script**:
   Execute the script to populate your MongoDB database:
   ```bash
   node seed-mongodb.js
   ```

5. **Verify the Data**:
   Connect to your MongoDB instance using the `mongosh` shell or MongoDB Compass and run:
   ```js
   use techhub-ecommerce
   db.users.countDocuments()  // Should return ~1,000,000
   db.orders.countDocuments() // Should return ~10,000,000
   db.products.findOne()      // Inspect a single product document
   ```

### Performance Considerations
Seeding large collections like `orders` (10M records) and `comments` (2.5M records) requires significant disk space (approximately 7-10 GB) and may take 10-20 minutes depending on your hardware. Ensure sufficient disk space and CPU resources.

### Notes
- The seeding script generates approximately 1M users, 10M orders, 100K products, and other records as outlined in the [Dataset Size Plan](#dataset-size-plan).
- Seeding may take several minutes depending on your system’s performance and database size.
- Re-running the script will clear the database and re-populate it with fresh data.

For detailed setup instructions or advanced configurations, see the [repository’s documentation](https://github.com/tarek-bs23/mongodb-performance-docs/blob/main/README.md) or open an issue on GitHub.