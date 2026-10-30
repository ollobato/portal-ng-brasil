<?php
// =============================================================================
// Serviço de Publicação Oficial no TikTok (Content Posting API v2) - Portal NG Brasil
// Executa no servidor Hostinger com renovação automática de token OAuth 2.0
// =============================================================================

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

header("Content-Type: application/json; charset=UTF-8");

$CLIENT_KEY = "awpunzxl9e81n4vp";
$CLIENT_SECRET = "YLgy30z0b6pj1oXUzvG5wNbl0aCCPsqX";
$storagePath = __DIR__ . '/tiktok-tokens.json';

// Se for requisição GET, retorna o status da conexão
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    if (file_exists($storagePath)) {
        $tokenData = json_decode(file_get_contents($storagePath), true);
        $isConnected = !empty($tokenData['accessToken']) && !empty($tokenData['refreshToken']);
        $expiresAt = isset($tokenData['expiresAt']) ? $tokenData['expiresAt'] : 0;
        
        echo json_encode([
            'connected' => $isConnected,
            'username' => isset($tokenData['username']) ? $tokenData['username'] : 'portalngbrasil',
            'displayName' => isset($tokenData['displayName']) ? $tokenData['displayName'] : 'Portal NG Brasil',
            'avatarUrl' => isset($tokenData['avatarUrl']) ? $tokenData['avatarUrl'] : null,
            'isExpired' => (time() * 1000) > $expiresAt,
            'connectedAt' => isset($tokenData['connectedAt']) ? $tokenData['connectedAt'] : null
        ]);
    } else {
        echo json_encode(['connected' => false]);
    }
    exit();
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Método não permitido. Utilize POST ou GET.']);
    exit();
}

// 1. Ler o payload de entrada
$rawBody = file_get_contents('php://input');
$input = json_decode($rawBody, true);
if (!is_array($input)) {
    $input = $_POST;
}

$title = isset($input['title']) ? trim($input['title']) : (isset($input['caption']) ? trim($input['caption']) : '');
$images = isset($input['images']) && is_array($input['images']) ? array_filter($input['images']) : [];
$videoUrl = isset($input['videoUrl']) ? trim($input['videoUrl']) : '';
$mediaType = isset($input['mediaType']) ? strtoupper(trim($input['mediaType'])) : (!empty($images) ? 'PHOTO' : 'VIDEO');
$postMode = isset($input['postMode']) ? trim($input['postMode']) : 'DIRECT_POST';
$privacyLevel = isset($input['privacyLevel']) ? trim($input['privacyLevel']) : 'PUBLIC_TO_EVERYONE';

if (empty($title)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'A legenda/título da notícia é obrigatória.']);
    exit();
}

// 2. Carregar e garantir token válido
if (!file_exists($storagePath)) {
    http_response_code(401);
    echo json_encode([
        'success' => false,
        'error' => 'TikTok não conectado. Conecte sua conta no painel de configurações.'
    ]);
    exit();
}

$tokenData = json_decode(file_get_contents($storagePath), true);
$accessToken = isset($tokenData['accessToken']) ? $tokenData['accessToken'] : '';
$refreshToken = isset($tokenData['refreshToken']) ? $tokenData['refreshToken'] : '';
$expiresAt = isset($tokenData['expiresAt']) ? $tokenData['expiresAt'] : 0;
$username = isset($tokenData['username']) ? $tokenData['username'] : 'portalngbrasil';

// Se faltar menos de 30 minutos para expirar o access_token, renova usando refresh_token
$nowMs = time() * 1000;
if ($nowMs >= ($expiresAt - 30 * 60 * 1000) && !empty($refreshToken)) {
    $chRef = curl_init("https://open.tiktokapis.com/v2/oauth/token/");
    curl_setopt_array($chRef, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST => true,
        CURLOPT_HTTPHEADER => ["Content-Type: application/x-www-form-urlencoded"],
        CURLOPT_POSTFIELDS => http_build_query([
            'client_key' => $CLIENT_KEY,
            'client_secret' => $CLIENT_SECRET,
            'grant_type' => 'refresh_token',
            'refresh_token' => $refreshToken
        ]),
        CURLOPT_TIMEOUT => 20
    ]);
    $refreshRes = curl_exec($chRef);
    curl_close($chRef);
    
    $refData = json_decode($refreshRes, true);
    if (isset($refData['data']['access_token'])) {
        $accessToken = $refData['data']['access_token'];
        $newRefreshToken = !empty($refData['data']['refresh_token']) ? $refData['data']['refresh_token'] : $refreshToken;
        $expiresIn = isset($refData['data']['expires_in']) ? intval($refData['data']['expires_in']) : 86400;

        $tokenData['accessToken'] = $accessToken;
        $tokenData['refreshToken'] = $newRefreshToken;
        $tokenData['expiresAt'] = (time() + $expiresIn) * 1000;
        $tokenData['updatedAt'] = date('c');

        file_put_contents($storagePath, json_encode($tokenData, JSON_PRETTY_PRINT));
    }
}

// 3. Montar payload do TikTok
$endpoint = "https://open.tiktokapis.com/v2/post/publish/content/init/";
$tiktokPayload = [];

if ($mediaType === 'PHOTO' || !empty($images)) {
    $tiktokPayload = [
        'post_info' => [
            'title' => mb_substr($title, 0, 2200),
            'privacy_level' => $privacyLevel,
            'disable_comment' => false
        ],
        'source_info' => [
            'source' => 'PULL_FROM_URL',
            'photo_cover_index' => 1,
            'photo_images' => array_values($images)
        ],
        'post_mode' => $postMode,
        'media_type' => 'PHOTO'
    ];
} else {
    $endpoint = "https://open.tiktokapis.com/v2/post/publish/video/init/";
    $tiktokPayload = [
        'post_info' => [
            'title' => mb_substr($title, 0, 2200),
            'privacy_level' => $privacyLevel,
            'disable_comment' => false
        ],
        'source_info' => [
            'source' => 'PULL_FROM_URL',
            'video_url' => $videoUrl
        ],
        'post_mode' => $postMode,
        'media_type' => 'VIDEO'
    ];
}

// 4. Executar disparo via cURL
function sendTikTokRequest($url, $payload, $token) {
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST => true,
        CURLOPT_HTTPHEADER => [
            "Authorization: Bearer {$token}",
            "Content-Type: application/json; charset=UTF-8"
        ],
        CURLOPT_POSTFIELDS => json_encode($payload),
        CURLOPT_TIMEOUT => 30
    ]);
    $res = curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    return [$code, json_decode($res, true)];
}

list($httpStatus, $resData) = sendTikTokRequest($endpoint, $tiktokPayload, $accessToken);

// Se falhar em DIRECT_POST porque o aplicativo está sob análise, tenta como rascunho (MEDIA_UPLOAD)
if ($httpStatus >= 400 && $postMode === 'DIRECT_POST') {
    $tiktokPayload['post_mode'] = 'MEDIA_UPLOAD';
    list($httpStatus, $resData) = sendTikTokRequest($endpoint, $tiktokPayload, $accessToken);
    if ($httpStatus < 400 && isset($resData['data']['publish_id'])) {
        $postMode = 'MEDIA_UPLOAD';
    }
}

if ($httpStatus < 400 && isset($resData['data']['publish_id'])) {
    $publishId = $resData['data']['publish_id'];
    $url = "https://www.tiktok.com/@{$username}";

    echo json_encode([
        'success' => true,
        'publishId' => $publishId,
        'postMode' => $postMode,
        'url' => $url,
        'data' => $resData['data'],
        'message' => $postMode === 'MEDIA_UPLOAD'
            ? 'Enviado como rascunho para a caixa de entrada do TikTok da conta!'
            : 'Publicado diretamente no TikTok com sucesso!'
    ]);
    exit();
}

// Se erro
http_response_code($httpStatus ?: 500);
echo json_encode([
    'success' => false,
    'error' => isset($resData['error']['message']) ? $resData['error']['message'] : (isset($resData['message']) ? $resData['message'] : 'Erro desconhecido na API do TikTok'),
    'details' => $resData
]);
