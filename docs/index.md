---
layout: default
title: Home
nav_order: 0
permalink: /
description: "A comprehensive guide to MongoDB performance optimization"
---

# MongoDB Query Performance Check & Optimization Guide

Welcome to the **MongoDB Query Performance Check and Optimization Guide**. A comprehensive, topic-based resource designed to help developers and engineers improve MongoDB query performance using local MongoDB installations.

---

## 📚 Topics Covered

- [Database Structure Overview](./01-database-structure-overview.md)
   - Collections and Documents
   - Schema Relationships Overview
   - Dataset Size Plan
   - Data Seeding Guideline

- [Introduction](./02-introduction.md)
   - What is MongoDB query performance?
   - Why Performance Matters
   - Overview of Tools and Techniques

- [Monitoring and Profiling](./03-monitoring-and-profiling.md)
   - Using `explain()` and Interpreting Output
   - MongoDB Compass Performance Tab
   - Query Profiler and Logs
   - Performance Advisor

- [MongoDB Internals](./04-mongodb-internals.md)
   - How MongoDB Stores Data (BSON, Documents, Collections)
   - Storage Engine Basics (WiredTiger)
   - How MongoDB Executes Queries
   - Query Planner and Execution Stages

- [Indexing Strategies](./05-indexing-strategies.md)
   - Types of Indexes
   - Compound Index (with ESR Rule)
   - Covered Queries
   - Index Selection and Cardinality
   - Indexing Best Practices

- [Query Optimization](./06-query-optimization.md)
   - Optimizing Read Queries
   - Avoiding Common Anti-Patterns
   - Pagination Strategies
   - Projection and Filtering

- [Aggregation Optimization](./07-aggregation-optimization.md)
   - Pipeline stage ordering
   - Performance Tips for Aggregation Operators
   - Memory Usage and Optimization
   - Pipeline Optimization Strategies
   - `$facet`, `$bucket`, and `$lookup` Considerations

- [Schema Design](./08-schema-design.md)
   - Embedding vs referencing
   - Document Size and Nesting
   - Schema Evolution and Query Impact
   - Query-Driven Schema Design

- [Case Studies](./09-case-studies.md)
    - Performance Note 
    - Real-world Optimization Examples