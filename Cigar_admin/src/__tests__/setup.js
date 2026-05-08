import '@testing-library/jest-dom/vitest'
import { vi } from 'vitest'

// --- 浏览器 API polyfills（确保 jsdom 环境一致性）---

// localStorage polyfill
if (typeof global.localStorage === 'undefined') {
  const store = {}
  global.localStorage = {
    getItem: (key) => store[key] ?? null,
    setItem: (key, value) => { store[key] = String(value) },
    removeItem: (key) => { delete store[key] },
    clear: () => { Object.keys(store).forEach((k) => delete store[k]) },
    get length() { return Object.keys(store).length },
    key: (i) => Object.keys(store)[i] ?? null,
  }
}

// sessionStorage polyfill
if (typeof global.sessionStorage === 'undefined') {
  const sstore = {}
  global.sessionStorage = {
    getItem: (key) => sstore[key] ?? null,
    setItem: (key, value) => { sstore[key] = String(value) },
    removeItem: (key) => { delete sstore[key] },
    clear: () => { Object.keys(sstore).forEach((k) => delete sstore[k]) },
    get length() { return Object.keys(sstore).length },
    key: (i) => Object.keys(sstore)[i] ?? null,
  }
}

// Mock antd `message` — globally spy on the static methods to suppress real toasts during tests
import { message } from 'antd'
vi.spyOn(message, 'success').mockImplementation(() => {})
vi.spyOn(message, 'error').mockImplementation(() => {})
vi.spyOn(message, 'info').mockImplementation(() => {})
vi.spyOn(message, 'warning').mockImplementation(() => {})

// Mock antd icons
vi.mock('@ant-design/icons', async () => {
  const icons = {}
  const names = [
    'ShoppingCartOutlined', 'DollarOutlined', 'UserOutlined', 'WalletOutlined',
    'SearchOutlined', 'ExportOutlined', 'SyncOutlined', 'EyeOutlined', 'EyeInvisibleOutlined',
    'EditOutlined', 'PlusOutlined', 'DeleteOutlined', 'LockOutlined',
    'UploadOutlined', 'SaveOutlined', 'StarFilled', 'CloseOutlined', 'ReloadOutlined',
    'SettingOutlined', 'ImportOutlined', 'EyeTwoTone',
    'ArrowUpOutlined', 'ArrowDownOutlined', 'HomeOutlined', 'UserAddOutlined',
    'DashboardOutlined', 'ShopOutlined', 'DatabaseOutlined', 'PictureOutlined',
    'StarOutlined', 'TeamOutlined', 'BarChartOutlined', 'LogoutOutlined',
    'MenuFoldOutlined', 'MenuUnfoldOutlined', 'BellOutlined', 'AppstoreOutlined',
  ]
  for (const name of names) {
    icons[name] = () => null
  }
  return icons
})

// Mock recharts (heavy library, not needed for unit tests)
vi.mock('recharts', () => ({
  LineChart: () => null,
  BarChart: () => null,
  PieChart: () => null,
  Line: () => null,
  Bar: () => null,
  Pie: () => null,
  Cell: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  Legend: () => null,
  ResponsiveContainer: ({ children }) => children,
  LabelList: () => null,
}))

// Mock matchMedia (not available in jsdom)
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  observe() {}
  unobserve() {}
  disconnect() {}
}

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor(callback) { this.callback = callback }
  observe() {}
  unobserve() {}
  disconnect() {}
}

// Mock getComputedStyle (needed by Antd components)
const originalGetComputedStyle = window.getComputedStyle
window.getComputedStyle = (element, pseudoElt) => {
  try {
    return originalGetComputedStyle.call(window, element, pseudoElt)
  } catch {
    return {
      getPropertyValue: () => '',
      paddingTop: '0px',
      paddingBottom: '0px',
      paddingLeft: '0px',
      paddingRight: '0px',
      marginTop: '0px',
      marginBottom: '0px',
      marginLeft: '0px',
      marginRight: '0px',
      borderTopWidth: '0px',
      borderBottomWidth: '0px',
      borderLeftWidth: '0px',
      borderRightWidth: '0px',
      width: '0px',
      height: '0px',
      display: 'block',
      visibility: 'visible',
      opacity: '1',
    }
  }
}

// Clear localStorage between tests
beforeEach(() => {
  localStorage.clear()
})
