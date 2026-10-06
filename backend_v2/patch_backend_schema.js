const fs = require('fs');
const path = require('path');
const file = path.resolve('drizzle/schema/rides.js');
const content = fs.readFileSync(file, 'utf8');
const newContent = content.replace(
  `paymentMethod:  varchar('payment_method', { length: 10 }),`,
  `paymentMethod:  varchar('payment_method', { length: 50 }),`
);
fs.writeFileSync(file, newContent);
