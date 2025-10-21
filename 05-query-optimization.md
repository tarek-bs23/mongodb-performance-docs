# 5. Query Optimization Techniques

Writing queries that work is one thing. Writing queries that scale is another. When your app starts growing and your database gets bigger, even small inefficiencies can snowball into major performance issues.

Here are some practical techniques I use to optimize read queries in MongoDB.

---

## ⚡ Optimizing Read Queries

Start by asking: *What’s the minimum amount of data I need to retrieve?*

- **Use projections** to return only the fields you need:
  ```js
  db.users.find({ status: "active" }, { name: 1, email: 1, _id: 0 })
  ```

* **Use indexes** that match your query pattern. Always check with `explain()` to confirm index usage.

* **Avoid unnecessary sorting** unless you have an index that supports it:

  ```js
  db.orders.find({ customerId: "12345" }).sort({ orderDate: -1 })
  ```

  Make sure you have an index like `{ customerId: 1, orderDate: -1 }` to avoid in-memory sorts.

---

## 🚫 Avoiding Common Anti-Patterns

### 1. `$where`

Avoid using `$where` unless absolutely necessary. It runs JavaScript on every document **slow and dangerous**.

```js
// ❌ Bad
db.users.find({ $where: "this.age > 30" })

// ✅ Good
db.users.find({ age: { $gt: 30 } })
```

### 2. `$regex` Without Anchors

Regex can be useful, but avoid **unanchored patterns**  as they prevent index usage.

```js
// ❌ Bad: no index usage
db.products.find({ name: { $regex: "phone" } })

// ✅ Good: anchored regex can use index
db.products.find({ name: { $regex: "^phone" } })
```


### 3. Large `$in` Arrays

Using `$in` with a huge array can be slow and memory-intensive.

```js
// ⚠️ Be cautious with this
db.orders.find({ status: { $in: ["pending", "shipped", "cancelled", ...] } })
```

If possible, break it into smaller queries or rethink the logic.

---

## 📄 Pagination Strategies

### Using `skip` and `limit`

This is the most common approach, but it doesn’t scale well for large offsets.

```js
db.orders.find().skip(1000).limit(10)
```

**Problem:** MongoDB still scans the first 1000 documents before returning the next 10.

### Use Range-Based Pagination Instead

If you can, paginate using a range query on a field like `_id` or `createdAt`.

```js
db.orders.find({ _id: { $gt: ObjectId("...") } }).limit(10)
```

This is **much faster** and scales better, especially for **infinite scroll** or APIs.

---

## 🧾 Projection and Filtering

Always **project only the fields you need**. This reduces network load and memory usage.

```js
// ❌ Instead of this:
db.users.find({ status: "active" })

// ✅ Do this:
db.users.find({ status: "active" }, { name: 1, email: 1, _id: 0 })
```

Also, **filter early and filter smart**. The more specific your query, the less MongoDB has to scan.

---

## ✅ Summary

* Use `explain()` to understand what your query is really doing.
* Avoid anti-patterns like `$where`, unanchored `$regex`, and massive `$in` arrays.
* Prefer **range-based pagination** over `skip`.
* Always use **projections** to limit returned fields.
* Indexes are your best friend, make sure your queries are using them.

Optimizing queries isn’t just about speed, it’s about making your app **scalable, predictable, and efficient**.
