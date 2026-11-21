import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ToastProvider } from './context/ToastContext';
import { AuthProvider } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { CartProvider } from './context/CartContext';
import { ProtectedRoute, LoadingState } from './components/common/UIStates';

import MarketplaceLayout from './layouts/MarketplaceLayout';
const SellerLayout = lazy(() => import('./layouts/SellerLayout'));
const AdminLayout = lazy(() => import('./layouts/AdminLayout'));

// Auth Pages (Lazy-loaded)
const LoginPage = lazy(() => import('./pages/auth/LoginPage'));
const RegisterPage = lazy(() => import('./pages/auth/RegisterPage'));
const ForgotPasswordPage = lazy(() => import('./pages/auth/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('./pages/auth/ResetPasswordPage'));

// Buyer / Public Marketplace Pages (Lazy-loaded)
const HomePage = lazy(() => import('./pages/buyer/HomePage'));
const ProductsPage = lazy(() => import('./pages/buyer/ProductsPage'));
const ProductDetailPage = lazy(() => import('./pages/buyer/ProductDetailPage'));
const StorePage = lazy(() => import('./pages/buyer/StorePage'));
const CartPage = lazy(() => import('./pages/buyer/CartPage'));
const CheckoutPage = lazy(() => import('./pages/buyer/CheckoutPage'));
const OrdersPage = lazy(() => import('./pages/buyer/OrdersPage'));
const OrderDetailPage = lazy(() => import('./pages/buyer/OrderDetailPage'));
const QrOrderPage = lazy(() => import('./pages/buyer/QrOrderPage'));
const ProfilePage = lazy(() => import('./pages/buyer/ProfilePage'));
const WishlistPage = lazy(() => import('./pages/buyer/WishlistPage'));
const NotificationsPage = lazy(() => import('./pages/buyer/NotificationsPage'));
const BuyerChatPage = lazy(() => import('./pages/buyer/BuyerChatPage'));

// Seller Dashboard Pages (Lazy-loaded)
const SellerDashboardPage = lazy(() => import('./pages/seller/SellerDashboardPage'));
const SellerProductsPage = lazy(() => import('./pages/seller/SellerProductsPage'));
const SellerQrPage = lazy(() => import('./pages/seller/SellerQrPage'));
const SellerOrdersPage = lazy(() => import('./pages/seller/SellerOrdersPage'));
const SellerReviewsPage = lazy(() => import('./pages/seller/SellerReviewsPage'));
const SellerTransactionsPage = lazy(() => import('./pages/seller/SellerTransactionsPage'));
const SellerReportsPage = lazy(() => import('./pages/seller/SellerReportsPage'));
const SellerChatPage = lazy(() => import('./pages/seller/SellerChatPage'));
const SellerSettingsPage = lazy(() => import('./pages/seller/SellerSettingsPage'));

// Admin Dashboard Pages (Lazy-loaded)
const AdminDashboardPage = lazy(() => import('./pages/admin/AdminDashboardPage'));
const AdminUsersPage = lazy(() => import('./pages/admin/AdminUsersPage'));
const AdminSellersPage = lazy(() => import('./pages/admin/AdminSellersPage'));
const AdminProductsPage = lazy(() => import('./pages/admin/AdminProductsPage'));
const AdminCategoriesPage = lazy(() => import('./pages/admin/AdminCategoriesPage'));
const AdminCouponsPage = lazy(() => import('./pages/admin/AdminCouponsPage'));
const AdminOrdersPage = lazy(() => import('./pages/admin/AdminOrdersPage'));
const AdminPaymentsPage = lazy(() => import('./pages/admin/AdminPaymentsPage'));
const AdminPayoutsPage = lazy(() => import('./pages/admin/AdminPayoutsPage'));
const AdminRefundsPage = lazy(() => import('./pages/admin/AdminRefundsPage'));
const AdminReportsPage = lazy(() => import('./pages/admin/AdminReportsPage'));
const AdminNotificationsPage = lazy(() => import('./pages/admin/AdminNotificationsPage'));
const AdminChatsPage = lazy(() => import('./pages/admin/AdminChatsPage'));
const AdminLogsPage = lazy(() => import('./pages/admin/AdminLogsPage'));
const AdminPermissionsPage = lazy(() => import('./pages/admin/AdminPermissionsPage'));
const AdminSettingsPage = lazy(() => import('./pages/admin/AdminSettingsPage'));

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <SocketProvider>
            <CartProvider>
              <Suspense fallback={<LoadingState message="Memuat halaman FerryMarket..." />}>
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
                    <Route path="reviews" element={<SellerReviewsPage />} />
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
                    <Route path="coupons" element={<AdminCouponsPage />} />
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
                    <Route path="payouts" element={<AdminPayoutsPage />} />
                    <Route path="refunds" element={<AdminRefundsPage />} />
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
              </Suspense>
            </CartProvider>
          </SocketProvider>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}
