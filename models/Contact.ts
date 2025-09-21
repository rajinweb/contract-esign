import mongoose from 'mongoose';

const ContactSchema = new mongoose.Schema({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String, required: false },
  companyName: { type: String, required: false },
  jobTitle: { type: String, required: false },
  address: {
    country: { type: String, required: false },
    streetAddress: { type: String, required: false },
    apartment: { type: String, required: false },
    city: { type: String, required: false },
    state: { type: String, required: false },
    zipCode: { type: String, required: false },
  },
  description: { type: String, required: false },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'Users', required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

export default mongoose.models.Contact || mongoose.model('Contact', ContactSchema);