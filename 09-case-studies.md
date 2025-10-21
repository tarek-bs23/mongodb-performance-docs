---
layout: default
title: "9. Case studies"
nav_order: 9
---

# 9. Case Studies and Real-World Examples

This section covers real scenarios where MongoDB performance was improved through query and schema optimization. These are based on actual issues I’ve faced in production not textbook examples. I’ll walk through before/after cases, show metrics, and share what I learned the hard way.

---

## 🐌 Case 1: Slow Query on Orders Collection

### ❌ Before Optimization

We had a query like this:

```js
db.orders.find({ status: "pending", createdAt: { $gte: ISODate("2023-01-01") } })
```

**Problem:**

* No index on `status` or `createdAt`
* Collection had ~5 million documents
* Query took ~2.5 seconds

### ✅ After Optimization

We added a compound index:

```js
db.orders.createIndex({ status: 1, createdAt: -1 })
```

**Result:**

* Query time dropped to ~120ms
* Index used: ✅
* CPU usage dropped during peak hours

### 📊 Metrics Comparison

| Metric         | Before  | After      |
| -------------- | ------- | ---------- |
| Execution Time | ~2500ms | ~120ms     |
| Index Used     | ❌ None  | ✅ Compound |
| CPU Spike      | High    | Normal     |

**Lesson Learned:**
Always index fields used in filters and sorts especially on high-traffic collections.

---

## 🧵 Case 2: Unbounded Array in User Activity

### ❌ Before Optimization

We had a `userActivity` document like this:

```js
{
  userId: "u123",
  actions: [ /* thousands of entries */ ]
}
```

**Problem:**

* Document size grew close to 16MB
* Reads were slow
* Writes failed intermittently due to size limit

### ✅ After Optimization

We moved `actions` to a separate collection:

```js
{
  userId: "u123",
  action: "login",
  timestamp: ISODate("...")
}
```

**Result:**

* No more size limit issues
* Queries became faster and more flexible
* Easier to archive old data

**Lesson Learned:**
Avoid unbounded arrays. Use separate collections for growing data like logs, comments, or activity.

---

## 🔍 Case 3: Inefficient Aggregation Pipeline

### ❌ Before Optimization

We had an aggregation to calculate monthly revenue:

```js
db.orders.aggregate([
  { $match: { status: "completed" } },
  { $group: { _id: { month: { $month: "$createdAt" } }, total: { $sum: "$amount" } } }
])
```

**Problem:**

* No index on `status` or `createdAt`
* Full collection scan
* Took ~4 seconds on 3M documents

### ✅ After Optimization

We added an index and pre-filtered by date range:

```js
db.orders.createIndex({ status: 1, createdAt: 1 })

db.orders.aggregate([
  { $match: { status: "completed", createdAt: { $gte: ISODate("2023-01-01") } } },
  { $group: { _id: { month: { $month: "$createdAt" } }, total: { $sum: "$amount" } } }
])
```

**Result:**

* Execution time dropped to ~300ms
* Index used
* Reduced server load

**Lesson Learned:**
Always match on indexed fields early in the pipeline. Aggregations benefit from good indexing too.

---

## ✅ Summary

* **Indexes** make a huge difference especially compound indexes on `filter + sort` fields.
* Avoid **unbounded arrays**, they break performance and scalability.
* Optimize **aggregation pipelines** by filtering early and indexing smartly.
* Measure before/after using `explain()` and server metrics, don’t guess.

Real-world MongoDB performance tuning is all about understanding your data, how it grows, and how it’s queried. Small changes can lead to big wins.
