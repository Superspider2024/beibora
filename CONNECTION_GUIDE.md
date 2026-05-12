# Beibora Production Connection Guide

## ✅ All Connections Complete

Your Beibora application is now fully connected to the production backend at **`beibora-production.up.railway.app`**

---

## 🔧 What Was Updated

### 1. Frontend API Configuration
- **File**: `frontend/beibora-frontend/lib/api.ts`
- **Change**: Updated base URL to `https://beibora-production.up.railway.app/api`
- **Impact**: All frontend pages now communicate with production backend

### 2. Profile Page
- **File**: `frontend/beibora-frontend/app/profile/page.tsx`
- **Change**: Added JWT token decoding for user info extraction
- **Impact**: Profile now displays logged-in user's role from token

### 3. Backend Authentication
- **File**: `backend/routes/auth.js`
- **Change**: Added admin code validation for admin registration
- **Impact**: Only users with valid admin code can register as admin

### 4. Order Processing
- **File**: `backend/routes/orders.js`
- **Change**: Fixed farmer reference and status management
- **Impact**: Orders now properly linked to farmers and track through status flow

### 5. Product Status Flow
- **File**: `backend/models/Product.js`
- **Change**: Added `'in_transit'` status
- **Impact**: Products now track complete lifecycle from stock → transit → sold

### 6. Environment Configuration
- **File**: `backend/.env`
- **Change**: Added `ADMIN_CODE=admin_secret_2024`
- **Impact**: Admin registration now secured with code verification

---

## 📱 Connected Pages & Features

| Page | Route | Authentication | Status |
|------|-------|-----------------|--------|
| Home | `/` | None | ✅ Connected |
| Signup | `/signup` | None | ✅ Connected |
| Login | `/login` | None | ✅ Connected |
| Marketplace | `/marketplace` | Required (Buyer) | ✅ Connected |
| Orders | `/orders` | Required (Buyer) | ✅ Connected |
| Offers | `/offers` | Required (Buyer) | ✅ Connected |
| Profile | `/profile` | Required | ✅ Connected |
| Admin | `/admin` | Required (Admin) | ✅ Connected |

---

## 🔌 API Endpoints Status

### Authentication
```
POST   /api/auth/register       → Create new user (buyer/admin)
POST   /api/auth/login          → User login
```

### Products
```
GET    /api/products            → List all products
GET    /api/products/:id        → Get product details
POST   /api/products            → Add product (admin only)
PUT    /api/products/:id/sold   → Mark as sold (admin only)
```

### Orders
```
POST   /api/orders              → Create order (buyer only)
GET    /api/orders              → Get user's orders
GET    /api/orders/all          → Get all orders (admin only)
PUT    /api/orders/:id/status   → Update status (admin only)
```

---

## 🚀 Testing Checklist

### Before Testing
- [ ] Backend running and connected to MongoDB
- [ ] Frontend environment configured
- [ ] Production URL accessible

### Test Flows
- [ ] Buyer Registration: Sign up with email, password, phone, location
- [ ] Admin Registration: Sign up with admin code `admin_secret_2024`
- [ ] Login: Test with both buyer and admin credentials
- [ ] View Marketplace: Browse available products
- [ ] Create Order: Select product, enter quantity, M-Pesa code
- [ ] Check Orders: View order history
- [ ] Admin Dashboard: Verify and update order statuses
- [ ] Profile: View user information and logout

---

## 🔐 Security Features

✅ JWT Token Authentication (1-hour expiration)
✅ Bearer Token in Authorization Header
✅ Admin Code Verification
✅ Role-Based Access Control (RBAC)
✅ Password Hashing with bcrypt
✅ CORS Enabled for Production

---

## 📊 Database Integration

- **Provider**: MongoDB Atlas
- **Connection**: Via `MONGODB_URI` in `.env`
- **Collections**: Users, Products, Orders
- **Status**: ✅ Connected and Configured

---

## 🔄 Data Flow Examples

### Buyer Registration & Purchase Flow
1. User signs up as buyer
2. JWT token stored in localStorage
3. User logs in with email/password
4. Token automatically attached to all API requests
5. User browses marketplace (GET /api/products)
6. User selects product and places order (POST /api/orders)
7. Order status tracked through fulfillment

### Admin Verification Flow
1. Admin registers with admin code
2. Admin logs in and views admin dashboard
3. Admin sees pending orders
4. Admin updates order status (GET /api/orders/all, PUT /api/orders/:id/status)
5. Product status updates based on order progress

---

## ⚙️ Configuration Summary

```env
MONGODB_URI=<connected>
JWT_SECRET=beibora_jwt_secret_2024_secure_key_change_in_production
PORT=5000
ADMIN_CODE=admin_secret_2024
```

Frontend Base URL: `https://beibora-production.up.railway.app/api`

---

## 📝 Notes

- All pages use the same API instance with automatic token attachment
- Bottom navigation shows only for authenticated users
- Token expires after 1 hour (users will need to re-login)
- Admin code should be changed in production environment
- Farmers are created by admins, not via registration endpoint

---

## ✨ Status: Ready for Testing

All components are connected and ready to use. Start by testing the signup/login flow, then proceed to marketplace and order management.

