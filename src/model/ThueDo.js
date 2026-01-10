const mongoose = require('mongoose');

const ThueDo_Schema = new mongoose.Schema({   
        text: { type: String, default: '' },                        
    },
    { 
        timestamps: true,   // createAt, updateAt
    }
);

module.exports = mongoose.model("ThueDo", ThueDo_Schema);