const {dailyMenu} = require('../src/data/dailyMenu');
const expected={Breakfast:10,Lunch:15,Snacks:15,Beverages:10};
const counts={};
const seen=new Set();
for (const item of dailyMenu) {
  counts[item.category]=(counts[item.category]||0)+1;
  if (!item.name || !(item.price>0) || !item.image) throw new Error('Invalid starter item');
  const key=`${item.category}:${item.name.trim().toLowerCase()}`;
  if(seen.has(key))throw new Error(`Duplicate starter dish: ${key}`);
  seen.add(key);
}
if (Object.keys(expected).some(k=>counts[k]!==expected[k]) || dailyMenu.length!==50) throw new Error(`Menu counts wrong: ${JSON.stringify(counts)}`);
console.log('Starter menu validated:', JSON.stringify(counts),'(50 total)');
