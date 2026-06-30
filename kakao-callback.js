// netlify/functions/kakao-callback.js
// 카카오 인가코드 → 토큰 교환 (이 단계가 완료돼야 카카오 대시보드에 로그인 카운트됨)

exports.handler = async (event) => {
  // CORS 허용
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const { code, redirectUri } = JSON.parse(event.body || '{}');
    if (!code) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'no_code' }) };
    }

    const REST_API_KEY = process.env.KAKAO_REST_API_KEY;   // 환경변수
    const CLIENT_SECRET = process.env.KAKAO_CLIENT_SECRET;  // 환경변수

    // 1) 인가코드로 토큰 교환 → 이 호출이 성공해야 카카오가 "로그인 1명" 집계
    const tokenRes = await fetch('https://kauth.kakao.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: REST_API_KEY,
        redirect_uri: redirectUri,
        code: code,
        ...(CLIENT_SECRET ? { client_secret: CLIENT_SECRET } : {}),
      }),
    });

    const tokenData = await tokenRes.json();
    if (tokenData.error) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: tokenData.error, detail: tokenData.error_description }) };
    }

    // 2) 사용자 정보 조회 (닉네임·이메일) — 명단 확보용, 지금은 반환만
    const userRes = await fetch('https://kapi.kakao.com/v2/user/me', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const userData = await userRes.json();

    const nickname = userData?.kakao_account?.profile?.nickname || '사용자';
    const email = userData?.kakao_account?.email || '';

    // (명단 저장은 나중에 여기서 DB로 보내면 됨)

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ ok: true, nickname, email }),
    };
  } catch (e) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'server_error', detail: String(e) }) };
  }
};
