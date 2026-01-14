const jwt = require('jsonwebtoken');
const User = require('../models/User');

const agentMiddleware = async (req, res, next) => {
    console.log('checking')
  try {
    // Get the token from the request header
    const token = req.header('Authorization').replace('Bearer ', '');
    console.log(token, 'token')
    if (!token) {
      return res.status(401).json({ message: 'Unauthorized access' });
    }
    // Verify the token
    const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
    // Find the user in the database based on the decoded token
    const user = await User.findById(decodedToken.userId);
    if (!user) {
      return res.status(401).json({ message: 'Unauthorized access' });
    }
    // Check if the user is an agent
    if (user.role !== 'agent') {
      return res.status(401).json({ message: 'Unauthorized access' });
    }
    // Check if the requested property is listed by the logged in agent
    if (req.params.agentId !== user._id.toString()) {
      return res.status(401).json({ message: 'Unauthorized access' });
    }
    // If all checks pass, move on to the next middleware or route handler
    next();
  } catch (err) {
    console.log(err, 'err')
    return res.status(401).json({ message: 'Unauthorized access' });
  }
};

module.exports = agentMiddleware;
