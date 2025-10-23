---
layout: default
title: "8. Schema design"
nav_order: 8
---

# 8. Schema Design for Performance

Schema design in MongoDB isn't just about organizing data, it directly impacts how fast your queries run, how much memory is used, and how scalable your application is. Unlike relational databases, MongoDB gives you a lot of flexibility, but with that comes responsibility.

Here's how I approach schema design when performance matters.

---

## 🧱 Embedding vs Referencing

### Referencing (Normalization)
Store related data in separate collections and link them using IDs.

```js
// Orders collection - references users
{
  _id: ObjectId("68f9debd1c054beae4a21226"),
  customerId: ObjectId("507f1f77bcf86cd799439011"),
  orderNumber: "ORD-2024-00123"
}

// Users collection
{
  _id: ObjectId("507f1f77bcf86cd799439011"),
  email: "alice@example.com",
  firstName: "Alice"
}
```

Use referencing when:
* Data is large or changes frequently (user profiles, product details)
* You don't always need the related data
* You want to avoid duplication and maintain consistency

### Embedding (Denormalization)
Store related data inside the same document.

```js
// Orders with embedded items
{
  _id: ObjectId("68f9debd1c054beae4a21226"),
  customerId: ObjectId("507f1f77bcf86cd799439011"),
  items: [
    {
      productId: ObjectId("68f9debd1c054beae4a21227"),
      name: "Gaming Laptop Pro",
      price: 1299.99,
      quantity: 1
    }
  ],
  shippingAddress: {
    street: "123 Tech Street",
    city: "San Francisco",
    state: "CA"
  }
}
```

Use embedding when:
* Data is accessed together (order + items, user + preferences)
* You want to avoid joins (`$lookup`) for better performance
* The embedded data has bounded growth

### Hybrid Approach
```js
// Users with embedded preferences but referenced orders
{
  _id: ObjectId("507f1f77bcf86cd799439011"),
  email: "alice@example.com",
  preferences: {           // Embedded - small, frequently accessed
    language: "en",
    currency: "USD",
    notifications: true
  },
  // Orders are referenced - large, not always needed
}
```

👍 **Rule of thumb**: Embed what you query together, reference what you query separately.

---

## 📏 Document Size and Nesting

MongoDB has a **16MB document size limit**. Plan accordingly.

### Good Patterns:
```js
// ✅ Flat structure with bounded arrays
{
  _id: ObjectId("68f9debd1c054beae4a21227"),
  name: "Gaming Laptop Pro",
  category: "laptops",
  price: 1299.99,
  specs: {                // Embedded but bounded
    storage: "1TB SSD",
    ram: "16GB",
    display: "15.6 inch"
  },
  tags: ["gaming", "laptop"]  // Bounded array
}
```

### Avoid:
```js
// ❌ Unbounded arrays that can grow indefinitely
{
  _id: ObjectId("68f9debd1c054beae4a21228"),
  title: "Blog Post",
  comments: [ /* Could have 10,000+ comments */ ]
}

// ❌ Deep nesting that's hard to query
{
  user: {
    profile: {
      preferences: {
        ui: {
          theme: {
            colors: {
              primary: "...",
              secondary: "..."
            }
          }
        }
      }
    }
  }
}
```

### Better Approach:
```js
// ✅ Separate collection for unbounded data
// blogPosts collection
{
  _id: ObjectId("68f9debd1c054beae4a21228"),
  title: "Getting Started with MongoDB",
  content: "..."
}

// comments collection  
{
  _id: ObjectId("68f9debd1c054beae4a21229"),
  postId: ObjectId("68f9debd1c054beae4a21228"),
  comment: "Great article!",
  userId: ObjectId("507f1f77bcf86cd799439011")
}
```

---

## 🔄 Schema Evolution and Query Impact

### Schema Validation
Enforce consistent structure as your application grows:

```js
// Add schema validation to users collection
db.createCollection("users", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["email", "firstName", "role", "status"],
      properties: {
        email: {
          bsonType: "string",
          pattern: "^.+@.+\\..+$",
          description: "must be a valid email and is required"
        },
        role: {
          enum: ["customer", "vendor", "admin"],
          description: "must be one of the allowed roles"
        },
        status: {
          enum: ["active", "inactive", "suspended"],
          description: "must be one of the allowed statuses"
        }
      }
    }
  }
})
```

### Query-Friendly Design
Design your schema based on query patterns:

```js
// Good: Schema supports common queries
{
  _id: ObjectId("507f1f77bcf86cd799439011"),
  email: "alice@example.com",
  role: "customer",
  status: "active",
  lastLogin: ISODate("2024-03-20T14:22:00Z"),  // Supports sorting
  "address.state": "CA"                        // Supports filtering
}

// Supported queries:
db.users.find({ role: "customer", status: "active" })
db.users.find({ "address.state": "CA" }).sort({ lastLogin: -1 })
```

---

## 🎯 Query-Driven Schema Design

### Pattern 1: Pre-computed Aggregates
```js
// Products with pre-computed rating stats
{
  _id: ObjectId("68f9debd1c054beae4a21227"),
  name: "Gaming Laptop Pro",
  ratings: {
    average: 4.5,        // Pre-computed
    count: 127           // Pre-computed
  }
  // Avoids expensive $avg and $count at query time
}
```

### Pattern 2: Targeted Embedding
```js
// Orders with frequently accessed product info
{
  _id: ObjectId("68f9debd1c054beae4a21226"),
  items: [
    {
      productId: ObjectId("68f9debd1c054beae4a21227"),
      name: "Gaming Laptop Pro",      // Denormalized for display
      price: 1299.99,                 // Price at time of order
      quantity: 1
    }
  ]
}
```

### Pattern 3: Geospatial Optimization
```js
// Users with geospatial data for location queries
{
  _id: ObjectId("507f1f77bcf86cd799439011"),
  address: {
    street: "123 Tech Street",
    city: "San Francisco",
    state: "CA",
    location: {
      type: "Point",
      coordinates: [-122.4194, 37.7749]  // Supports $near queries
    }
  }
}
```

---

## ✅ Summary

* **Embed** frequently accessed, bounded data; **reference** large, infrequently accessed data
* Keep documents **flat** and avoid unbounded arrays that could hit the 16MB limit
* Use **schema validation** to maintain consistency as your application evolves
* Design your schema based on **query patterns** - how you access data matters most
* Consider **pre-computation** for expensive aggregations
* Use **geospatial data types** for location-based queries

Good schema design is the foundation of **fast queries** and a **scalable application**.
