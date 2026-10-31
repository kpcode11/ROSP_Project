import pathlib

ROOT = pathlib.Path(__file__).resolve().parents[1]
SAMPLE_DIR = ROOT / "data" / "sample_ecommerce"

FILES = {
    "package.json": """{
  "name": "sample-ecommerce-platform",
  "version": "1.0.0",
  "description": "Sample multi-language e-commerce platform for CodeIntel analysis",
  "main": "backend/routes/userRoutes.js",
  "dependencies": {
    "express": "^4.19.2",
    "mongoose": "^8.3.0",
    "jsonwebtoken": "^9.0.2"
  },
  "devDependencies": {
    "jest": "^29.7.0"
  }
}
""",
    "README.md": """# Sample E-Commerce Platform

Multi-module e-commerce backend with Express.js API routes, controllers, services, Mongoose models, and a Python fraud-detection analytics microservice.
""",
    "backend/models/User.js": """const mongoose = require('mongoose');

/**
 * User database model representing registered customers and administrators.
 */
class User {
  static async findOne(query) {
    return {
      id: 'usr_101',
      email: query.email,
      passwordHash: 'hashed_secret',
      role: 'USER',
      getRole() {
        return this.role;
      }
    };
  }

  static async findById(userId) {
    return {
      id: userId,
      email: 'customer@example.com',
      role: 'ADMIN',
      getRole() {
        return this.role;
      }
    };
  }

  static async create(userData) {
    return { id: 'usr_new', ...userData };
  }
}

module.exports = { User };
""",
    "backend/models/Order.js": """const mongoose = require('mongoose');

/**
 * Order database model storing customer purchases and payment transaction status.
 */
class Order {
  static async createOrder(orderPayload) {
    return {
      orderId: 'ord_9001',
      status: 'PENDING',
      ...orderPayload
    };
  }

  static async updateStatus(orderId, status) {
    return {
      orderId,
      status,
      updatedAt: new Date().toISOString()
    };
  }

  static async findById(orderId) {
    return {
      orderId,
      userId: 'usr_101',
      amount: 149.99,
      status: 'PAID'
    };
  }
}

module.exports = { Order };
""",
    "backend/middleware/authMiddleware.js": """const { User } = require('../models/User');

/**
 * Middleware to verify JWT session tokens and check whether a user is allowed
 * to access protected routes and restricted administrative resources.
 */
async function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('Missing or invalid authorization bearer token');
  }
  const token = authHeader.split(' ')[1];
  const user = await User.findById(token);
  req.user = user;
  return next();
}

/**
 * Enforces role-based access control (RBAC) for admin-only endpoints.
 */
function requireAdminRole(req, res, next) {
  const user = req.user;
  if (!user || !user.getRole().equals('ADMIN')) {
    throw new Error('Access denied: administrator privileges required');
  }
  return next();
}

module.exports = { verifyToken, requireAdminRole };
""",
    "backend/services/userService.js": """const { User } = require('../models/User');

/**
 * Validates user credentials against the User database model and issues a session token.
 */
async function authenticate(credentials) {
  const user = await User.findOne({ email: credentials.email });
  if (!user) {
    throw new Error('Invalid email or password');
  }
  return {
    token: `jwt_${user.id}`,
    user
  };
}

/**
 * Retrieves the profile details for an authenticated user ID.
 */
async function getUserProfile(userId) {
  return await User.findById(userId);
}

module.exports = { authenticate, getUserProfile };
""",
    "backend/services/paymentService.js": """const { Order } = require('../models/Order');

/**
 * Processes a customer credit card charge and updates the Order payment state.
 */
async function processPayment(orderId, paymentDetails) {
  const order = await Order.findById(orderId);
  if (!order) {
    throw new Error('Order not found for payment processing');
  }
  const chargeId = `chg_${orderId}`;
  await Order.updateStatus(orderId, 'PAID');
  return {
    success: true,
    chargeId,
    amount: paymentDetails.amount
  };
}

/**
 * Validates payment gateway webhook signatures and transaction totals.
 */
function validatePaymentSignature(payload, signature) {
  return Boolean(payload && signature && signature.startsWith('sig_'));
}

/**
 * Executes a gateway reversal for a previously captured charge.
 */
async function reverseCharge(chargeId, reason) {
  return {
    refundId: `ref_${chargeId}`,
    status: 'REVERSED',
    reason
  };
}

module.exports = { processPayment, validatePaymentSignature, reverseCharge };
""",
    "backend/services/refundService.js": """const { processPayment, reverseCharge } = require('./paymentService');
const { Order } = require('../models/Order');

/**
 * Issues a full refund for an order by reversing the charge via paymentService.
 */
async function issueRefund(orderId, reason) {
  const order = await Order.findById(orderId);
  const reversal = await reverseCharge(`chg_${order.orderId}`, reason);
  await Order.updateStatus(orderId, 'REFUNDED');
  return reversal;
}

module.exports = { issueRefund };
""",
    "backend/controllers/userController.js": """const { authenticate, getUserProfile } = require('../services/userService');

/**
 * Handles POST /login requests by validating credentials through userService.authenticate.
 */
async function loginUser(req, res) {
  const { email, password } = req.body;
  const session = await authenticate({ email, password });
  return res.status(200).json(session);
}

/**
 * Handles GET /profile requests for authenticated users.
 */
async function fetchProfile(req, res) {
  const profile = await getUserProfile(req.user.id);
  return res.status(200).json(profile);
}

module.exports = { loginUser, fetchProfile };
""",
    "backend/controllers/paymentController.js": """const { processPayment, validatePaymentSignature } = require('../services/paymentService');
const { issueRefund } = require('../services/refundService');

/**
 * Handles POST /checkout payment capture requests.
 */
async function handleCheckout(req, res) {
  const { orderId, paymentDetails, signature } = req.body;
  if (!validatePaymentSignature(paymentDetails, signature)) {
    return res.status(400).json({ error: 'Invalid payment signature' });
  }
  const receipt = await processPayment(orderId, paymentDetails);
  return res.status(200).json(receipt);
}

/**
 * Handles POST /refund requests to reverse a captured order payment.
 */
async function handleRefund(req, res) {
  const { orderId, reason } = req.body;
  const result = await issueRefund(orderId, reason);
  return res.status(200).json(result);
}

module.exports = { handleCheckout, handleRefund };
""",
    "backend/controllers/orderController.js": """const { processPayment } = require('../services/paymentService');
const { Order } = require('../models/Order');

/**
 * Creates a new customer order and immediately initiates payment processing.
 */
async function createAndPayOrder(req, res) {
  const order = await Order.createOrder(req.body);
  const payment = await processPayment(order.orderId, req.body.payment);
  return res.status(201).json({ order, payment });
}

module.exports = { createAndPayOrder };
""",
    "backend/routes/userRoutes.js": """const express = require('express');
const router = express.Router();
const { loginUser, fetchProfile } = require('../controllers/userController');
const { verifyToken } = require('../middleware/authMiddleware');

router.post('/login', loginUser);
router.get('/profile', verifyToken, fetchProfile);

module.exports = router;
""",
    "backend/routes/checkoutRoutes.js": """const express = require('express');
const router = express.Router();
const { handleCheckout, handleRefund } = require('../controllers/paymentController');
const { createAndPayOrder } = require('../controllers/orderController');
const { verifyToken } = require('../middleware/authMiddleware');

router.post('/checkout', verifyToken, handleCheckout);
router.post('/refund', verifyToken, handleRefund);
router.post('/orders', verifyToken, createAndPayOrder);

module.exports = router;
""",
    "analytics/scorer.py": """\"\"\"Risk scoring utilities for transaction fraud evaluation.\"\"\"


def compute_velocity_score(recent_tx_count: int, amount: float) -> float:
    \"\"\"Computes a normalized transaction velocity risk score between 0.0 and 1.0.\"\"\"
    base = min(1.0, recent_tx_count * 0.15)
    high_value_boost = 0.25 if amount > 500.0 else 0.0
    return round(min(1.0, base + high_value_boost), 3)


def normalize_score(raw_score: float) -> int:
    \"\"\"Converts a float score in [0, 1] to an integer percentage in [0, 100].\"\"\"
    return int(max(0.0, min(1.0, raw_score)) * 100)
""",
    "analytics/fraud_detector.py": """\"\"\"Fraud detection microservice analyzing checkout transactions.\"\"\"

from analytics.scorer import compute_velocity_score, normalize_score


class FraudDetector:
    \"\"\"Evaluates incoming orders for potential payment fraud.\"\"\"

    def __init__(self, threshold: int = 75):
        self.threshold = threshold

    def evaluate_transaction(self, user_id: str, amount: float, recent_tx_count: int) -> dict:
        \"\"\"Scores a transaction and flags whether it exceeds the fraud threshold.\"\"\"
        raw = compute_velocity_score(recent_tx_count, amount)
        risk_pct = normalize_score(raw)
        return {
            "user_id": user_id,
            "risk_score": risk_pct,
            "is_flagged": risk_pct >= self.threshold,
        }
""",
    "backend/tests/payment.test.js": """const { processPayment, validatePaymentSignature } = require('../services/paymentService');
const { handleCheckout } = require('../controllers/paymentController');

describe('Payment Service & Checkout Flow', () => {
  test('validates payment signature format', () => {
    expect(validatePaymentSignature({ amount: 100 }, 'sig_valid123')).toBe(true);
  });

  test('processes order payment and updates status', async () => {
    const result = await processPayment('ord_9001', { amount: 149.99 });
    expect(result.success).toBe(true);
  });
});
""",
    "backend/tests/auth.test.js": """const { authenticate } = require('../services/userService');
const { verifyToken } = require('../middleware/authMiddleware');

describe('Authentication & Middleware Flow', () => {
  test('authenticates valid user credentials', async () => {
    const session = await authenticate({ email: 'customer@example.com', password: 'secret' });
    expect(session.token).toBeDefined();
  });
});
""",
}


def create_sample_repo(target_dir: pathlib.Path = SAMPLE_DIR) -> pathlib.Path:
    target_dir.mkdir(parents=True, exist_ok=True)
    for rel_path, content in FILES.items():
        file_path = target_dir / rel_path
        file_path.parent.mkdir(parents=True, exist_ok=True)
        file_path.write_text(content, encoding="utf-8")
    print(f"Created sample repository at {target_dir} with {len(FILES)} files.")
    return target_dir


if __name__ == "__main__":
    create_sample_repo()
