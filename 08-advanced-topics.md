---
layout: default
title: "8. Advanced topics"
nav_order: 8
---

# 8. Advanced Topics

Once your MongoDB setup is running smoothly, and you’ve nailed the basics, it’s time to look at some advanced topics that can make or break performance at scale. These are things I’ve had to deal with in real-world projects especially when working with large datasets, high traffic, or distributed systems.

---

## ⚙️ Sharding and Performance

**Sharding** is MongoDB’s way of scaling horizontally. Instead of one big server doing all the work, your data is split across multiple shards (servers), each handling a portion of the load.

### When to use sharding:
- Your dataset is too large for a single server  
- You’re hitting performance bottlenecks on reads/writes  
- You need high availability and scalability  

#### Example:
Let’s say you have a `logs` collection with billions of entries. You can shard it by `userId` or `region` to distribute the load.

```js
sh.enableSharding("analyticsDB")
db.logs.createIndex({ userId: 1 })
sh.shardCollection("analyticsDB.logs", { userId: 1 })
```

**Tips:**

* Pick a shard key that has high cardinality and is used in most queries.
* Avoid low-cardinality keys like `status: "active"`, they’ll cause uneven data distribution.

---

## 🚀 Caching Strategies

MongoDB doesn’t have built-in caching like Redis, but you can still reduce query load with smart caching.

### Common caching approaches:

* **App-level caching**: Use Redis to cache frequent queries
* **In-memory caching**: Store small, static datasets in memory (e.g., config, lookup tables)
* **TTL indexes**: Automatically expire temporary data

#### Example:

If you’re fetching product details that rarely change:

```js
// Cache in Redis for 10 minutes
redis.setex(`product:${productId}`, 600, JSON.stringify(productData))
```

**Real-world tip:**
Always invalidate the cache when the data changes. Stale cache = bad UX.

---

## 🧠 Query Plan Caching

MongoDB caches query plans to speed up repeated queries. This usually helps, but sometimes the cached plan isn’t optimal especially if your data distribution changes.

### How to inspect:

Use `explain("executionStats")` to see the query plan.

```js
db.orders.find({ status: "pending" }).explain("executionStats")
```

### If the plan is bad:

* Use `.hint()` to force a better index
* Clear the plan cache if needed

```js
db.orders.getPlanCache().clear()
```

**Pro tip:**
If a query suddenly slows down, check if the query plan changed or if the index stats are outdated.

---

## 📊 Working with Large Datasets

When your collections grow into the millions or billions, you need to be more careful with how you query and structure data.

### Best practices:

* **Index wisely**: Index fields used in filters and sorts
* **Avoid deep pagination**: Use range-based pagination instead of `.skip()`
* **Stream results**: Use cursors to process large datasets in chunks

#### Example:

Instead of this:

```js
db.logs.find().skip(10000).limit(100)
```

Do this:

```js
db.logs.find({ _id: { $gt: lastSeenId } }).limit(100)
```

### Aggregation tip:

Break complex pipelines into stages. Use `$merge` or `$out` to store intermediate results if needed.

---

## ✅ Summary

* Use **sharding** when your dataset or traffic outgrows a single server.
* Implement **caching** to reduce load and improve response times.
* Monitor and manage **query plan caching** to avoid performance regressions.
* Design queries and indexes carefully when working with **large datasets**.

These advanced techniques can help you scale MongoDB smoothly and keep performance in check especially when things get big and busy.
