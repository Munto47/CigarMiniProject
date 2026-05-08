import { describe, it, expect, vi } from 'vitest'
import apiClient from '../../api/client'
import { uploadImage } from '../../api/upload'

vi.mock('../../api/client', () => ({
  default: {
    post: vi.fn(),
  },
}))

describe('upload API', () => {
  describe('uploadImage', () => {
    it('应 POST /upload/image 使用 multipart/form-data', async () => {
      const mockFile = new File(['test'], 'test.png', { type: 'image/png' })
      apiClient.post.mockResolvedValue({ data: { code: 0, data: { url: 'http://...' } } })

      await uploadImage(mockFile)

      expect(apiClient.post).toHaveBeenCalledWith('/upload/image', expect.any(FormData), {
        headers: { 'Content-Type': 'multipart/form-data' },
      })

      const formData = apiClient.post.mock.calls[0][1]
      expect(formData.get('file')).toBe(mockFile)
    })
  })
})
