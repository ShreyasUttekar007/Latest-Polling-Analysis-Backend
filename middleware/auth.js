// middleware/auth.js
const jwt = require("jsonwebtoken");
const User = require("../models/User");

async function auth(req, res, next) {
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;

    if (!token) return res.status(401).json({ error: "Missing token" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET); 
    // decoded should contain userId (or id) based on how you sign it
    const userId = decoded.userId || decoded.id;
    if (!userId) return res.status(401).json({ error: "Invalid token payload" });

    const user = await User.findById(userId).select("email roles");
    if (!user) return res.status(401).json({ error: "User not found" });

    req.user = {
      _id: user._id,
      email: user.email,
      roles: user.roles || [],
      isAdmin: (user.roles || []).includes("admin"),
    };

    next();
  } catch (err) {
    return res.status(401).json({ error: "Unauthorized" });
  }
}

module.exports = { auth };
