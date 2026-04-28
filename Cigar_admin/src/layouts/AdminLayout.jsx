import { useState } from 'react'
import { Layout, Menu, Avatar, Dropdown, Badge, Button, Typography, Space } from 'antd'
import { useNavigate, useLocation, Outlet } from 'react-router-dom'
import {
  DashboardOutlined, ShopOutlined, DatabaseOutlined, ShoppingCartOutlined,
  UserOutlined, WalletOutlined, PictureOutlined, StarOutlined, TeamOutlined,
  BarChartOutlined, SettingOutlined, LogoutOutlined, MenuFoldOutlined,
  MenuUnfoldOutlined, BellOutlined, AppstoreOutlined,
} from '@ant-design/icons'
import useStore from '../store/useStore'

const { Sider, Header, Content } = Layout
const { Text } = Typography

const menuItems = [
  { key: '/dashboard', icon: <DashboardOutlined />, label: '数据概览' },
  {
    key: 'products', icon: <ShopOutlined />, label: '商品管理',
    children: [
      { key: '/products/cigars', label: '雪茄商品' },
      { key: '/products/drinks', label: '饮品商品' },
    ],
  },
  {
    key: 'library', icon: <DatabaseOutlined />, label: '雪茄库',
    children: [
      { key: '/library/instore', label: '在售雪茄库' },
      { key: '/library/reference', label: '行业参考库' },
      { key: '/library/tags', label: '风味标签' },
    ],
  },
  { key: '/orders', icon: <ShoppingCartOutlined />, label: '订单管理' },
  { key: '/members', icon: <UserOutlined />, label: '用户/会员' },
  { key: '/storedvalue', icon: <WalletOutlined />, label: '储值管理' },
  { key: '/posters', icon: <PictureOutlined />, label: '海报管理' },
  { key: '/reviews', icon: <StarOutlined />, label: '评价管理' },
  { key: '/accounts', icon: <TeamOutlined />, label: '账号管理' },
  { key: '/statistics', icon: <BarChartOutlined />, label: '数据统计' },
  { key: '/settings', icon: <SettingOutlined />, label: '系统设置' },
]

export default function AdminLayout() {
  const [collapsed, setCollapsed] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const { user, logout, pendingOrders } = useStore()

  const selectedKey = location.pathname
  const openKey = menuItems.find(m => m.children?.some(c => c.key === selectedKey))?.key

  const handleMenuClick = ({ key }) => navigate(key)

  const userMenuItems = [
    { key: 'logout', icon: <LogoutOutlined />, label: '退出登录', danger: true },
  ]

  const handleUserMenu = ({ key }) => {
    if (key === 'logout') {
      logout()
      navigate('/login')
    }
  }

  return (
    <Layout style={{ minHeight: '100vh', background: '#0D0D0D' }}>
      <Sider
        collapsed={collapsed}
        collapsible
        trigger={null}
        width={220}
        style={{
          background: '#111111',
          borderRight: '1px solid rgba(201,168,76,0.12)',
          position: 'fixed',
          left: 0, top: 0, bottom: 0,
          zIndex: 100,
          overflow: 'hidden',
        }}
      >
        {/* Logo */}
        <div style={{
          height: 64, display: 'flex', alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'flex-start',
          padding: collapsed ? 0 : '0 20px',
          borderBottom: '1px solid rgba(201,168,76,0.12)',
          gap: 10,
          flexShrink: 0,
        }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8, flexShrink: 0,
            background: 'linear-gradient(135deg, #E8C97A, #C9A84C, #7A6430)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 16, fontWeight: 700, color: '#1A1208',
          }}>C</div>
          {!collapsed && (
            <div>
              <div style={{ color: '#C9A84C', fontWeight: 700, fontSize: 14, lineHeight: 1.2 }}>CIGAR CLUB</div>
              <div style={{ color: '#4A4540', fontSize: 11, lineHeight: 1.2 }}>管理后台</div>
            </div>
          )}
        </div>

        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[selectedKey]}
          defaultOpenKeys={openKey ? [openKey] : []}
          items={menuItems}
          onClick={handleMenuClick}
          style={{ background: 'transparent', border: 'none', marginTop: 8 }}
        />
      </Sider>

      <Layout style={{ marginLeft: collapsed ? 80 : 220, transition: 'margin-left 0.2s', background: '#0D0D0D' }}>
        <Header style={{
          position: 'sticky', top: 0, zIndex: 99,
          background: '#161616',
          borderBottom: '1px solid rgba(201,168,76,0.12)',
          height: 64, padding: '0 24px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed(!collapsed)}
            style={{ color: '#9E9484', fontSize: 16 }}
          />

          <Space size={16}>
            <Badge count={pendingOrders} size="small" offset={[-2, 2]}>
              <Button
                type="text"
                icon={<BellOutlined />}
                style={{ color: '#9E9484', fontSize: 16 }}
                onClick={() => navigate('/orders')}
              />
            </Badge>
            <Dropdown menu={{ items: userMenuItems, onClick: handleUserMenu }} placement="bottomRight">
              <Space style={{ cursor: 'pointer' }}>
                <Avatar
                  size={32}
                  style={{ background: 'linear-gradient(135deg, #E8C97A, #C9A84C)', color: '#1A1208', fontSize: 13, fontWeight: 700 }}
                >
                  {user?.name?.[0] || 'A'}
                </Avatar>
                <Text style={{ color: '#F5F0E8', fontSize: 13 }}>{user?.name || 'Admin'}</Text>
              </Space>
            </Dropdown>
          </Space>
        </Header>

        <Content style={{ padding: '24px', minHeight: 'calc(100vh - 64px)' }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  )
}
