# 7. Schema Design for Performance

Schema design in MongoDB isn’t just about organizing data, it directly impacts how fast your queries run, how much memory is used, and how scalable your application is. Unlike relational databases, MongoDB gives you a lot of flexibility, but with that comes responsibility.

Here’s how I approach schema design when performance matters.

---

## 🧱 Embedding vs Referencing

### Referencing (Normalization)
This is similar to how relational databases work, you store related data in separate collections and link them using IDs.

```js
// orders collection
{
  _id: ObjectId("..."),
  customerId: ObjectId("...")
}

// customers collection
{
  _id: ObjectId("..."),
  name: "John Doe"
}
```

Use referencing when:
* The related data is large or changes frequently
* You don’t always need the related data
* You want to avoid duplication


### Embedding (Denormalization)

You store related data inside the same document.

```js
{
  _id: ObjectId("..."),
  customer: {
    name: "John Doe",
    email: "john@example.com"
  },
  items: [
    { productId: "p1", quantity: 2 },
    { productId: "p2", quantity: 1 }
  ]
}
```

Use embedding when:

* The data is tightly coupled and accessed together
* You want fewer joins (`$lookup`)
* The embedded data doesn’t grow unbounded

👍 **Rule of thumb**: If you always fetch the data together, embed it. If not, reference it.

---

## 📏 Document Size and Nesting

MongoDB has a **16MB document size limit**. That’s a lot, but it’s not infinite.

Avoid:

* Deeply nested documents (hard to query and index)
* Unbounded arrays (e.g., a `comments` array with thousands of entries)

Instead:

* Keep documents flat and predictable
* Use pagination or separate collections for large subdocuments

#### Example:

Instead of embedding all comments in a blog post:

```js
// ❌ Bad
{
  title: "Post",
  comments: [ /* 10,000 comments */ ]
}
```

Use a separate `comments` collection:

```js
// ✅ Better
{
  postId: ObjectId("..."),
  comment: "Nice post!"
}
```

---

## 🔄 Schema Evolution and Query Impact

MongoDB is schema-less, but that doesn’t mean you should ignore structure.

Over time, if your documents evolve too much (e.g., some have `fieldA`, others have `fieldB`), your queries become harder to optimize.

**Real-world tips:**

* Keep your schema consistent
* Use **schema validation** (`$jsonSchema`) to enforce structure
* Avoid querying across too many optional fields, it confuses the query planner

---

## ✅ Summary

* Use **embedding** for tightly related data, **referencing** for loosely related or large data.
* Keep documents **flat and predictable**, avoid deep nesting and unbounded arrays.
* Be mindful of the **16MB document limit**.
* Use **schema validation** to prevent chaos as your app grows.
* Design your schema based on **how you query**, not just how the data looks.

Good schema design is the foundation of **fast queries** and a **happy database**.
