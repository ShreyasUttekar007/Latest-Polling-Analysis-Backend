const mongoose = require("mongoose");
const { Schema } = mongoose;
const bcrypt = require("bcrypt");

const assemblyConstituencies = [
  "1-Akkalkuwa (ST)",
  "5-Sakri (ST)",
  "10-Chopda (ST)",
  "14-Jalgaon Rural",
  "16-Erandol",
  "18-Pachora",
  "20-Muktainagar",
  "22-Buldhana",
  "24-Sindhkhed Raja",
  "25-Mehkar (SC)",
  "29-Balapur",
  "33-Risod",
  "40-Daryapur",
  "59-Ramtek",
  "61-Bhandara (SC)",
  "79-Digras",
  "84-Hadgaon",
  "86-Nanded North",
  "87-Nanded South",
  "93-Kalamnuri",
  "96-Parbhani",
  "100-Gansavangi",
  "101-Jalna",
  "104-Sillod",
  "105-Kannad",
  "107-Aurangabad (Central)",
  "108-Aurangabad (West) (SC)",
  "110-Paithan",
  "112-Vaijapur",
  "113-Nandgaon",
  "115-Malegaon (Outer)",
  "126-Deolali",
  "130-Palghar (ST)",
  "131-Boisar (ST)",
  "134-Bhiwandi Rural (ST)",
  "137-Bhiwandi East",
  "138-Kalyan West",
  "140-Ambarnath (SC)",
  "144-Kalyan Rural",
  "146-Ovala Majiwada",
  "147-Kopri Pachpakhadi",
  "154-Magathane",
  "156-Vikhroli",
  "157-Bhandup West",
  "158-Jogeshwari East",
  "159-Dindoshi",
  "166-Andheri East",
  "168-Chandivali",
  "171-Mankhurd Shivaji Nagar",
  "173-Chembur",
  "174-Kurla (SC)",
  "178-Dharavi (SC)",
  "181-Mahim",
  "182-Worli",
  "184-Byculla",
  "186-Mumbadevi",
  "189-Karjat",
  "192-Alibag",
  "194-Mahad",
  "202-Purandar",
  "217-Sangmner",
  "220-Shrirampur (SC)",
  "221-Nevasa",
  "240-Omerga (SC)",
  "242-Dharashiv",
  "243-Paranda",
  "244-Karmala",
  "246-Barshi",
  "253-Sangola",
  "257-Koregaon",
  "261-Patan",
  "263-Dapoli",
  "264-Guhagar",
  "266-Ratnagiri",
  "267-Rajapur",
  "269-Kudal",
  "270-Sawantwadi",
  "272-Radhanagari",
  "275-Karvir",
  "276-Kolhapur North",
  "286-Khanapur",
];

const UserSchema = new Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: true,
      trim: true,
      minlength: 6,
    },
    roles: {
      type: [
        {
          type: String,
          enum: ["admin", "mod", "user", ...assemblyConstituencies],
        },
      ],
      default: ["user"],
    },
  },
  { timestamps: true }
);
UserSchema.pre("save", function (next) {
  const user = this;
  if (!user.isModified("password")) return next();
  bcrypt.genSalt(10, function (err, salt) {
    if (err) return next(err);
    bcrypt.hash(user.password, salt, function (err, hash) {
      if (err) return next(err);
      user.password = hash;
      next();
    });
  });
});
UserSchema.methods.comparePassword = function (candidatePassword, next) {
  bcrypt.compare(candidatePassword, this.password, function (err, isMatch) {
    if (err) return next(err);
    next(null, isMatch);
  });
};

const User = mongoose.model("User", UserSchema);

module.exports = User;
