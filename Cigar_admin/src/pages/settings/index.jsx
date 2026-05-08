import { useState, useEffect, useCallback } from 'react'
import { Tabs, Form, Input, Button, Switch, Table, message, Upload, Spin } from 'antd'
import { UploadOutlined, SaveOutlined } from '@ant-design/icons'
import PageHeader from '../../components/PageHeader'
import StatusBadge from '../../components/StatusBadge'
import { getSettings, updateSetting, getOperationLogs, testMeituanConnection } from '../../api/settings'
import { uploadImage } from '../../api/upload'

export default function Settings() {
  const [settingsData, setSettingsData] = useState({})
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [logs, setLogs] = useState([])
  const [logsTotal, setLogsTotal] = useState(0)
  const [logsPage, setLogsPage] = useState(1)
  const [logsLoading, setLogsLoading] = useState(false)
  const [testingMeituan, setTestingMeituan] = useState(false)
  const [basicForm] = Form.useForm()
  const [meituanForm] = Form.useForm()

  const fetchSettings = useCallback(async () => {
    setLoading(true)
    try {
      const res = await getSettings()
      const data = res.data?.data || {}
      setSettingsData(data)
      const basic = data.basic || {}
      basicForm.setFieldsValue({
        clubName: basic.clubName || 'GOAT CIGAR CLUB',
        tagline: basic.tagline || '',
        address: basic.address || '',
        phone: basic.phone || '',
        hours: basic.hours || '',
      })
      const mt = data.meituan || {}
      meituanForm.setFieldsValue({
        appId: mt.appId || '',
        appSecret: '',
        baseUrl: mt.baseUrl || '',
        autoSync: mt.autoSync !== false,
      })
    } catch (err) {
      console.error('获取设置失败:', err)
    } finally {
      setLoading(false)
    }
  }, [basicForm, meituanForm])

  const fetchLogs = useCallback(async () => {
    setLogsLoading(true)
    try {
      const res = await getOperationLogs({ page: logsPage, pageSize: 10 })
      const body = res.data?.data
      setLogs(body?.list || [])
      setLogsTotal(body?.total || 0)
    } catch (err) {
      console.error('获取操作日志失败:', err)
    } finally {
      setLogsLoading(false)
    }
  }, [logsPage])

  const handleTabChange = (key) => {
    if (key === 'logs') fetchLogs()
    else if (key === 'basic' || key === 'meituan') fetchSettings()
  }

  const handleSaveBasic = async () => {
    const vals = await basicForm.validateFields()
    setSaving(true)
    try {
      await updateSetting('basic', {
        clubName: vals.clubName,
        tagline: vals.tagline,
        address: vals.address,
        phone: vals.phone,
        hours: vals.hours,
      })
      message.success('基础信息已保存')
    } catch (err) {
      message.error(err.response?.data?.message || '保存失败')
    } finally {
      setSaving(false)
    }
  }

  const handleSaveMeituan = async () => {
    const vals = await meituanForm.validateFields()
    setSaving(true)
    try {
      const payload = {
        appId: vals.appId,
        baseUrl: vals.baseUrl,
        autoSync: vals.autoSync,
      }
      if (vals.appSecret) payload.appSecret = vals.appSecret
      await updateSetting('meituan', payload)
      message.success('美团接口配置已保存')
    } catch (err) {
      message.error(err.response?.data?.message || '保存失败')
    } finally {
      setSaving(false)
    }
  }

  const handleTestMeituan = async () => {
    setTestingMeituan(true)
    try {
      await testMeituanConnection()
      message.success('美团接口连接测试成功')
    } catch (err) {
      message.error(err.response?.data?.message || '连接测试失败')
    } finally {
      setTestingMeituan(false)
    }
  }

  const logColumns = [
    { title: '时间', key: 'time', width: 170, render: (_, r) => <span style={{ color: '#6B6560', fontSize: 12 }}>{r.createdAt || '-'}</span> },
    { title: '操作人', dataIndex: 'adminName', key: 'adminName', width: 110, render: v => <span style={{ color: '#F5F0E8' }}>{v || '-'}</span> },
    { title: '模块', dataIndex: 'module', key: 'module', width: 90, render: v => <span style={{ color: '#9E9484', fontSize: 12 }}>{v || '-'}</span> },
    { title: '操作内容', dataIndex: 'description', key: 'description', render: v => <span style={{ color: '#9E9484', fontSize: 12 }}>{v || '-'}</span> },
    {
      title: '级别', dataIndex: 'level', key: 'level', width: 80,
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
          <Spin spinning={loading}>
            <div style={{ background: '#161616', border: '1px solid rgba(201,168,76,0.12)', borderRadius: 12, padding: 24 }}>
              <FormSection title="品牌信息">
                <Form form={basicForm} layout="vertical">
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
                    <Form.Item label="俱乐部名称" name="clubName">
                      <Input style={{ background: '#1F1F1F', borderColor: 'rgba(201,168,76,0.2)' }} />
                    </Form.Item>
                    <Form.Item label="宣传语" name="tagline">
                      <Input style={{ background: '#1F1F1F', borderColor: 'rgba(201,168,76,0.2)' }} />
                    </Form.Item>
                  </div>
                  <Form.Item label="商家 LOGO">
                    <Upload beforeUpload={async (file) => { try { const res = await uploadImage(file); basicForm.setFieldsValue({ logoUrl: res.data.data.url }); message.success('LOGO 上传成功'); } catch { message.error('上传失败'); } return false }} showUploadList={false}>
                      <Button icon={<UploadOutlined />} style={{ color: '#9E9484', borderColor: 'rgba(201,168,76,0.2)' }}>
                        上传 LOGO
                      </Button>
                    </Upload>
                  </Form.Item>
                </Form>
              </FormSection>

              <FormSection title="联系方式与地址">
                <Form form={basicForm} layout="vertical">
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
                  <Button type="primary" icon={<SaveOutlined />} loading={saving}
                    style={{ background: 'linear-gradient(135deg, #E8C97A, #C9A84C)', border: 'none', color: '#1A1208', fontWeight: 600 }}
                    onClick={handleSaveBasic}>
                    保存信息
                  </Button>
                </Form>
              </FormSection>
            </div>
          </Spin>
        </div>
      ),
    },
    {
      key: 'meituan', label: '美团收银接口',
      children: (
        <div style={{ maxWidth: 560 }}>
          <Spin spinning={loading}>
            <div style={{ background: '#161616', border: '1px solid rgba(201,168,76,0.12)', borderRadius: 12, padding: 24 }}>
              <div style={{ background: 'rgba(201,168,76,0.06)', border: '1px solid rgba(201,168,76,0.15)', borderRadius: 8, padding: '10px 16px', marginBottom: 24, fontSize: 13, color: '#9E9484' }}>
                接口配置将用于订单实时同步至美团收银系统，请联系美团商家服务获取参数
              </div>
              <Form form={meituanForm} layout="vertical">
                <Form.Item label="美团 App ID" name="appId">
                  <Input style={{ background: '#1F1F1F', borderColor: 'rgba(201,168,76,0.2)' }} />
                </Form.Item>
                <Form.Item label="App Secret" name="appSecret">
                  <Input.Password placeholder="留空则不修改" style={{ background: '#1F1F1F', borderColor: 'rgba(201,168,76,0.2)' }} />
                </Form.Item>
                <Form.Item label="API 接口地址" name="baseUrl">
                  <Input style={{ background: '#1F1F1F', borderColor: 'rgba(201,168,76,0.2)' }} />
                </Form.Item>
                <Form.Item label="自动同步" name="autoSync" valuePropName="checked">
                  <Switch checkedChildren="开启" unCheckedChildren="关闭" />
                </Form.Item>
                <div style={{ display: 'flex', gap: 12 }}>
                  <Button type="primary" loading={saving}
                    style={{ background: 'linear-gradient(135deg, #E8C97A, #C9A84C)', border: 'none', color: '#1A1208', fontWeight: 600 }}
                    onClick={handleSaveMeituan}>
                    保存配置
                  </Button>
                  <Button loading={testingMeituan}
                    style={{ color: '#4CAF7A', borderColor: 'rgba(76,175,122,0.3)' }}
                    onClick={handleTestMeituan}>
                    测试连接
                  </Button>
                </div>
              </Form>
            </div>
          </Spin>
        </div>
      ),
    },
    {
      key: 'logs', label: '系统日志',
      children: (
        <div style={{ background: '#161616', border: '1px solid rgba(201,168,76,0.12)', borderRadius: 12, overflow: 'hidden' }}>
          <Spin spinning={logsLoading}>
            <Table
              dataSource={logs} columns={logColumns} rowKey="id" size="middle"
              pagination={{
                current: logsPage, pageSize: 10, total: logsTotal,
                showTotal: t => <span style={{ color: '#6B6560' }}>共 {t} 条</span>,
                onChange: (p) => setLogsPage(p),
              }}
            />
          </Spin>
        </div>
      ),
    },
  ]

  return (
    <div>
      <PageHeader title="系统设置" subtitle="配置商家基础信息、收银接口及查看系统日志" />
      <div style={{ background: '#161616', border: '1px solid rgba(201,168,76,0.12)', borderRadius: 12, padding: 20 }}>
        <Tabs items={tabItems} onChange={handleTabChange} />
      </div>
    </div>
  )
}
