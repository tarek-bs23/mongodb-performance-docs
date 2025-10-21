# 4. Indexing Strategies

Indexing is one of the most powerful tools you have to improve MongoDB query performance. Without the right indexes, even a simple query can become painfully slow. But with the right ones, you can reduce query time from seconds to milliseconds.

Let’s break down the key indexing concepts and how to use them effectively.

---

## 🔢 Types of Indexes

### 1. Single Field Index
The most basic type. You create it on one field:

```js
db.orders.createIndex({ customerId: 1 })
```

Use this when you frequently filter or sort by a single field.


### 2. Compound Index

An index on multiple fields. **Order matters!**

```js
db.orders.createIndex({ customerId: 1, orderDate: -1 })
```

This is useful when your queries filter or sort on both fields. MongoDB can only use the index efficiently if your query starts with the **prefix** of the index.


### 3. Multikey Index

Automatically created when you index an **array field**:

```js
db.products.createIndex({ tags: 1 })
```

MongoDB indexes each element in the array. Great for fields like `["electronics", "sale"]`.


### 4. Text Index

Used for **full-text search** on string fields:

```js
db.articles.createIndex({ content: "text" })
```

Then you can run `$text` queries.
⚠️ Note: Only **one text index** is allowed per collection.


### 5. Geospatial Index

Used for **location-based queries**:

```js
db.places.createIndex({ location: "2dsphere" })
```

Perfect for apps that use maps, GPS, or need to find nearby places.

---

## 📝 Covered Queries

A **covered query** is one where MongoDB can return results **using only the index**, it doesn’t need to fetch the actual documents.

Example:

```js
db.orders.find({ customerId: "12345" }, { customerId: 1, _id: 0 })
```

If you have an index on `customerId`, and you're only projecting that field, MongoDB can serve the query **directly from the index**. This is extremely fast.

---

## 🎯 Index Selection and Cardinality

MongoDB’s query planner chooses the best index based on stats but not all indexes are created equal.

* **High cardinality** (lots of unique values) → great for filtering.
* **Low cardinality** (few unique values like `status: "active"`) → not very selective on its own, but useful in compound indexes.

Example:

```js
db.users.createIndex({ status: 1, createdAt: -1 })
```

This works well if you often query users by `status` and sort by `createdAt`.

---

## 🧠 Indexing Best Practices

* Use `explain()` to verify index usage.
* Don’t over-index. Each index adds **write overhead** and consumes **disk space**.
* Use **compound indexes** for multi-field queries, but be mindful of **field order**.
* Drop unused indexes with `db.collection.dropIndex()`.
* Use **partial indexes** when you only query a subset of documents.
* Monitor index usage with the **profiler** or **logs**.

---

## ✅ Summary

* MongoDB supports several index types - single field, compound, multikey, text, and geospatial, each optimized for specific query patterns.
* Use **compound indexes** wisely and in the correct order for multi-field queries.
* Aim for **covered queries** whenever possible for blazing-fast lookups.
* Balance between read performance and write cost **too many indexes** can slow down inserts and updates.
* Regularly **analyze, monitor, and prune** indexes to keep performance optimal.

A well-planned indexing strategy can turn a sluggish query into a lightning-fast one and that’s the real power of MongoDB indexing.
