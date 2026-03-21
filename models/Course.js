const mongoose = require('mongoose');

const courseSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  yearLevel: { type: String, required: true },
  term: { type: String, required: true },
  code: { type: String, required: true },
  name: { type: String, required: true },
  prerequisites: { type: String, default: '' },
  coRequisites: { type: String, default: '' },
  units: { type: Number, default: 0 },
  status: {
    type: String,
    enum: ['Completed', 'Taking', 'Pending', 'Retake', 'To Take', 'Future'],
    default: 'Future'
  },
  notes: { type: String, default: '' },
  updatedAt: { type: Date, default: Date.now }
});

courseSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Course', courseSchema);
