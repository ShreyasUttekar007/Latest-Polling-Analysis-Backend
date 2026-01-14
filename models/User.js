const mongoose = require("mongoose");
const { Schema } = mongoose;
const bcrypt = require("bcrypt");

const assemblyConstituencies = [
  "1-Akkalkuwa (ST)",
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
