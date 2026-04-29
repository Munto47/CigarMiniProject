import { useState } from 'react'
import { Tabs, Form, Input, Button, Switch, Table, message, Upload } from 'antd'
import { UploadOutlined, SaveOutlined } from '@ant-design/icons'
import PageHeader from '../../components/PageHeader'
import StatusBadge from '../../components/StatusBadge'

const mockLogs = [
  { id: 1, time: '2024-06-03 14:22', user: 'admin', action: '更新了雪茄 Cohiba Behike 52 的库存', level: 'info' },
  { id: 2, time: '2024-06-03 10:15', user: 'product_mgr', action: '新增雪茄 Padron 1964 Anniversary', level: 'info' },
  { id: 3, time: '2024-06-02 22:30', user: 'admin', action: '修改了储值折扣率 0.85 → 0.82', level: 'warning' },
  { id: 4, time: '2024-06-02 18:00', user: 'order_mgr', action: '手动完成订单 ORD20240602002', level: 'info' },
  { id: 5, time: '2024-06-02 03:14', user: 'unknown', action: '登录失败（IP: 10.0.0.55）', level: 'error' },
]

export default function Settings() {
  const [basicForm] = Form.useForm()
  const [meituanForm] = Form.useForm()

  const logColumns = [
    { title: '时间', dataIndex: 'time', key: 'time', width: 160, render: v => <span style={{ color: '#6B6560', fontSize: 12 }}>{v}</span> },
    { title: '操作人', dataIndex: 'user', key: 'user', width: 100, render: v => <span style={{ color: '#F5F0E8' }}>{v}</span> },
    { title: '操作内容', dataIndex: 'action', key: 'action', render: v => <span style={{ color: '#9E9484', fontSize: 12 }}>{v}</span> },
    {
      title: '级别', dataIndex: 'level', key: 'level', width: 90,
      render: v => <StatusBadge type={v === 'error' ? 'danger' : v === 'warning' ? 'warning' : 'default'} dot>
        {v === 'error' ? '错误' : v === 'warning' ? '警告' : '信息'}
      </StatusBadge>,
    },
  ]

  const FormSection = ({ title, children }) => (
    <div style={{ marginBottom: 28 }}>
      <div style={{ color: '#C9A84C', fontSize: 14, fontWeight: 600, marginBottom: 16, paddingBottom: 8, borderBottom: '1px solid rgba(201,168,76,0.15)' }}>{title}</div>
      {children}
    </div>
  )

  const tabItems = [
    {
      key: 'basic', label: '基础信息',
      children: (
        <div style={{ maxWidth: 560 }}>
          <div style={{ background: '#161616', border: '1px solid rgba(201,168,76,0.12)', borderRadius: 12, padding: 24 }}>
            <FormSection title="品牌信息">
              <Form layout="vertical" initialValues={{ clubName: 'GOAT CIGAR CLUB', tagline: '山羊雪茄俱乐部 · 发现专属风味' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
                  <Form.Item label="俱乐部名称" name="clubName">
                    <Input style={{ background: '#1F1F1F', borderColor: 'rgba(201,168,76,0.2)' }} />
                  </Form.Item>
                  <Form.Item label="宣传语" name="tagline">
                    <Input style={{ background: '#1F1F1F', borderColor: 'rgba(201,168,76,0.2)' }} />
                  </Form.Item>
                </div>
                <Form.Item label="商家 LOGO">
                  <Upload beforeUpload={() => { message.info('LOGO上传待后端接入'); return false; }} showUploadList={false}>
                    <Button icon={<UploadOutlined />} style={{ color: '#9E9484', borderColor: 'rgba(201,168,76,0.2)' }}>
                      上传 LOGO
                    </Button>
                  </Upload>
                </Form.Item>
              </Form>
            </FormSection>

            <FormSection title="联系方式与地址">
              <Form layout="vertical" initialValues={{ address: '上海市黄浦区某某路88号', phone: '021-88888888', hours: '17:00 - 02:00' }}>
                <Form.Item label="门店地址" name="address">
                  <Input style={{ background: '#1F1F1F', borderColor: 'rgba(201,168,76,0.2)' }} />
                </Form.Item>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
                  <Form.Item label="联系电话" name="phone">
                    <Input style={{ background: '#1F1F1F', borderColor: 'rgba(201,168,76,0.2)' }} />
                  </Form.Item>
                  <Form.Item label="营业时间" name="hours">
                    <Input placeholder="例：17:00 - 02:00" style={{ background: '#1F1F1F', borderColor: 'rgba(201,168,76,0.2)' }} />
                  </Form.Item>
                </div>
                <Button type="primary" icon={<SaveOutlined />} style={{ background: 'linear-gradient(135deg, #E8C97A, #C9A84C)', border: 'none', color: '#1A1208', fontWeight: 600 }}
                  onClick={() => message.success('基础信息已保存')}>
                  保存信息
                </Button>
              </Form>
            </FormSection>
          </div>
        </div>
      ),
    },
    {
      key: 'meituan', label: '美团收银接口',
      children: (
        <div style={{ maxWidth: 560 }}>
          <div style={{ background: '#161616', border: '1px solid rgba(201,168,76,0.12)', borderRadius: 12, padding: 24 }}>
            <div style={{ background: 'rgba(201,168,76,0.06)', border: '1px solid rgba(201,168,76,0.15)', borderRadius: 8, padding: '10px 16px', marginBottom: 24, fontSize: 13, color: '#9E9484' }}>
              💡 接口配置将用于订单实时同步至美团收银系统，请联系美团商家服务获取参数
            </div>
            <Form form={meituanForm} layout="vertical" initialValues={{ appId: 'mt_app_xxxxxxxx', baseUrl: 'https://open.meituan.com/api/v1' }}>
              <Form.Item label="美团 App ID" name="appId">
                <Input style={{ background: '#1F1F1F', borderColor: 'rgba(201,168,76,0.2)' }} />
              </Form.Item>
              <Form.Item label="App Secret" name="appSecret">
                <Input.Password placeholder="输入 App Secret" style={{ background: '#1F1F1F', borderColor: 'rgba(201,168,76,0.2)' }} />
              </Form.Item>
              <Form.Item label="API 接口地址" name="baseUrl">
                <Input style={{ background: '#1F1F1F', borderColor: 'rgba(201,168,76,0.2)' }} />
              </Form.Item>
              <Form.Item label="自动同步" name="autoSync" valuePropName="checked" initialValue={true}>
                <Switch checkedChildren="开启" unCheckedChildren="关闭" />
              </Form.Item>
              <div style={{ display: 'flex', gap: 12 }}>
                <Button type="primary" style={{ background: 'linear-gradient(135deg, #E8C97A, #C9A84C)', border: 'none', color: '#1A1208', fontWeight: 600 }}
                  onClick={() => message.success('接口配置已保存')}>
                  保存配置
                </Button>
                <Button style={{ color: '#4CAF7A', borderColor: 'rgba(76,175,122,0.3)' }}
                  onClick={() => message.success('接口连接测试成功（演示）')}>
                  测试连接
                </Button>
              </div>
            </Form>
          </div>
        </div>
      ),
    },
    {
      key: 'logs', label: '系统日志',
      children: (
        <div style={{ background: '#161616', border: '1px solid rgba(201,168,76,0.12)', borderRadius: 12, overflow: 'hidden' }}>
          <Table dataSource={mockLogs} columns={logColumns} rowKey="id" size="middle" pagination={{ pageSize: 10 }} />
        </div>
      ),
    },
  ]

  return (
    <div>
      <PageHeader title="系统设置" subtitle="配置商家基础信息、收银接口及查看系统日志" />
      <div style={{ background: '#161616', border: '1px solid rgba(201,168,76,0.12)', borderRadius: 12, padding: 20 }}>
        <Tabs items={tabItems} />
      </div>
    </div>
  )
}
