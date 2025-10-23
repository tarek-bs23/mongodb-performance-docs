# MongoDB Query Performance Check & Optimization Guide

Welcome to the **MongoDB Query Performance Check and Optimization Guide**. A comprehensive, topic-based resource designed to help developers and engineers improve MongoDB query performance using local MongoDB installations.

---

## 📚 Topics Covered

Explore the full MongoDB Performance documentation, including a browsable index of all topics, on the GitHub Pages site: [MongoDB Performance Docs](https://tarek-bs23.github.io/mongodb-performance-docs/)


- [Database Structure Overview](./docs/01-database-structure-overview.md)
   - Collections and Documents
   - Schema Relationships Overview
   - Dataset Size Plan
   - Data Seeding Guideline

- [Introduction](./docs/02-introduction.md)
   - What is MongoDB query performance?
   - Why Performance Matters
   - Overview of Tools and Techniques

- [Monitoring and Profiling](./docs/03-monitoring-and-profiling.md)
   - Using `explain()` and Interpreting Output
   - MongoDB Compass Performance Tab
   - Query Profiler and Logs
   - Performance Advisor

- [MongoDB Internals](./docs/04-mongodb-internals.md)
   - How MongoDB Stores Data (BSON, Documents, Collections)
   - Storage Engine Basics (WiredTiger)
   - How MongoDB Executes Queries
   - Query Planner and Execution Stages

- [Indexing Strategies](./docs/05-indexing-strategies.md)
   - Types of Indexes
   - Compound Index (with ESR Rule)
   - Covered Queries
   - Index Selection and Cardinality
   - Indexing Best Practices

- [Query Optimization](./docs/06-query-optimization.md)
   - Optimizing Read Queries
   - Avoiding Common Anti-Patterns
   - Pagination Strategies
   - Projection and Filtering

- [Aggregation Optimization](./docs/07-aggregation-optimization.md)
   - Pipeline stage ordering
   - Performance Tips for Aggregation Operators
   - Memory Usage and Optimization
   - Pipeline Optimization Strategies
   - `$facet`, `$bucket`, and `$lookup` Considerations

- [Schema Design](./docs/08-schema-design.md)
   - Embedding vs referencing
   - Document Size and Nesting
   - Schema Evolution and Query Impact
   - Query-Driven Schema Design

- [Case Studies](./docs/09-case-studies.md)
    - Performance Note 
    - Real-world Optimization Examples

---

## 🛠️ Requirements

- MongoDB (local installation)
- MongoDB Compass (optional)
- Node.js