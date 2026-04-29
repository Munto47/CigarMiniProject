export const mockReviews = [
  {
    id: 1, userId: 1, userName: '林先生', cigarId: 1, cigarName: 'Cohiba Behike 52',
    rating: 5, comment: '经典中的经典，古巴的骄傲。前段雪松木香非常明显，中段咖啡可可层次丰富，尾段绵长悠远。完美的商务场合雪茄。',
    orderId: 'ORD20240603001', time: '2024-06-03 21:30', status: 'visible',
    rechargeLevel: 8, consumptionLevel: 7,
  },
  {
    id: 2, userId: 4, userName: '陈先生', cigarId: 1, cigarName: 'Cohiba Behike 52',
    rating: 5, comment: '品质无可挑剔，每一口都是享受。与麦卡伦搭配堪称完美。',
    orderId: 'ORD20240602002', time: '2024-06-02 22:00', status: 'visible',
    rechargeLevel: 9, consumptionLevel: 8,
  },
  {
    id: 3, userId: 1, userName: '林先生', cigarId: 4, cigarName: 'Montecristo No.2',
    rating: 4, comment: '性价比很高的选择，口感均衡，适合日常品鉴。比较遗憾的是今天的燃烧不太均匀。',
    orderId: 'ORD20240602001', time: '2024-06-02 20:45', status: 'visible',
    rechargeLevel: 8, consumptionLevel: 7,
  },
  {
    id: 4, userId: 2, userName: '张女士', cigarId: 2, cigarName: 'Davidoff Winston Churchill',
    rating: 4, comment: '作为初次品雪茄的选择非常合适，果香和奶油感很讨喜，不冲。服务员推荐很专业。',
    orderId: 'ORD20240603002', time: '2024-06-03 22:15', status: 'visible',
    rechargeLevel: 5, consumptionLevel: 4,
  },
  {
    id: 5, userId: 3, userName: '王先生', cigarId: 3, cigarName: 'Arturo Fuente OpusX',
    rating: 5, comment: '稀缺款，能买到很开心。胡椒味很有特点，后段变化丰富，是真正的艺术品。',
    orderId: 'ORD20240603003', time: '2024-06-03 23:00', status: 'pending',
    rechargeLevel: 3, consumptionLevel: 3,
  },
]

export const mockSensitiveWords = ['垃圾', '欺骗', '骗子', '假货', '差劲']

export const cigarRatingSummary = [
  { cigarId: 1, cigarName: 'Cohiba Behike 52', avgRating: 4.8, count: 34 },
  { cigarId: 2, cigarName: 'Davidoff Winston Churchill', avgRating: 4.6, count: 58 },
  { cigarId: 3, cigarName: 'Arturo Fuente OpusX', avgRating: 4.7, count: 22 },
  { cigarId: 4, cigarName: 'Montecristo No.2', avgRating: 4.5, count: 87 },
  { cigarId: 5, cigarName: 'Padron 1964 Anniversary', avgRating: 4.9, count: 12 },
  { cigarId: 6, cigarName: 'Romeo y Julieta Reserva Real', avgRating: 4.2, count: 43 },
]
