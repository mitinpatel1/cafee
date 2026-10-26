// Office cafeteria menu. Used as fallback when the backend /api/menu is empty or unreachable.
// Same fields as the backend MenuItem model, so seed-menu.json can be imported as-is.
const U = (id) => `https://images.unsplash.com/${id}?w=600&auto=format&fit=crop&q=80`;

export const MENU_ITEMS = [
  // ---------- Breakfast ----------
  { _id: 'bf01', name: 'Poha', description: 'Light flattened rice with peanuts, curry leaves and lemon.', price: 30, category: 'Breakfast', isVeg: true, isPopular: true, rating: 4.6, preparationTime: 5, calories: 250, emoji: '🍚' },
  { _id: 'bf02', name: 'Masala Upma', description: 'Soft semolina cooked with veggies and mustard tempering.', price: 35, category: 'Breakfast', isVeg: true, rating: 4.3, preparationTime: 6, calories: 280, emoji: '🥣' },
  { _id: 'bf03', name: 'Aloo Paratha with Curd', description: 'Two hot parathas stuffed with spiced potato, served with curd and pickle.', price: 55, category: 'Breakfast', isVeg: true, isPopular: true, rating: 4.7, preparationTime: 10, calories: 420, emoji: '🫓' },
  { _id: 'bf04', name: 'Idli Sambar', description: 'Three steamed idlis with sambar and coconut chutney.', price: 45, category: 'Breakfast', isVeg: true, rating: 4.5, preparationTime: 6, calories: 230, emoji: '🍥' },
  { _id: 'bf05', name: 'Masala Dosa', description: 'Crisp dosa with potato masala, sambar and chutney.', price: 65, category: 'Breakfast', isVeg: true, rating: 4.6, preparationTime: 10, calories: 340, emoji: '🌯' },
  { _id: 'bf06', name: 'Veg Sandwich', description: 'Fresh veggies, mint chutney and cheese between toasted bread.', price: 40, category: 'Breakfast', isVeg: true, rating: 4.4, preparationTime: 5, calories: 260, emoji: '🥪', image: U('photo-1528735602780-2552fd46c7af') },
  { _id: 'bf07', name: 'Bread Omelette', description: 'Masala omelette in two toasted bread slices.', price: 45, category: 'Breakfast', isVeg: false, rating: 4.4, preparationTime: 7, calories: 310, emoji: '🍳' },
  { _id: 'bf08', name: 'Boiled Eggs (2 pc)', description: 'High-protein start to the day, with salt and pepper.', price: 30, category: 'Breakfast', isVeg: false, rating: 4.2, preparationTime: 3, calories: 150, emoji: '🥚' },

  // ---------- Lunch ----------
  { _id: 'ln01', name: 'Veg Thali', description: '2 roti, dal, seasonal sabzi, rice, salad and sweet.', price: 90, category: 'Lunch', isVeg: true, isPopular: true, rating: 4.7, preparationTime: 8, calories: 650, emoji: '🍱' },
  { _id: 'ln02', name: 'Dal Rice Combo', description: 'Dal tadka with steamed rice, papad and pickle.', price: 70, category: 'Lunch', isVeg: true, rating: 4.4, preparationTime: 6, calories: 480, emoji: '🍛' },
  { _id: 'ln03', name: 'Rajma Chawal', description: 'Slow-cooked rajma curry with jeera rice and onion salad.', price: 80, category: 'Lunch', isVeg: true, isPopular: true, rating: 4.6, preparationTime: 8, calories: 560, emoji: '🍛' },
  { _id: 'ln04', name: 'Paneer Butter Masala with Naan', description: 'Creamy paneer gravy with 2 butter naan and salad.', price: 120, category: 'Lunch', isVeg: true, isPopular: true, rating: 4.8, preparationTime: 12, calories: 720, emoji: '🧀', image: U('photo-1631452180519-c014fe946bc7') },
  { _id: 'ln05', name: 'Chole Bhature', description: 'Spicy chole with two fluffy bhature, onion and pickle.', price: 75, category: 'Lunch', isVeg: true, rating: 4.5, preparationTime: 10, calories: 640, emoji: '🫓' },
  { _id: 'ln06', name: 'Veg Pulao with Raita', description: 'Fragrant rice cooked with vegetables, served with raita.', price: 75, category: 'Lunch', isVeg: true, rating: 4.3, preparationTime: 8, calories: 440, emoji: '🍚' },
  { _id: 'ln07', name: 'Roti Sabzi Meal', description: '4 roti with one dry sabzi and dal. Quick and light.', price: 60, category: 'Lunch', isVeg: true, rating: 4.2, preparationTime: 6, calories: 420, emoji: '🫓' },
  { _id: 'ln08', name: 'Chicken Biryani', description: 'Hyderabadi-style biryani with raita and salan.', price: 130, category: 'Lunch', isVeg: false, isPopular: true, rating: 4.7, preparationTime: 12, calories: 700, emoji: '🍗', image: U('photo-1563379091339-03b21ab4a4f8') },
  { _id: 'ln09', name: 'Egg Curry Rice', description: 'Home-style egg curry with steamed rice.', price: 95, category: 'Lunch', isVeg: false, rating: 4.3, preparationTime: 10, calories: 560, emoji: '🍳' },
  { _id: 'ln10', name: 'Healthy Salad Bowl', description: 'Greens, cucumber, corn, chickpeas and lemon dressing.', price: 80, category: 'Lunch', isVeg: true, rating: 4.4, preparationTime: 5, calories: 220, emoji: '🥗', image: U('photo-1512621776951-a57141f2eefd') },

  // ---------- Snacks ----------
  { _id: 'sn01', name: 'Samosa (2 pc)', description: 'Crispy potato samosas with green and tamarind chutney.', price: 25, category: 'Snacks', isVeg: true, isPopular: true, rating: 4.6, preparationTime: 3, calories: 300, emoji: '🥟', image: U('photo-1601050690597-df0568f70950') },
  { _id: 'sn02', name: 'Veg Burger Combo', description: 'Veg burger with fries and a cold drink.', price: 95, category: 'Snacks', isVeg: true, isPopular: true, rating: 4.5, preparationTime: 8, calories: 640, emoji: '🍔', image: U('photo-1568901346375-23c9450c58cd') },
  { _id: 'sn03', name: 'Grilled Veg Sandwich', description: 'Grilled with cheese, capsicum, tomato and onion.', price: 55, category: 'Snacks', isVeg: true, rating: 4.5, preparationTime: 6, calories: 330, emoji: '🥪', image: U('photo-1528735602780-2552fd46c7af') },
  { _id: 'sn04', name: 'Veg Maggi', description: 'Masala Maggi with peas and carrots.', price: 40, category: 'Snacks', isVeg: true, rating: 4.4, preparationTime: 5, calories: 310, emoji: '🍜' },
  { _id: 'sn05', name: 'Pav Bhaji', description: 'Buttery bhaji with two toasted pav and lemon.', price: 70, category: 'Snacks', isVeg: true, rating: 4.6, preparationTime: 8, calories: 480, emoji: '🍞' },
  { _id: 'sn06', name: 'Veg Momos (6 pc)', description: 'Steamed momos with spicy red chutney.', price: 60, category: 'Snacks', isVeg: true, rating: 4.3, preparationTime: 8, calories: 260, emoji: '🥟' },
  { _id: 'sn07', name: 'French Fries', description: 'Crispy salted fries with ketchup.', price: 50, category: 'Snacks', isVeg: true, rating: 4.2, preparationTime: 5, calories: 365, emoji: '🍟' },
  { _id: 'sn08', name: 'Bread Pakora', description: 'Gram-flour coated bread stuffed with potato, deep fried.', price: 25, category: 'Snacks', isVeg: true, rating: 4.1, preparationTime: 4, calories: 280, emoji: '🍘' },
  { _id: 'sn09', name: 'Chicken Sandwich', description: 'Grilled chicken, lettuce and mayo in brown bread.', price: 80, category: 'Snacks', isVeg: false, rating: 4.4, preparationTime: 8, calories: 420, emoji: '🥪' },

  // ---------- Beverages ----------
  { _id: 'bv01', name: 'Masala Chai', description: 'Kadak ginger-elaichi chai, the office classic.', price: 15, category: 'Beverages', isVeg: true, isPopular: true, rating: 4.8, preparationTime: 3, calories: 90, emoji: '☕' },
  { _id: 'bv02', name: 'Filter Coffee', description: 'Hot, strong South Indian style coffee.', price: 25, category: 'Beverages', isVeg: true, rating: 4.5, preparationTime: 3, calories: 80, emoji: '☕', image: U('photo-1495474472287-4d71bcdd2085') },
  { _id: 'bv03', name: 'Cold Coffee', description: 'Blended chilled coffee with ice cream.', price: 50, category: 'Beverages', isVeg: true, isPopular: true, rating: 4.6, preparationTime: 4, calories: 210, emoji: '🥤' },
  { _id: 'bv04', name: 'Green Tea', description: 'Light and refreshing, no sugar added.', price: 20, category: 'Beverages', isVeg: true, rating: 4.2, preparationTime: 3, calories: 5, emoji: '🍵' },
  { _id: 'bv05', name: 'Fresh Lime Soda', description: 'Sweet or salted, made fresh to order.', price: 30, category: 'Beverages', isVeg: true, rating: 4.4, preparationTime: 3, calories: 70, emoji: '🍋' },
  { _id: 'bv06', name: 'Chaas (Buttermilk)', description: 'Spiced chilled buttermilk with roasted jeera.', price: 20, category: 'Beverages', isVeg: true, rating: 4.5, preparationTime: 2, calories: 60, emoji: '🥛' },
  { _id: 'bv07', name: 'Mango Lassi', description: 'Thick sweet lassi blended with mango pulp.', price: 40, category: 'Beverages', isVeg: true, rating: 4.6, preparationTime: 3, calories: 230, emoji: '🥭' },
  { _id: 'bv08', name: 'Fresh Orange Juice', description: 'Freshly squeezed, no added sugar.', price: 50, category: 'Beverages', isVeg: true, rating: 4.4, preparationTime: 4, calories: 110, emoji: '🍊' },
  { _id: 'bv09', name: 'Black Coffee', description: 'Strong and sugar-free for long meetings.', price: 20, category: 'Beverages', isVeg: true, rating: 4.1, preparationTime: 2, calories: 5, emoji: '☕' },

  // ---------- Desserts ----------
  { _id: 'ds01', name: 'Gulab Jamun (2 pc)', description: 'Warm, soft jamuns in sugar syrup.', price: 30, category: 'Desserts', isVeg: true, isPopular: true, rating: 4.7, preparationTime: 2, calories: 300, emoji: '🍡' },
  { _id: 'ds02', name: 'Fruit Salad', description: 'Seasonal cut fruits with a hint of chaat masala.', price: 40, category: 'Desserts', isVeg: true, rating: 4.3, preparationTime: 3, calories: 120, emoji: '🍉' },
  { _id: 'ds03', name: 'Chocolate Brownie', description: 'Fudgy brownie with walnut bits.', price: 50, category: 'Desserts', isVeg: true, rating: 4.5, preparationTime: 2, calories: 340, emoji: '🍫' },
  { _id: 'ds04', name: 'Kheer', description: 'Slow-cooked rice pudding with dry fruits.', price: 35, category: 'Desserts', isVeg: true, rating: 4.4, preparationTime: 2, calories: 240, emoji: '🍮' },
  { _id: 'ds05', name: 'Ice Cream Cup', description: 'Vanilla, chocolate or butterscotch.', price: 30, category: 'Desserts', isVeg: true, rating: 4.3, preparationTime: 2, calories: 180, emoji: '🍨' },
].map((i) => ({ isAvailable: true, isPopular: false, ...i }));

export const CATEGORIES = [
  { id: 'Breakfast', icon: '🍳' },
  { id: 'Lunch', icon: '🍱' },
  { id: 'Snacks', icon: '🥪' },
  { id: 'Beverages', icon: '☕' },
  { id: 'Desserts', icon: '🍰' },
];

// Tries backend first; falls back to local data so the UI never shows an empty menu.
export const filterLocal = ({ category, search } = {}) => {
  let list = MENU_ITEMS;
  if (category && category !== 'All Items' && category !== 'All') list = list.filter((i) => i.category === category);
  if (search) {
    const q = search.toLowerCase();
    list = list.filter((i) => i.name.toLowerCase().includes(q) || i.description.toLowerCase().includes(q));
  }
  return list.map((i) => ({ ...i }));
};
