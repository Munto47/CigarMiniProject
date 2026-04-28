import { useState } from 'react'
import { Form, Input, Button, message, Checkbox } from 'antd'
import { UserOutlined, LockOutlined, EyeInvisibleOutlined, EyeTwoTone } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import useStore from '../../store/useStore'

const MOCK_ACCOUNTS = [
  { username: 'admin', password: 'admin123', name: '超级管理员', role: 'super' },
  { username: 'product_mgr', password: 'product123', name: '李经理', role: 'product' },
  { username: 'order_mgr', password: 'order123', name: '赵主管', role: 'order' },
]

export default function LoginPage() {
  const [loading, setLoading] = useState(false)
  const [failCount, setFailCount] = useState(0)
  const navigate = useNavigate()
  const { login } = useStore()

  const onFinish = async (values) => {
    if (failCount >= 5) {
      message.error('账号已被锁定，请1小时后重试')
      return
    }
    setLoading(true)
    await new Promise(r => setTimeout(r, 800))
    const account = MOCK_ACCOUNTS.find(
      a => a.username === values.username && a.password === values.password
    )
    if (account) {
      login({ name: account.name, role: account.role, username: account.username })
      message.success(`欢迎回来，${account.name}`)
      navigate('/dashboard')
    } else {
      const newCount = failCount + 1
      setFailCount(newCount)
      if (newCount >= 5) {
        message.error('密码错误次数过多，账号已锁定1小时')
      } else {
        message.error(`账号或密码错误，还可尝试 ${5 - newCount} 次`)
      }
    }
    setLoading(false)
  }

  return (
    <div style={{
      minHeight: '100vh', background: '#0D0D0D',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      position: 'relative', overflow: 'hidden',
    }}>
      {/* 背景装饰 */}
      <div style={{
        position: 'absolute', width: 400, height: 400, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(201,168,76,0.06) 0%, transparent 70%)',
        top: '20%', left: '30%', transform: 'translate(-50%,-50%)',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', width: 300, height: 300, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(201,168,76,0.04) 0%, transparent 70%)',
        bottom: '20%', right: '25%',
        pointerEvents: 'none',
      }} />

      <div style={{
        width: 400, background: '#161616',
        border: '1px solid rgba(201,168,76,0.2)',
        borderRadius: 16, padding: '48px 40px',
        boxShadow: '0 24px 80px rgba(0,0,0,0.8)',
        position: 'relative',
      }}>
        {/* 顶部金线 */}
        <div style={{
          position: 'absolute', top: 0, left: '20%', right: '20%', height: 2,
          background: 'linear-gradient(90deg, transparent, #C9A84C, transparent)',
          borderRadius: '0 0 2px 2px',
        }} />

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 14, margin: '0 auto 16px',
            background: 'linear-gradient(135deg, #E8C97A, #C9A84C, #7A6430)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 26, fontWeight: 700, color: '#1A1208',
            boxShadow: '0 4px 20px rgba(201,168,76,0.3)',
          }}>C</div>
          <div style={{ color: '#C9A84C', fontSize: 18, fontWeight: 700, letterSpacing: '0.15em' }}>
            CIGAR CLUB
          </div>
          <div style={{ color: '#4A4540', fontSize: 12, marginTop: 4, letterSpacing: '0.1em' }}>
            管理后台系统
          </div>
        </div>

        <Form onFinish={onFinish} size="large" layout="vertical">
          <Form.Item name="username" rules={[{ required: true, message: '请输入账号' }]}>
            <Input
              prefix={<UserOutlined style={{ color: '#4A4540' }} />}
              placeholder="管理员账号"
              style={{ background: '#1F1F1F', border: '1px solid rgba(201,168,76,0.2)', color: '#F5F0E8', borderRadius: 8 }}
            />
          </Form.Item>

          <Form.Item name="password" rules={[{ required: true, message: '请输入密码' }]}>
            <Input.Password
              prefix={<LockOutlined style={{ color: '#4A4540' }} />}
              placeholder="登录密码"
              iconRender={v => v ? <EyeTwoTone twoToneColor="#C9A84C" /> : <EyeInvisibleOutlined style={{ color: '#4A4540' }} />}
              style={{ background: '#1F1F1F', border: '1px solid rgba(201,168,76,0.2)', color: '#F5F0E8', borderRadius: 8 }}
            />
          </Form.Item>

          {failCount >= 5 && (
            <div style={{
              background: 'rgba(201,76,76,0.1)', border: '1px solid rgba(201,76,76,0.3)',
              borderRadius: 8, padding: '10px 14px', marginBottom: 16,
              color: '#C94C4C', fontSize: 13,
            }}>
              账号已锁定，请1小时后重试
            </div>
          )}

          <Form.Item style={{ marginBottom: 0, marginTop: 8 }}>
            <Button
              type="primary" htmlType="submit" block
              loading={loading}
              disabled={failCount >= 5}
              style={{
                height: 44, borderRadius: 8, fontWeight: 600, fontSize: 15,
                background: 'linear-gradient(135deg, #E8C97A, #C9A84C, #7A6430)',
                border: 'none', color: '#1A1208',
              }}
            >
              {loading ? '验证中...' : '登 录'}
            </Button>
          </Form.Item>
        </Form>

        <div style={{ marginTop: 24, textAlign: 'center', color: '#4A4540', fontSize: 12 }}>
          演示账号：admin / admin123
        </div>
      </div>
    </div>
  )
}
