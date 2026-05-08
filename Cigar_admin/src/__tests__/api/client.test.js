import { describe, it, expect, beforeEach, vi } from 'vitest'
import axios from 'axios'
import apiClient, { genIdempotencyKey } from '../../api/client'

describe('apiClient', () => {
  describe('axios 实例配置', () => {
    it('baseURL 应为 /api', () => {
      expect(apiClient.defaults.baseURL).toBe('/api')
    })

    it('timeout 应为 15000ms', () => {
      expect(apiClient.defaults.timeout).toBe(15000)
    })

    it('Content-Type 应为 application/json', () => {
      expect(apiClient.defaults.headers['Content-Type']).toBe('application/json')
    })
  })

  describe('请求拦截器', () => {
    it('应附加 Authorization header (access_token 存在时)', () => {
      localStorage.setItem('access_token', 'test-token')

      const config = { headers: {} }
      const interceptor = apiClient.interceptors.request.handlers[0]
      const result = interceptor.fulfilled(config)

      expect(result.headers.Authorization).toBe('Bearer test-token')
    })

    it('access_token 不存在时不附加 Authorization header', () => {
      localStorage.removeItem('access_token')

      const config = { headers: {} }
      const interceptor = apiClient.interceptors.request.handlers[0]
      const result = interceptor.fulfilled(config)

      expect(result.headers.Authorization).toBeUndefined()
    })

    it('应附加 Idempotency-Key header (config.idempotencyKey 存在时)', () => {
      const config = {
        headers: {},
        idempotencyKey: 'test-idempotency-key-123',
      }
      const interceptor = apiClient.interceptors.request.handlers[0]
      const result = interceptor.fulfilled(config)

      expect(result.headers['Idempotency-Key']).toBe('test-idempotency-key-123')
    })
  })

  describe('响应拦截器 (success)', () => {
    it('code=0 时应返回完整 response', async () => {
      const response = {
        data: { code: 0, message: '成功', data: { id: 1 } },
        status: 200,
      }

      const interceptor = apiClient.interceptors.response.handlers[0]
      const result = await interceptor.fulfilled(response)

      expect(result).toBe(response)
    })

    it('code!=0 时应 reject 并包含错误信息', async () => {
      const response = {
        data: { code: 2001, message: '参数错误' },
        status: 400,
      }

      const interceptor = apiClient.interceptors.response.handlers[0]
      await expect(interceptor.fulfilled(response)).rejects.toThrow('参数错误')
    })

    it('body 无 code 字段时应返回原 response', async () => {
      const response = {
        data: { result: 'some-data' },
        status: 200,
      }

      const interceptor = apiClient.interceptors.response.handlers[0]
      const result = await interceptor.fulfilled(response)
      expect(result).toBe(response)
    })
  })

  describe('响应拦截器 (error - token 刷新)', () => {
    it('网络错误(无 response)应直接 reject', async () => {
      const error = { message: 'Network Error' }

      const interceptor = apiClient.interceptors.response.handlers[0]
      await expect(interceptor.rejected(error)).rejects.toEqual(error)
    })

    it('code=1001 且无 refreshToken 时应清除并重定向', async () => {
      localStorage.removeItem('refresh_token')
      delete window.location
      window.location = { href: '' }

      const error = {
        response: {
          data: { code: 1001, message: 'Token 过期' },
        },
        config: { headers: {} },
      }

      const interceptor = apiClient.interceptors.response.handlers[0]
      await expect(interceptor.rejected(error)).rejects.toBeDefined()
      expect(window.location.href).toBe('/login')
    })

    it('code=1006 时应设置 must_change_password 并重定向', async () => {
      delete window.location
      window.location = { href: '' }

      const error = {
        response: {
          data: { code: 1006, message: '必须修改密码' },
        },
        config: { headers: {} },
      }

      const interceptor = apiClient.interceptors.response.handlers[0]
      await expect(interceptor.rejected(error)).rejects.toBeDefined()
      expect(localStorage.getItem('must_change_password')).toBe('true')
      expect(window.location.href).toBe('/change-password')
    })
  })
})

describe('genIdempotencyKey', () => {
  it('应生成符合 UUID v4 格式的字符串', () => {
    const key = genIdempotencyKey()
    expect(key).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
    )
  })

  it('每次调用应生成不同的 key', () => {
    const keys = new Set()
    for (let i = 0; i < 100; i++) {
      keys.add(genIdempotencyKey())
    }
    expect(keys.size).toBe(100)
  })
})
