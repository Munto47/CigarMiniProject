/**
 * 微信小程序全局 wx 对象 mock
 * 模拟 wx.request、wx.setStorageSync、wx.getStorageSync 等核心 API
 */

// 模拟 Storage
const storage = {}

// 全局 wx mock
global.wx = {
  // Storage API
  setStorageSync(key, value) {
    storage[key] = value
  },
  getStorageSync(key) {
    return storage[key] !== undefined ? storage[key] : ''
  },
  removeStorageSync(key) {
    delete storage[key]
  },
  getStorageInfoSync() {
    const keys = Object.keys(storage)
    return { keys, currentSize: keys.length, limitSize: 10240 }
  },

  // Request API
  request(options) {
    return { abort: () => {} }
  },

  // UI APIs
  showLoading: jest.fn(),
  hideLoading: jest.fn(),
  showToast: jest.fn(),
  showModal: jest.fn(),
  showActionSheet: jest.fn(),
  hideToast: jest.fn(),

  // Navigation APIs
  navigateTo: jest.fn(),
  navigateBack: jest.fn(),
  switchTab: jest.fn(),
  redirectTo: jest.fn(),
  reLaunch: jest.fn(),

  // Other common APIs
  login: jest.fn(),
  getUserInfo: jest.fn(),
  getSetting: jest.fn(),
  authorize: jest.fn(),
  requestPayment: jest.fn(),
  uploadFile: jest.fn(),
  getFileSystemManager() {
    return {
      readFileSync: jest.fn(() => 'mock-base64-audio'),
    }
  },

  // Canvas / Media
  createSelectorQuery() {
    return {
      select() { return this },
      selectAll() { return this },
      boundingClientRect(cb) { return this },
      node(cb) { return this },
      exec() {},
    }
  },
  canvasToTempFilePath: jest.fn(),
  saveImageToPhotosAlbum: jest.fn(),
  getRecorderManager() {
    return {
      start: jest.fn(),
      stop: jest.fn(),
      onStart: jest.fn(),
      onStop: jest.fn(),
    }
  },

  // Vibration
  vibrateShort: jest.fn(),

  // System info
  getSystemInfoSync() {
    return {
      model: 'iPhone 14',
      pixelRatio: 3,
      windowWidth: 390,
      windowHeight: 844,
      system: 'iOS 17.0',
      version: '8.0.0',
      platform: 'ios',
      SDKVersion: '3.0.0',
    }
  },
  getDeviceInfo() {
    return { platform: 'ios' }
  },
  getWindowInfo() {
    return {
      pixelRatio: 3,
      screenWidth: 390,
      screenHeight: 844,
      windowWidth: 390,
      windowHeight: 844,
      statusBarHeight: 47,
      safeArea: { top: 47, bottom: 34, left: 0, right: 390, width: 390, height: 763 },
    }
  },
  getMenuButtonBoundingClientRect() {
    return {
      width: 87,
      height: 32,
      top: 47,
      right: 383,
      bottom: 79,
      left: 296,
    }
  },

  // Event
  onAppShow: jest.fn(),
  onAppHide: jest.fn(),
  offAppShow: jest.fn(),
  offAppHide: jest.fn(),

  // Async scheduling
  nextTick: jest.fn((cb) => { if (typeof cb === 'function') cb() }),

  // Make phone call
  makePhoneCall: jest.fn(),

  // Share
  showShareMenu: jest.fn(),
  hideShareMenu: jest.fn(),
  updateShareMenu: jest.fn(),
}

// Reset storage and clear all mocks between tests
beforeEach(() => {
  for (const key of Object.keys(storage)) {
    delete storage[key]
  }
})

// Mock App/Page/Component 构造函数
global.App = jest.fn()
global.Page = jest.fn()
global.Component = jest.fn()

// Mock getCurrentPages
global.getCurrentPages = () => []

// Mock __wxConfig
global.__wxConfig = {
  envVersion: 'develop',
}
