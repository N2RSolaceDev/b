import mongoose from 'mongoose';

const requestSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  budget: {
    type: Number
  },
  price: {
    type: Number
  },
  bmacLink: {
    type: String
  },
  status: {
    type: String,
    enum: ['pending', 'quoted', 'paid', 'completed'],
    default: 'pending'
  }
}, { timestamps: true });

export default mongoose.model('Request', requestSchema);
