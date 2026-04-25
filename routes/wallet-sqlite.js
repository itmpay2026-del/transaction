const express = require("express");
const db = require("../config/database");
const auth = require("../middleware/auth-sqlite");
const router = express.Router();

// Get balance
router.get("/balance", auth, async (req, res) => {
  try {
    db.get(
      "SELECT balance FROM users WHERE email = ?",
      [req.user.email],
      (err, row) => {
        if (err) return res.status(500).json({ message: err.message });
        if (!row) return res.status(404).json({ message: "User not found" });
        res.json({ balance: row.balance });
      }
    );
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get transaction history (last 20)
router.get("/history", auth, async (req, res) => {
  try {
    db.get(
      "SELECT id FROM users WHERE email = ?",
      [req.user.email],
      (err, user) => {
        if (err) return res.status(500).json({ message: err.message });
        if (!user) return res.status(404).json({ message: "User not found" });

        db.all(
          `SELECT * FROM transactions WHERE userId = ? ORDER BY createdAt DESC LIMIT 20`,
          [user.id],
          (err, transactions) => {
            if (err) return res.status(500).json({ message: err.message });
            res.json({ transactions });
          }
        );
      }
    );
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Send money
router.post("/send", auth, async (req, res) => {
  try {
    const { receiverEmail, amount } = req.body;
    const senderEmail = req.user.email;

    if (!receiverEmail || !amount) {
      return res.status(400).json({ message: "Receiver email and amount are required" });
    }
    if (typeof amount !== "number" || amount <= 0) {
      return res.status(400).json({ message: "Amount must be a positive number" });
    }
    if (senderEmail === receiverEmail) {
      return res.status(400).json({ message: "Cannot send to yourself" });
    }

    // Get sender and receiver
    db.get("SELECT id, balance FROM users WHERE email = ?", [senderEmail], (err, sender) => {
      if (err) return res.status(500).json({ message: err.message });
      if (!sender) return res.status(404).json({ message: "Sender not found" });
      if (sender.balance < amount) {
        return res.status(400).json({ message: "Insufficient balance" });
      }

      db.get("SELECT id, balance FROM users WHERE email = ?", [receiverEmail], (err, receiver) => {
        if (err) return res.status(500).json({ message: err.message });
        if (!receiver) return res.status(404).json({ message: "Receiver not found" });

        // Update balances
        const newSenderBalance = sender.balance - amount;
        const newReceiverBalance = receiver.balance + amount;

        db.run("UPDATE users SET balance = ? WHERE id = ?", [newSenderBalance, sender.id], (err) => {
          if (err) return res.status(500).json({ message: err.message });

          db.run("UPDATE users SET balance = ? WHERE id = ?", [newReceiverBalance, receiver.id], (err) => {
            if (err) return res.status(500).json({ message: err.message });

            // Record transactions
            db.run(
              "INSERT INTO transactions (userId, type, amount, description) VALUES (?, ?, ?, ?)",
              [sender.id, "send", amount, `Sent to ${receiverEmail}`],
              (err) => {
                if (err) return res.status(500).json({ message: err.message });

                db.run(
                  "INSERT INTO transactions (userId, type, amount, description) VALUES (?, ?, ?, ?)",
                  [receiver.id, "receive", amount, `Received from ${senderEmail}`],
                  (err) => {
                    if (err) return res.status(500).json({ message: err.message });
                    res.json({ message: "Money sent successfully", newBalance: newSenderBalance });
                  }
                );
              }
            );
          });
        });
      });
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Top up balance
router.post("/topup", auth, async (req, res) => {
  try {
    const { amount } = req.body;
    const email = req.user.email;

    if (!amount) {
      return res.status(400).json({ message: "Amount is required" });
    }
    if (typeof amount !== "number" || amount <= 0) {
      return res.status(400).json({ message: "Amount must be a positive number" });
    }

    // Get current balance
    db.get("SELECT id, balance FROM users WHERE email = ?", [email], (err, user) => {
      if (err) return res.status(500).json({ message: err.message });
      if (!user) return res.status(404).json({ message: "User not found" });

      // Update balance
      const newBalance = user.balance + amount;
      db.run("UPDATE users SET balance = ? WHERE id = ?", [newBalance, user.id], (err) => {
        if (err) return res.status(500).json({ message: err.message });

        // Record transaction
        db.run(
          "INSERT INTO transactions (userId, type, amount, description) VALUES (?, ?, ?, ?)",
          [user.id, "topup", amount, "Account top-up"],
          (err) => {
            if (err) return res.status(500).json({ message: err.message });
            res.json({ message: "Balance topped up successfully", newBalance });
          }
        );
      });
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
