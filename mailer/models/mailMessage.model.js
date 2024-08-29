import mongoose from 'mongoose';

const mailMessageSchema = new mongoose.Schema({
  to: {
    type: String,
    required: true,
  },
  from: {
    type: String,
    required: true,
  },
  subject: {
    type: String,
    required: true,
  },
  body: {
    type: String,
    required: true,
  },
  template: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MailTemplate',
  },
  sentAt: {
    type: Date,
    default: null,
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

mailMessageSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

const MailMessage = mongoose.model('MailMessage', mailMessageSchema);

export default MailMessage;
