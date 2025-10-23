---
layout: default
title: "09. Case studies"
nav_order: 09
---

# 9. Case Studies and Real-World Examples

This section covers real scenarios where MongoDB performance was improved through query and schema optimization. These are based on actual issues in production e-commerce applications. I'll walk through before/after cases, show metrics, and share what I learned the hard way.

---

## ⚠️ Performance Note

**Important:** The performance metrics and execution times shown in these examples are based on specific hardware configurations and may vary significantly on your system.

### Factors That Affect Performance:

- **CPU Power**: Faster processors execute queries more quickly
- **RAM Size**: More memory allows larger working sets and better caching
- **Storage Type**: SSDs vs HDDs dramatically impact I/O performance
- **MongoDB Version**: Different versions have different optimizations
- **Data Size**: Your actual dataset size will affect performance
- **System Load**: Other running processes can impact MongoDB performance
- **Network Latency**: For distributed setups, network speed matters

### Focus on Relative Improvements:

While absolute timings (ms) may differ on your hardware, the **relative improvements** and **optimization principles** remain consistent:

- A query that runs 10x faster on our test system will show similar proportional gains on yours
- Index usage patterns and execution plans behave the same way
- The same optimization strategies apply regardless of hardware

**Use these examples as guides for optimization approaches rather than absolute performance benchmarks.** Always test with your own data and hardware to establish meaningful baselines.

---

## 🐌 Case 1: Slow User Order History Query

### ❌ Before Optimization

Users complained about slow order history loading:

```js
db.orders.find({ 
  customerId: ObjectId("68f9debd1c054beae4a21226") 
}).sort({ createdAt: -1 })
```

**Problem:**
* No index on `customerId`
* Collection had ~10 million orders
* Query performed full collection scan
* Average execution time: ~2900ms
* High CPU during user login spikes

### ✅ After Optimization

Added compound index for customer orders:

```js
db.orders.createIndex({ customerId: 1, createdAt: -1 })
```

**Result:**
* Query time dropped to ~5ms
* Index used: ✅
* 98% reduction in order history load time
* Eliminated CPU spikes during peak hours

### 📊 Metrics Comparison

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| Execution Time | ~2900ms | ~5ms | 580x faster |
| Documents Examined | 10,000,000 | 23 | 434,782x fewer |
| CPU Usage | High spikes | Normal | Stable |

**Lesson Learned:** Always index foreign key fields that are frequently queried, especially with sorting.

---

## 🧵 Case 2: Product Search Performance Issues

### ❌ Before Optimization

Product catalog search was painfully slow:

```js
db.products.find({
  category: "laptops",
  price: { $lte: 1000 },
  "ratings.average": { $gte: 4.0 },
  status: "active"
}).sort({ "ratings.count": -1 })
```

**Problem:**
* No compound index covering all filter fields
* In-memory sort on large result sets
* Query time: ~1200ms for category searches
* Poor user experience during sales events

### ✅ After Optimization

Created targeted compound indexes:

```js
// For category browsing with filters
db.products.createIndex({ 
  category: 1, 
  status: 1, 
  price: 1,
  "ratings.average": -1 
})

// For rating-based sorting
db.products.createIndex({
  category: 1,
  status: 1, 
  "ratings.count": -1
})
```

**Result:**
* Query time reduced to ~45ms
* Eliminated in-memory sorts
* 95% faster product searches
* Handled Black Friday traffic without issues

### 📊 Performance Impact

| Scenario | Before | After |
|----------|--------|-------|
| Category Filter | 1200ms | 45ms |
| Sort by Rating | 850ms | 28ms |
| Peak Traffic | Timeouts | Normal |

**Lesson Learned:** Compound indexes should match your most common query patterns, including filter combinations and sort orders.

---

## 🔍 Case 3: Analytics Dashboard Aggregation Bottleneck

### ❌ Before Optimization

Admin dashboard loading slowly due to complex aggregation:

```js
db.orders.aggregate([
  {
    $match: {
      status: { $in: ["delivered", "shipped"] },
      createdAt: { $gte: ISODate("2024-01-01") }
    }
  },
  {
    $group: {
      _id: {
        month: { $month: "$createdAt" },
        status: "$status"
      },
      totalRevenue: { $sum: "$totalAmount" },
      orderCount: { $sum: 1 },
      avgOrderValue: { $avg: "$totalAmount" }
    }
  },
  { $sort: { "_id.month": 1 } }
])
```

**Problem:**
* No index on `status` + `createdAt`
* Processing 1.8M documents every dashboard load
* Execution time: ~8 seconds
* Database locks during business hours

### ✅ After Optimization

**Solution 1:** Added proper indexing
```js
db.orders.createIndex({ status: 1, createdAt: -1 })
```

**Solution 2:** Implemented pre-computed aggregates
```js
// Daily summary collection
{
  _id: ObjectId(),
  date: ISODate("2024-03-21"),
  metrics: {
    totalRevenue: 45289.99,
    orderCount: 342,
    deliveredOrders: 298,
    shippedOrders: 44
  },
  updatedAt: ISODate("2024-03-22T00:05:00Z")
}
```

**Result:**
* Dashboard load time: ~120ms (from 8000ms)
* Real-time data with 5-minute freshness
* 99% reduction in database load
* No more locking during business hours

### 📊 Aggregation Performance

| Approach | Execution Time | Database Load | Freshness |
|----------|----------------|---------------|-----------|
| Real-time Aggregation | 8000ms | Very High | Real-time |
| Pre-computed Aggregates | 120ms | Minimal | 5 minutes |

**Lesson Learned:** For frequently accessed analytics, pre-computation beats real-time aggregation every time.

---

## 💸 Case 4: Shopping Cart Performance Under Load

### ❌ Before Optimization

Shopping cart operations during flash sales:

```js
// Cart document structure
{
  _id: ObjectId(),
  userId: ObjectId("507f1f77bcf86cd799439011"),
  items: [
    {
      productId: ObjectId("68f9debd1c054beae4a21227"),
      name: "Gaming Laptop Pro",
      price: 1299.99,
      quantity: 1,
      // ... 15 more fields
    }
    // ... up to 50 items
  ],
  // ... 25 other cart fields
}
```

**Problem:**
* Large cart documents (approaching 16MB)
* Frequent document rewrites for cart updates
* Write conflicts during high concurrency
* 45% cart abandonment during sales

### ✅ After Optimization

**Solution:** Separated cart items into own collection
```js
// carts collection (minimal)
{
  _id: ObjectId(),
  userId: ObjectId("507f1f77bcf86cd799439011"),
  updatedAt: ISODate("2024-03-21T14:30:00Z"),
  itemCount: 3,
  totalAmount: 1899.99
}

// cart_items collection
{
  _id: ObjectId(),
  cartId: ObjectId(),
  productId: ObjectId("68f9debd1c054beae4a21227"),
  quantity: 1,
  addedAt: ISODate("2024-03-21T14:25:00Z")
}
```

**Result:**
* Cart update time: 15ms (from 450ms)
* Zero document size issues
* 80% reduction in cart abandonment during sales
* Better concurrent update handling

### 📊 Cart Performance

| Metric | Before | After |
|--------|--------|-------|
| Update Time | 450ms | 15ms |
| Document Size | ~12MB | ~2KB |
| Concurrent Updates | Conflicts | Smooth |
| Abandonment Rate | 45% | 9% |

**Lesson Learned:** Separate large, frequently updated arrays into their own collections to avoid document size issues and write conflicts.

---

## 📈 Case 5: User Location-Based Queries

### ❌ Before Optimization

Finding nearby stores was slow:

```js
db.places.find({
  type: "store",
  status: "open"
})
// Application-side distance calculation - very slow!
```

**Problem:**
* Client-side distance calculations
* Loading all stores then filtering
* Query time: ~900ms
* High bandwidth usage

### ✅ After Optimization

Implemented geospatial indexing and queries:

```js
// Added geospatial index
db.places.createIndex({ location: "2dsphere" })

// Using MongoDB geospatial query
db.places.find({
  location: {
    $near: {
      $geometry: {
        type: "Point",
        coordinates: [-122.4194, 37.7749]
      },
      $maxDistance: 10000 // 10km
    }
  },
  type: "store",
  status: "open"
})
```

**Result:**
* Query time: ~12ms (from 900ms)
* 99% less data transferred
* Accurate distance calculations
* Better user experience

### 📊 Geospatial Performance

| Approach | Time | Data Transfer | Accuracy |
|----------|------|---------------|----------|
| Client-side | 900ms | High | Good |
| Server-side | 12ms | Minimal | Excellent |

**Lesson Learned:** Use MongoDB's built-in geospatial features instead of client-side calculations.

---

## ✅ Summary

* **Index Strategically**: Compound indexes on common query patterns provide massive performance gains
* **Pre-compute Aggregates**: Real-time aggregation doesn't scale for frequently accessed data
* **Avoid Large Documents**: Separate unbounded arrays and large subdocuments into their own collections
* **Use Native Features**: Leverage MongoDB's geospatial, text search, and other built-in capabilities
* **Monitor and Measure**: Use `explain()` and performance metrics to identify bottlenecks

**Key Takeaways:**
1. A single well-designed index can improve performance by 100x
2. Schema design should evolve with query patterns
3. Pre-computation is often better than real-time calculation
4. MongoDB's specialized features solve common problems efficiently

Real-world optimization requires understanding both your data and how your application uses it. Small, targeted changes often deliver the biggest impact.