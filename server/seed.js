import User from './models/User.js';
import mongoose from 'mongoose';

await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/siteflow');

const adminEmail = 'monkdev9@gmail.com';

let admin = await User.findOne({ email: adminEmail });
if (!admin) {
  admin = new User({
    email: adminEmail,
    isAdmin: true,
    displayName: 'Solace',
    isSetup: false,
    mustSetPassword: true
  });
  await admin.save();
  console.log('✅ Admin "Solace" created. Must set password on first login.');
} else {
  console.log('🟢 Admin already exists.');
}

process.exit(0);
