const express = require("express");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const db = require("../config/database");
const User = require("../models/User");
const router = express.Router();

router.post("/register", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password required" });
    }

    // Check if user exists
    db.get("SELECT id FROM users WHERE email = ?", [email], async (err, row) => {
      if (err) return res.status(500).json({ message: err.message });
      if (row) return res.status(400).json({ message: "Email already used" });

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 12);

      // Insert new user
      db.run(
        "INSERT INTO users (email, password) VALUES (?, ?)",
        [email, hashedPassword],
        async function (err) {
          if (err) return res.status(500).json({ message: err.message });

          try {
            // Create MongoDB user
            const mongoUser = new User({
              email,
              password: hashedPassword, // Store hashed password
              name: email.split('@')[0] // Default name from email
            });
            await mongoUser.save();

            // Create JWT token
            const token = jwt.sign({ id: this.lastID, userId: mongoUser._id }, process.env.JWT_SECRET, {
              expiresIn: "7d",
            });
            res.status(201).json({ token, email });
          } catch (mongoErr) {
            // If MongoDB fails, still allow registration but log error
            console.error('MongoDB user creation failed:', mongoErr);
            const token = jwt.sign({ id: this.lastID }, process.env.JWT_SECRET, {
              expiresIn: "7d",
            });
            res.status(201).json({ token, email });
          }
        }
      );
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    db.get(
      "SELECT id, email, password FROM users WHERE email = ?",
      [email],
      async (err, user) => {
        if (err) return res.status(500).json({ message: err.message });
        if (!user) {
          return res.status(401).json({ message: "Invalid credentials" });
        }

        // Compare passwords
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
          return res.status(401).json({ message: "Invalid credentials" });
        }

        // Find MongoDB user
        const mongoUser = await User.findOne({ email: user.email });

        // Create JWT token
        const token = jwt.sign({ 
          id: user.id, 
          userId: mongoUser ? mongoUser._id : null 
        }, process.env.JWT_SECRET, {
          expiresIn: "7d",
        });
        res.json({ token, email: user.email });
      }
    );
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
