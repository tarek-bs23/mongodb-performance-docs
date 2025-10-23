---
layout: default
title: "Query optimization"
nav_order: 6
---

# Query Optimization Techniques

Writing queries that work is one thing. Writing queries that scale is another. When your app starts growing and your database gets bigger, even small inefficiencies can snowball into major performance issues.

Here are some practical techniques I use to optimize read queries in MongoDB.

---


## ⚡ Optimizing Read Queries

Start by asking: *What's the minimum amount of data I need to retrieve?*

- **Use projections** to return only the fields you need:
  ```js
  // Get only essential user info for display
  db.users.find(
    { status: "active" }, 
    { firstName: 1, lastName: 1, email: 1, lastLogin: 1, _id: 0 }
  )

  // Product listing - only display fields
  db.products.find(
    { category: "laptops", status: "active" },
    { name: 1, price: 1, brand: 1, "ratings.average": 1, _id: 0 }
  )

  // Order summary - minimal data for dashboard
  db.orders.find(
    { customerId: ObjectId("68f9debd1c054beae4a21226") },
    { orderNumber: 1, totalAmount: 1, status: 1, createdAt: 1, _id: 0 }
  )
  ```

* **Use indexes** that match your query pattern. Always check with `explain()` to confirm index usage:

  ```js
  // Verify index usage for user queries
  db.users.find({ 
    role: "customer", 
    status: "active",
    "address.state": "CA"
  }).explain("executionStats")

  // Check product search performance
  db.products.find({
    category: "phones",
    price: { $lte: 1000 },
    "ratings.average": { $gte: 4.0 }
  }).explain("executionStats")
  ```

* **Avoid unnecessary sorting** unless you have an index that supports it:

  ```js
  // User activity - recent first
  db.users.find({ role: "customer" })
    .sort({ lastLogin: -1 })
    .limit(50)

  // Ensure index: { role: 1, lastLogin: -1 }

  // Product catalog - price sorting
  db.products.find({ category: "laptops" })
    .sort({ price: 1 })
    .limit(20)

  // Ensure index: { category: 1, price: 1 }

  // Blog posts - newest first
  db.blogPosts.find({ status: "published" })
    .sort({ publishedAt: -1 })
    .limit(10)

  // Ensure index: { status: 1, publishedAt: -1 }
  ```

* **Use compound indexes** following ESR rule for complex queries:

  ```js
  // Orders by customer with status filter and date sorting
  db.orders.find({
    customerId: ObjectId("68f9debd1c054beae4a21226"),
    status: { $in: ["delivered", "shipped"] }
  }).sort({ createdAt: -1 })

  // Optimal index: { customerId: 1, status: 1, createdAt: -1 }
  // E: customerId (equality), E: status (equality), S: createdAt (sort)
  ```
---

## 🚫 Avoiding Common Anti-Patterns

### 1. `$where` Clauses

Avoid `$where` - it executes JavaScript on every document.

```js
// ❌ Slow - JavaScript execution
db.users.find({ $where: "this.lastLogin > new Date('2024-03-01')" })

// ✅ Fast - native query operators
db.users.find({ lastLogin: { $gt: ISODate("2024-03-01") } })
```

### 2. Unanchored `$regex`

Unanchored regex patterns prevent index usage.

```js
// ❌ No index usage
db.products.find({ name: { $regex: "gaming" } })

// ✅ Can use index
db.products.find({ name: { $regex: "^gaming" } })
```

### 3. Large `$in` Arrays

Huge `$in` arrays are memory-intensive and slow.

```js
// ⚠️ Problematic with large arrays
db.products.find({ 
  tags: { $in: ["gaming", "laptop", "budget", "premium", ...] } 
})

// ✅ Better: Restructure or use text search
db.products.find({ 
  $text: { $search: "gaming laptop" } 
})
```

---

## 📄 Pagination Strategies

### Using `skip` and `limit`

Simple but inefficient for large offsets:

```js
// ❌ Scans all skipped documents
db.orders.find()
  .skip(1000)
  .limit(10)
```

### Range-Based Pagination

Much faster using indexed fields:

```js
// ✅ Efficient - uses index seek
db.orders.find({ 
  _id: { $gt: ObjectId("68f9debd1c054beae4a21226") } 
}).limit(10)

// ✅ With date sorting
db.products.find({
  createdAt: { $lt: ISODate("2024-03-20T10:00:00Z") }
})
  .sort({ createdAt: -1 })
  .limit(20)
```

### For User Interfaces:

```js
// Infinite scroll - next page
db.products.find({ 
  category: "laptops",
  _id: { $gt: lastProductId } 
}).limit(25)

// Date-based pagination  
db.blogPosts.find({
  publishedAt: { $lt: lastPostDate }
})
  .sort({ publishedAt: -1 })
  .limit(10)
```
---

## 🧾 Projection and Filtering

Always return **only the fields you need** to reduce network load and memory usage.

```js
// ❌ Bad: fetches entire documents
db.users.find({ status: "active" })

// ✅ Good: fetch only necessary fields
db.users.find(
  { status: "active" },
  { firstName: 1, lastName: 1, email: 1, _id: 0 }
)
```

Also, **filter early and precisely** — the more selective your query, the fewer documents MongoDB scans.

```js
// Example: get delivered orders for a specific customer
db.orders.find(
  { customerId: ObjectId("..."), status: "delivered" },
  { orderNumber: 1, totalAmount: 1, _id: 0 }
)
```

✅ **Tip:** Combine smart filtering with projections and indexes for fastest queries.

--- 


## ✅ Summary

* Use `explain()` to understand what your query is really doing.
* Avoid anti-patterns like `$where`, unanchored `$regex`, and massive `$in` arrays.
* Prefer **range-based pagination** over `skip`.
* Always use **projections** to limit returned fields.
* Indexes are your best friend, make sure your queries are using them.

Optimizing queries isn’t just about speed, it’s about making your app **scalable, predictable, and efficient**.
