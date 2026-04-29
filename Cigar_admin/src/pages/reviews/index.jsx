import { useState } from 'react'
import { Table, Button, Tabs, Input, Tag, message, Popconfirm, Progress } from 'antd'
import { DeleteOutlined, EyeInvisibleOutlined, PlusOutlined, CloseOutlined, StarFilled } from '@ant-design/icons'
import { mockReviews, mockSensitiveWords, cigarRatingSummary } from '../../mock/reviews'
import PageHeader from '../../components/PageHeader'
import StatusBadge from '../../components/StatusBadge'
import MemberLevelBadge from '../../components/MemberLevelBadge'

function StarRating({ value }) {
  return (
    <span style={{ display: 'inline-flex', gap: 2 }}>
      {[1, 2, 3, 4, 5].map(i => (
        <StarFilled key={i} style={{ color: i <= value ? '#C9A84C' : '#2A2520', fontSize: 13 }} />
      ))}
    </span>
  )
}

export default function Reviews() {
  const [reviews, setReviews] = useState(mockReviews)
  const [words, setWords] = useState(mockSensitiveWords)
  const [newWord, setNewWord] = useState('')

  const handleDelete = (id) => {
    setReviews(r => r.filter(item => item.id !== id))
    message.success('评论已删除')
  }

  const handleHide = (id) => {
    setReviews(r => r.map(item => item.id === id ? { ...item, status: 'hidden' } : item))
    message.success('评论已屏蔽')
  }

  const addWord = () => {
    if (!newWord.trim()) return
    if (words.includes(newWord.trim())) { message.warning('该词已存在'); return }
    setWords(w => [...w, newWord.trim()])
    setNewWord('')
    message.success('敏感词已添加')
  }

  const reviewColumns = [
    {
      title: '用户', key: 'user', width: 180,
      render: (_, r) => (
        <div>
          <div style={{ color: '#F5F0E8', fontWeight: 600, fontSize: 13 }}>{r.userName}</div>
          <div style={{ display: 'flex', gap: 4, marginTop: 2 }}>
            <MemberLevelBadge type="recharge" level={r.rechargeLevel} size="small" />
            <MemberLevelBadge type="consumption" level={r.consumptionLevel} size="small" />
          </div>
        </div>
      ),
    },
    {
      title: '雪茄', dataIndex: 'cigarName', key: 'cigarName', width: 180,
      render: v => <span style={{ color: '#C9A84C', fontSize: 13 }}>{v}</span>,
    },
    {
      title: '评分', dataIndex: 'rating', key: 'rating', width: 130,
      render: v => <StarRating value={v} />,
      sorter: (a, b) => a.rating - b.rating,
    },
    {
      title: '评论内容', dataIndex: 'comment', key: 'comment',
      render: v => <span style={{ color: '#9E9484', fontSize: 12 }}>{v}</span>,
    },
    { title: '时间', dataIndex: 'time', key: 'time', width: 140, render: v => <span style={{ color: '#6B6560', fontSize: 12 }}>{v}</span> },
    {
      title: '状态', dataIndex: 'status', key: 'status', width: 90,
      render: v => <StatusBadge type={v === 'visible' ? 'success' : v === 'hidden' ? 'danger' : 'warning'} dot>
        {v === 'visible' ? '公开' : v === 'hidden' ? '已屏蔽' : '待审'}
      </StatusBadge>,
    },
    {
      title: '操作', key: 'action', width: 100,
      render: (_, r) => (
        <span style={{ display: 'flex', gap: 4 }}>
          {r.status !== 'hidden' && (
            <Button type="text" size="small" icon={<EyeInvisibleOutlined />} style={{ color: '#E8A04C' }} onClick={() => handleHide(r.id)} title="屏蔽" />
          )}
          <Popconfirm title="确认删除该评论？" onConfirm={() => handleDelete(r.id)} okText="删除" cancelText="取消" okButtonProps={{ danger: true }}>
            <Button type="text" size="small" icon={<DeleteOutlined />} style={{ color: '#C94C4C' }} />
          </Popconfirm>
        </span>
      ),
    },
  ]

  const ratingColumns = [
    {
      title: '雪茄', dataIndex: 'cigarName', key: 'cigarName',
      render: v => <span style={{ color: '#F5F0E8', fontWeight: 600 }}>{v}</span>,
    },
    {
      title: '综合评分', dataIndex: 'avgRating', key: 'avgRating', width: 200,
      render: v => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Progress percent={v / 5 * 100} showInfo={false} strokeColor="#C9A84C" trailColor="#1F1F1F" size="small" style={{ width: 120 }} />
          <span style={{ color: '#C9A84C', fontWeight: 700 }}>{v}</span>
        </div>
      ),
      sorter: (a, b) => a.avgRating - b.avgRating,
    },
    { title: '评价人数', dataIndex: 'count', key: 'count', width: 90, render: v => <span style={{ color: '#9E9484' }}>{v} 人</span>, sorter: (a, b) => a.count - b.count },
    {
      title: '星级分布', key: 'dist', width: 160,
      render: (_, r) => <StarRating value={Math.round(r.avgRating)} />,
    },
  ]

  const tabItems = [
    {
      key: 'rating', label: '评分总览',
      children: (
        <div style={{ background: '#161616', border: '1px solid rgba(201,168,76,0.12)', borderRadius: 12, overflow: 'hidden' }}>
          <Table dataSource={cigarRatingSummary} columns={ratingColumns} rowKey="cigarId" size="middle" pagination={false} />
        </div>
      ),
    },
    {
      key: 'comments', label: '评论管理',
      children: (
        <div style={{ background: '#161616', border: '1px solid rgba(201,168,76,0.12)', borderRadius: 12, overflow: 'hidden' }}>
          <Table dataSource={reviews} columns={reviewColumns} rowKey="id" size="middle" pagination={{ pageSize: 10 }} />
        </div>
      ),
    },
    {
      key: 'sensitive', label: '敏感词库',
      children: (
        <div style={{ maxWidth: 600 }}>
          <div style={{ background: '#161616', border: '1px solid rgba(201,168,76,0.12)', borderRadius: 12, padding: 24 }}>
            <div style={{ color: '#9E9484', fontSize: 13, marginBottom: 16 }}>
              系统预设敏感词过滤，用户提交评论时自动拦截违规内容
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
              {words.map(w => (
                <Tag
                  key={w}
                  closable
                  onClose={() => setWords(arr => arr.filter(x => x !== w))}
                  style={{ background: 'rgba(201,76,76,0.1)', color: '#C94C4C', border: '1px solid rgba(201,76,76,0.3)', borderRadius: 999, padding: '2px 10px' }}
                  closeIcon={<CloseOutlined style={{ color: '#C94C4C', fontSize: 10 }} />}
                >
                  {w}
                </Tag>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <Input
                value={newWord} onChange={e => setNewWord(e.target.value)}
                onPressEnter={addWord}
                placeholder="输入敏感词后回车或点击添加"
                style={{ background: '#1F1F1F', borderColor: 'rgba(201,168,76,0.2)' }}
              />
              <Button type="primary" icon={<PlusOutlined />} onClick={addWord}
                style={{ background: 'linear-gradient(135deg, #E8C97A, #C9A84C)', border: 'none', color: '#1A1208', fontWeight: 600 }}>
                添加
              </Button>
            </div>
          </div>
        </div>
      ),
    },
  ]

  return (
    <div>
      <PageHeader title="评价管理" subtitle="管理商品评分数据与用户评论，查看会员双等级信息，过滤违规内容" />
      <div style={{ background: '#161616', border: '1px solid rgba(201,168,76,0.12)', borderRadius: 12, padding: 20 }}>
        <Tabs items={tabItems} />
      </div>
    </div>
  )
}
