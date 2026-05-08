import apiClient from './client'

export function uploadImage(file) {
  const formData = new FormData()
  formData.append('file', file)
  return apiClient.post('/upload/image', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
}
