---
layout: default
title: "3. Monitoring and profiling"
nav_order: 3
---

# 3. Monitoring and Profiling Tools

When you're trying to figure out why a MongoDB query is slow, you need more than just intuition, you need **visibility**. MongoDB gives us several tools to monitor, profile, and understand what’s happening under the hood.

---

## 🧪 Using `explain()` and Interpreting Output

This is your first line of defense when debugging a slow query.

```js
db.orders.find({ customerId: "12345" }).explain("executionStats")
```

This command shows how MongoDB plans to execute the query and what actually happened during execution.

### What to Look for in `explain("executionStats")`

When analyzing query performance using `explain("executionStats")`, here are the key fields to focus on:

* **stage**:
  Indicates the type of operation MongoDB used to execute the query.

  * If you see `"COLLSCAN"`, it means a full collection scan. Usually a sign that an index is missing or not being used.

* **nReturned**:
  The number of documents returned by the query.

* **totalDocsExamined**:
  The number of documents MongoDB had to scan to return the result.

  * Ideally, this should be close to `nReturned`. A large gap means inefficiency.

* **executionTimeMillis**:
  The total time (in milliseconds) MongoDB took to execute the query.

  * Lower is better, but context matters. A fast query that scans millions of documents may still be a problem under load.

### Example Output

Here’s a simplified example of what `explain("executionStats")` might return:

```json
{
  "queryPlanner": {
    "plannerVersion": 1,
    "namespace": "ecommerce.orders",
    "indexFilterSet": false,
    "parsedQuery": {
      "customerId": {
        "$eq": "12345"
      }
    },
    "winningPlan": {
      "stage": "FETCH",
      "inputStage": {
        "stage": "IXSCAN",
        "indexName": "customerId_1",
        "direction": "forward"
      }
    }
  },
  "executionStats": {
    "executionSuccess": true,
    "nReturned": 1,
    "executionTimeMillis": 6,
    "totalKeysExamined": 1,
    "totalDocsExamined": 1
  }
}
```

This tells us:

* MongoDB used the `customerId_1` index `(IXSCAN)`
* Only one document was examined and returned
* The query completed in 6ms which is very efficient

---

## 🖥️ MongoDB Compass Performance Tab

If you're more visual, **MongoDB Compass** is a great GUI tool. It shows:

* Query execution plans
* Index usage
* Query duration
* Index suggestions

You can paste your query into the "Aggregations" or "Filter" tab and click "**Explain Plan**" to see a visual breakdown of how MongoDB will execute it. This is super helpful when you're trying to explain performance issues to non-technical stakeholders or teammates who prefer visuals.

---

## 📋 Query Profiler and Logs

MongoDB has a built-in query profiler that logs slow operations.

You can enable it like this:

```js
db.setProfilingLevel(1, { slowms: 50 }) // Log queries slower than 50ms
```

Then check the logs:

```js
db.system.profile.find().sort({ ts: -1 }).limit(5).pretty()
```

This gives you a snapshot of what’s been running slowly including the query, execution time, and which indexes were used. You can also check the logs in your MongoDB log file (usually in ***/var/log/mongodb/mongod.log***), which includes slow query logs and warnings.

---

## 🧠 Performance Advisor (MongoDB Atlas Only)

If you're using **MongoDB Atlas**, you get access to the **Performance Advisor** — a built-in tool that:

* Analyzes slow queries
* Recommends indexes
* Shows query patterns over time

It’s like having a junior DBA watching your queries 24/7 and suggesting improvements.
While this guide focuses on local MongoDB, it’s worth knowing that Atlas gives you a lot of performance insights out of the box.

---

## ✅ Summary

Use these tools together:

* Start with explain() to understand query plans.
* Use Compass for visual analysis.
* Enable the profiler to catch slow queries in real-time.
* If you're on Atlas, let the Performance Advisor help you out.

These tools will help you move from guessing to knowing what’s slowing your queries down and how to fix it.