# 🚀 Foodie Backend — Yesterday's Newly Integrated APIs & Features Summary

> **Summary Brief**: Yesterday, the backend team fully implemented and integrated all core Customer Module APIs for the Foodie application. A total of **42 production-ready REST endpoints** across **12 key subsystems** were newly created, wired with database entities, secured with JWT Bearer authentication, and mapped to consistent response envelopes.

---

## 📌 Executive Summary of Yesterday's Release

Yesterday's update delivered full end-to-end backend functionality connecting the database schema, business logic, security layer, and payment integration. 

The frontend team can now replace all local dummy state with actual backend API calls. Below is the breakdown of what was newly built and integrated yesterday:

---

## 🛠️ Subsystem Breakdown of Newly Integrated APIs

### 1. Customer Authentication & Profile Management
* **Newly Built Capabilities**:
  - Customer registration with password hashing (BCrypt) and device metadata tracking.
  - Dual-token JWT authentication (Access Token + Refresh Token rotation).
  - Password recovery workflow via email/OTP (`/forgot-password` and `/reset-password`).
  - Single-device / multi-device session logout token revocation (`/revoke`).
  - Authenticated customer profile retrieval (`/users/me`), profile update, and password change.

### 2. Restaurant Module & Location Intelligence
* **Newly Built Capabilities**:
  - Public restaurant discovery API with filtering by cuisine, search keyword, minimum rating, and open/closed status.
  - Geo-location calculation (Haversine formula) calculating real-time distance (km) and delivery fees based on customer latitude/longitude.
  - Complete restaurant profile view returning logo, cover image, operating hours, delivery estimates, and minimum order requirements.

### 3. Food / Menu Module
* **Newly Built Capabilities**:
  - Categorized menu tree retrieval (`categories[]` -> `items[]` -> `variants[]`).
  - Food item detail endpoint including veg/non-veg flags, price, image URL, category, availability status, and customization variants.
  - Food items search and category filtering endpoints.

### 4. Search and Filtering APIs
* **Newly Built Capabilities**:
  - Global search endpoint (`/search/global`) returning matched restaurants and food items combined.
  - Targeted food item search (`/search/food-items`) supporting keyword query, veg/non-veg filter, price caps, and restaurant ID.

### 5. Cart Module & Price Calculation Engine
* **Newly Built Capabilities**:
  - Customer cart state persisted in database with single-restaurant enforcement logic.
  - Add, update quantity, remove line item, and clear cart endpoints.
  - Dynamic checkout calculator evaluating subtotal, tax amount (5% GST), delivery charges, applied coupon discount, and final grand total.

### 6. Delivery Address Management Module
* **Newly Built Capabilities**:
  - Full CRUD operations for customer saved addresses (Add, List, Edit, Delete).
  - Address type categorization (`HOME`, `WORK`, `OTHER`).
  - Default address flag management (`/addresses/{id}/default`).

### 7. Order Lifecycle & Active Order Tracking
* **Newly Built Capabilities**:
  - One-click order creation converting active cart items into frozen order line items.
  - State machine enforcing valid order status transitions:
    `PLACED` ➔ `CONFIRMED` ➔ `PREPARING` ➔ `READY_FOR_PICKUP` ➔ `OUT_FOR_DELIVERY` ➔ `DELIVERED` / `CANCELLED`.
  - Active order tracking endpoint (`/orders/me/active`) for live frontend tracking UI.
  - Order history and order cancellation with rule checks.

### 8. Razorpay Payment Gateway Integration
* **Newly Built Capabilities**:
  - Razorpay Order ID initiation endpoint (`/payments/initiate`) keeping secrets strictly on backend.
  - Cryptographic HMAC-SHA256 signature verification endpoint (`/payments/verify`).
  - Webhook endpoint (`/payments/webhook/razorpay`) handling async payment success/failure events.
  - Automated refund triggering for eligible cancelled orders.

### 9. Favorites Module
* **Newly Built Capabilities**:
  - Add/remove restaurant to/from customer favorites.
  - Favorite restaurant list retrieval endpoint.

### 10. Offers & Coupon Engine
* **Newly Built Capabilities**:
  - Eligible coupons query endpoint checking cart total, active date range, and user usage limits.
  - Coupon validation endpoint (`/coupons/apply`) calculating discount amounts without mutating state.

### 11. Ratings & Reviews Subsystem
* **Newly Built Capabilities**:
  - Post-delivery review submission (star rating 1-5 & review comment) enforced to completed orders only.
  - Public restaurant review listing with pagination and sorting.

### 12. Standard API Envelopes & Documentation
* **Newly Built Capabilities**:
  - Unified success wrapper `ApiResponse<T>` and error wrapper `ApiErrorResponse`.
  - OpenAPI 3.0 / Swagger UI documentation generated automatically at `http://localhost:8080/swagger-ui.html`.

---

## 📋 Comprehensive Endpoint Reference Table (Newly Integrated Yesterday)

| Method | Endpoint Path | Subsystem | Auth Required | Description |
|---|---|---|---|---|
| `POST` | `/api/v1/auth/register` | Auth | No | Register new customer |
| `POST` | `/api/v1/auth/login/customer` | Auth | No | Customer email & password login |
| `POST` | `/api/v1/auth/forgot-password` | Auth | No | Request password reset OTP |
| `POST` | `/api/v1/auth/reset-password` | Auth | No | Reset password using OTP |
| `POST` | `/api/v1/auth/refresh` | Auth | No | Rotate JWT refresh token |
| `POST` | `/api/v1/auth/logout` | Auth | Yes | Revoke refresh token |
| `GET` | `/api/v1/users/me` | User | Yes (Customer) | Get logged-in customer profile |
| `PUT` | `/api/v1/users/me` | User | Yes (Customer) | Update customer profile |
| `POST` | `/api/v1/users/me/change-password` | User | Yes (Customer) | Change password |
| `GET` | `/api/v1/users/me/addresses` | User | Yes (Customer) | Get saved delivery addresses |
| `POST` | `/api/v1/users/me/addresses` | User | Yes (Customer) | Add new delivery address |
| `PUT` | `/api/v1/users/me/addresses/{id}` | User | Yes (Customer) | Update delivery address |
| `DELETE` | `/api/v1/users/me/addresses/{id}` | User | Yes (Customer) | Delete delivery address |
| `PUT` | `/api/v1/users/me/addresses/{id}/default` | User | Yes (Customer) | Set address as default |
| `GET` | `/api/v1/restaurants` | Restaurant | No | List / filter restaurants |
| `GET` | `/api/v1/restaurants/{id}` | Restaurant | No | Get restaurant details by ID |
| `GET` | `/api/v1/menu/restaurants/{restaurantId}` | Menu | No | Get full menu tree |
| `GET` | `/api/v1/menu/items/{itemId}` | Menu | No | Get single food item detail |
| `GET` | `/api/v1/menu/restaurants/{restaurantId}/items` | Menu | No | Get food items by category/veg |
| `GET` | `/api/v1/search/food-items` | Search | No | Search food items |
| `GET` | `/api/v1/search/global` | Search | No | Global search (restaurants + items) |
| `GET` | `/api/v1/cart` | Cart | Yes (Customer) | Get current cart with calculations |
| `POST` | `/api/v1/cart/items` | Cart | Yes (Customer) | Add item to cart |
| `PUT` | `/api/v1/cart/items/{cartItemId}` | Cart | Yes (Customer) | Update cart item quantity |
| `DELETE` | `/api/v1/cart/items/{cartItemId}` | Cart | Yes (Customer) | Remove cart item |
| `DELETE` | `/api/v1/cart` | Cart | Yes (Customer) | Clear entire cart |
| `POST` | `/api/v1/orders` | Order | Yes (Customer) | Place order from cart |
| `GET` | `/api/v1/orders/me/active` | Order | Yes (Customer) | Get active order for live tracking |
| `GET` | `/api/v1/orders/me` | Order | Yes (Customer) | Get customer order history |
| `GET` | `/api/v1/orders/{id}` | Order | Yes (Customer) | Get order details |
| `POST` | `/api/v1/orders/{id}/cancel` | Order | Yes (Customer) | Cancel order |
| `POST` | `/api/v1/payments/initiate` | Payment | Yes (Customer) | Create Razorpay Order ID |
| `POST` | `/api/v1/payments/verify` | Payment | Yes (Customer) | Verify Razorpay payment signature |
| `POST` | `/api/v1/payments/refund` | Payment | Yes (Customer) | Request refund for order |
| `POST` | `/api/v1/payments/webhook/razorpay` | Payment | No | Razorpay payment webhook |
| `GET` | `/api/v1/favorites/restaurants` | Favorite | Yes (Customer) | List favorite restaurants |
| `POST` | `/api/v1/favorites/restaurants/{id}` | Favorite | Yes (Customer) | Add restaurant to favorites |
| `DELETE` | `/api/v1/favorites/restaurants/{id}` | Favorite | Yes (Customer) | Remove from favorites |
| `GET` | `/api/v1/coupons/eligible` | Coupon | Yes (Customer) | List eligible coupons |
| `POST` | `/api/v1/coupons/apply` | Coupon | Yes (Customer) | Validate & preview coupon discount |
| `POST` | `/api/v1/orders/{id}/review` | Review | Yes (Customer) | Submit order rating & review |
| `GET` | `/api/v1/restaurants/{id}/reviews` | Review | No | Get public restaurant reviews |

---

> **Frontend Integration Ready**: The backend is active locally at `http://localhost:8080`. All 42 endpoints return standard JSON response envelopes ready for immediate UI binding.
