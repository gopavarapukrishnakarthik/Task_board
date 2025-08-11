const jwt = require("jsonwebtoken");

function verifyToken(req, res, next) {
  console.log("Authorization header:", req.headers.authorization);
  console.log("Cookies:", req.cookies);

  let token = req.cookies.token;

  if (!token && req.headers.authorization) {
    const parts = req.headers.authorization.split(" ");
    if (parts.length === 2 && parts[0] === "Bearer") {
      token = parts[1];
    }
  }

  if (!token) {
    return res.status(401).json({ message: "Unauthorized - no token found" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log("Decoded token:", decoded);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ message: "Invalid token" });
  }
}

function requireLead(req, res, next) {
  if (req.user.role !== "lead")
    return res.status(403).json({ message: "Lead access only" });
  next();
}

module.exports = { verifyToken, requireLead };
