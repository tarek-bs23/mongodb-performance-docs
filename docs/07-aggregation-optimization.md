---
layout: default
title: "7. Aggregation optimization"
nav_order: 7
---

# 7. Aggregation Pipeline Optimization

The aggregation pipeline is one of MongoDB's most powerful features but it can also be one of the easiest to misuse. If you're not careful with how you structure your pipeline, performance can tank fast, especially on large datasets.

Here's how I approach optimizing aggregation pipelines in real-world projects.

---

## 🧱 Pipeline Stage Ordering

The order of your pipeline stages matters a lot.

### ✅ Best Practice:
Put the most **restrictive** stages (like `$match`) as early as possible. This reduces the number of documents passed to later stages.

#### Example:
```js
// User analytics - filter early
db.users.aggregate([
  { $match: { 
    role: "customer", 
    status: "active",
    lastLogin: { $gte: ISODate("2024-01-01") }
  }},
  { $project: { 
    firstName: 1, 
    email: 1, 
    "address.state": 1,
    lastLogin: 1 
  }},
  { $group: { 
    _id: "$address.state", 
    activeUsers: { $sum: 1 },
    lastLoginAvg: { $avg: "$lastLogin" }
  }}
])
```

**Why this works:**
- `$match` filters early using indexes
- `$project` reduces document size
- `$group` works on fewer, smaller documents

---

## ⚡ Performance Tips for Aggregation Operators

### Memory-Intensive Operators
Some operators use more memory than others. Use them strategically:

```js
// ❌ Memory-heavy - stores all documents in array
{
  $group: {
    _id: "$category",
    allProducts: { $push: "$$ROOT" }  // Stores full documents
  }
}

// ✅ Memory-efficient - store only needed fields
{
  $group: {
    _id: "$category",
    productNames: { $push: "$name" },  // Store only names
    avgPrice: { $avg: "$price" }
  }
}

// ✅ Even better - use $addToSet for unique values
{
  $group: {
    _id: "$category",
    uniqueBrands: { $addToSet: "$brand" }
  }
}
```

### Efficient Array Operations
```js
// ❌ Inefficient array processing
{ $unwind: "$tags" },  // Explodes array, creates many documents
{ $group: { _id: "$tags", count: { $sum: 1 } } }

// ✅ More efficient array processing
{ $project: { tagCount: { $size: "$tags" } } }

// ✅ Use $reduce for complex array operations
{
  $project: {
    highRatedTags: {
      $reduce: {
        input: "$tags",
        initialValue: [],
        in: { $concatArrays: ["$$value", "$$this"] }
      }
    }
  }
}
```

### Optimize Date Operations
```js
// ❌ Computes date difference for every document
{
  $project: {
    daysSinceLogin: {
      $divide: [
        { $subtract: [new Date(), "$lastLogin"] },
        1000 * 60 * 60 * 24
      ]
    }
  }
}

// ✅ Compute date range once, then filter
{ $match: { lastLogin: { $gte: ISODate("2024-03-01") } } },
{
  $bucket: {
    groupBy: "$lastLogin",
    boundaries: [
      ISODate("2024-03-01"),
      ISODate("2024-03-15"),
      ISODate("2024-04-01")
    ],
    default: "older"
  }
}
```

---

## 💾 Memory Usage and Optimization

### Monitor Memory Usage
```js
// Check aggregation memory usage
db.products.aggregate([
  { $match: { status: "active" } },
  { $group: { 
    _id: "$category",
    count: { $sum: 1 },
    products: { $push: { name: "$name", price: "$price" } }
  }},
  { $limit: 100 }
], {
  allowDiskUse: true,  // Enable for large datasets
  maxTimeMS: 30000     // Set timeout
})
```

### Memory Limits and Solutions
```js
// Problem: Exceeds 100MB memory limit
db.orders.aggregate([
  { $group: {
    _id: "$customerId",
    allOrders: { $push: "$$ROOT" }  // Too much data!
  }}
])

// Solution 1: Use allowDiskUse
db.orders.aggregate([...], { allowDiskUse: true })

// Solution 2: Reduce data early
db.orders.aggregate([
  { $match: { createdAt: { $gte: ISODate("2024-01-01") } } },
  { $project: { 
    customerId: 1, 
    totalAmount: 1,
    status: 1 
  }},
  { $group: {
    _id: "$customerId",
    orderCount: { $sum: 1 },
    totalSpent: { $sum: "$totalAmount" }
  }}
])

// Solution 3: Process in chunks
db.orders.aggregate([
  { $match: { status: "delivered" } },
  { $sort: { createdAt: -1 } },
  { $limit: 1000 },  // Process in batches
  { $group: { ... } }
])
```

### Optimize Large $group Operations
```js
// ❌ Groups entire collection
{
  $group: {
    _id: "$category",
    total: { $sum: "$price" }
  }
}

// ✅ Filter before grouping
{ $match: { status: "active", stock: { $gt: 0 } } },
{
  $group: {
    _id: "$category",
    total: { $sum: "$price" }
  }
}

// ✅ Use $facet for multiple aggregations
{
  $facet: {
    priceStats: [
      { $group: { _id: "$category", avgPrice: { $avg: "$price" } } }
    ],
    stockStats: [
      { $group: { _id: "$category", totalStock: { $sum: "$stock" } } }
    ]
  }
}
```

---

## 🚀 Pipeline Optimization Strategies

### 1. Early Filtering Strategy
```js
// ❌ Bad - processes all data first
db.orders.aggregate([
  { $project: { customerId: 1, totalAmount: 1 } },
  { $group: { _id: "$customerId", total: { $sum: "$totalAmount" } } },
  { $match: { total: { $gt: 1000 } } }  // Filter too late!
])

// ✅ Good - filter early
db.orders.aggregate([
  { $match: { 
    status: "delivered",
    createdAt: { $gte: ISODate("2024-01-01") }
  }},
  { $project: { customerId: 1, totalAmount: 1 } },
  { $group: { _id: "$customerId", total: { $sum: "$totalAmount" } } },
  { $match: { total: { $gt: 1000 } } }
])
```

### 2. Index-Aware Pipeline Design
```js
// Design pipelines to use existing indexes
db.users.aggregate([
  // Uses index on role + status + lastLogin
  { $match: { 
    role: "customer", 
    status: "active",
    lastLogin: { $gte: ISODate("2024-03-01") }
  }},
  // Uses index on address.state for sorting
  { $sort: { "address.state": 1 } },
  { $group: { 
    _id: "$address.state",
    userCount: { $sum: 1 }
  }}
])
```

### 3. Progressive Data Reduction
```js
// Reduce data at each stage
db.products.aggregate([
  // Stage 1: Filter by status and category (uses index)
  { $match: { 
    status: "active", 
    category: "laptops",
    "ratings.average": { $gte: 4.0 }
  }},
  
  // Stage 2: Project only needed fields
  { $project: { 
    name: 1, 
    brand: 1, 
    price: 1,
    "ratings.count": 1 
  }},
  
  // Stage 3: Sort efficiently
  { $sort: { price: 1 } },
  
  // Stage 4: Limit before expensive operations
  { $limit: 1000 },
  
  // Stage 5: Final grouping
  { $group: { 
    _id: "$brand",
    avgPrice: { $avg: "$price" },
    totalReviews: { $sum: "$ratings.count" }
  }}
])
```

### 4. Avoid Unnecessary Stages
```js
// ❌ Redundant stages
db.orders.aggregate([
  { $match: { status: "delivered" } },
  { $project: { customerId: 1, totalAmount: 1 } },
  { $unwind: "$items" },  // Not needed if no array field
  { $group: { _id: "$customerId", total: { $sum: "$totalAmount" } } }
])

// ✅ Clean and efficient
db.orders.aggregate([
  { $match: { status: "delivered" } },
  { $project: { customerId: 1, totalAmount: 1 } },
  { $group: { _id: "$customerId", total: { $sum: "$totalAmount" } } }
])
```

---

## 🧩 `$facet`, `$bucket`, and `$lookup` Considerations

### `$facet`
Run multiple pipelines in parallel - resource intensive.

```js
// Dashboard analytics
{
  $facet: {
    userStats: [
      { $match: { role: "customer" } },
      { $group: { 
        _id: "$status", 
        count: { $sum: 1 } 
      }}
    ],
    productStats: [
      { $match: { status: "active" } },
      { $group: { 
        _id: "$category", 
        avgPrice: { $avg: "$price" } 
      }}
    ]
  }
}
```

### `$lookup`
Joins between collections - ensure indexes exist.

```js
// Optimized $lookup - filter first
{ $match: { status: "delivered" } },
{
  $lookup: {
    from: "users",
    localField: "customerId",
    foreignField: "_id", 
    as: "customer"
  }
}
```

---

## ✅ Summary

* **Memory Management**: Use `allowDiskUse`, limit `$push` operations, process in chunks
* **Operator Efficiency**: Choose memory-efficient operators, avoid unnecessary computations
* **Pipeline Strategy**: Filter early, use indexes, reduce data progressively
* **Monitor Performance**: Use `explain()`, set `maxTimeMS`, watch memory usage
* **Test at Scale**: Performance changes dramatically with data size

Aggregation pipelines are like SQL queries on steroids but *with great power comes great responsibility*. Structure them wisely.