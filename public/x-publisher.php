<?php
// =============================================================================
// Serviço de Publicação Oficial no X (antigo Twitter) - Portal NG Brasil
// Contorna restrições de CORS e executa assinatura criptográfica OAuth 1.0a / OAuth 2.0
// =============================================================================

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Método não permitido. Utilize POST.']);
    exit();
}

// 1. Ler os dados da requisição (JSON ou multipart/form-data)
$rawBody = file_get_contents('php://input');
$input = json_decode($rawBody, true);
if (!is_array($input)) {
    $input = $_POST;
}

$text = isset($input['text']) ? trim($input['text']) : '';
$mediaUrl = isset($input['mediaUrl']) ? trim($input['mediaUrl']) : (isset($input['media_url']) ? trim($input['media_url']) : '');
$mediaData = isset($input['mediaData']) ? trim($input['mediaData']) : (isset($input['media_data']) ? trim($input['media_data']) : '');
$username = isset($input['username']) ? trim($input['username']) : 'portalngbrasi';
$username = ltrim($username, '@');

// Chaves de API
$apiKey = isset($input['apiKey']) ? trim($input['apiKey']) : (isset($input['xApiKey']) ? trim($input['xApiKey']) : getenv('X_API_KEY'));
$apiSecret = isset($input['apiSecret']) ? trim($input['apiSecret']) : (isset($input['xApiSecret']) ? trim($input['xApiSecret']) : getenv('X_API_SECRET'));
$clientId = isset($input['clientId']) ? trim($input['clientId']) : (isset($input['xClientId']) ? trim($input['xClientId']) : getenv('X_CLIENT_ID'));
$clientSecret = isset($input['clientSecret']) ? trim($input['clientSecret']) : (isset($input['xClientSecret']) ? trim($input['xClientSecret']) : getenv('X_CLIENT_SECRET'));
$accessToken = isset($input['accessToken']) ? trim($input['accessToken']) : (isset($input['xAccessToken']) ? trim($input['xAccessToken']) : getenv('X_ACCESS_TOKEN'));
$accessSecret = isset($input['accessSecret']) ? trim($input['accessSecret']) : (isset($input['xAccessSecret']) ? trim($input['xAccessSecret']) : getenv('X_ACCESS_SECRET'));
$bearerToken = isset($input['bearerToken']) ? trim($input['bearerToken']) : (isset($input['xBearerToken']) ? trim($input['xBearerToken']) : getenv('X_BEARER_TOKEN'));

if (empty($apiKey)) $apiKey = 'teHpJ1Cmw3uXEIfWRIqRInZux';
if (empty($apiSecret)) $apiSecret = 'tyAAWtBNCczs84PNnYHEJTcJAPWa31MlU3JLqIaQdX3tGmigS4';
if (empty($clientId)) $clientId = 'QkdCUEZPZWtuYTdONVd5YkZISzQ6MTpjaQ';
if (empty($clientSecret)) $clientSecret = 'LLzasof3DC6kGCREytzq2XgjCZbJARQxQUZbTUvqRiO_HRmWGK';
if (empty($accessToken)) $accessToken = '2011249028273451008-a8oG3gCPkl7JxPS7uhI7eG7feWRYbe';
if (empty($accessSecret)) $accessSecret = 'dCFifuYoQNfVqz32MVdj1qx8STMUeHL59h6VkAUWy8r68';
if (empty($bearerToken)) $bearerToken = 'AAAAAAAAAAAAAAAAAAAAALKGAAIAAAAAP98Fmf0pMDI7kWlwsrjsFU3JSLU%3DxuFdfZ65P69HQZeqAIgFLjSt2iQ7vq4pvjuGuVoKA3VJ8M0AOf';

if (empty($text)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'O texto do post no X é obrigatório.']);
    exit();
}

$hasOAuth1 = !empty($apiKey) && !empty($apiSecret) && !empty($accessToken) && !empty($accessSecret);
$hasOAuth2 = !empty($bearerToken);

if (!$hasOAuth1 && !$hasOAuth2) {
    http_response_code(401);
    echo json_encode([
        'success' => false,
        'error' => 'Credenciais da API do X não configuradas. Forneça API Key, API Secret, Access Token e Access Secret (OAuth 1.0a) ou Bearer Token (OAuth 2.0).'
    ]);
    exit();
}

/**
 * Monta o cabeçalho Authorization OAuth 1.0a segundo a RFC 5849
 */
function buildOAuth1Header($url, $method, $params, $consumerKey, $consumerSecret, $token, $tokenSecret) {
    $oauth = [
        'oauth_consumer_key' => $consumerKey,
        'oauth_nonce' => bin2hex(random_bytes(16)),
        'oauth_signature_method' => 'HMAC-SHA1',
        'oauth_timestamp' => (string)time(),
        'oauth_token' => $token,
        'oauth_version' => '1.0'
    ];

    $allParams = array_merge($oauth, $params);
    ksort($allParams);

    $paramPairs = [];
    foreach ($allParams as $k => $v) {
        $paramPairs[] = rawurlencode($k) . '=' . rawurlencode($v);
    }
    $paramString = implode('&', $paramPairs);

    $baseString = strtoupper($method) . '&' . rawurlencode($url) . '&' . rawurlencode($paramString);
    $signingKey = rawurlencode($consumerSecret) . '&' . rawurlencode($tokenSecret);
    $signature = base64_encode(hash_hmac('sha1', $baseString, $signingKey, true));

    $oauth['oauth_signature'] = $signature;
    ksort($oauth);

    $headerParts = [];
    foreach ($oauth as $k => $v) {
        $headerParts[] = rawurlencode($k) . '="' . rawurlencode($v) . '"';
    }

    return 'OAuth ' . implode(', ', $headerParts);
}

// 2. Se houver mídia (imagem) e OAuth 1.0a, faz upload para o endpoint v1.1
$mediaId = null;
if ($hasOAuth1 && (!empty($mediaUrl) || !empty($mediaData))) {
    try {
        $base64Image = '';

        if (!empty($mediaData)) {
            // Se veio em base64 com prefixo data:image/...;base64,
            $base64Image = preg_replace('/^data:image\/[^;]+;base64,/', '', $mediaData);
        } elseif (!empty($mediaUrl)) {
            // Baixa a imagem via cURL
            $chImg = curl_init();
            curl_setopt($chImg, CURLOPT_URL, $mediaUrl);
            curl_setopt($chImg, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($chImg, CURLOPT_FOLLOWLOCATION, true);
            curl_setopt($chImg, CURLOPT_TIMEOUT, 15);
            curl_setopt($chImg, CURLOPT_SSL_VERIFYPEER, false);
            $rawImgData = curl_exec($chImg);
            $httpImgCode = curl_getinfo($chImg, CURLINFO_HTTP_CODE);
            curl_close($chImg);

            if ($httpImgCode >= 200 && $httpImgCode < 300 && !empty($rawImgData)) {
                $base64Image = base64_encode($rawImgData);
            }
        }

        if (!empty($base64Image)) {
            $uploadUrl = 'https://upload.twitter.com/1.1/media/upload.json';
            $postParams = ['media_data' => $base64Image];
            $authHeader = buildOAuth1Header($uploadUrl, 'POST', $postParams, $apiKey, $apiSecret, $accessToken, $accessSecret);

            $chUpload = curl_init();
            curl_setopt($chUpload, CURLOPT_URL, $uploadUrl);
            curl_setopt($chUpload, CURLOPT_POST, true);
            curl_setopt($chUpload, CURLOPT_POSTFIELDS, http_build_query($postParams));
            curl_setopt($chUpload, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($chUpload, CURLOPT_TIMEOUT, 20);
            curl_setopt($chUpload, CURLOPT_SSL_VERIFYPEER, false);
            curl_setopt($chUpload, CURLOPT_HTTPHEADER, [
                'Authorization: ' . $authHeader,
                'Content-Type: application/x-www-form-urlencoded'
            ]);

            $uploadResponse = curl_exec($chUpload);
            $uploadHttpCode = curl_getinfo($chUpload, CURLINFO_HTTP_CODE);
            curl_close($chUpload);

            if ($uploadHttpCode >= 200 && $uploadHttpCode < 300) {
                $uploadJson = json_decode($uploadResponse, true);
                if (!empty($uploadJson['media_id_string'])) {
                    $mediaId = $uploadJson['media_id_string'];
                }
            } else {
                // Apenas loga no console interno; prossegue enviando o tweet com link preview
                error_log("Aviso no upload de mídia para o X: " . $uploadResponse);
            }
        }
    } catch (Exception $e) {
        error_log("Exceção ao fazer upload de imagem para o X: " . $e->getMessage());
    }
}

// 3. Montar payload do tweet no X API v2 (POST /2/tweets)
$tweetPayload = ['text' => $text];
if (!empty($mediaId)) {
    $tweetPayload['media'] = ['media_ids' => [$mediaId]];
}

$tweetUrl = 'https://api.twitter.com/2/tweets';
$jsonPayload = json_encode($tweetPayload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);

$headers = [
    'Content-Type: application/json',
    'User-Agent: PortalNGBrasil/2.0'
];

if ($hasOAuth1) {
    // Para POST com JSON, os parâmetros do corpo JSON NÃO entram na assinatura OAuth 1.0a
    $authHeader = buildOAuth1Header($tweetUrl, 'POST', [], $apiKey, $apiSecret, $accessToken, $accessSecret);
    $headers[] = 'Authorization: ' . $authHeader;
} else {
    $headers[] = 'Authorization: Bearer ' . $bearerToken;
}

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $tweetUrl);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, $jsonPayload);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 20);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlError = curl_error($ch);
curl_close($ch);

if (!empty($curlError)) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Falha de conexão com os servidores do X: ' . $curlError
    ]);
    exit();
}

$resData = json_decode($response, true);

if ($httpCode >= 200 && $httpCode < 300 && !empty($resData['data']['id'])) {
    $tweetId = $resData['data']['id'];
    $tweetPermalink = "https://x.com/{$username}/status/{$tweetId}";

    http_response_code(200);
    echo json_encode([
        'success' => true,
        'id' => $tweetId,
        'url' => $tweetPermalink,
        'data' => $resData['data']
    ]);
    exit();
}

// Tratamento de erros amigáveis
$errorMessage = 'Erro ao publicar no X.';
if (isset($resData['detail'])) {
    $errorMessage = $resData['detail'];
} elseif (isset($resData['title'])) {
    $errorMessage = $resData['title'] . (isset($resData['errors']) ? ': ' . json_encode($resData['errors']) : '');
} elseif (isset($resData['errors'][0]['message'])) {
    $errorMessage = $resData['errors'][0]['message'];
}

if ($httpCode === 401) {
    $errorMessage = "X API (401 - Não Autorizado): Verifique se a API Key, API Secret, Access Token e Access Token Secret estão corretos e com permissão 'Read and Write'.";
} elseif ($httpCode === 402) {
    $errorMessage = "X API (402 - Créditos Esgotados): A sua conta no X Developer Console precisa de créditos pré-pagos (Billing/Faturamento) para publicar posts via API v2.";
} elseif ($httpCode === 403) {
    $errorMessage = "X API (403 - Permissão Negada): Certifique-se de que o aplicativo no Developer Portal está configurado com permissão de ESCRITA ('Read and Write') antes de gerar os tokens.";
} elseif ($httpCode === 429) {
    $errorMessage = "X API (429 - Limite Atingido): Limite de requisições do plano atingido no X. Aguarde alguns minutos antes de postar novamente.";
}

http_response_code($httpCode >= 400 && $httpCode < 600 ? $httpCode : 500);
echo json_encode([
    'success' => false,
    'httpCode' => $httpCode,
    'error' => $errorMessage,
    'details' => $resData
]);
