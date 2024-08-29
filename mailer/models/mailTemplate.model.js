import mongoose from 'mongoose';

const mailTemplateSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
  },
  subject: {
    type: String,
    required: true,
  },
  body: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

mailTemplateSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

mailTemplateSchema.statics.findByName = function (name) {
  return this.findOne({ name });
};

const MailTemplate = mongoose.model('MailTemplate', mailTemplateSchema);

export default MailTemplate;
