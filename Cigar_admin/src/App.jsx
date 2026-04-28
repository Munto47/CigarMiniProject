import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ConfigProvider } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import theme from './theme'
import AdminLayout from './layouts/AdminLayout'
import LoginPage from './pages/login/index'
import Dashboard from './pages/dashboard/index'
import CigarList from './pages/products/cigars/index'
import DrinkList from './pages/products/drinks/index'
import InstoreLibrary from './pages/library/instore/index'
import ReferenceLibrary from './pages/library/reference/index'
import TagManagement from './pages/library/tags/index'
import Orders from './pages/orders/index'
import Members from './pages/members/index'
import StoredValue from './pages/storedvalue/index'
import Posters from './pages/posters/index'
import Reviews from './pages/reviews/index'
import Accounts from './pages/accounts/index'
import Statistics from './pages/statistics/index'
import Settings from './pages/settings/index'
import useStore from './store/useStore'

function RequireAuth({ children }) {
  const { user } = useStore()
  if (!user) return <Navigate to="/login" replace />
  return children
}

export default function App() {
  return (
    <ConfigProvider theme={theme} locale={zhCN}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<RequireAuth><AdminLayout /></RequireAuth>}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="products/cigars" element={<CigarList />} />
            <Route path="products/drinks" element={<DrinkList />} />
            <Route path="library/instore" element={<InstoreLibrary />} />
            <Route path="library/reference" element={<ReferenceLibrary />} />
            <Route path="library/tags" element={<TagManagement />} />
            <Route path="orders" element={<Orders />} />
            <Route path="members" element={<Members />} />
            <Route path="storedvalue" element={<StoredValue />} />
            <Route path="posters" element={<Posters />} />
            <Route path="reviews" element={<Reviews />} />
            <Route path="accounts" element={<Accounts />} />
            <Route path="statistics" element={<Statistics />} />
            <Route path="settings" element={<Settings />} />
          </Route>
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </ConfigProvider>
  )
}
