---
layout: default
title: "3. MongoDB Internals"
nav_order: 3
---

# 3. Understanding MongoDB Internals

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

##### Example:

```javascript
// What you write in JavaScript:
const user = {
  _id: ObjectId("507f1f77bcf86cd799439011"),
  name: "Alice",
  email: "alice@example.com",
  age: 30,
  profile: {
    title: "Software Engineer",
    department: "engineering"
  },
  skills: ["javascript", "nodejs", "mongodb"],
  createdAt: new Date("2024-01-15"),
  status: "active"
}

// How MongoDB actually stores it (conceptually):
<BSON Document>:
  - _id: ObjectId (12 bytes)
  - name: String (5 bytes + "Alice")
  - email: String (16 bytes + "alice@example.com")
  - age: Int32 (4 bytes + value 30)
  - profile: Embedded Document (nested BSON)
  - skills: Array (overhead + three strings)
  - createdAt: Date (8 bytes + timestamp)
  - status: String (6 bytes + "active")
```

This document is stored internally as BSON, making it fast to query and index.




### 🧩 Documents

A **document** is the basic unit of data in MongoDB similar to a row in SQL, but much more flexible. Each document is a self-contained object with fields and values, and structures can vary across documents within the same collection.

Example document in a `users` collection: 
```javascript
{
  _id: ObjectId("507f1f77bcf86cd799439011"),
  email: "alice@example.com",
  name: "Alice Smith",
  profile: {
    title: "Senior Software Engineer",
    department: "engineering",
    level: "IC4"
  },
  skills: ["javascript", "nodejs", "mongodb", "react"],
  employment: {
    hireDate: ISODate("2022-03-15T00:00:00Z"),
    status: "active",
    type: "full_time"
  },
  createdAt: ISODate("2024-01-15T10:30:00Z"),
  lastLogin: ISODate("2024-01-20T14:22:00Z")
}
```

**Key Document characteristics:**
- **Field-value pairs**: Like a JavaScript object
- **Flexible schema**: No two documents need the same fields
- **Nested documents**: Can embed objects and arrays  
- **16MB size limit**: Documents can't exceed 16 megabytes

MongoDB doesn’t enforce a fixed schema, which allows fast iteration but it also means **you need to design your schema carefully** to avoid performance issues and inconsistency.



### 🗂 Collections

A **collection** is a group of related documents like a table in SQL, but without fixed columns.

Example:

```javascript
// A 'users' collection might contain documents like:

// Document 1 - Engineering lead
{
  _id: ObjectId("507f1f77bcf86cd799439011"),
  email: "alice@example.com",
  name: "Alice Smith",
  profile: {
    title: "Engineering Manager",
    department: "engineering"
  },
  employment: {
    hireDate: ISODate("2020-06-01T00:00:00Z"),
    status: "active"
  }
}

// Document 2 - Individual contributor  
{
  _id: ObjectId("507f1f77bcf86cd799439012"),
  email: "bob@example.com", 
  name: "Bob Johnson",
  profile: {
    title: "Senior Software Engineer",
    department: "engineering",
    level: "IC4"
  },
  skills: ["python", "docker", "aws"],
  employment: {
    hireDate: ISODate("2021-09-15T00:00:00Z"),
    status: "active",
    manager_id: ObjectId("507f1f77bcf86cd799439011")
  }
}

// Document 3 - Different department, different fields
{
  _id: ObjectId("507f1f77bcf86cd799439013"),
  email: "carol@example.com",
  name: "Carol Davis", 
  profile: {
    title: "Product Manager",
    department: "product",
    portfolio: ["mobile", "web-platform"]
  },
  employment: {
    hireDate: ISODate("2023-01-10T00:00:00Z"),
    status: "active"
  }
}
```

**Collection behavior:**
- **No schema enforcement**: Documents can have different structures
- **Dynamic fields**: Add new fields anytime without migrations  
- **Indexable**: Create indexes on any field, even nested ones
- **Capped options**: Can limit collection size for logging scenarios

Now, the `users` collection holds all documents, each with its own structure. This flexibility is powerful but it’s up to you to keep things **consistent** and **queryable**.

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
2. If yes → it serves it directly(**faster**).
3. If not → it reads from disk and loads it into cache(**slower**).

This is why **having a working set that fits in RAM** is crucial for performance.

You can monitor cache usage with:

```javascript
// Monitor cache usage
db.serverStatus().wiredTiger.cache

// Example output:
{
  "bytes currently in the cache": 25684984,
  "maximum bytes configured": 515396075,
  "pages read into cache": 15422,
  "pages read from cache": 892244
}
```

### Real Example: Cache Impact on Query Performance

```javascript
// Query: Find active engineering users
db.users.find({
  "profile.department": "engineering",
  "employment.status": "active"
})
```

| Scenario                | Execution Time | Source    |
|------------------------|---------------|-----------|
| **With data in cache** | ~5 ms         | Memory    |
| **With data on disk**  | ~50 ms        | Disk I/O  |

---


## ⚙️ How MongoDB Executes Queries

When you run a query in MongoDB, it doesn't just scan the entire collection (unless it has to). MongoDB uses a **query planner** to figure out the most efficient way to return your data.

### The Query Execution Pipeline

```
Query → Query Parser → Query Optimizer → Execution Engine → Storage Engine → Results
```

Let's break down what happens at each stage with our `users` collection example.

### Step 1: Query Parsing - "What Do You Want?"

The parser validates your query syntax and converts it into an internal representation.

```javascript
// query
db.users.find({
  "profile.department": "engineering",
  "employment.status": "active", 
  "profile.level": "IC4"
}).sort({ "employment.hireDate": -1 }).limit(10)=
```
The parser checks:
- Is the JSON valid?
- Are the operators supported? 
- Is the collection name correct?

If you have **syntax errors**, this is where it fails fast.

### Step 2: Query Optimization - "What's the Best Way?"

This is where the magic happens. The optimizer acts like a smart GPS that considers all possible routes to your data and picks the fastest one.

#### The Optimization Process - Thinking Like MongoDB

Let's break down how the optimizer evaluates the query:

**Query:**
```javascript
db.users.find({
  "profile.department": "engineering",     // Equality filter
  "employment.status": "active",           // Equality filter  
  "profile.level": "IC4"                   // Equality filter
}).sort({ "employment.hireDate": -1 })     // Sort requirement
```

**Available Indexes:**
```javascript
// Index 1: Covers department + status
{ "profile.department": 1, "employment.status": 1 }

// Index 2: Covers level only  
{ "profile.level": 1 }

// Index 3: Covers department + sort field
{ "profile.department": 1, "employment.hireDate": -1 }

// Index 4: Covers status + sort field
{ "employment.status": 1, "employment.hireDate": -1 }
```

**The Optimizer's Decision Matrix:**

| Candidate Plan | Pros | Cons | Viability |
|----------------|------|------|-----------|
| **Index 1**<br/>`dept + status` | ✅ Handles 2 equality filters<br/>✅ Reduces dataset early | ❌ Still needs to sort<br/>❌ Must filter `level` manually | 🟢 **HIGH** |
| **Index 3**<br/>`dept + hireDate` | ✅ Handles 1 equality + sort<br/>✅ No in-memory sort needed | ❌ Must filter `status` & `level`<br/>❌ May scan more documents | 🟡 **MEDIUM** |
| **Index 2**<br/>`level only` | ✅ Handles 1 equality filter | ❌ Must filter `dept` & `status`<br/>❌ Requires in-memory sort | 🔴 **LOW** |
| **COLLSCAN**<br/>Full scan | ✅ Always works | ❌ Scans ALL documents<br/>❌ Slowest option | 🔴 **LAST RESORT** |

**The Winner: Index 1** 🏆

**Why Index 1 Wins:**
- Eliminates 90% of documents with two equality filters first
- The remaining dataset is small enough that in-memory sort is cheap
- Most selective approach for the query predicates

#### How to See the Optimization Process in Action

```javascript
// Get the full optimization story
const explanation = db.users.explain("allPlansExecution").find({
  "profile.department": "engineering",
  "employment.status": "active", 
  "profile.level": "IC4"
}).sort({ "employment.hireDate": -1 }).limit(10)
```

**What You'll See in the Output:**

```javascript
{
  "queryPlanner": {
    "winningPlan": {
      "stage": "FETCH",
      "filter": {
        "profile.level": { "$eq": "IC4" }
      },
      "inputStage": {
        "stage": "IXSCAN",
        "indexName": "profile.department_1_employment.status_1",  // 🏆 Winner!
        "keyPattern": {
          "profile.department": 1,
          "employment.status": 1
        }
      }
    },
    "rejectedPlans": [  // 📝 The other candidates considered
      {
        "stage": "FETCH", 
        "filter": {
          "employment.status": { "$eq": "active" },
          "profile.level": { "$eq": "IC4" }
        },
        "inputStage": {
          "stage": "IXSCAN",
          "indexName": "profile.department_1_employment.hireDate_-1",  // Index 3
          "reason": "Lost to better index for equality filters"
        }
      },
      {
        "stage": "SORT",  // Required in-memory sort
        "inputStage": {
          "stage": "IXSCAN", 
          "indexName": "profile.level_1",  // Index 2
          "reason": "Poor selectivity and requires sorting"
        }
      }
    ]
  },
  "executionStats": {
    "nReturned": 8,
    "executionTimeMillis": 12,
    "totalKeysExamined": 142,
    "totalDocsExamined": 142,
    "executionStages": {
      "stage": "FETCH",
      "nReturned": 8,
      "works": 143,
      "advanced": 8,
      "inputStage": {
        "stage": "IXSCAN",
        "nReturned": 142,
        "works": 143
      }
    }
  }
}
```

**Key Insights from the Output:**

- **`winningPlan`**: The chosen execution path (Index 1)
- **`rejectedPlans`**: Other indexes that were tested but performed worse  
- **`executionStats`**: Real performance metrics for the winning plan
- **`nReturned` vs `totalDocsExamined`**: Efficiency ratio (8 results from 142 docs examined)

**Pro Tip:** Look for large gaps between `nReturned` and `totalDocsExamined` - this indicates the query is examining many documents but returning few, which suggests index improvements are needed.

This visualization helps you understand exactly why MongoDB chose a particular execution path and what alternatives were considered!


### Step 3: Execution Engine - "Getting the Job Done"

The execution engine carries out the chosen plan by combining different "stages". Think of these as Lego blocks that snap together to process your data.

#### Common Execution Stages

```javascript
// Example execution plan for our query
{
  "stage": "FETCH",
  "inputStage": {
    "stage": "IXSCAN",        // Using index scan
    "indexName": "profile.department_1_employment.status_1",
    "keyPattern": {
      "profile.department": 1,
      "employment.status": 1
    }
  },
  "filter": {                 // Additional filtering after index scan
    "profile.level": { "$eq": "IC4" }
  }
}
```

**Key Stages Explained:**

- **`COLLSCAN`**: The boogeyman. Scans every document in the collection.
  ```javascript
  "stage": "COLLSCAN"  // This is what you DON'T want to see
  ```

- **`IXSCAN`**: The hero. Scans only the index entries.
  ```javascript
  "stage": "IXSCAN",
  "indexName": "email_1"  // Using the email index
  ```

- **`FETCH`**: Retrieves full documents after finding them via index.
  ```javascript
  "stage": "FETCH",
  "inputStage": {
    "stage": "IXSCAN"  // IXSCAN finds pointers, FETCH gets the actual docs
  }
  ```

- **`SORT`**: Sorts results in memory (can be expensive!).
  ```javascript
  "stage": "SORT"  // Memory-intensive, especially for large result sets
  ```

### Step 4: Storage Engine (WiredTiger) - "Getting the Raw Data"

WiredTiger is where your data actually lives on disk. It handles:
- Reading data from disk/memory
- Managing memory cache  
- Handling concurrency (multiple reads/writes)
- Compression

What happens during a query:
 1. Check cache: Is the data/index already in memory?
 2. If not, read from disk (much slower)
 3. Apply any compression/decompression  
 4. Return data to execution engine

This is why your "working set" (frequently accessed data) should fit in RAM for optimal performance


### Real Example: The Difference Between Good and Bad

Let's see two different execution paths for the same query.

#### The Slow Way (Bad Plan)

```javascript
// Query: Find active engineering users at IC4 level, sorted by hire date
db.users.find({
  "profile.department": "engineering",
  "employment.status": "active",
  "profile.level": "IC4"
}).sort({ "employment.hireDate": -1 })

// Bad execution plan (no suitable index):
{
  "stage": "SORT",            // Expensive in-memory sort
  "inputStage": {
    "stage": "COLLSCAN",      // Worst case - full collection scan
    "filter": {               // Filtering during the scan
      "profile.department": { "$eq": "engineering" },
      "employment.status": { "$eq": "active" },
      "profile.level": { "$eq": "IC4" }
    }
  }
}
```

Performance impact:
 - Scans ALL documents (e.g., 50,000 employee records)
 - Sorts ALL matching documents in memory  
 - Slow and memory-intensive


#### The Fast Way (Good Plan)

```javascript
// Same query with proper index
db.users.createIndex({ 
  "profile.department": 1, 
  "employment.status": 1, 
  "employment.hireDate": -1 
})

// Good execution plan:
{
  "stage": "FETCH",
  "filter": {                 // Only need to filter level
    "profile.level": { "$eq": "IC4" }
  },
  "inputStage": {
    "stage": "IXSCAN",        // Using our compound index
    "indexName": "profile.department_1_employment.status_1_employment.hireDate_-1",
    "keyPattern": {
      "profile.department": 1,
      "employment.status": 1,
      "employment.hireDate": -1
    }
  }
}
```
 
Performance benefits:
 - Index immediately finds engineering + active users
 - Results are already pre-sorted by hireDate (descending)
 - Only need to filter level on a small subset
 - Fast and efficient


### Query Plan Caching – Learning from Experience

MongoDB doesn't re-optimize every query. Once it finds a good plan, it **caches** it.

How It Works
- **First execution:** Optimization + execution  
- **Subsequent executions:** Use cached plan  

When Plans Get Evicted from Cache
- Index created/dropped  
- Collection receives **1000+ writes**  
- Server restart  
- Manual cache clear  

**Force Re-optimization if Needed**
```javascript
db.users.find({...}).hint({ $natural: 1 })ers.find({...}).hint({ $natural: 1 })
```

### Putting It All Together: The Complete Picture

```plaintext
Client Query
     ↓
Query Parser
     ↓
Query Optimizer (finds best plan)
     ↓
Execution Engine (runs IXSCAN → FETCH)
     ↓
Storage Engine (WiredTiger)
     ↓
Results Returned
```
---


## 🧠 Query Planner and Execution Stages

MongoDB's query planner evaluates multiple query plans and picks the best one based on cost (CPU, I/O, and memory). You can see this in action using:

```javascript
// Analyze query execution
db.users.find({
  "profile.department": "engineering",
  "employment.status": "active"
}).explain("executionStats")
```

This will show details such as:
- Which index (if any) was used
- How many documents were scanned vs. returned  
- Execution time in milliseconds

#### Example Output (Simplified)

```javascript
{
  "executionStats": {
    "executionTimeMillis": 8,
    "totalDocsExamined": 125,
    "totalKeysExamined": 125,
    "nReturned": 125,
    "executionStages": {
      "stage": "FETCH",
      "nReturned": 125,
      "inputStage": {
        "stage": "IXSCAN",
        "indexName": "profile.department_1_employment.status_1",
        "nReturned": 125
      }
    }
  }
}
```

This tells us MongoDB used an **index scan** (`IXSCAN`) followed by a **fetch** stage to retrieve the documents-that's efficient.

**🚩 Red Flag:** If you see `COLLSCAN`, it means MongoDB scanned the entire collection, which indicates a performance problem.

---

## ⚠️ Real-World Tip

If your queries are slow even with proper indexes, your data might be **too large to fit in memory**. In that case, MongoDB has to read from disk more often-which is much slower and increases latency.

**Check your working set:**
```javascript
// Monitor memory usage
db.serverStatus().mem
db.serverStatus().wiredTiger.cache
```

**Key metrics to watch:**
 - **resident** memory: How much RAM is actively used
 - **virtual** memory: Total memory mapped  
 - Cache hit rate: Pages read from cache vs disk


---


## ✅ Summary

* MongoDB stores data as **BSON documents** inside **collections** flexible but requires careful schema design.
* The **query planner** chooses the most efficient path using indexes and cost estimation.
* Use `explain("executionStats")` to inspect query performance avoid `COLLSCAN`.
* **WiredTiger** is the default storage engine. It handles compression, caching, and concurrency.
* If performance drops, check whether your **working set fits in RAM** as disk reads are expensive.

Understanding these internals helps you write faster queries and build MongoDB systems that actually scale in the real world.
