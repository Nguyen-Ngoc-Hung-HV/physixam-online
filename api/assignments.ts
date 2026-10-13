import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI || '';
let cachedClient: MongoClient | null = null;

async function connectToDatabase() {
  if (cachedClient) return cachedClient;
  if (!uri) throw new Error('MONGODB_URI chưa được cấu hình');
  const client = new MongoClient(uri);
  await client.connect();
  cachedClient = client;
  return client;
}

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const client = await connectToDatabase();
    const db = client.db('physixam');
    const collection = db.collection('assignments');

    // GET: Học sinh tải đề thi về máy bằng mã rút gọn (code, assign, id)
    if (req.method === 'GET') {
      const { code, id, assign } = req.query || {};
      const targetCode = String(code || assign || id || '').trim();

      if (!targetCode) {
        const list = await collection.find({}).sort({ assignedAt: -1 }).limit(20).toArray();
        return res.status(200).json(list);
      }

      const examDoc = await collection.findOne({
        $or: [
          { code: { $regex: new RegExp(`^${targetCode}$`, 'i') } },
          { examCode: { $regex: new RegExp(`^${targetCode}$`, 'i') } },
          { id: targetCode }
        ]
      });

      if (!examDoc) {
        return res.status(404).json({ error: 'Không tìm thấy đề thi trên máy chủ' });
      }

      return res.status(200).json(examDoc);
    }

    // POST: Giáo viên lưu/kích hoạt đề thi lên MongoDB Atlas
    if (req.method === 'POST') {
      const payload = req.body;
      if (!payload) {
        return res.status(400).json({ error: 'Dữ liệu không hợp lệ' });
      }

      const lookupCode = payload.code || payload.examCode || payload.id || 'DEFAULT';

      await collection.updateOne(
        {
          $or: [
            { code: lookupCode },
            { examCode: lookupCode },
            { id: payload.id }
          ]
        },
        { 
          $set: {
            ...payload,
            updatedAt: new Date().toISOString()
          } 
        },
        { upsert: true }
      );

      return res.status(200).json({ success: true, message: 'Đã lưu đề thi lên MongoDB Atlas thành công' });
    }

    return res.status(405).json({ error: 'Phương thức không hỗ trợ' });
  } catch (error: any) {
    console.error('Lỗi API Assignments:', error);
    return res.status(500).json({ error: error.message || 'Lỗi kết nối cơ sở dữ liệu' });
  }
}