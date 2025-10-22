---
layout: default
title: "7. Aggregation optimization"
nav_order: 7
---

# 7. Aggregation Pipeline Optimization

The aggregation pipeline is one of MongoDB’s most powerful features but it can also be one of the easiest to misuse. If you’re not careful with how you structure your pipeline, performance can tank fast, especially on large datasets.

Here’s how I approach optimizing aggregation pipelines in real-world projects.

---

## 🧱 Pipeline Stage Ordering

The order of your pipeline stages matters a lot.

### ✅ Best Practice:
Put the most **restrictive** stages (like `$match`) as early as possible. This reduces the number of documents passed to later stages.

#### Example:
```js
db.orders.aggregate([
  { $match: { status: "shipped" } },
  { $project: { customerId: 1, total: 1 } },
  { $group: { _id: "$customerId", totalSpent: { $sum: "$total" } } }
])
```

**Why this works:**

* `$match` filters early
* `$project` reduces document size
* `$group` works on fewer, smaller documents

This is the ideal flow.

---

## ⚙️ `$match`, `$project`, `$group` Performance

### `$match`

Use it as early as possible. It can leverage indexes if placed at the beginning of the pipeline.

```js
{ $match: { status: "active" } }
```

### `$project`

Use it to remove unnecessary fields before heavy operations like `$group` or `$lookup`.

```js
{ $project: { name: 1, email: 1, _id: 0 } }
```

This reduces memory usage and improves performance.

### `$group`

This is often the most expensive stage. Make sure you’re grouping only what’s necessary, and try to reduce the input size before it.

---

## 🧩 `$facet`, `$bucket`, and `$lookup` Considerations

### `$facet`

Allows you to run multiple pipelines in parallel. Powerful, but resource-intensive.

```js
{
  $facet: {
    byStatus: [{ $match: { status: "active" } }, { $count: "total" }],
    byRegion: [{ $group: { _id: "$region", count: { $sum: 1 } } }]
  }
}
```

Use it when you need multiple aggregations in one go but avoid it on massive datasets unless you’ve filtered things down first.

---

### `$bucket`

Great for bucketing numeric or date values into ranges.

```js
{
  $bucket: {
    groupBy: "$age",
    boundaries: [0, 18, 30, 50, 100],
    default: "Other",
    output: { count: { $sum: 1 } }
  }
}
```

Make sure your boundaries make sense for your data distribution.

---

### `$lookup`

Used for joins. Powerful, but can be slow if not optimized.

```js
{
  $lookup: {
    from: "customers",
    localField: "customerId",
    foreignField: "_id",
    as: "customer"
  }
}
```

**Tips:**

* Ensure both `localField` and `foreignField` are indexed.
* Use `$lookup` after `$match` to reduce the number of documents being joined.

---

## ✅ Summary

* Always filter early with `$match`.
* Use `$project` to trim down documents before heavy stages.
* Be cautious with `$group`, `$facet`, and `$lookup`, they’re powerful but expensive.
* Use `explain("executionStats")` on your aggregation to see how it performs.
* Test with real data sizes as performance can change drastically at scale.

Aggregation pipelines are like SQL queries on steroids but with great power comes great responsibility. Structure them wisely.
