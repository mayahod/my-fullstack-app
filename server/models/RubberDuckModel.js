const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const rubberDuckSchema = new Schema({
    name: {
        type: String,
        required: true
    },
    color: {
        type: String,
        required: true
    },
    imageUrl: {
        type: String,
        required: true
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('RubberDuck', rubberDuckSchema);