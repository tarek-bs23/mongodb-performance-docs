---
layout: default
title: MongoDB Internals
nav_order: 3
has_children: false
permalink: /mongodb-internals
---

# 2. Understanding MongoDB Internals

This section explains how MongoDB works under the hood how it stores data, executes queries, and manages memory and disk through its storage engine. Knowing this helps you write smarter queries and design better schemas that actually perform well in production.

---

## 🧱 How MongoDB Stores Data (BSON, Documents, Collections)

MongoDB uses a flexible, **document-oriented** model. Instead of rows and tables like SQL, it stores data as **documents** inside **collections**, using a binary format called **BSON (Binary JSON)**.


### 📦 BSON - Binary JSON

BSON is MongoDB’s internal storage format. It’s similar to JSON but stored in **binary**, making it:
- Faster to read and write  
- More efficient for complex data types (like `Date`, `ObjectId`, or `Binary`)  
- Compact and optimized for indexing  

Think of BSON as **“JSON, but made for performance.”**

Example document from a `devProfiles` collection (shown as JSON for readability):

```json
{
  _id: ObjectId("6534f1b87c5a2a1c4b2e12d3"),
  name: "Tarek",
  title: "Software Engineer II",
  techStack: ["MongoDB", "Node.js", "TypeScript"],
  location: {
    city: "Dhaka",
    country: "Bangladesh"
  },
  joinedAt: ISODate("2024-03-15T10:00:00Z")
}
```

This document is stored internally as BSON, making it fast to query and index.


### 🧩 Documents

A **document** is the basic unit of data in MongoDB similar to a row in SQL, but much more flexible. Each document is a self-contained object with fields and values, and structures can vary across documents within the same collection.

Example from a `projects` collection:

```json
// Document 1
{
  name: "MongoDB Performance Guide",
  owner: "Tarek",
  tags: ["MongoDB", "Optimization", "Documentation"],
  status: "In Progress"
}

// Document 2
{
  name: "Design System Revamp",
  leadDesigner: "Abir",
  toolsUsed: ["Figma", "Sketch"],
  status: "Completed"
}
```

MongoDB doesn’t enforce a fixed schema, which allows fast iteration but it also means **you need to design your schema carefully** to avoid performance issues and inconsistency.



### 🗂 Collections

A **collection** is a group of related documents like a table in SQL, but without fixed columns.

Example:

```js
// Create a collection
db.createCollection("projects")

// Insert documents
db.projects.insertMany([
  { name: "MongoDB Performance Guide", owner: "Tarek" },
  { name: "Design System Revamp", leadDesigner: "Abir" }
])
```

Now, the `projects` collection holds both documents, each with its own structure. This flexibility is powerful but it’s up to you to keep things **consistent** and **queryable**.

---

## ⚙️ How MongoDB Executes Queries

When you run a query in MongoDB, it doesn’t just scan the entire collection (unless it has to). MongoDB uses a **query planner** to figure out the most efficient way to return your data.

Example:

```js
db.orders.find({ customerId: "12345" })
```

MongoDB checks:

* Are there any indexes on `customerId`?
* Which index (if multiple) would return the fewest documents?
* What’s the most efficient path to get the result?

If there’s a good index, MongoDB will use it. If not, it falls back to a **collection scan** meaning it checks every document, which is slow and expensive.

---

## 🧠 Query Planner and Execution Stages

MongoDB’s query planner evaluates multiple query plans and picks the best one based on cost (CPU, I/O, and memory).
You can see this in action using:

```js
db.orders.find({ customerId: "12345" }).explain("executionStats")
```

This will show details such as:

* Which index (if any) was used
* How many documents were scanned vs. returned
* Execution time in milliseconds

#### Example Output (Simplified)

```json
{
  "executionStats": {
    "executionTimeMillis": 8,
    "totalDocsExamined": 1,
    "totalKeysExamined": 1,
    "executionStages": {
      "stage": "FETCH",
      "inputStage": {
        "stage": "IXSCAN",
        "indexName": "customerId_1"
      }
    }
  }
}
```

This tells us MongoDB used an **index scan** (`IXSCAN`) followed by a **fetch** stage to retrieve the document that’s efficient.
If you see `COLLSCAN`, it means MongoDB scanned the entire collection, which is a 🚩 **red flag for performance**.

---

## 🗄️ Storage Engine Basics (WiredTiger)

MongoDB uses **WiredTiger** as its default storage engine (since version 3.2). It’s the core component responsible for how data is stored, retrieved, and managed in memory and on disk.


### What is WiredTiger?

WiredTiger is a high-performance, concurrent, and extensible storage engine designed for modern workloads.
It manages:

* **Data storage** (how documents are written to disk)
* **Index storage**
* **Caching**
* **Concurrency control**

Think of it as the **engine under the hood** that keeps MongoDB fast, efficient, and scalable.


### Why WiredTiger Matters

Before WiredTiger, MongoDB used a simpler engine called **MMAPv1**, which had major limitations like collection-level locking and no compression. WiredTiger introduced key improvements:

* **Document-level locking** → Multiple operations can happen in parallel
* **Compression** → Reduces disk space for both data and indexes
* **Write-ahead logging (journaling)** → Ensures durability and crash recovery
* **Memory-efficient caching** → Uses a portion of RAM (typically 50%) to cache frequently accessed data


### How It Works (Simplified)

When you query MongoDB:

1. WiredTiger checks if the data is already in memory (cache).
2. If yes → it serves it directly — **fast**.
3. If not → it reads from disk and loads it into cache — **slower**.

This is why **having a working set that fits in RAM** is crucial for performance.

You can monitor cache usage with:

```js
db.serverStatus().wiredTiger.cache
```

---

### ⚠️ Real-World Tip

If your queries are slow even with proper indexes, your data might be **too large to fit in memory**.
In that case, MongoDB has to read from disk more often — which is much slower and increases latency.

---

## ✅ Summary

* MongoDB stores data as **BSON documents** inside **collections** flexible but requires careful schema design.
* The **query planner** chooses the most efficient path using indexes and cost estimation.
* Use `explain("executionStats")` to inspect query performance avoid `COLLSCAN`.
* **WiredTiger** is the default storage engine. It handles compression, caching, and concurrency.
* If performance drops, check whether your **working set fits in RAM** as disk reads are expensive.

Understanding these internals helps you write faster queries and build MongoDB systems that actually scale in the real world.
