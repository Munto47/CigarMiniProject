import { useState, useEffect, useCallback } from 'react'
import { Table, Button, Tabs, Input, Tag, message, Popconfirm, Progress, Spin } from 'antd'
import { DeleteOutlined, EyeInvisibleOutlined, EyeOutlined, PlusOutlined, CloseOutlined, StarFilled } from '@ant-design/icons'
import PageHeader from '../../components/PageHeader'
import StatusBadge from '../../components/StatusBadge'
import { getReviews, moderateReview, deleteReview, getSensitiveWords, createSensitiveWord, deleteSensitiveWord } from '../../api/reviews'

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
  const [reviews, setReviews] = useState([])
  const [reviewsTotal, setReviewsTotal] = useState(0)
  const [reviewsPage, setReviewsPage] = useState(1)
  const [reviewsLoading, setReviewsLoading] = useState(false)
  const [words, setWords] = useState([])
  const [wordsLoading, setWordsLoading] = useState(false)
  const [newWord, setNewWord] = useState('')
  const [ratingSummary, setRatingSummary] = useState([])
  const [ratingLoading, setRatingLoading] = useState(false)

  const fetchReviews = useCallback(async () => {
    setReviewsLoading(true)
    try {
      const res = await getReviews({ page: reviewsPage, pageSize: 10 })
      const body = res.data.data
      setReviews(body.list || [])
      setReviewsTotal(body.total || 0)
    } catch (err) {
      console.error('获取评价列表失败:', err)
    } finally {
      setReviewsLoading(false)
    }
  }, [reviewsPage])

  const fetchWords = useCallback(async () => {
    setWordsLoading(true)
    try {
      const res = await getSensitiveWords({ pageSize: 500 })
      const body = res.data.data
      setWords(body.list || [])
    } catch (err) {
      console.error('获取敏感词失败:', err)
    } finally {
      setWordsLoading(false)
    }
  }, [])

  const fetchRatingSummary = useCallback(async () => {
    setRatingLoading(true)
    try {
      const res = await getReviews({ pageSize: 1 })
      setRatingSummary(res.data?.data?.ratingSummary || [])
    } catch (err) {
      console.error('获取评分概览失败:', err)
    } finally {
      setRatingLoading(false)
    }
  }, [])

  // 页面挂载时同时加载评价列表、评分总览和敏感词
  useEffect(() => {
    fetchReviews()
    fetchRatingSummary()
    fetchWords()
  }, [fetchReviews, fetchRatingSummary, fetchWords])

  const handleTabChange = (key) => {
    if (key === 'comments') fetchReviews()
    else if (key === 'sensitive') fetchWords()
    else if (key === 'rating') fetchRatingSummary()
  }

  const handleHide = async (id) => {
    try {
      await moderateReview(id, { action: 'hide' })
      message.success('评论已屏蔽')
      fetchReviews()
    } catch (err) {
      message.error(err.response?.data?.message || '操作失败')
    }
  }

  const handleShow = async (id) => {
    try {
      await moderateReview(id, { action: 'show' })
      message.success('评论已恢复')
      fetchReviews()
    } catch (err) {
      message.error(err.response?.data?.message || '操作失败')
    }
  }

  const handleDelete = async (id) => {
    try {
      await deleteReview(id)
      message.success('评论已删除')
      fetchReviews()
    } catch (err) {
      message.error(err.response?.data?.message || '删除失败')
    }
  }

  const addWord = async () => {
    if (!newWord.trim()) return
    try {
      await createSensitiveWord({ word: newWord.trim() })
      setNewWord('')
      message.success('敏感词已添加')
      fetchWords()
    } catch (err) {
      message.error(err.response?.data?.message || '添加失败')
    }
  }

  const removeWord = async (id) => {
    try {
      await deleteSensitiveWord(id)
      message.success('敏感词已删除')
      fetchWords()
    } catch (err) {
      message.error(err.response?.data?.message || '删除失败')
    }
  }

  const reviewColumns = [
    {
      title: '用户', key: 'user', width: 160,
      render: (_, r) => (
        <div>
          <div style={{ color: '#F5F0E8', fontWeight: 600, fontSize: 13 }}>{r.userName || r.user?.nickname || '匿名'}</div>
          {r.user?.rechargeLevel && (
            <div style={{ color: '#9E9484', fontSize: 11, marginTop: 2 }}>
              充V{r.user.rechargeLevel} · 消V{r.user.consumptionLevel}
            </div>
          )}
        </div>
      ),
    },
    {
      title: '雪茄', key: 'cigarName', width: 170,
      render: (_, r) => <span style={{ color: '#C9A84C', fontSize: 13 }}>{r.cigarName || r.cigar?.name || '-'}</span>,
    },
    {
      title: '评分', dataIndex: 'rating', key: 'rating', width: 130,
      render: v => <StarRating value={v} />,
      sorter: (a, b) => a.rating - b.rating,
    },
    {
      title: '评论内容', key: 'comment',
      render: (_, r) => <span style={{ color: '#9E9484', fontSize: 12 }}>{r.content || r.comment || '-'}</span>,
    },
    { title: '时间', key: 'time', width: 140, render: (_, r) => <span style={{ color: '#6B6560', fontSize: 12 }}>{r.createdAt || r.time || '-'}</span> },
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
          {r.status === 'hidden' ? (
            <Button type="text" size="small" icon={<EyeOutlined />} style={{ color: '#4CAF7A' }} onClick={() => handleShow(r.id)} title="恢复" />
          ) : (
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
      title: '雪茄', key: 'cigarName',
      render: (_, r) => <span style={{ color: '#F5F0E8', fontWeight: 600 }}>{r.cigarName || r.name || '-'}</span>,
    },
    {
      title: '综合评分', key: 'avgRating', width: 200,
      render: (_, r) => {
        const v = r.avgRating || r.ratingAvg || 0
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Progress percent={Number(v) / 5 * 100} showInfo={false} strokeColor="#C9A84C" trailColor="#1F1F1F" size="small" style={{ width: 120 }} />
            <span style={{ color: '#C9A84C', fontWeight: 700 }}>{Number(v).toFixed(1)}</span>
          </div>
        )
      },
      sorter: (a, b) => (a.avgRating || 0) - (b.avgRating || 0),
    },
    { title: '评价人数', key: 'count', width: 90, render: (_, r) => <span style={{ color: '#9E9484' }}>{r.count || r.ratingCount || 0} 人</span> },
    {
      title: '星级分布', key: 'dist', width: 160,
      render: (_, r) => <StarRating value={Math.round(r.avgRating || r.ratingAvg || 0)} />,
    },
  ]

  const wordList = Array.isArray(words) ? words.map(w => typeof w === 'string' ? { word: w } : w) : []

  const tabItems = [
    {
      key: 'rating', label: '评分总览',
      children: (
        <div style={{ background: '#161616', border: '1px solid rgba(201,168,76,0.12)', borderRadius: 12, overflow: 'hidden' }}>
          <Spin spinning={ratingLoading}>
            <Table dataSource={ratingSummary} columns={ratingColumns} rowKey={(r) => r.cigarId || r.id || Math.random()} size="middle" pagination={false} />
          </Spin>
        </div>
      ),
    },
    {
      key: 'comments', label: '评论管理',
      children: (
        <div style={{ background: '#161616', border: '1px solid rgba(201,168,76,0.12)', borderRadius: 12, overflow: 'hidden' }}>
          <Spin spinning={reviewsLoading}>
            <Table
              dataSource={reviews} columns={reviewColumns} rowKey="id" size="middle"
              pagination={{
                current: reviewsPage, pageSize: 10, total: reviewsTotal,
                showTotal: t => <span style={{ color: '#6B6560' }}>共 {t} 条</span>,
                onChange: (p) => setReviewsPage(p),
              }}
            />
          </Spin>
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
            <Spin spinning={wordsLoading}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
                {wordList.map(w => (
                  <Tag
                    key={w.id || w.word}
                    closable
                    onClose={() => removeWord(w.id)}
                    style={{ background: 'rgba(201,76,76,0.1)', color: '#C94C4C', border: '1px solid rgba(201,76,76,0.3)', borderRadius: 999, padding: '2px 10px' }}
                    closeIcon={<CloseOutlined style={{ color: '#C94C4C', fontSize: 10 }} />}
                  >
                    {w.word}
                  </Tag>
                ))}
                {wordList.length === 0 && <span style={{ color: '#4A4540', fontSize: 12 }}>暂无敏感词</span>}
              </div>
            </Spin>
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
      <PageHeader title="评价管理" subtitle="管理商品评分数据与用户评论，过滤违规内容" />
      <div style={{ background: '#161616', border: '1px solid rgba(201,168,76,0.12)', borderRadius: 12, padding: 20 }}>
        <Tabs items={tabItems} onChange={handleTabChange} />
      </div>
    </div>
  )
}
