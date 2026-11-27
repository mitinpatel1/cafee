
/*
  OfficeBite — Daily Menu

  50 items | 50 separate Unsplash image references

  Breakfast: 10
  Lunch: 15
  Snacks: 15
  Beverages: 10

  Existing price, category and isVeg data preserved.
*/

// ==========================================
// INITIAL MENU
// ==========================================

const menu = {
  Breakfast: [
    ["Masala Dosa", 95],
    ["Idli Sambar", 75],
    ["Poha", 65],
    ["Aloo Paratha", 85],
    ["Veg Upma", 65],
    ["Chole Bhature", 115],
    ["Paneer Sandwich", 110],
    ["Bread Omelette", 90, false],
    ["Masala Uttapam", 105],
    ["Veg Breakfast Wrap", 115],
  ],

  Lunch: [
    ["Veg Thali", 160],
    ["Paneer Butter Masala", 175],
    ["Dal Tadka Rice", 135],
    ["Rajma Chawal", 125],
    ["Chole Rice", 125],
    ["Jeera Rice & Dal Makhani", 155],
    ["Mixed Veg Curry & Roti", 145],
    ["Palak Paneer", 170],
    ["Veg Biryani", 155],
    ["Sambar Rice", 125],
    ["Kadhi Chawal", 125],
    ["Egg Curry & Rice", 165, false],
    ["Chicken Curry & Rice", 205, false],
    ["Tandoori Roti Combo", 145],
    ["Kadai Paneer & Roti", 185],
  ],

  Snacks: [
    ["Samosa Plate", 50],
    ["Veg Puff", 55],
    ["Paneer Puff", 75],
    ["Veg Burger", 105],
    ["French Fries", 95],
    ["Aloo Tikki Chaat", 95],
    ["Pav Bhaji", 125],
    ["Bhel Puri", 75],
    ["Vada Pav", 65],
    ["Grilled Veg Sandwich", 105],
    ["Paneer Roll", 125],
    ["Veg Momos", 105],
    ["Cheese Toast", 95],
    ["Chicken Sandwich", 145, false],
    ["Dhokla Plate", 75],
  ],

  Beverages: [
    ["Masala Chai", 35],
    ["Filter Coffee", 50],
    ["Cappuccino", 95],
    ["Cold Coffee", 115],
    ["Fresh Lime Soda", 65],
    ["Sweet Lassi", 75],
    ["Mango Shake", 105],
    ["Chocolate Milkshake", 125],
    ["Iced Tea", 85],
    ["Fresh Watermelon Juice", 95],
  ],
};

// ==========================================
// UNSPLASH IMAGE URL GENERATOR
// ==========================================

const unsplash = (photoId) =>
  `https://images.unsplash.com/${photoId}?auto=format&fit=crop&w=850&h=650&q=82`;

// ==========================================
// UNIQUE IMAGE FOR EVERY DISH
// ==========================================
//
// Some photos are representative food images,
// not an exact photo of the named dish.
// Review them before using in production.
//
// Replace individual IDs with your preferred
// Unsplash photo IDs whenever needed.
// ==========================================

const foodImages = {
  // ---------- BREAKFAST ----------

  "Masala Dosa":
    "photo-1743615467204-8fdaa85ff2db",

  "Idli Sambar":
    "photo-1741376509253-221ac18fac0f",

  "Poha":
    "photo-1546069901-ba9599a7e63c",

  "Aloo Paratha":
    "photo-1668357530437-72a12c660f94",

  "Veg Upma":
    "photo-1665660710687-b44c50751054",

  "Chole Bhature":
    "photo-1603894584373-5ac82b2ae398",

  "Paneer Sandwich":
    "photo-1528735602780-2552fd46c7af",

  "Bread Omelette":
    "photo-1525351484163-7529414344d8",

  "Masala Uttapam":
    "photo-1743615467363-250466982515",

  "Veg Breakfast Wrap":
    "photo-1776820620219-c5079240a997",

  // ---------- LUNCH ----------

  "Veg Thali":
    "photo-1711153419402-336ee48f2138",

  "Paneer Butter Masala":
    "photo-1631452180539-96aca7d48617",

  "Dal Tadka Rice":
    "photo-1546833999-b9f581a1996d",

  "Rajma Chawal":
    "photo-1788601988466-9f361c34c6cb",

  "Chole Rice":
    "photo-1565557623262-b51c2513a641",

  "Jeera Rice & Dal Makhani":
    "photo-1585937421612-70a008356fbe",

  "Mixed Veg Curry & Roti":
    "photo-1567337710282-00832b415979",

  "Palak Paneer":
    "photo-1631452180519-c014fe946bc7",

  "Veg Biryani":
    "photo-1563379091339-03246963d51a",

  "Sambar Rice":
    "photo-1596797038530-2c107229654b",

  "Kadhi Chawal":
    "photo-1604908176997-431ac6f1c1a1",

  "Egg Curry & Rice":
    "photo-1604908176997-125f25cc6f3d",

  "Chicken Curry & Rice":
    "photo-1742599361539-f096753d1100",

  "Tandoori Roti Combo":
    "photo-1596040033229-a9821ebd058d",

  "Kadai Paneer & Roti":
    "photo-1606491956689-2ea866880c84",

  // ---------- SNACKS ----------

  "Samosa Plate":
    "photo-1601050690597-df0568f70950",

  "Veg Puff":
    "photo-1541592106381-b31e9677c0e5",

  "Paneer Puff":
    "photo-1601004890684-d8cbf643f5f2",

  "Veg Burger":
    "photo-1568901346375-23c9450c58cd",

  "French Fries":
    "photo-1573080496219-bb080dd4f877",

  "Aloo Tikki Chaat":
    "photo-1604908177522-040c4a3cb0c3",

  "Pav Bhaji":
    "photo-1600555379765-f82335a7b1b0",

  "Bhel Puri":
    "photo-1547592180-85f173990554",

  "Vada Pav":
    "photo-1550547660-d9450f859349",

  "Grilled Veg Sandwich":
    "photo-1553909489-cd47e0ef937f",

  "Paneer Roll":
    "photo-1555126634-323283e090fa",

  "Veg Momos":
    "https://images.unsplash.com/photo-1738608084602-f9543952188e?q=80&w=1172&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=NHwxMjA3fDA%3D",

  "Cheese Toast":
    "photo-1482049016688-2d3e1b311543",

  "Chicken Sandwich":
    "photo-1521390188846-e2a3a97453a0",

  "Dhokla Plate":
    "photo-1626082927389-6cd097cdc6ec",

  // ---------- BEVERAGES ----------

  "Masala Chai":
    "photo-1544787219-7f47ccb76574",

  "Filter Coffee":
    "photo-1511920170033-f8396924c348",

  "Cappuccino":
    "photo-1509042239860-f550ce710b93",

  "Cold Coffee":
    "photo-1461023058943-07fcbe16d735",

  "Fresh Lime Soda":
    "photo-1513558161293-cdaf765edfd7",

  "Sweet Lassi":
    "photo-1553787499-6f9133860278",

  "Mango Shake":
    "photo-1570197788417-0e82375c9371",

  "Chocolate Milkshake":
    "photo-1563805042-7684c019e1cb",

  "Iced Tea":
    "photo-1556679343-c7306c1976bc",

  "Fresh Watermelon Juice":
    "photo-1497534446932-c925b458314e",
};

// ==========================================
// ITEM QUANTITY & PORTION DESCRIPTIONS
// ==========================================

const itemDescriptions = {
  // Breakfast
  "Masala Dosa": "1 Crispy Dosa with spiced potato filling, served with Sambar & 2 Chutneys (Serves 1)",
  "Idli Sambar": "2 Pcs Steamed soft Idlis served with hot Sambar & Coconut Chutney",
  "Poha": "1 Plate (approx. 250g) freshly tempered flattened rice with peanuts, onions & sev",
  "Aloo Paratha": "1 Large Stuffed Paratha served with fresh Curd & mixed Pickle",
  "Veg Upma": "1 Plate (approx. 250g) roasted semolina with fresh veggies & coconut chutney",
  "Chole Bhature": "2 Pcs Fluffy golden Bhature with spicy Punjabi Chole & onion salad",
  "Paneer Sandwich": "2 Grilled triangular quarters loaded with fresh spiced paneer & mint chutney",
  "Bread Omelette": "2 Fresh toasted bread slices with a 2-egg masala omelette",
  "Masala Uttapam": "1 Thick savory pancake topped with onion, tomato & chilies (Serves 1)",
  "Veg Breakfast Wrap": "1 Jumbo roll filled with sautéed veggies, corn & creamy dressing",

  // Lunch
  "Veg Thali": "Full Meal: 3 Rotis, Rice, Dal, Paneer Gravy, Dry Veg, Salad & Sweet (Serves 1)",
  "Paneer Butter Masala": "1 Bowl (approx. 300g) rich butter tomato gravy with cottage cheese cubes (Serves 1-2)",
  "Dal Tadka Rice": "1 Bowl aromatic Jeera Rice with 1 Bowl yellow Dal Tadka (Serves 1)",
  "Rajma Chawal": "1 Large Plate Steamed Basmati Rice with authentic Punjabi Rajma (Serves 1)",
  "Chole Rice": "1 Large Plate fragrant Steamed Rice topped with spicy Punjabi Chole (Serves 1)",
  "Jeera Rice & Dal Makhani": "1 Bowl slow-cooked creamy Dal Makhani with fragrant Jeera Rice (Serves 1)",
  "Mixed Veg Curry & Roti": "4 Fresh Tawa Rotis with seasonal mixed vegetable curry (Serves 1)",
  "Palak Paneer": "1 Bowl (approx. 300g) smooth spiced spinach gravy with soft paneer cubes (Serves 1-2)",
  "Veg Biryani": "1 Dum Biryani Plate (approx. 350g) with aromatic spices, served with Raita (Serves 1)",
  "Sambar Rice": "1 Large Bowl (approx. 350g) South Indian spiced lentil rice with papad (Serves 1)",
  "Kadhi Chawal": "1 Large Plate Steamed Rice with authentic Punjabi Pakoda Kadhi (Serves 1)",
  "Egg Curry & Rice": "2 Boiled Eggs in rich spiced onion-tomato curry served with Steamed Rice (Serves 1)",
  "Egg Curry": "2 Boiled Eggs in rich spiced onion-tomato gravy (approx. 250g, Serves 1)",
  "Chicken Curry & Rice": "2 Tender Chicken pieces in home-style spiced curry with Basmati Rice (Serves 1)",
  "Tandoori Roti Combo": "4 Butter Tandoori Rotis with choice of Dal Makhani or Paneer Gravy (Serves 1)",
  "Tandoori Roti": "2 Pcs Fresh clay oven-baked whole wheat Tandoori Rotis",
  "Kadai Paneer & Roti": "1 Bowl Kadai Paneer with bell peppers, served with 3 Tawa Rotis (Serves 1)",
  "Kadai Paneer": "1 Bowl (approx. 300g) spiced paneer with bell peppers & kadai masala (Serves 1-2)",

  // Snacks
  "Samosa Plate": "2 Pcs Crispy golden Samosas filled with spiced potatoes, served with 2 Chutneys",
  "Veg Puff": "1 Pc Golden baked flaky puff stuffed with seasoned mixed vegetables",
  "Paneer Puff": "1 Pc Crisp oven-baked puff pastry stuffed with spiced cottage cheese filling",
  "Veg Burger": "1 Pc Crispy vegetable patty burger with fresh lettuce, tomato & creamy mayo",
  "French Fries": "1 Medium Basket (approx. 150g) salted golden crispy fries with dip",
  "Aloo Tikki Chaat": "2 Pcs Crispy spiced potato patties topped with sweet curd & tangy chutneys",
  "Pav Bhaji": "2 Butter-toasted Pavs served with rich mashed vegetable bhaji, onion & lemon",
  "Bhel Puri": "1 Large Bowl (approx. 200g) crunchy puffed rice tossed with tangy imli & mint chutneys",
  "Vada Pav": "1 Pc Spicy Batata Vada inside butter-toasted pav with dry garlic chutney",
  "Grilled Veg Sandwich": "2 Grilled 3-layered sandwich squares filled with fresh veggies & melted cheese",
  "Paneer Roll": "1 Pc Flaky Paratha wrap packed with marinated paneer tikkas, onions & sauce",
  "Veg Momos": "6 Pcs Steamed vegetable dumplings served with spicy red momo chili chutney",
  "Cheese Toast": "2 Pcs Crispy toasted bread slices with melted seasoned mozzarella cheese",
  "Chicken Sandwich": "2 Triple-layer grilled sandwich quarters with shredded spiced chicken & mayo",
  "Dhokla Plate": "4 Pcs Soft & spongy steamed fermented gram flour dhoklas with green chilies",

  // Beverages
  "Masala Chai": "1 Cup (approx. 150ml) freshly brewed Indian spiced tea with ginger & cardamom",
  "Filter Coffee": "1 Traditional Tumbler (approx. 150ml) authentic South Indian chicory blend coffee",
  "Cappuccino": "1 Mug (approx. 200ml) freshly brewed espresso with rich steamed milk froth",
  "Cold Coffee": "1 Tall Glass (approx. 300ml) thick blended chilled coffee with vanilla ice cream",
  "Fresh Lime Soda": "1 Glass (approx. 300ml) sparkling chilled soda with fresh lime (Sweet / Salted)",
  "Sweet Lassi": "1 Glass (approx. 300ml) thick Punjabi churned sweet yogurt topped with malai",
  "Mango Shake": "1 Tall Glass (approx. 300ml) thick Alphonso mango shake with fresh milk",
  "Chocolate Milkshake": "1 Tall Glass (approx. 300ml) rich chocolate ganache blended chilled milkshake",
  "Iced Tea": "1 Tall Glass (approx. 300ml) chilled lemon peach iced black tea with fresh mint",
  "Fresh Watermelon Juice": "1 Glass (approx. 300ml) 100% pure cold-pressed fresh watermelon juice (no water added)"
};

// ==========================================
// CREATE DAILY MENU
// ==========================================

const dailyMenu = Object.entries(menu).flatMap(
  ([category, dishes]) =>
    dishes.map(([name, price, isVeg = true], i) => {
      const photoId = foodImages[name];

      if (!photoId) {
        throw new Error(
          `Missing Unsplash image for: ${name}`
        );
      }

      return {
        name,
        price,
        isVeg,
        category,

        description:
          itemDescriptions[name] ||
          `Freshly prepared portion of ${name.toLowerCase()} · Serves 1`,

        preparationTime:
          category === "Lunch"
            ? 20
            : category === "Breakfast"
            ? 12
            : 8,

        isPopular: i < 2,

        image: unsplash(photoId),

        isAvailable: true,
      };
    })
);

// ==========================================
// VALIDATION
// ==========================================

// Ensure every item has its own image ID.
const allPhotoIds = dailyMenu.map(
  (item) => foodImages[item.name]
);

const uniquePhotoIds = new Set(allPhotoIds);

if (uniquePhotoIds.size !== dailyMenu.length) {
  throw new Error(
    "Duplicate Unsplash images detected in menu."
  );
}

console.log(
  `Menu ready: ${dailyMenu.length} items, ` +
  `${uniquePhotoIds.size} unique image references`
);

// ==========================================
// EXPORT
// ==========================================

module.exports = { dailyMenu };
