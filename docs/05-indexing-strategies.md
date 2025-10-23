---
layout: default
title: "5. Indexing strategies"
nav_order: 5
---

# 5. Indexing Strategies

Indexing is one of the most powerful tools you have to improve MongoDB query performance. Without the right indexes, even a simple query can become painfully slow. But with the right ones, you can reduce query time from seconds to milliseconds.

Let’s break down the key indexing concepts and how to use them effectively.

---

## 🔢 Types of Indexes

### 1. Single Field Index
The most basic type. You create it on one field:

```js
// User lookup by email
db.users.createIndex({ email: 1 })

// Order lookup by customer
db.orders.createIndex({ customerId: 1 })

// Product lookup by category
db.products.createIndex({ category: 1 })
```

Use this when you frequently filter or sort by a single field.


### 2. Compound Index

An index on multiple fields. **Order matters!**

```js
// Efficient user queries by role and status
db.users.createIndex({ role: 1, status: 1 })

// Fast order history with sorting
db.orders.createIndex({ customerId: 1, createdAt: -1 })

// Product catalog filtering and sorting
db.products.createIndex({ category: 1, price: 1, ratings.average: -1 })
```

This is useful when your queries filter or sort on multiple fields. MongoDB can only use the index efficiently if your query starts with the prefix of the index.

### 3. Multikey Index

Automatically created when you index an **array field**:

```js
// Search products by tags
db.products.createIndex({ tags: 1 })

// Find blog posts by categories
db.blogPosts.createIndex({ tags: 1 })
```

MongoDB indexes each element in the array. Great for fields like [`"electronics", "sale"]` or `["mongodb", "tutorial"]`.


### 5. Text Index

Used for **full-text search** on string fields:

```js
// Search blog post content and titles
db.blogPosts.createIndex({ 
  title: "text", 
  content: "text" 
})

// Search product names and descriptions
db.products.createIndex({
  name: "text",
  description: "text"
})
```

Then you can run `$text` queries.
```js
db.blogPosts.find({ 
  $text: { $search: "mongodb performance" } 
})
```
>⚠️ Note: Only **one text index** is allowed per collection.



### 5. Geospatial Index
Used for **location-based queries**:

```js
// Find users by location
db.users.createIndex({ "address.location": "2dsphere" })

// Find nearby stores/warehouses
db.places.createIndex({ location: "2dsphere" })
```

Perfect for finding nearby users or store locations:
```js
// Find stores within 10km of coordinates
db.places.find({
  location: {
    $near: {
      $geometry: {
        type: "Point",
        coordinates: [-122.4194, 37.7749]
      },
      $maxDistance: 10000
    }
  }
})
```

### 🎯 **Additional Index Types**

### 6. Partial Index
Index only documents that match a filter:

```js
// Index only active products for faster queries
db.products.createIndex(
  { category: 1, price: 1 },
  { partialFilterExpression: { status: "active" } }
)

// Index only published blog posts
db.blogPosts.createIndex(
  { category: 1, publishedAt: -1 },
  { partialFilterExpression: { status: "published" } }
)
```

### 7. Sparse Index
Index only documents that contain the field:

```js
// Index users with phone numbers (not all users have phones)
db.users.createIndex(
  { phone: 1 },
  { sparse: true }
)
```

### 8. Unique Index
Enforce uniqueness on a field:

```js
// Ensure unique emails and order numbers
db.users.createIndex({ email: 1 }, { unique: true })
db.orders.createIndex({ orderNumber: 1 }, { unique: true })
db.products.createIndex({ sku: 1 }, { unique: true })
db.blogPosts.createIndex({ slug: 1 }, { unique: true })
```

### 9. TTL Index
Automatically expire documents after a time period:

```js
// Auto-delete user sessions after 30 days
db.sessions.createIndex(
  { createdAt: 1 },
  { expireAfterSeconds: 2592000 } // 30 days
)

// Remove old logs after 90 days  
db.logs.createIndex(
  { timestamp: 1 },
  { expireAfterSeconds: 7776000 } // 90 days
)
```
---

## ⚙️ Compound Index (with ESR Rule)

A **compound index** includes **multiple fields** in a single index and the **order of fields matters a lot** for performance.

MongoDB follows the **ESR rule**, which stands for:

> **E = Equality → S = Sort → R = Range**

This means:

* **Equality fields** should come **first** (e.g. `{ status: "active" }`)
* **Sort fields** should come **next** (e.g. `.sort({ createdAt: -1 })`)
* **Range fields** (e.g. `$gt`, `$lt`) should come **last**


### **Why ESR?**

When MongoDB creates a **compound index**, it stores documents in **sorted order** based on the sequence of fields in the index definition.

For example, an index like:

```js
{ category: 1, price: 1, ratings: -1 }
```

means documents are first sorted by `category`, then by `price`, then by `ratings`.

The **query planner** can efficiently use the index only if your query follows the same logical order. That’s where **ESR (Equality → Sort → Range)** helps. It ensures your index fields align with how queries actually work.

#### How MongoDB Uses ESR:

| Step             | Rule                              | What Happens                                                     |
| ---------------- | --------------------------------- | ---------------------------------------------------------------- |
| **E - Equality** | Match exact values (`=` or `$in`) | Narrows down search range early, reducing scanned index entries  |
| **S - Sort**     | Use `.sort()` on a field          | Uses the index’s internal sort order, avoiding in-memory sorting |
| **R - Range**    | Use `$gt`, `$lt`, `$gte`, `$lte`  | Defines the scanning window within the matched subset            |

Following ESR allows MongoDB to **scan only the relevant portion** of the index, no unnecessary reads, no in-memory sorts.

#### Example Visualization:

```
Index: [role, status, lastLogin]
Query: { role: "customer", status: "active" } + sort lastLogin

→ Jump directly to the "customer + active" section
→ Read documents already sorted by lastLogin
→ No full collection scan or sort needed ✅
```

If you break ESR (e.g., put `lastLogin` before `role` or `status`), MongoDB must scan large index chunks and sort results manually slowing down queries dramatically.

---

### Examples Following ESR Rule

#### User Management Queries

```js
// Query: Find active customers, sorted by last login
db.users.find({ 
  role: "customer",           // Equality
  status: "active"            // Equality
}).sort({ lastLogin: -1 })    // Sort

// Index following ESR:
db.users.createIndex({ 
  role: 1,           // E - Equality
  status: 1,         // E - Equality  
  lastLogin: -1      // S - Sort
})
```
<br>

#### **Order History with Date Range**

```js
// Query: Find delivered orders from last 30 days, newest first
db.orders.find({
  status: "delivered",                    // Equality
  createdAt: {                            // Range
    $gte: ISODate("2024-02-20"),
    $lte: ISODate("2024-03-21")
  }
}).sort({ createdAt: -1 })                // Sort

// Index following ESR:
db.orders.createIndex({
  status: 1,          // E - Equality
  createdAt: -1       // S - Sort (also handles the range efficiently)
})
// Note: When sort and range are on same field, put it in Sort position
```
<br>

#### **Product Catalog with Price Range**

```js
// Query: Find gaming laptops under $1000, sorted by rating
db.products.find({
  category: "laptops",                    // Equality
  tags: "gaming",                         // Equality (array match)
  price: { $lte: 1000 },                  // Range
  "ratings.average": { $gte: 4.0 }        // Range
}).sort({ "ratings.average": -1 })        // Sort

// Index following ESR:
db.products.createIndex({
  category: 1,               // E - Equality
  tags: 1,                   // E - Equality  
  "ratings.average": -1,     // S - Sort
  price: 1                   // R - Range
})
```

---

### ❌ Common ESR Violations & Fixes

#### Bad: Range before Equality

```js
// Query
db.orders.find({
  totalAmount: { $gt: 100 },    // Range
  status: "paid"                // Equality
})

// Bad index (Range before Equality)
db.orders.createIndex({ totalAmount: 1, status: 1 })

// Good index (Equality before Range)
db.orders.createIndex({ status: 1, totalAmount: 1 })
```
<br>

#### Bad: Range before Sort

```js
// Query
db.users.find({
  lastLogin: { $gte: ISODate("2024-03-01") }  // Range
}).sort({ email: 1 })                         // Sort

// Bad index (Range before Sort)
db.users.createIndex({ lastLogin: 1, email: 1 })

// Good: Use separate fields or restructure query
db.users.createIndex({ email: 1 }) // Better for sort-heavy queries
```
---

### Advanced ESR Scenarios

#### Multiple Equality Fields

```js
// Query with multiple equality conditions
db.orders.find({
  customerId: ObjectId("..."),    // Equality
  status: "delivered",            // Equality
  paymentStatus: "paid"           // Equality
}).sort({ deliveredAt: -1 })      // Sort

// Index: All equalities, then sort
db.orders.createIndex({
  customerId: 1,
  status: 1, 
  paymentStatus: 1,
  deliveredAt: -1
})
```
<br>

#### Same Field for Sort and Range

```js
// When the sort field also has a range filter
db.products.find({
  category: "phones",                    // Equality
  createdAt: {                           // Range + Sort field
    $gte: ISODate("2024-01-01")
  }
}).sort({ createdAt: -1 })               // Sort

// Put it in S position - handles both efficiently
db.products.createIndex({
  category: 1,          // E - Equality
  createdAt: -1         // S - Sort (handles range efficiently)
})
```

---

### ✅ ESR Rule Checklist

Before creating a compound index, ask:

1. **E** - What fields have exact matches (`=`, `$in`)?
2. **S** - What fields are used for sorting?
3. **R** - What fields have range queries (`$gt`, `$lt`)?

**Result:** Faster queries, less memory usage, and happy databases! 🚀

---

## 📝 Covered Queries

A **covered query** is one where MongoDB can return results **using only the index**, without fetching the full documents from disk.
This happens when:

1. All the **fields in the query** are included in the index.
2. All the **fields in the projection** are also part of that index.
3. You **don’t project `*` or unindexed fields**.

This makes the query **blazing fast** ⚡ since MongoDB doesn’t touch the collection data at all — it just reads from the index.



### Example 1: Users by Role

```js
// Query: Get all active customers’ roles (only using index)
db.users.find(
  { role: "customer", status: "active" },   // filter fields
  { role: 1, status: 1, _id: 0 }            // projected fields
)

// Matching index:
db.users.createIndex({ role: 1, status: 1 })
```

✅ This query is **covered** because both the filter and projection fields (`role`, `status`) exist in the index.
MongoDB doesn’t need to read the full documents.

<br>

###Example 2: Orders by Customer**

```js
// Query: Find order IDs for a specific customer
db.orders.find(
  { customerId: ObjectId("66e2a1b93d...") },   // filter field
  { customerId: 1, orderNumber: 1, _id: 0 }    // projected fields
)

// Matching index:
db.orders.createIndex({ customerId: 1, orderNumber: 1 })
```

✅ Covered because both `customerId` and `orderNumber` are indexed and projected — no collection scan needed.

<br>

### Example 3: Product Catalog Lookup

```js
// Query: Get category and price for all electronics
db.products.find(
  { category: "electronics" },        // filter field
  { category: 1, price: 1, _id: 0 }   // projected fields
)

// Matching index:
db.products.createIndex({ category: 1, price: 1 })
```

✅ Covered query — MongoDB serves the result entirely from the index.

<br>

### Not Covered Example

```js
db.users.find(
  { role: "admin" },
  { role: 1, email: 1, _id: 0 }   // ❌ email not in index
)
```

❌ Not covered because `email` is not part of the index — MongoDB must fetch documents to return that field.

<br>

### Key Takeaways

* **Include all filter + projection fields** in your index to make it “covered.”
* Don’t include unnecessary fields — it makes the index large and less efficient.
* Covered queries = faster reads, reduced I/O, and lower latency.

---

## 🎯 Index Selection and Cardinality

MongoDB's query planner chooses the best index based on stats but not all indexes are created equal.

* **High cardinality** (lots of unique values) → great for filtering.
* **Low cardinality** (few unique values like `status: "active"`) → not very selective on its own, but useful in compound indexes.

### Examples in the E-commerce Schema:

#### High Cardinality Fields:
```js
// Excellent for filtering - many unique values
db.users.createIndex({ email: 1 })           // Each email is unique
db.products.createIndex({ sku: 1 })          // Each SKU is unique
db.orders.createIndex({ orderNumber: 1 })    // Each order number is unique
```

#### Low Cardinality Fields (use in compounds):
```js
// Not selective alone, but good in compounds
db.users.createIndex({ status: 1, lastLogin: -1 })
// Good for: "Show me active users sorted by recent activity"

db.products.createIndex({ status: 1, category: 1, price: 1 })
// Good for: "Show me active laptops under $1000"

db.orders.createIndex({ status: 1, paymentStatus: 1, createdAt: -1 })
// Good for: "Show me paid orders that are processing, newest first"
```

#### Smart Compound Index Examples:
```js
// User queries by role + activity
db.users.createIndex({ role: 1, status: 1, lastLogin: -1 })

// Product catalog browsing
db.products.createIndex({ category: 1, brand: 1, price: 1 })

// Order history with filters
db.orders.createIndex({ customerId: 1, status: 1, createdAt: -1 })

// Blog post discovery
db.blogPosts.createIndex({ status: 1, category: 1, publishedAt: -1 })
```

---

## 🧠 Indexing Best Practices

- **Use `explain()`** to verify that MongoDB is using your intended index.
    ```js
    db.orders.find({ customerId: someId }).explain("executionStats")
    ```
- **Avoid over-indexing**, every index consumes disk and adds overhead to inserts and updates.

- **Compound indexes** shine when you query or sort on multiple fields. Always follow your most common query patterns.

- **Drop unused indexes**:
    ```js
    db.products.dropIndex("category_1_price_-1")
    ```

- **Partial indexes** are great for filtering only specific subsets, e.g.:
    ```js
    db.orders.createIndex(
    { createdAt: -1 },
    { partialFilterExpression: { status: "delivered" } }
    )
    ```
- **Monitor index usage** using:
    ```js
    db.collection.stats()
    db.serverStatus().metrics.queryExecutor
    ```
---

## ✅ Summary

* MongoDB supports several index types - single field, compound, multikey, text, and geospatial, each optimized for specific query patterns.
* Use **compound indexes** wisely and in the correct order for multi-field queries.
* Aim for **covered queries** whenever possible for blazing-fast lookups.
* Balance between read performance and write cost **too many indexes** can slow down inserts and updates.
* Regularly **analyze, monitor, and prune** indexes to keep performance optimal.

A well-planned indexing strategy can turn a sluggish query into a lightning-fast one and that’s the real power of MongoDB indexing.
