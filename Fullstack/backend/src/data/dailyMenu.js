// Initial, editable menu. Saved to MongoDB ONCE per franchise; it is NOT fake fallback data.
// Owners may edit, disable or delete any seeded item without it being recreated on restart.
const menu = {
  Breakfast: [
    ['Masala Dosa',95],['Idli Sambar',75],['Poha',65],['Aloo Paratha',85],['Veg Upma',65],
    ['Chole Bhature',115],['Paneer Sandwich',110],['Bread Omelette',90,false],['Masala Uttapam',105],['Veg Breakfast Wrap',115],
  ],
  Lunch: [
    ['Veg Thali',160],['Paneer Butter Masala',175],['Dal Tadka Rice',135],['Rajma Chawal',125],['Chole Rice',125],
    ['Jeera Rice & Dal Makhani',155],['Mixed Veg Curry & Roti',145],['Palak Paneer',170],['Veg Biryani',155],['Sambar Rice',125],
    ['Kadhi Chawal',125],['Egg Curry & Rice',165,false],['Chicken Curry & Rice',205,false],['Tandoori Roti Combo',145],['Kadai Paneer & Roti',185],
  ],
  Snacks: [
    ['Samosa Plate',50],['Veg Puff',55],['Paneer Puff',75],['Veg Burger',105],['French Fries',95],
    ['Aloo Tikki Chaat',95],['Pav Bhaji',125],['Bhel Puri',75],['Vada Pav',65],['Grilled Veg Sandwich',105],
    ['Paneer Roll',125],['Veg Momos',105],['Cheese Toast',95],['Chicken Sandwich',145,false],['Dhokla Plate',75],
  ],
  Beverages: [
    ['Masala Chai',35],['Filter Coffee',50],['Cappuccino',95],['Cold Coffee',115],['Fresh Lime Soda',65],
    ['Sweet Lassi',75],['Mango Shake',105],['Chocolate Milkshake',125],['Iced Tea',85],['Fresh Watermelon Juice',95],
  ],
};
const images = {
  Breakfast: [
    'photo-1525351484163-7529414344d8','photo-1533089860892-a7c6f0a88666','photo-1525351484163-7529414344d8',
  ],
  Lunch: ['photo-1547592180-85f173990554','photo-1512621776951-a57141f2eefd','photo-1603894584373-5ac82b2ae398'],
  Snacks: ['photo-1568901346375-23c9450c58cd','photo-1573080496219-bb080dd4f877','photo-1601050690597-df0568f70950'],
  Beverages: ['photo-1511920170033-f8396924c348','photo-1544145945-f90425340c7e','photo-1509042239860-f550ce710b93'],
};
const dailyMenu = Object.entries(menu).flatMap(([category, dishes]) => dishes.map(([name,price,isVeg=true], i) => ({
  name, price, isVeg, category,
  description: `Freshly prepared ${name.toLowerCase()} · available daily while stocks last.`,
  preparationTime: category === 'Lunch' ? 20 : category === 'Breakfast' ? 12 : 8,
  isPopular: i < 2,
  image: `https://images.unsplash.com/${images[category][i % images[category].length]}?auto=format&fit=crop&w=850&q=82`,
  isAvailable: true,
})));
module.exports = { dailyMenu };
