import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },
  password: {
    type: String
  },
  isAdmin: {
    type: Boolean,
    default: false
  },
  displayName: {
    type: String
  },
  bmacLink: {
    type: String,
    validate: {
      validator: (v) => !v || v.startsWith('https://buymeacoffee.com/'),
      message: 'Must be a valid BuyMeACoffee link'
    }
  },
  isSetup: {
    type: Boolean,
    default: false
  },
  mustSetPassword: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

export default mongoose.model('User', userSchema);
