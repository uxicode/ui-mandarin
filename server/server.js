import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import * as cheerio from 'cheerio'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 3001
const IS_PRODUCTION = process.env.NODE_ENV === 'production'

const DEV_ORIGINS = ['http://localhost:5173', 'http://localhost:4173', 'http://localhost:5174']
const PROD_ORIGINS = [
  process.env.PRODUCTION_URL,
  ...(process.env.FRONTEND_URL ? process.env.FRONTEND_URL.split(',').map(o => o.trim()) : []),
]

const allowedOrigins = process.env.NODE_ENV === 'production'
  ? PROD_ORIGINS
  : [...DEV_ORIGINS, ...PROD_ORIGINS]

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

/** 인증 없이 사용 (fetch-url-title 등) */
const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false, autoRefreshToken: false },
})

const COOKIE_ACCESS = 'mandarin_access'
const COOKIE_REFRESH = 'mandarin_refresh'

function parseCookies(header) {
  if (!header || typeof header !== 'string') return {}
  return Object.fromEntries(
    header.split(';').map((part) => {
      const idx = part.indexOf('=')
      if (idx === -1) return [part.trim(), '']
      const k = part.slice(0, idx).trim()
      const v = part.slice(idx + 1).trim()
      try {
        return [k, decodeURIComponent(v)]
      } catch {
        return [k, v]
      }
    })
  )
}

function cookieBaseOpts() {
  // 프론트(Vercel)와 API(Render)가 서로 다른 도메인이므로
  // 프로덕션에서는 SameSite=None; Secure 를 써야 cross-site fetch에 쿠키가 실린다.
  if (IS_PRODUCTION) {
    return 'Path=/; HttpOnly; SameSite=None; Secure'
  }
  return 'Path=/; HttpOnly; SameSite=Lax'
}

function clearAuthCookies(res) {
  const base = cookieBaseOpts()
  res.append('Set-Cookie', `${COOKIE_ACCESS}=; Max-Age=0; ${base}`)
  res.append('Set-Cookie', `${COOKIE_REFRESH}=; Max-Age=0; ${base}`)
}

function setAuthCookies(res, session) {
  if (!session?.access_token || !session.refresh_token) return
  const base = cookieBaseOpts()
  const maxAccess = Math.max(60, Number(session.expires_in) || 3600)
  const maxRefresh = 60 * 60 * 24 * 30
  res.append(
    'Set-Cookie',
    `${COOKIE_ACCESS}=${encodeURIComponent(session.access_token)}; Max-Age=${maxAccess}; ${base}`
  )
  res.append(
    'Set-Cookie',
    `${COOKIE_REFRESH}=${encodeURIComponent(session.refresh_token)}; Max-Age=${maxRefresh}; ${base}`
  )
}

function getAccessTokenFromRequest(req) {
  const authHeader = req.headers.authorization
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7).trim()
  }
  const cookies = parseCookies(req.headers.cookie)
  return cookies[COOKIE_ACCESS] || null
}

function getRefreshTokenFromRequest(req) {
  const cookies = parseCookies(req.headers.cookie)
  return cookies[COOKIE_REFRESH] || null
}

function createUserClient(accessToken) {
  return createClient(supabaseUrl, supabaseKey, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

/**
 * 액세스 토큰(또는 리프레시)으로 세션 복원. 성공 시 필요하면 Set-Cookie로 토큰 갱신.
 */
async function resolveUserSession(req, res) {
  let access = getAccessTokenFromRequest(req)

  const tryWithAccess = async (token) => {
    if (!token) return null
    const client = createUserClient(token)
    const { data: { user }, error } = await client.auth.getUser(token)
    if (error || !user) return null
    return { accessToken: token, user, client }
  }

  if (access) {
    const ok = await tryWithAccess(access)
    if (ok) return ok
  }

  const refresh = getRefreshTokenFromRequest(req)
  if (refresh) {
    const { data, error } = await supabase.auth.refreshSession({ refresh_token: refresh })
    if (!error && data.session) {
      setAuthCookies(res, data.session)
      const client = createUserClient(data.session.access_token)
      return {
        accessToken: data.session.access_token,
        user: data.session.user,
        client,
      }
    }
  }

  return null
}

async function requireTaskAuth(req, res, next) {
  try {
    const resolved = await resolveUserSession(req, res)
    if (!resolved) {
      return res.status(401).json({ success: false, error: '인증이 필요합니다.' })
    }
    req.taskSupabase = resolved.client
    req.authUser = resolved.user
    next()
  } catch (err) {
    console.error('requireTaskAuth:', err)
    return res.status(500).json({ success: false, error: err.message || '인증 처리 오류' })
  }
}

function userJson(user) {
  if (!user) return null
  return {
    id: user.id,
    email: user.email,
    user_metadata: user.user_metadata || {},
  }
}

// —— Auth (세션은 HttpOnly 쿠키, Supabase는 서버에서만 사용) ——

/** 로그인 여부 조회. 게스트는 401이 아니라 200 + user: null (브라우저 콘솔/네트워크에 불필요한 오류 표시 방지) */
app.get('/api/auth/me', async (req, res) => {
  try {
    const resolved = await resolveUserSession(req, res)
    if (!resolved) {
      return res.json({ success: true, user: null })
    }
    return res.json({ success: true, user: userJson(resolved.user) })
  } catch (error) {
    console.error('auth/me 오류:', error)
    return res.status(500).json({ success: false, error: error.message })
  }
})

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body || {}
    if (!email || !password) {
      return res.status(400).json({ success: false, error: '이메일과 비밀번호가 필요합니다.' })
    }
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      return res.status(401).json({ success: false, error: error.message })
    }
    if (!data.session) {
      return res.status(401).json({ success: false, error: '세션을 만들 수 없습니다.' })
    }
    setAuthCookies(res, data.session)
    return res.json({ success: true, user: userJson(data.session.user) })
  } catch (error) {
    console.error('auth/login 오류:', error)
    return res.status(500).json({ success: false, error: error.message })
  }
})

app.post('/api/auth/signup', async (req, res) => {
  try {
    const { email, password, displayName } = req.body || {}
    if (!email || !password) {
      return res.status(400).json({ success: false, error: '이메일과 비밀번호가 필요합니다.' })
    }
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: displayName ? { display_name: displayName } : undefined,
      },
    })
    if (error) {
      return res.status(400).json({ success: false, error: error.message })
    }
    if (data.session) {
      setAuthCookies(res, data.session)
    }
    const u = data.session?.user || data.user
    return res.status(201).json({
      success: true,
      user: u ? userJson(u) : null,
      sessionCreated: !!data.session,
    })
  } catch (error) {
    console.error('auth/signup 오류:', error)
    return res.status(500).json({ success: false, error: error.message })
  }
})

app.post('/api/auth/logout', async (req, res) => {
  try {
    const access = getAccessTokenFromRequest(req)
    clearAuthCookies(res)
    if (access) {
      const client = createUserClient(access)
      await client.auth.signOut().catch(() => {})
    }
    return res.json({ success: true })
  } catch (error) {
    console.error('auth/logout 오류:', error)
    clearAuthCookies(res)
    return res.json({ success: true })
  }
})

app.patch('/api/auth/profile', async (req, res) => {
  try {
    const resolved = await resolveUserSession(req, res)
    if (!resolved) {
      return res.status(401).json({ success: false, error: '인증이 필요합니다.' })
    }
    const { displayName } = req.body || {}
    const { data, error } = await resolved.client.auth.updateUser({
      data: displayName !== undefined ? { display_name: displayName } : undefined,
    })
    if (error) {
      return res.status(400).json({ success: false, error: error.message })
    }
    return res.json({ success: true, user: userJson(data.user) })
  } catch (error) {
    console.error('auth/profile 오류:', error)
    return res.status(500).json({ success: false, error: error.message })
  }
})

// 업무 목록 조회 (GET /api/tasks)
app.get('/api/tasks', requireTaskAuth, async (req, res) => {
  try {
    const { data, error } = await req.taskSupabase
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
app.post('/api/tasks', requireTaskAuth, async (req, res) => {
  try {
    const { title, description, scores, startDate, deadline, completed } = req.body

    if (!title || !scores) {
      return res.status(400).json({ 
        success: false, 
        error: '제목과 점수는 필수입니다.' 
      })
    }
 
    // user_id 추가
    const { data, error } = await req.taskSupabase
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
app.put('/api/tasks/:id', requireTaskAuth, async (req, res) => {
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

    const { data, error } = await req.taskSupabase
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
app.delete('/api/tasks/:id', requireTaskAuth, async (req, res) => {
  try {
    const { id } = req.params

    const { error } = await req.taskSupabase
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
app.patch('/api/tasks/:id/toggle', requireTaskAuth, async (req, res) => {
  try {
    const { id } = req.params

    const { data: task, error: fetchError } = await req.taskSupabase
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

    const { data, error } = await req.taskSupabase
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
