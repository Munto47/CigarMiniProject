export const mockDrinks = [
  {
    id: 1, name: '麦卡伦12年单一麦芽威士忌', category: '威士忌',
    price: 180, memberPrice: 155, stock: 32, status: 'active',
    matchCigars: [1, 3], description: '雪莉桶陈酿，带有干果与香草气息',
    isNew: false, createdAt: '2024-01-15',
  },
  {
    id: 2, name: '格兰菲迪15年', category: '威士忌',
    price: 150, memberPrice: 130, stock: 18, status: 'active',
    matchCigars: [2, 4], description: '三桶陈酿工艺，蜂蜜与香草交融',
    isNew: false, createdAt: '2024-02-01',
  },
  {
    id: 3, name: '古巴自由（朗姆可乐）', category: '鸡尾酒',
    price: 68, memberPrice: 58, stock: 99, status: 'active',
    matchCigars: [1, 2], description: '古巴传统搭配，清爽甘甜',
    isNew: false, createdAt: '2024-01-20',
  },
  {
    id: 4, name: '莫吉托', category: '鸡尾酒',
    price: 58, memberPrice: 50, stock: 99, status: 'active',
    matchCigars: [6], description: '薄荷与朗姆的经典组合，清凉提神',
    isNew: false, createdAt: '2024-01-20',
  },
  {
    id: 5, name: '精品手冲咖啡', category: '咖啡',
    price: 48, memberPrice: 42, stock: 99, status: 'active',
    matchCigars: [2, 4], description: '单品豆手冲，风味纯净',
    isNew: true, createdAt: '2024-06-01',
  },
  {
    id: 6, name: '巴拿马矿泉水 500ml', category: '软饮',
    price: 28, memberPrice: 24, stock: 200, status: 'active',
    matchCigars: [1, 2, 3, 4, 5, 6], description: '进口矿泉水，清洁口腔',
    isNew: false, createdAt: '2024-01-10',
  },
]
