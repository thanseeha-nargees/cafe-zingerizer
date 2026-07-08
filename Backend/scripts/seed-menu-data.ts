import dotenv from "dotenv";
import mongoose from "mongoose";
import path from "node:path";

dotenv.config({
  path: path.resolve(__dirname, "..", ".env"),
  quiet: true,
});

const categories = [
  {
    name: "Burgers",
    slug: "burgers",
    image:
      "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=1200&h=800&fit=crop&q=80",
    isActive: true,
  },
  {
    name: "Wraps",
    slug: "wraps",
    image:
      "https://images.unsplash.com/photo-1530469912745-a215c6b256ea?w=1200&h=800&fit=crop&q=80",
    isActive: true,
  },
  {
    name: "Sides",
    slug: "sides",
    image:
      "https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=1200&h=800&fit=crop&q=80",
    isActive: true,
  },
  {
    name: "Drinks",
    slug: "drinks",
    image:
      "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=1200&h=800&fit=crop&q=80",
    isActive: true,
  },
  {
    name: "Desserts",
    slug: "desserts",
    image:
      "https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=1200&h=800&fit=crop&q=80",
    isActive: true,
  },
];

const items = [
  {
    name: "Zinger Burger",
    description:
      "Signature crispy chicken burger with fresh lettuce, creamy mayo, and a soft toasted bun for an easy all-time favorite.",
    price: 229,
    category: "Burgers",
    image:
      "https://images.unsplash.com/photo-1550317138-10000687a72b?w=1000&h=800&fit=crop&q=80",
    isAvailable: true,
  },
  {
    name: "Cheese Blast Burger",
    description:
      "Chicken burger stacked with extra cheese sauce, onion, lettuce, and a rich smoky dressing for a heavier bite.",
    price: 259,
    category: "Burgers",
    image:
      "https://images.unsplash.com/photo-1550547660-d9450f859349?w=1000&h=800&fit=crop&q=80",
    isAvailable: true,
  },
  {
    name: "Smoky Zinger Burger",
    description:
      "Crispy chicken zinger layered with iceberg lettuce, pickles, cheddar slice, and a smoky chipotle mayo in a toasted brioche bun.",
    price: 249,
    category: "Burgers",
    image:
      "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=1000&h=800&fit=crop&q=80",
    isAvailable: true,
  },
  {
    name: "Cheese Volcano Burger",
    description:
      "Double chicken patty burger loaded with molten cheese sauce, caramelized onions, jalapenos, and house burger dressing.",
    price: 289,
    category: "Burgers",
    image:
      "https://images.unsplash.com/photo-1550547660-d9450f859349?w=1000&h=800&fit=crop&q=80",
    isAvailable: true,
  },
  {
    name: "Classic Grilled Chicken Burger",
    description:
      "Flame-grilled chicken breast with tomato, onion, crisp lettuce, and garlic aioli for a lighter but juicy bite.",
    price: 219,
    category: "Burgers",
    image:
      "https://images.unsplash.com/photo-1571091718767-18b5b1457add?w=1000&h=800&fit=crop&q=80",
    isAvailable: true,
  },
  {
    name: "Paneer Crunch Burger",
    description:
      "Crispy paneer patty with crunchy slaw, mint mayo, and a sweet-spicy glaze, built for a satisfying veg option.",
    price: 209,
    category: "Burgers",
    image:
      "https://images.unsplash.com/photo-1520072959219-c595dc870360?w=1000&h=800&fit=crop&q=80",
    isAvailable: true,
  },
  {
    name: "Peri Peri Wrap",
    description:
      "Tender peri peri chicken, crisp salad, and creamy dressing wrapped tight in a warm tortilla for a balanced spicy roll.",
    price: 189,
    category: "Wraps",
    image:
      "https://images.unsplash.com/photo-1529006557810-274b9b2fc783?w=1000&h=800&fit=crop&q=80",
    isAvailable: true,
  },
  {
    name: "Peri Peri Chicken Wrap",
    description:
      "Soft tortilla stuffed with peri peri chicken strips, onion, lettuce, and creamy pepper mayo, rolled fresh to order.",
    price: 199,
    category: "Wraps",
    image:
      "https://images.unsplash.com/photo-1530469912745-a215c6b256ea?w=1000&h=800&fit=crop&q=80",
    isAvailable: true,
  },
  {
    name: "Tandoori Paneer Wrap",
    description:
      "Charred paneer tikka, capsicum, onion, and mint chutney wrapped in a warm flatbread with a yogurt dressing.",
    price: 189,
    category: "Wraps",
    image:
      "https://images.unsplash.com/photo-1529006557810-274b9b2fc783?w=1000&h=800&fit=crop&q=80",
    isAvailable: true,
  },
  {
    name: "Loaded Chicken Roll",
    description:
      "Succulent chicken bites, shredded cheese, onion rings, and tangy sauce packed into a buttery roomali-style roll.",
    price: 219,
    category: "Wraps",
    image:
      "https://images.unsplash.com/photo-1514944152559-a103040c7f16?w=1000&h=800&fit=crop&q=80",
    isAvailable: true,
  },
  {
    name: "Crispy Fries",
    description:
      "Straight-cut crispy fries, lightly salted and served hot, great on their own or alongside burgers and wraps.",
    price: 99,
    category: "Sides",
    image:
      "https://images.unsplash.com/photo-1630384060421-cb20d0e0649d?w=1000&h=800&fit=crop&q=80",
    isAvailable: true,
  },
  {
    name: "Masala Fries",
    description:
      "Golden fries tossed with chatpata masala seasoning and served hot with a side of signature dip.",
    price: 109,
    category: "Sides",
    image:
      "https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=1000&h=800&fit=crop&q=80",
    isAvailable: true,
  },
  {
    name: "Chicken Popcorn Bucket",
    description:
      "Bite-sized crispy chicken popcorn with a bold pepper seasoning, perfect for sharing or snacking solo.",
    price: 179,
    category: "Sides",
    image:
      "https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=1000&h=800&fit=crop&q=80",
    isAvailable: true,
  },
  {
    name: "Hot Wings",
    description:
      "Spicy fried chicken wings glazed with a fiery house sauce and finished with herbs for extra punch.",
    price: 199,
    category: "Sides",
    image:
      "https://images.unsplash.com/photo-1608039755401-742074f0548d?w=1000&h=800&fit=crop&q=80",
    isAvailable: true,
  },
  {
    name: "Classic Mojito",
    description:
      "Fresh lime and mint cooler with soda, lightly sweetened and poured over ice for a clean refreshing drink.",
    price: 89,
    category: "Drinks",
    image:
      "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=1000&h=800&fit=crop&q=80",
    isAvailable: true,
  },
  {
    name: "Cold Coffee",
    description:
      "Smooth cafe-style cold coffee blended with milk and ice, topped with a creamy froth and served chilled.",
    price: 119,
    category: "Drinks",
    image:
      "https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=1000&h=800&fit=crop&q=80",
    isAvailable: true,
  },
  {
    name: "Mint Lime Mojito",
    description:
      "A cooling blend of muddled mint, lime, and soda served over ice for a bright refreshing finish.",
    price: 99,
    category: "Drinks",
    image:
      "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=1000&h=800&fit=crop&q=80",
    isAvailable: true,
  },
  {
    name: "Cold Coffee Supreme",
    description:
      "Thick chilled coffee blended with milk, cream, and ice, topped with foam for a cafe-style treat.",
    price: 129,
    category: "Drinks",
    image:
      "https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=1000&h=800&fit=crop&q=80",
    isAvailable: true,
  },
  {
    name: "Chocolate Shake",
    description:
      "Rich chocolate milkshake blended smooth and finished with a silky texture kids and adults both love.",
    price: 149,
    category: "Drinks",
    image:
      "https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=1000&h=800&fit=crop&q=80",
    isAvailable: true,
  },
  {
    name: "Brownie Sundae",
    description:
      "Warm chocolate brownie topped with vanilla ice cream and finished with chocolate sauce and crunch.",
    price: 169,
    category: "Desserts",
    image:
      "https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=1000&h=800&fit=crop&q=80",
    isAvailable: true,
  },
  {
    name: "Choco Lava Cake",
    description:
      "Soft baked chocolate cake with a gooey molten center, served warm for the best finish to your meal.",
    price: 149,
    category: "Desserts",
    image:
      "https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=1000&h=800&fit=crop&q=80",
    isAvailable: true,
  },
];

async function run(): Promise<void> {
  const mongoUrl = process.env.MONGO_URL;

  if (!mongoUrl) {
    throw new Error("MONGO_URL is not defined");
  }

  await mongoose.connect(mongoUrl);

  const db = mongoose.connection.db;

  if (!db) {
    throw new Error("Database connection failed");
  }

  let categoryUpserts = 0;
  let categoryModified = 0;

  for (const category of categories) {
    const result = await db.collection("categories").updateOne(
      { slug: category.slug },
      {
        $set: category,
        $setOnInsert: {
          createdAt: new Date(),
        },
        $currentDate: {
          updatedAt: true,
        },
      },
      {
        upsert: true,
      }
    );

    categoryUpserts += result.upsertedCount;
    categoryModified += result.modifiedCount;
  }

  let itemUpserts = 0;
  let itemModified = 0;

  for (const item of items) {
    const result = await db.collection("menus").updateOne(
      { name: item.name },
      {
        $set: item,
        $setOnInsert: {
          createdAt: new Date(),
        },
        $currentDate: {
          updatedAt: true,
        },
      },
      {
        upsert: true,
      }
    );

    itemUpserts += result.upsertedCount;
    itemModified += result.modifiedCount;
  }

  const savedCategories = await db
    .collection("categories")
    .find(
      {},
      {
        projection: {
          _id: 0,
          name: 1,
          slug: 1,
          image: 1,
          isActive: 1,
        },
      }
    )
    .sort({ name: 1 })
    .toArray();

  const savedItems = await db
    .collection("menus")
    .find(
      {},
      {
        projection: {
          _id: 0,
          name: 1,
          category: 1,
          price: 1,
          description: 1,
        },
      }
    )
    .sort({
      category: 1,
      name: 1,
    })
    .toArray();

  console.log(
    JSON.stringify(
      {
        categoryUpserts,
        categoryModified,
        itemUpserts,
        itemModified,
        categoryCount: savedCategories.length,
        menuCount: savedItems.length,
        categories: savedCategories,
        items: savedItems,
      },
      null,
      2
    )
  );
}

run()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async (): Promise<void> => {
    await mongoose.disconnect();
  });
