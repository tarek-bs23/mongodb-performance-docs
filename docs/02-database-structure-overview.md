---
layout: default
title: "2. Database Structure Overview"
nav_order: 2
---

# 2. Database Structure Overview

This section documents the complete MongoDB schema design for the **TechHub E-Commerce Platform**, a simulated large-scale application used throughout this guide to demonstrate **query performance**, **schema design patterns**, and **real-world optimization techniques**.

Each collection represents a core part of a modern e-commerce system, designed to support millions of documents while maintaining realistic relationships between entities.

---

## 🧍‍♂️ **1. Users Collection**

Stores all types of users like customers, vendors, and admins are forming the foundation of the system. Referenced in almost every other collection such as orders, reviews, sessions, and activities.

```javascript
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


## 🛒 **2. Orders Collection**

Captures all purchase transactions made by customers. Each order references a user (`customerId`) and multiple products.

```javascript
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

## 📦 **3. Products Collection**

Stores product details such as name, category, price, stock, and specs. Central to the e-commerce model and referenced by orders and reviews.

```javascript
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

## 🧭 **4. User Activity Collection**

Tracks user actions for analytics, personalization, and auditing. Designed for high-write, append-only workloads.

```javascript
{
  _id: ObjectId(),
  userId: ObjectId(),        // references users._id
  sessionId: String,
  action: String,            // "login", "view_product", "purchase", etc.
  metadata: {
    productId: ObjectId(),
    searchQuery: String,
    page: String,
    ipAddress: String,
    userAgent: String
  },
  timestamp: Date
}
```

## 📝 **5. Blog Posts Collection**

Stores educational and marketing articles created by admins or vendors. Useful for displaying blog or knowledge base content in the platform.

```javascript
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

## 💬 **6. Comments Collection**

Stores user comments related to blog posts. Kept in a separate collection for better scalability and data organization.

```javascript
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

## 🏬 **7. Places Collection**

Represents physical business locations such as stores, warehouses, and pickup points.


```javascript
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

## ⚙️ **8. Logs Collection**

Captures detailed application-level events for performance monitoring and debugging.

```javascript
{
  _id: ObjectId(),
  level: String,             // "info", "warning", "error", "critical"
  message: String,
  service: String,           // "api", "auth", "payment", "shipping"
  userId: ObjectId(),        // optional reference to users._id
  metadata: Object,
  timestamp: Date,
  region: String             // "us-east", "eu", "asia", etc.
}
```

---

## 🧩 **Schema Relationships Overview**

| Relationship Type | Example Collections                             | Description                               |
| ----------------- | ----------------------------------------------- | ----------------------------------------- |
| **1 → 1**         | `users` → `preferences`                         | Embedded subdocument                      |
| **1 → Many**      | `users` → `orders`, `blogPosts`, `userActivity` | Referenced relationships                  |
| **Many → 1**      | `orders.items` → `products`                     | Multiple items reference a single product |
| **Many → Many**   | `products` ↔ `tags`, `blogPosts` ↔ `tags`       | Represented as arrays of strings          |
| **Hierarchical**  | `comments` with `parentCommentId`               | Recursive relationships                   |

---

## 📊 **Dataset Size Plan**

| Collection     | Approx. Records | Description                       |
| -------------- | --------------- | --------------------------------- |
| `users`        | 500,000         | Mix of customers, vendors, admins |
| `products`     | 10,000          | Electronics, accessories, etc.    |
| `orders`       | 5,000,000       | Linked to users and products      |
| `userActivity` | 50,000,000+     | High-volume analytics data        |
| `blogPosts`    | 1,000           | Authored by admins/vendors        |
| `comments`     | 25,000          | User interactions                 |
| `places`       | 500             | Store and warehouse locations     |
| `logs`         | 100,000,000+    | System and application logs       |

