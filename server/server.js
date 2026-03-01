import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import * as cheerio from 'cheerio'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 3001
const IS_PRODUCTION = process.env.NODE_ENV === 'production'

const DEV_ORIGINS = ['http://localhost:5173', 'http://localhost:4173']
const PROD_ORIGINS = process.env.FRONTEND_URL
  ? process.env.FRONTEND_URL.split(',').map(o => o.trim())
  : []

const allowedOrigins = IS_PRODUCTION ? PROD_ORIGINS : [...DEV_ORIGINS, ...PROD_ORIGINS]

app.use(cors({
  origin: (origin, callback) => {
    // 서버 간 요청(origin 없음)은 허용
    if (!origin) return callback(null, true)
    if (allowedOrigins.includes(origin)) return callback(null, true)
    callback(new Error(`CORS blocked: ${origin}`))
  },
  credentials: true
}))

app.use(express.json())

// Supabase 클라이언트 초기화
const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Supabase 환경 변수가 설정되지 않았습니다.')
  console.error('SUPABASE_URL과 SUPABASE_ANON_KEY를 .env 파일에 설정해주세요.')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

// 업무 목록 조회 (GET /api/tasks)
app.get('/api/tasks', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error

    res.json({ success: true, data })
  } catch (error) {
    console.error('업무 목록 조회 오류:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// 업무 생성 (POST /api/tasks)
app.post('/api/tasks', async (req, res) => {
  try {
    const { title, description, scores, startDate, deadline, completed } = req.body

    if (!title || !scores) {
      return res.status(400).json({ 
        success: false, 
        error: '제목과 점수는 필수입니다.' 
      })
    }

    const { data, error } = await supabase
      .from('tasks')
      .insert([
        {
          title,
          description: description || null,
          importance: scores.importance,
          urgency: scores.urgency,
          start_date: startDate || null,
          deadline: deadline || null,
          completed: completed || false
        }
      ])
      .select()
      .single()

    if (error) throw error

    res.status(201).json({ success: true, data })
  } catch (error) {
    console.error('업무 생성 오류:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// 업무 수정 (PUT /api/tasks/:id)
app.put('/api/tasks/:id', async (req, res) => {
  try {
    const { id } = req.params
    const { title, description, scores, startDate, deadline, completed } = req.body

    const updateData = {}
    if (title !== undefined) updateData.title = title
    if (description !== undefined) updateData.description = description || null
    if (scores) {
      updateData.importance = scores.importance
      updateData.urgency = scores.urgency
    }
    if (startDate !== undefined) updateData.start_date = startDate || null
    if (deadline !== undefined) updateData.deadline = deadline || null
    if (completed !== undefined) updateData.completed = completed

    const { data, error } = await supabase
      .from('tasks')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    if (!data) {
      return res.status(404).json({ 
        success: false, 
        error: '업무를 찾을 수 없습니다.' 
      })
    }

    res.json({ success: true, data })
  } catch (error) {
    console.error('업무 수정 오류:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// 업무 삭제 (DELETE /api/tasks/:id)
app.delete('/api/tasks/:id', async (req, res) => {
  try {
    const { id } = req.params

    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', id)

    if (error) throw error

    res.json({ success: true })
  } catch (error) {
    console.error('업무 삭제 오류:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// 업무 완료 토글 (PATCH /api/tasks/:id/toggle)
app.patch('/api/tasks/:id/toggle', async (req, res) => {
  try {
    const { id } = req.params

    // 현재 업무 조회
    const { data: task, error: fetchError } = await supabase
      .from('tasks')
      .select('completed')
      .eq('id', id)
      .single()

    if (fetchError) throw fetchError

    if (!task) {
      return res.status(404).json({ 
        success: false, 
        error: '업무를 찾을 수 없습니다.' 
      })
    }

    // 완료 상태 토글
    const { data, error } = await supabase
      .from('tasks')
      .update({ completed: !task.completed })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    res.json({ success: true, data })
  } catch (error) {
    console.error('업무 완료 토글 오류:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// URL 제목 가져오기 (GET /api/fetch-url-title)
app.get('/api/fetch-url-title', async (req, res) => {
  try {
    const { url } = req.query

    if (!url || typeof url !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'URL 파라미터가 필요합니다.',
      })
    }

    // URL 유효성 검사
    let targetUrl
    try {
      targetUrl = new URL(url)
    } catch (error) {
      return res.status(400).json({
        success: false,
        error: '유효하지 않은 URL입니다.',
      })
    }

    // 타임아웃 설정 (10초)
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000)

    try {
      // HTML 가져오기
      const response = await fetch(targetUrl.toString(), {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const html = await response.text()
      const $ = cheerio.load(html)

      // 오픈그래프 메타데이터 추출
      const openGraph = {}
      $('meta[property^="og:"]').each((_, element) => {
        const property = $(element).attr('property')
        const content = $(element).attr('content')
        if (property && content) {
          // og:title -> title, og:description -> description 형식으로 변환
          const key = property.replace('og:', '')
          openGraph[key] = content
        }
      })

      // 기본 메타데이터도 추출 (description, image 등)
      const meta = {}
      $('meta[name="description"]').each((_, element) => {
        const content = $(element).attr('content')
        if (content && !openGraph.description) {
          meta.description = content
        }
      })

      // 제목 추출 (우선순위: og:title → title 태그 → URL)
      let title = openGraph.title
      if (!title) {
        title = $('title').text().trim()
      }
      if (!title) {
        title = url
      }

      // console.log('html 내용=', html);

      res.json({
        success: true,
        title: title,
        url: url,
        openGraph: Object.keys(openGraph).length > 0 ? openGraph : undefined,
        meta: Object.keys(meta).length > 0 ? meta : undefined,
      })
    } catch (fetchError) {
      clearTimeout(timeoutId)
      if (fetchError.name === 'AbortError') {
        return res.status(408).json({
          success: false,
          error: '요청 시간이 초과되었습니다.',
        })
      }
      throw fetchError
    }
  } catch (error) {
    console.error('URL 제목 가져오기 오류:', error)
    res.status(500).json({
      success: false,
      error: error.message || 'URL 제목을 가져오는데 실패했습니다.',
    })
  }
})

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

app.listen(PORT, () => {
  console.log(`🚀 서버가 포트 ${PORT}에서 실행 중입니다.`)
  console.log(`📡 API 엔드포인트: http://localhost:${PORT}/api`)
})
