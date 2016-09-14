'use strict';

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const Translations = new Schema({
  language: {type: String, required: true},
  source: {type: String, required: true},
  target: {type: String},
  transaction: {type: Schema.Types.ObjectId, ref: 'DatasetTransactions', required: true}
});

module.exports = mongoose.model('Translations', Translations);
