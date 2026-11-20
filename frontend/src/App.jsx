import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ToastProvider } from './context/ToastContext';
import { AuthProvider } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { CartProvider } from './context/CartContext';
import { ProtectedRoute } from './components/common/UIStates';

import MarketplaceLayout from './layouts/MarketplaceLayout';
import SellerLayout from './layouts/SellerLayout';
import AdminLayout from './layouts/AdminLayout';

// Auth Pages
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';
import ResetPasswordPage from './pages/auth/ResetPasswordPage';

// Buyer / Public Marketplace Pages
import HomePage from './pages/buyer/HomePage';
import ProductsPage from './pages/buyer/ProductsPage';
import ProductDetailPage from './pages/buyer/ProductDetailPage';
import StorePage from './pages/buyer/StorePage';
import CartPage from './pages/buyer/CartPage';
import CheckoutPage from './pages/buyer/CheckoutPage';
import OrdersPage from './pages/buyer/OrdersPage';
import OrderDetailPage from './pages/buyer/OrderDetailPage';
import QrOrderPage from './pages/buyer/QrOrderPage';
import ProfilePage from './pages/buyer/ProfilePage';
import WishlistPage from './pages/buyer/WishlistPage';
import NotificationsPage from './pages/buyer/NotificationsPage';
import BuyerChatPage from './pages/buyer/BuyerChatPage';

// Seller Dashboard Pages
import SellerDashboardPage from './pages/seller/SellerDashboardPage';
import SellerProductsPage from './pages/seller/SellerProductsPage';
import SellerQrPage from './pages/seller/SellerQrPage';
import SellerOrdersPage from './pages/seller/SellerOrdersPage';
import SellerTransactionsPage from './pages/seller/SellerTransactionsPage';
import SellerReportsPage from './pages/seller/SellerReportsPage';
import SellerChatPage from './pages/seller/SellerChatPage';
import SellerSettingsPage from './pages/seller/SellerSettingsPage';

// Admin Dashboard Pages
import AdminDashboardPage from './pages/admin/AdminDashboardPage';
import AdminUsersPage from './pages/admin/AdminUsersPage';
import AdminSellersPage from './pages/admin/AdminSellersPage';
import AdminProductsPage from './pages/admin/AdminProductsPage';
import AdminCategoriesPage from './pages/admin/AdminCategoriesPage';
import AdminOrdersPage from './pages/admin/AdminOrdersPage';
import AdminPaymentsPage from './pages/admin/AdminPaymentsPage';
import AdminReportsPage from './pages/admin/AdminReportsPage';
import AdminNotificationsPage from './pages/admin/AdminNotificationsPage';
import AdminChatsPage from './pages/admin/AdminChatsPage';
import AdminLogsPage from './pages/admin/AdminLogsPage';
import AdminPermissionsPage from './pages/admin/AdminPermissionsPage';
import AdminSettingsPage from './pages/admin/AdminSettingsPage';

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <SocketProvider>
            <CartProvider>
              <Routes>
                {/* Auth Routes */}
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                <Route path="/reset-password" element={<ResetPasswordPage />} />

                {/* Public & Buyer Marketplace Routes */}
                <Route element={<MarketplaceLayout />}>
                  <Route path="/" element={<HomePage />} />
                  <Route path="/products" element={<ProductsPage />} />
                  <Route path="/products/:slug" element={<ProductDetailPage />} />
                  <Route path="/store/:slug" element={<StorePage />} />

                  <Route
                    path="/cart"
                    element={
                      <ProtectedRoute>
                        <CartPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/checkout"
                    element={
                      <ProtectedRoute>
                        <CheckoutPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/orders"
                    element={
                      <ProtectedRoute>
                        <OrdersPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/orders/:id"
                    element={
                      <ProtectedRoute>
                        <OrderDetailPage />
                      </ProtectedRoute>
                    }
                  />
                  {/* Strictly Authenticated QR Order Landing Page */}
                  <Route
                    path="/qr/order/:orderNumber"
                    element={
                      <ProtectedRoute>
                        <QrOrderPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/profile"
                    element={
                      <ProtectedRoute>
                        <ProfilePage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/wishlist"
                    element={
                      <ProtectedRoute>
                        <WishlistPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/notifications"
                    element={
                      <ProtectedRoute>
                        <NotificationsPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/chat"
                    element={
                      <ProtectedRoute>
                        <BuyerChatPage />
                      </ProtectedRoute>
                    }
                  />
                </Route>

                {/* Seller Dashboard Routes (Role: SELLER only) */}
                <Route
                  path="/seller"
                  element={
                    <ProtectedRoute allowedRoles={['SELLER']}>
                      <SellerLayout />
                    </ProtectedRoute>
                  }
                >
                  <Route index element={<SellerDashboardPage />} />
                  <Route path="products" element={<SellerProductsPage />} />
                  <Route path="qr" element={<SellerQrPage />} />
                  <Route path="orders" element={<SellerOrdersPage />} />
                  <Route path="transactions" element={<SellerTransactionsPage />} />
                  <Route path="reports" element={<SellerReportsPage />} />
                  <Route path="chat" element={<SellerChatPage />} />
                  <Route path="settings" element={<SellerSettingsPage />} />
                </Route>

                {/* Admin Dashboard Routes (Role: ADMIN only - All 16 Menus) */}
                <Route
                  path="/admin"
                  element={
                    <ProtectedRoute allowedRoles={['ADMIN']}>
                      <AdminLayout />
                    </ProtectedRoute>
                  }
                >
                  <Route index element={<AdminDashboardPage />} />
                  <Route path="users" element={<AdminUsersPage />} />
                  <Route
                    path="sellers"
                    element={<AdminSellersPage defaultStatus="ALL" title="Daftar Seller Marketplace" />}
                  />
                  <Route
                    path="seller-verification"
                    element={<AdminSellersPage defaultStatus="PENDING" title="Verifikasi Seller Baru" />}
                  />
                  <Route path="products" element={<AdminProductsPage />} />
                  <Route path="categories" element={<AdminCategoriesPage />} />
                  <Route path="orders" element={<AdminOrdersPage title="Kelola Pesanan" />} />
                  <Route
                    path="payments"
                    element={<AdminPaymentsPage defaultStatus="ALL" title="Daftar Pembayaran" />}
                  />
                  <Route
                    path="payment-verification"
                    element={
                      <AdminPaymentsPage
                        defaultStatus="WAITING_VERIFICATION"
                        title="Verifikasi Bukti Pembayaran"
                      />
                    }
                  />
                  <Route
                    path="transactions"
                    element={<AdminOrdersPage title="Riwayat Transaksi Marketplace" />}
                  />
                  <Route path="reports" element={<AdminReportsPage />} />
                  <Route path="notifications" element={<AdminNotificationsPage />} />
                  <Route path="chats" element={<AdminChatsPage />} />
                  <Route path="logs" element={<AdminLogsPage />} />
                  <Route path="permissions" element={<AdminPermissionsPage />} />
                  <Route path="settings" element={<AdminSettingsPage />} />
                </Route>

                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </CartProvider>
          </SocketProvider>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}
