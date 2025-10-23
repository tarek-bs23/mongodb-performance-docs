---
layout: default
title: "MongoDB Internals"
nav_order: 4
---

# Understanding MongoDB Internals

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

```js
// What you write in JavaScript:
const user = {
  _id: ObjectId("507f1f77bcf86cd799439011"),
  email: "alice@example.com",
  password: "$2b$10$hashed_password_string", // Hashed
  firstName: "Alice",
  lastName: "Johnson",
  role: "customer",
  status: "active",
  address: {
    street: "123 Main St",
    city: "San Francisco",
    state: "CA",
    country: "USA",
    zipCode: "94105",
    location: {
      type: "Point",
      coordinates: [-122.4194, 37.7749] // [longitude, latitude]
    }
  },
  phone: "+1-555-0123",
  createdAt: new Date("2024-01-15T10:30:00Z"),
  lastLogin: new Date("2024-03-20T14:22:00Z"),
  preferences: {
    language: "en",
    currency: "USD",
    notifications: true
  }
}

// How MongoDB actually stores it (conceptually):
<BSON Document>:
  - _id: ObjectId (12 bytes)
  - email: String (16 bytes + "alice@example.com")
  - password: String (28 bytes + hashed value)
  - firstName: String (5 bytes + "Alice")
  - lastName: String (8 bytes + "Johnson")
  - role: String (8 bytes + "customer")
  - status: String (6 bytes + "active")
  - address: Embedded Document (nested BSON):
    ├─ street: String (11 bytes + "123 Main St")
    ├─ city: String (13 bytes + "San Francisco")
    ├─ state: String (2 bytes + "CA")
    ├─ country: String (3 bytes + "USA")
    ├─ zipCode: String (5 bytes + "94105")
    └─ location: Embedded Document:
        ├─ type: String (4 bytes + "Point")
        └─ coordinates: Array (overhead + two Double values)
  - phone: String (12 bytes + "+1-555-0123")
  - createdAt: Date (8 bytes + timestamp)
  - lastLogin: Date (8 bytes + timestamp)
  - preferences: Embedded Document:
    ├─ language: String (2 bytes + "en")
    ├─ currency: String (3 bytes + "USD")
    └─ notifications: Boolean (1 byte + true)
```

This document is stored internally as BSON, making it fast to query and index.




### 🧩 Documents

A **document** is the basic unit of data in MongoDB similar to a row in SQL, but much more flexible. Each document is a self-contained object with fields and values, and structures can vary across documents within the same collection.

Example document in a `users` collection: 
```json
{
  _id: ObjectId("507f1f77bcf86cd799439011"),
  email: "alice@example.com",
  password: "$2b$10$hashed_password_string_here",
  firstName: "Alice",
  lastName: "Smith",
  role: "customer",
  status: "active",
  address: {
    street: "123 Tech Street",
    city: "San Francisco",
    state: "CA",
    country: "USA",
    zipCode: "94105",
    location: {
      type: "Point",
      coordinates: [-122.4194, 37.7749]
    }
  },
  phone: "+1-555-0123",
  createdAt: ISODate("2024-01-15T10:30:00Z"),
  lastLogin: ISODate("2024-03-20T14:22:00Z"),
  preferences: {
    language: "en",
    currency: "USD",
    notifications: true
  }
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

```json
// A 'users' collection might contain documents like:

// Document 1 - Customer
{
  _id: ObjectId("507f1f77bcf86cd799439011"),
  email: "alice@example.com",
  password: "$2a$10$hashedPasswordHere", // Hashed password
  firstName: "Alice",
  lastName: "Smith",
  role: "customer",
  status: "active",
  address: {
    street: "123 Main St",
    city: "New York",
    state: "NY",
    country: "USA",
    zipCode: "10001",
    location: {
      type: "Point",
      coordinates: [-73.9857, 40.7484] // [longitude, latitude]
    }
  },
  phone: "+1-555-123-4567",
  createdAt: ISODate("2024-01-15T10:00:00Z"),
  lastLogin: ISODate("2025-10-20T08:30:00Z"),
  preferences: {
    language: "en",
    currency: "USD",
    notifications: true
  }
}

// Document 2 - Vendor
{
  _id: ObjectId("507f1f77bcf86cd799439012"),
  email: "bob@example.com",
  password: "$2a$10$anotherHashedPassword", // Hashed password
  firstName: "Bob",
  lastName: "Johnson",
  role: "vendor",
  status: "active",
  address: {
    street: "456 Market St",
    city: "San Francisco",
    state: "CA",
    country: "USA",
    zipCode: "94105",
    location: {
      type: "Point",
      coordinates: [-122.4194, 37.7749] // [longitude, latitude]
    }
  },
  phone: "+1-555-987-6543",
  createdAt: ISODate("2023-09-15T12:00:00Z"),
  lastLogin: ISODate("2025-10-19T15:45:00Z"),
  preferences: {
    language: "en",
    currency: "USD",
    notifications: false
  }
}

// Document 3 - Admin with different preferences
{
  _id: ObjectId("507f1f77bcf86cd799439013"),
  email: "carol@example.com",
  password: "$2a$10$yetAnotherHashedPassword", // Hashed password
  firstName: "Carol",
  lastName: "Davis",
  role: "admin",
  status: "active",
  address: {
    street: "789 King St",
    city: "Toronto",
    state: "ON",
    country: "Canada",
    zipCode: "M5V 1J2",
    location: {
      type: "Point",
      coordinates: [-79.3832, 43.6532] // [longitude, latitude]
    }
  },
  phone: "+1-416-555-4321",
  createdAt: ISODate("2023-01-10T09:00:00Z"),
  lastLogin: ISODate("2025-10-18T10:15:00Z"),
  preferences: {
    language: "fr",
    currency: "CAD",
    notifications: true
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

```js
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

```js
// Query: Find active customers in California with recent login
db.users.find({
  "role": "customer",
  "status": "active", 
  "address.state": "CA",
  "lastLogin": { $gte: ISODate("2024-03-01T00:00:00Z") }
})
```

| Scenario                | Execution Time | Source    | Notes |
|------------------------|---------------|-----------|-------|
| **With data in cache** | ~3 ms         | Memory (WiredTiger Cache) | Data loaded in RAM from previous queries |
| **With data on disk**  | ~45 ms        | Disk I/O  | Requires reading from storage, populating cache |

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

```js
// Query: Find active customers in California who logged in recently
db.users.find({
  "role": "customer",
  "status": "active",
  "address.state": "CA", 
  "lastLogin": { $gte: ISODate("2024-03-01T00:00:00Z") }
}).sort({ "lastLogin": -1 }).limit(20)
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
```js
db.users.find({
  "role": "customer",                    // Equality filter
  "status": "active",                    // Equality filter  
  "address.state": "CA",                 // Equality filter
  "lastLogin": { $gte: ISODate("2024-03-01") }  // Range filter
}).sort({ "lastLogin": -1 }).limit(20)   // Sort + limit
```

**Available Indexes:**
```js
// Index 1: Covers role + status + state
{ "role": 1, "status": 1, "address.state": 1 }

// Index 2: Covers role + lastLogin  
{ "role": 1, "lastLogin": -1 }

// Index 3: Covers status + lastLogin
{ "status": 1, "lastLogin": -1 }

// Index 4: Covers state only
{ "address.state": 1 }
```

**The Optimizer's Decision Matrix:**

| Candidate Plan | Pros | Cons | Viability |
|----------------|------|------|-----------|
| **Index 1**<br/>`role + status + state` | ✅ Handles 3 equality filters<br/>✅ Reduces dataset early | ❌ Still needs to filter `lastLogin`<br/>❌ Must sort in memory | 🟢 **HIGH** |
| **Index 2**<br/>`role + lastLogin` | ✅ Handles equality + sort<br/>✅ Pre-sorted results<br/>✅ Efficient for limit | ❌ Must filter `status` & `state`<br/>❌ May scan more date range | 🟢 **HIGH** |
| **Index 3**<br/>`status + lastLogin` | ✅ Handles equality + sort | ❌ Must filter `role` & `state`<br/>❌ Less selective | 🟡 **MEDIUM** |
| **COLLSCAN**<br/>Full scan | ✅ Always works | ❌ Scans ALL documents<br/>❌ Slowest option | 🔴 **LAST RESORT** |

**The Winner: Index 2** 🏆

**Why Index 2 Wins:**
- Eliminates non-customer users immediately
- Results are pre-sorted by lastLogin (descending)
- Perfect for `limit(20)` - stops early
- Only needs to filter status and state on small result set

#### How to See the Optimization Process in Action

```js
// Get the full optimization story
const explanation = db.users.explain("allPlansExecution").find({
  "role": "customer",
  "status": "active",
  "address.state": "CA",
  "lastLogin": { $gte: ISODate("2024-03-01T00:00:00Z") }
}).sort({ "lastLogin": -1 }).limit(20)
```

**What You'll See in the Output:**

```js
{
  "queryPlanner": {
    "winningPlan": {
      "stage": "FETCH",
      "filter": {
        "status": { "$eq": "active" },
        "address.state": { "$eq": "CA" }
      },
      "inputStage": {
        "stage": "IXSCAN",
        "indexName": "role_1_lastLogin_-1",  // 🏆 Winner!
        "keyPattern": {
          "role": 1,
          "lastLogin": -1
        }
      }
    },
    "rejectedPlans": [  // 📝 The other candidates considered
      {
        "stage": "FETCH", 
        "filter": {
          "lastLogin": { "$gte": ISODate("2024-03-01T00:00:00Z") }
        },
        "inputStage": {
          "stage": "IXSCAN",
          "indexName": "role_1_status_1_address.state_1",  // Index 1
          "reason": "Lost due to in-memory sort requirement"
        }
      },
      {
        "stage": "FETCH",
        "filter": {
          "role": { "$eq": "customer" },
          "address.state": { "$eq": "CA" }
        },
        "inputStage": {
          "stage": "IXSCAN", 
          "indexName": "status_1_lastLogin_-1",  // Index 3
          "reason": "Poor selectivity for status-only filter"
        }
      }
    ]
  },
  "executionStats": {
    "nReturned": 20,
    "executionTimeMillis": 8,
    "totalKeysExamined": 35,
    "totalDocsExamined": 35,
    "executionStages": {
      "stage": "FETCH",
      "nReturned": 20,
      "works": 36,
      "advanced": 20,
      "inputStage": {
        "stage": "IXSCAN",
        "nReturned": 35,
        "works": 36
      }
    }
  }
}
```

**Key Insights from the Output:**

- **`winningPlan`**: The chosen execution path (Index 2)
- **`rejectedPlans`**: Other indexes that were tested but performed worse  
- **`executionStats`**: Real performance metrics
- **`nReturned` vs `totalDocsExamined`**: Efficiency ratio (20 results from 35 docs examined)

This visualization helps you understand exactly why MongoDB chose a particular execution path and what alternatives were considered!


### Step 3: Execution Engine - "Getting the Job Done"

The execution engine carries out the chosen plan by combining different "stages". Think of these as Lego blocks that snap together to process your data.

#### Common Execution Stages

```js
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
  ```js
  "stage": "COLLSCAN"  // This is what you DON'T want to see
  ```

- **`IXSCAN`**: The hero. Scans only the index entries.
  ```js
  "stage": "IXSCAN",
  "indexName": "email_1"  // Using the email index
  ```

- **`FETCH`**: Retrieves full documents after finding them via index.
  ```js
  "stage": "FETCH",
  "inputStage": {
    "stage": "IXSCAN"  // IXSCAN finds pointers, FETCH gets the actual docs
  }
  ```

- **`SORT`**: Sorts results in memory (can be expensive!).
  ```js
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


<!-- ### Real Example: The Difference Between Good and Bad

Let's see two different execution paths for the same query.

#### The Slow Way (Bad Plan)

```js
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

```js
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
 -->

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
```js
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

```js
// Analyze query execution for active customers with recent activity
db.users.find({
  "role": "customer",
  "status": "active",
  "lastLogin": { $gte: ISODate("2024-03-01T00:00:00Z") }
}).explain("executionStats")
```

This will show details such as:
- Which index (if any) was used
- How many documents were scanned vs. returned  
- Execution time in milliseconds

#### Example Output (Simplified)

```js
{
  "executionStats": {
    "executionSuccess": true,
    "nReturned": 3420,
    "executionTimeMillis": 15,
    "totalKeysExamined": 3450,
    "totalDocsExamined": 3420,
    "executionStages": {
      "stage": "FETCH",
      "nReturned": 3420,
      "executionTimeMillisEstimate": 12,
      "works": 3451,
      "advanced": 3420,
      "inputStage": {
        "stage": "IXSCAN",
        "nReturned": 3450,
        "executionTimeMillisEstimate": 8,
        "works": 3451,
        "keyPattern": {
          "role": 1,
          "lastLogin": -1
        },
        "indexName": "role_1_lastLogin_-1"
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
```js
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
